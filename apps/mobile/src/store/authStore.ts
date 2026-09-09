import { create } from "zustand";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { getApiBaseUrl } from "../lib/config";
import { analytics } from "../lib/analytics";

const ACCESS_TOKEN_KEY = "zayuno_consumer_access_token";
const REFRESH_TOKEN_KEY = "zayuno_consumer_refresh_token";
const USER_KEY = "zayuno_consumer_user";
const ACCESS_TOKEN_EXPIRES_AT_KEY = "zayuno_consumer_access_token_expires_at";
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_EARLY_MS = 60_000;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        return typeof window !== "undefined"
          ? window.localStorage.getItem(key)
          : null;
      } catch {
        return null;
      }
    }
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch (error) {
        lastError = error;
        if (attempt < 2) await wait(40 * (attempt + 1));
      }
    }
    throw lastError;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined")
          window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    // Do not hide native persistence failures. A login must only be reported as
    // successful after the session is actually stored for the next app launch.
    await SecureStore.setItemAsync(key, value);
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {}
  },
};

export interface ConsumerUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

interface SessionPayload {
  accessToken: string;
  refreshToken?: string;
  user?: ConsumerUser;
  expiresIn?: number;
}

interface AuthState {
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  refreshToken: string | null;
  token: string | null;
  user: ConsumerUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  initAuth: () => Promise<void>;
  setSession: (session: SessionPayload) => Promise<void>;
  refreshSession: (force?: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
}

let refreshInFlight: Promise<boolean> | null = null;
let initInFlight: Promise<void> | null = null;

async function clearStoredSession() {
  await Promise.all([
    storage.deleteItem(ACCESS_TOKEN_KEY),
    storage.deleteItem(REFRESH_TOKEN_KEY),
    storage.deleteItem(USER_KEY),
    storage.deleteItem(ACCESS_TOKEN_EXPIRES_AT_KEY),
  ]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshToken: null,
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

  initAuth: async () => {
    if (initInFlight) return initInFlight;
    initInFlight = (async () => {
      analytics.trackAuthSession("restore_started");
      try {
        const [accessToken, refreshToken, userJson, expiresAtJson] =
          await Promise.all([
            storage.getItem(ACCESS_TOKEN_KEY),
            storage.getItem(REFRESH_TOKEN_KEY),
            storage.getItem(USER_KEY),
            storage.getItem(ACCESS_TOKEN_EXPIRES_AT_KEY),
          ]);
        let user: ConsumerUser | null = null;
        try {
          user = userJson ? JSON.parse(userJson) : null;
        } catch {
          // A damaged profile cache must never destroy otherwise valid tokens.
        }
        const parsedExpiresAt = Number(expiresAtJson);
        const accessTokenExpiresAt = Number.isFinite(parsedExpiresAt)
          ? parsedExpiresAt
          : null;
        const hasStoredSession = Boolean(accessToken || refreshToken);
        set({
          accessToken,
          accessTokenExpiresAt,
          refreshToken,
          token: accessToken,
          user,
          isAuthenticated: hasStoredSession,
          isLoading: Boolean(refreshToken),
        });
        if (user) analytics.identifyUser(user);
        const refreshAttempted = Boolean(
          refreshToken &&
            (!accessToken ||
              !accessTokenExpiresAt ||
              accessTokenExpiresAt <= Date.now() + REFRESH_EARLY_MS),
        );
        const refreshSucceeded = refreshToken
          ? await get().refreshSession()
          : false;
        const restored = get().isAuthenticated;
        analytics.trackAuthSession(
          restored ? "restore_succeeded" : "restore_failed",
          {
            reason: restored ? "stored_session" : "refresh_rejected",
            has_access: Boolean(get().accessToken),
            has_refresh: Boolean(get().refreshToken),
            refresh_attempted: refreshAttempted,
            refresh_succeeded: refreshSucceeded,
          },
        );
      } catch (error) {
        // A transient Android keystore read failure is not evidence that the
        // account session is invalid. Keep disk data and retry next launch.
        analytics.trackAuthSession("restore_failed", {
          reason: "secure_storage_read",
        });
        analytics.trackError(error, "auth_restore");
        set({
          accessToken: null,
          accessTokenExpiresAt: null,
          refreshToken: null,
          token: null,
          user: null,
          isAuthenticated: false,
        });
      } finally {
        set({ isLoading: false });
        initInFlight = null;
      }
    })();
    return initInFlight;
  },

  setSession: async ({ accessToken, refreshToken, user, expiresIn }) => {
    const persistedRefreshToken = refreshToken || get().refreshToken;
    const persistedUser = user || get().user;
    const accessTokenExpiresAt =
      Date.now() +
      Math.max(Number(expiresIn) || DEFAULT_ACCESS_TOKEN_TTL_SECONDS, 60) *
        1000;
    if (persistedUser) analytics.identifyUser(persistedUser);
    // Persist the newly rotated refresh token first. If Android kills the app
    // between writes, the next cold start can still obtain a fresh access token.
    if (persistedRefreshToken)
      await storage.setItem(REFRESH_TOKEN_KEY, persistedRefreshToken);
    await storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    await storage.setItem(
      ACCESS_TOKEN_EXPIRES_AT_KEY,
      String(accessTokenExpiresAt),
    );
    if (persistedUser)
      await storage.setItem(USER_KEY, JSON.stringify(persistedUser));
    set({
      accessToken,
      accessTokenExpiresAt,
      refreshToken: persistedRefreshToken || null,
      token: accessToken,
      user: persistedUser || null,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  refreshSession: async (force = false) => {
    const current = get();
    if (
      !force &&
      current.accessToken &&
      current.accessTokenExpiresAt &&
      current.accessTokenExpiresAt > Date.now() + REFRESH_EARLY_MS
    ) {
      return true;
    }
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const refreshToken = get().refreshToken;
      const baseUrl = getApiBaseUrl();
      if (!refreshToken || !baseUrl) return false;
      try {
        const response = await fetch(
          `${baseUrl}/api/v1/consumer/auth/refresh`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          },
        );
        if (!response.ok) {
          // Only an explicit auth rejection invalidates a persisted session.
          // Network errors and temporary 5xx responses must not log users out.
          if ([401, 403].includes(response.status)) {
            await clearStoredSession();
            set({
              accessToken: null,
              accessTokenExpiresAt: null,
              refreshToken: null,
              token: null,
              user: null,
              isAuthenticated: false,
            });
          }
          return false;
        }
        const session = await response.json();
        await get().setSession({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user || get().user || undefined,
          expiresIn: session.expiresIn,
        });
        return true;
      } catch {
        // Keep the last known session while offline or while production is
        // temporarily unavailable. The next authenticated request retries it.
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
    return refreshInFlight;
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    const baseUrl = getApiBaseUrl();
    if (refreshToken && baseUrl) {
      fetch(`${baseUrl}/api/v1/consumer/auth/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    await clearStoredSession();
    analytics.resetUser();
    set({
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));
