import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import { devApiProxy } from '../apps/provider-portal/scripts/dev-api-proxy';

const requirePortal = createRequire(new URL('../apps/provider-portal/package.json', import.meta.url));
const { createServer: createViteServer } = requirePortal('vite');

async function listen(server: Server) {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server) {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function main() {
  const upstream = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/api/v1/auth/login' && request.method === 'POST') {
      response.setHeader('Set-Cookie', [
        'zayuno_provider_access=test-access; Domain=api.example.test; Path=/; HttpOnly; Secure; SameSite=Lax',
        'zayuno_provider_refresh=test-refresh; Path=/api/v1/auth; HttpOnly; Secure; SameSite=Lax',
      ]);
      response.end('{}');
    } else if (request.url === '/api/v1/auth/session') {
      response.statusCode = request.headers.cookie?.includes('zayuno_provider_access=test-access') ? 200 : 401;
      response.end(JSON.stringify({ authenticated: response.statusCode === 200 }));
    } else if (request.url === '/api/v1/auth/logout') {
      response.setHeader('Set-Cookie', 'zayuno_provider_access=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
      response.end('{}');
    } else {
      response.statusCode = 404;
      response.end('{}');
    }
  });
  const upstreamBase = await listen(upstream);
  const vite = await createViteServer({
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true, proxy: { '/api': devApiProxy(upstreamBase) } },
    appType: 'custom',
  });
  const portal = createServer(vite.middlewares);
  try {
    const portalBase = await listen(portal);
    const login = await fetch(`${portalBase}/api/v1/auth/login`, { method: 'POST' });
    assert.equal(login.status, 200);
    const cookies = login.headers.getSetCookie();
    assert.equal(cookies.length, 2);
    for (const cookie of cookies) {
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=Lax/i);
      assert.doesNotMatch(cookie, /;\s*(Domain=|Secure\b)/i, 'cookies must be usable on the local HTTP origin');
    }
    assert.match(cookies[1], /Path=\/api\/v1\/auth/);
    const cookieHeader = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    for (let reload = 0; reload < 3; reload++) {
      const session = await fetch(`${portalBase}/api/v1/auth/session`, { headers: { Cookie: cookieHeader } });
      assert.equal(session.status, 200, 'same-origin session cookies must reach the upstream on every reload');
    }
    assert.equal((await fetch(`${portalBase}/api/v1/auth/session`)).status, 401);
    const logout = await fetch(`${portalBase}/api/v1/auth/logout`, { method: 'POST' });
    assert.match(logout.headers.getSetCookie()[0], /Max-Age=0/);
    console.log('PASS: real HTTP dev proxy login cookies, session reloads, cookie scope and logout');
  } finally {
    await close(portal);
    await vite.close();
    await close(upstream);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
