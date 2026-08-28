/**
 * HH Security Regression Tests
 *
 * Covers:
 *   A. isTrustedInternalProviderTarget — exact allowlist logic
 *   B. Auth middleware — fail-closed, timing-safe, no bypass
 *   C. executeSsrfSafeGet — production-mode trusted path vs blocked paths
 *
 * Run: tsx tests/test-hh-security-regression.ts
 */

import { isTrustedInternalProviderTarget } from '../packages/shared/src/trusted-internal-targets.js';
import { createHhRecruitmentApp } from '../integrations/hh-recruitment/src/server.js';
import {
  executeSsrfSafeGet,
  SsrfSecurityError
} from '../apps/api/src/modules/providers/ssrf-checker.js';
import http from 'http';
import net from 'net';

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean) {
  if (cond) { console.log(`  \u2705 ${name}`); passed++; }
  else       { console.error(`  \u274c ${name}`); failed++; }
}

async function mustThrowSsrf(name: string, fn: () => Promise<any>, expectedCode?: string) {
  try {
    await fn();
    console.error(`  \u274c ${name}  (expected SsrfSecurityError — got no error)`);
    failed++;
  } catch (err: any) {
    const isSsrf = err instanceof SsrfSecurityError;
    const codeMatch = !expectedCode || err.code === expectedCode;
    if (isSsrf && codeMatch) {
      console.log(`  \u2705 ${name}  [code=${err.code}]`);
      passed++;
    } else {
      console.error(`  \u274c ${name}  (expected SsrfSecurityError${expectedCode ? ' code='+expectedCode : ''}, got ${err?.constructor?.name} code=${err?.code} msg=${err?.message})`);
      failed++;
    }
  }
}

// ─── Spin up a tiny lokal HTTP server to simulate hh-recruitment ──────────────
function startLocalServer(responseBody: string, statusCode = 200): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(responseBody);
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({ port: addr.port, close: () => server.close() });
    });
  });
}

// ─── A. Trusted Internal Allowlist ────────────────────────────────────────────
console.log('\n[A] isTrustedInternalProviderTarget — allowlist logic');

ok('hh-uz + http://hh-recruitment:4008 → TRUSTED',
  isTrustedInternalProviderTarget('hh-uz', 'http://hh-recruitment:4008'));

ok('hh-recruitment + http://hh-recruitment:4008 → TRUSTED',
  isTrustedInternalProviderTarget('hh-recruitment', 'http://hh-recruitment:4008'));

ok('hh-uz + http://hh-recruitment:4008/health → TRUSTED (path ignored)',
  isTrustedInternalProviderTarget('hh-uz', 'http://hh-recruitment:4008/health'));

ok('hh-uz + https://hh-recruitment:4008 → NOT TRUSTED (wrong protocol)',
  !isTrustedInternalProviderTarget('hh-uz', 'https://hh-recruitment:4008'));

ok('hh-uz + http://hh-recruitment:9999 → NOT TRUSTED (wrong port)',
  !isTrustedInternalProviderTarget('hh-uz', 'http://hh-recruitment:9999'));

ok('hh-uz + http://evil-host:4008 → NOT TRUSTED (wrong hostname)',
  !isTrustedInternalProviderTarget('hh-uz', 'http://evil-host:4008'));

ok('other-provider + http://hh-recruitment:4008 → NOT TRUSTED (wrong slug)',
  !isTrustedInternalProviderTarget('other-provider', 'http://hh-recruitment:4008'));

ok('null slug → NOT TRUSTED',
  !isTrustedInternalProviderTarget(null, 'http://hh-recruitment:4008'));

ok('null url → NOT TRUSTED',
  !isTrustedInternalProviderTarget('hh-uz', null));

ok('URL with userinfo → NOT TRUSTED',
  !isTrustedInternalProviderTarget('hh-uz', 'http://user:pass@hh-recruitment:4008'));

ok('cloud metadata slug → NOT TRUSTED',
  !isTrustedInternalProviderTarget('169.254.169.254', 'http://169.254.169.254:4008'));

// ─── B. Auth Middleware ────────────────────────────────────────────────────────
console.log('\n[B] Auth middleware — fail-closed, timing-safe');

const TEST_KEY = 'test-api-key-abc123xyz';

const testApp = createHhRecruitmentApp({
  apiKey: TEST_KEY,
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret'
});

async function hitEndpoint(
  app: ReturnType<typeof createHhRecruitmentApp>,
  path: string,
  headers: Record<string, string> = {},
  timeout = 2000
): Promise<number> {
  const server = app.listen(0);
  const port = (server.address() as net.AddressInfo).port;
  return new Promise((resolve) => {
    const req = http.request({ hostname: '127.0.0.1', port, path, method: 'GET', headers }, res => {
      res.resume();
      res.on('end', () => { server.close(); resolve(res.statusCode!); });
    });
    req.setTimeout(timeout, () => { req.destroy(); server.close(); resolve(-1); });
    req.on('error', () => { server.close(); resolve(-1); });
    req.end();
  });
}

const healthStatus = await hitEndpoint(testApp, '/health');
ok('/health accessible without auth (status != 401)', healthStatus !== 401);

const noKeyStatus = await hitEndpoint(testApp, '/provider-info');
ok('/provider-info with NO key returns 401', noKeyStatus === 401);

const wrongKeyStatus = await hitEndpoint(testApp, '/provider-info', { 'x-provider-api-key': 'wrong-key' });
ok('/provider-info with WRONG key returns 401', wrongKeyStatus === 401);

