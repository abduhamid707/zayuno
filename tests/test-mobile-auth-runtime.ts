import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsx"))("esbuild");
const accessKey = "zayuno_consumer_access_token";
const refreshKey = "zayuno_consumer_refresh_token";
const userKey = "zayuno_consumer_user";
const expiresKey = "zayuno_consumer_access_token_expires_at";
const user = { id: "customer", name: "Test" };
const snapshot = () =>
  new Map([
    [accessKey, "old-access"],
    [refreshKey, "old-refresh"],
    [userKey, JSON.stringify(user)],
    [expiresKey, String(Date.now() + 3600000)],
  ]);
const deferred = () => {
  let resolve!: (value?: any) => void;
  const promise = new Promise<any>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
async function main() {
  const result = await build({
    entryPoints: [resolve("apps/mobile/src/store/authStore.ts")],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    plugins: [
      {
        name: "native-auth-fixtures",
        setup(b: any) {
          b.onResolve(
            {
              filter:
                /^(react-native|expo-secure-store)$|^\.\.\/lib\/(config|analytics)$/,
            },
            (args: any) => ({ path: args.path, namespace: "auth-mock" }),
          );
          b.onLoad({ filter: /.*/, namespace: "auth-mock" }, (args: any) => ({
            contents:
              args.path === "react-native"
                ? "export const Platform={OS:'android'};"
                : args.path === "expo-secure-store"
                  ? "export const getItemAsync=(k)=>globalThis.fixture.get(k); export const setItemAsync=(k,v)=>globalThis.fixture.set(k,v); export const deleteItemAsync=(k)=>globalThis.fixture.del(k);"
                  : args.path.endsWith("config")
                    ? "export const getApiBaseUrl=()=> 'https://api.example.test';"
                    : "export const analytics={trackAuthSession:(...args)=>globalThis.fixture.events.push(args),identifyUser:()=>{},trackError:()=>{},resetUser:()=>{}};",
          }));
        },
      },
    ],
    logLevel: "silent",
  });
  const code = result.outputFiles[0].text;
  const launch = (
    disk: Map<string, string>,
    options: {
      readError?: boolean;
      fetch?: (...args: any[]) => any;
      readGate?: Promise<any>;
    } = {},
  ) => {
    const fixture = {
      events: [] as any[],
      readError: options.readError,
      get: async (key: string) => {
        if (options.readGate) await options.readGate;
        if (fixture.readError) throw new Error("Keystore locked");
        return disk.get(key) || null;
      },
      set: async (key: string, value: string) => {
        disk.set(key, value);
      },
      del: async (key: string) => {
        disk.delete(key);
      },
    };
    const module = { exports: {} as any };
    runInNewContext(code, {
      module,
      exports: module.exports,
      require,
      fixture,
      setTimeout,
      clearTimeout,
      AbortController,
      console,
      process: { env: { NODE_ENV: "test" } },
      fetch:
        options.fetch ||
        (() => {
          throw new Error("unexpected network call");
        }),
    });
    return { store: module.exports.useAuthStore, fixture };
  };
  const disk = new Map<string, string>();
  const first = launch(disk);
  await first.store
    .getState()
    .setSession({
      accessToken: "access",
      refreshToken: "refresh",
      user,
      expiresIn: 3600,
    });
  const cold = launch(disk);
  await cold.store.getState().initAuth();
  assert.equal(
    cold.store.getState().isAuthenticated,
    true,
    "a new JS runtime must restore the stored login without Google",
  );
  assert.equal(cold.store.getState().user.id, user.id);

  const lockedDisk = snapshot();
  const locked = launch(lockedDisk, { readError: true });
  await locked.store.getState().initAuth();
  assert.equal(
    locked.store.getState().restoreError,
    true,
    "keystore failure needs a retry surface, not the welcome screen",
  );
  assert.equal(lockedDisk.get(refreshKey), "old-refresh");
  locked.fixture.readError = false;
  await locked.store.getState().initAuth();
  assert.equal(locked.store.getState().isAuthenticated, true);
  assert.equal(locked.store.getState().restoreError, false);

  for (const status of [503, 403]) {
    const offlineDisk = snapshot();
    offlineDisk.set(expiresKey, "1");
    const offline = launch(offlineDisk, {
      fetch: async () => ({
        ok: false,
        status,
        json: async () =>
          status === 403
            ? Promise.reject(new Error("gateway HTML"))
            : { statusCode: 503 },
      }),
    });
    await offline.store.getState().initAuth();
    assert.equal(offline.store.getState().isAuthenticated, true);
    assert.equal(offlineDisk.get(refreshKey), "old-refresh");
  }
  const rejectedDisk = snapshot();
  rejectedDisk.set(expiresKey, "1");
  const rejected = launch(rejectedDisk, {
    fetch: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ statusCode: 401 }),
    }),
  });
  await rejected.store.getState().initAuth();
  assert.equal(
    rejected.store.getState().isAuthenticated,
    false,
    "explicit session revocation must still be honored",
  );

  const gate = deferred();
  let refreshCalls = 0;
  const raceDisk = snapshot();
  const race = launch(raceDisk, {
    fetch: async (url: string) => {
      if (url.endsWith("/revoke")) return { ok: true };
      refreshCalls++;
      await gate.promise;
      return {
        ok: true,
        json: async () => ({
          accessToken: "new-access",
          refreshToken: "new-refresh",
          user,
        }),
      };
    },
  });
  await race.store.getState().initAuth();
  const pending = race.store.getState().refreshSession(true);
  const pending2 = race.store.getState().refreshSession(true);
  await race.store.getState().logout();
  gate.resolve();
  await Promise.all([pending, pending2]);
  assert.equal(refreshCalls, 1);
  assert.equal(
    race.store.getState().isAuthenticated,
    false,
    "late refresh cannot undo logout",
  );
  assert.equal(raceDisk.has(refreshKey), false);

  const readGate = deferred();
  const reading = launch(new Map(), { readGate: readGate.promise });
  const restoring = reading.store.getState().initAuth();
  await reading.store
    .getState()
    .setSession({ accessToken: "fresh", refreshToken: "fresh-refresh", user });
  readGate.resolve();
  await restoring;
  assert.equal(
    reading.store.getState().accessToken,
    "fresh",
    "late hydration cannot overwrite a newer login",
  );
  console.log(
    "Native auth runtime: cold launch, keystore recovery, gateway/offline, revocation, single-flight refresh, logout race, and hydration race passed.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