const colonBypassStatus = await hitEndpoint(testApp, '/provider-info', { 'x-provider-api-key': 'anything:anything' });
ok('/provider-info colon-bypass rejected (401)', colonBypassStatus === 401);

const emptyKeyStatus = await hitEndpoint(testApp, '/provider-info', { 'x-provider-api-key': '' });
ok('/provider-info with EMPTY key returns 401', emptyKeyStatus === 401);

const correctKeyStatus = await hitEndpoint(testApp, '/provider-info', { 'x-provider-api-key': TEST_KEY });
ok('/provider-info with correct x-provider-api-key returns 200', correctKeyStatus === 200);

const bearerStatus = await hitEndpoint(testApp, '/provider-info', { 'authorization': `Bearer ${TEST_KEY}` });
ok('/provider-info with correct Bearer token returns 200', bearerStatus === 200);

const locNoKey = await hitEndpoint(testApp, '/locations');
ok('/locations with no key returns 401', locNoKey === 401);

const locWithKey = await hitEndpoint(testApp, '/locations', { 'x-provider-api-key': TEST_KEY });
ok('/locations with correct key returns 200', locWithKey === 200);

// Fail-closed: app with NO api key configured — must reject every non-empty key
const noKeyApp = createHhRecruitmentApp({
  apiKey: '',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret'
});
const noKeyAppResult = await hitEndpoint(noKeyApp, '/provider-info', { 'x-provider-api-key': 'any-random-key' });
ok('App with NO apiKey configured → arbitrary key rejected (fail-closed)', noKeyAppResult === 401);

// ─── C. executeSsrfSafeGet — production-mode allowlist ───────────────────────
console.log('\n[C] executeSsrfSafeGet — production-mode providerSlug allowlist');

// Temporarily set NODE_ENV=production for these checks
const origNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';

try {
  // C1: Plain http:// to a REAL internal host WITHOUT providerSlug → must throw INVALID_URL in production
  await mustThrowSsrf(
    'production + http://hh-recruitment:4008 + NO providerSlug → INVALID_URL',
    () => executeSsrfSafeGet('http://hh-recruitment:4008/health', {}, {}),
    'INVALID_URL'
  );

  // C2: Spin up a local server at 127.0.0.1 to simulate hh-recruitment responding
  // We cannot use the real Docker hostname in this test, so we verify the allowlist
  // bypass path by using a URL that WOULD be blocked without the slug.
  // The allowlist only exempts hh-recruitment:4008 — 127.0.0.1 is always loopback.
  // So C2 verifies via the allowlist function itself (already done in Section A).
  // What we CAN test end-to-end: wrong slug for a real URL that passes DNS but is private.
  await mustThrowSsrf(
    'production + http://localhost:65000 + wrong slug (not-hh) → INVALID_URL or FORBIDDEN_ADDRESS',
    () => executeSsrfSafeGet('http://localhost:65000/health', {}, { providerSlug: 'not-hh' })
  );

  // C3: http:// to a public hostname without slug → INVALID_URL (https only in prod)
  await mustThrowSsrf(
    'production + http://example.com + NO slug → INVALID_URL',
    () => executeSsrfSafeGet('http://example.com/health', {}, {}),
    'INVALID_URL'
  );

  // C4: Cloud metadata → FORBIDDEN_ADDRESS regardless of slug
  await mustThrowSsrf(
    'production + cloud metadata http://169.254.169.254 + any slug → FORBIDDEN_ADDRESS',
    () => executeSsrfSafeGet('http://169.254.169.254/health', {}, { providerSlug: 'hh-uz' }),
    'FORBIDDEN_ADDRESS'
  );

  // C5: Wrong port — not in allowlist → INVALID_URL (http in prod)
  await mustThrowSsrf(
    'production + http://hh-recruitment:9999 + hh-uz slug (wrong port, not allowlisted) → INVALID_URL',
    () => executeSsrfSafeGet('http://hh-recruitment:9999/health', {}, { providerSlug: 'hh-uz' }),
    'INVALID_URL'
  );

  // C6: Wrong hostname — not in allowlist → INVALID_URL (http in prod)
  await mustThrowSsrf(
    'production + http://evil-internal:4008 + hh-uz slug (wrong host, not allowlisted) → INVALID_URL',
    () => executeSsrfSafeGet('http://evil-internal:4008/health', {}, { providerSlug: 'hh-uz' }),
    'INVALID_URL'
  );

  // C7: https:// to public domain + slug → should attempt DNS (not blocked by allowlist logic alone)
  // We just verify it does NOT throw INVALID_URL for https public URLs even without slug
  let httpsPublicThrew = false;
  let httpsPublicCode = '';
  try {
    await executeSsrfSafeGet('https://example.com/', {}, { timeoutMs: 3000 });
  } catch (err: any) {
    httpsPublicThrew = true;
    httpsPublicCode = err?.code || err?.message || '';
  }
  // Should NOT throw INVALID_URL (https is always allowed protocol)
  // May throw TIMEOUT or UNREACHABLE depending on network — both acceptable
  ok(
    'production + https://example.com → not blocked by INVALID_URL (protocol OK)',
    !httpsPublicThrew || (httpsPublicCode !== 'INVALID_URL')
  );

  console.log('  ℹ️  Note: Real http://hh-recruitment:4008 probe (Docker-only) not testable from host — verified via allowlist logic in Section A.');

} finally {
  process.env.NODE_ENV = origNodeEnv;
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n─────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  process.exit(1);
}
console.log('All tests passed!');
