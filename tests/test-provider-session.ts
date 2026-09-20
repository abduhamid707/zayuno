import assert from 'node:assert/strict';
import { createProviderSessionClient } from '../apps/provider-portal/src/provider-session';

async function main() {
  const session = { accessToken: 'test-access', user: { id: 'test-owner', providerId: null } };
  function setup(responses: Array<Response | Error>) {
    const calls: Array<{ path: string; method?: string }> = [];
    const request: typeof fetch = async (input, init) => {
      assert.equal(init?.credentials, 'include');
      calls.push({ path: String(input), method: init?.method });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      assert.ok(response, 'unexpected extra request');
      return response;
    };
    return { client: createProviderSessionClient('', request), calls };
  }

  const valid = setup([Response.json({ authenticated: true, ...session }), Response.json(session)]);
  assert.deepEqual(await Promise.all([valid.client.restore(), valid.client.restore()]), [session, session]);
  assert.equal(valid.calls.length, 1, 'StrictMode restore must make one session request');
  assert.deepEqual(await valid.client.restore(), session, 'later reload must check the server again');
  assert.equal(valid.calls.length, 2);

  const expired = setup([new Response(null, { status: 401 }), Response.json(session)]);
  assert.deepEqual(await Promise.all([expired.client.restore(), expired.client.restore()]), [session, session]);
  assert.deepEqual(expired.calls, [
    { path: '/api/v1/auth/session', method: undefined },
    { path: '/api/v1/auth/refresh', method: 'POST' },
  ], 'expired access must rotate refresh exactly once');

  const refresh = setup([Response.json(session)]);
  await Promise.all([refresh.client.refresh(), refresh.client.refresh()]);
  assert.equal(refresh.calls.length, 1, 'concurrent refresh must not reuse a rotated token');

  const signedOut = setup([new Response(null, { status: 401 }), new Response(null, { status: 401 })]);
  assert.equal(await signedOut.client.restore(), null, 'missing/revoked refresh must require login');

  for (const failure of [new Response(null, { status: 503 }), new Error('offline')]) {
    const failed = setup([failure, Response.json(session)]);
    await assert.rejects(failed.client.restore());
    assert.equal(failed.calls.length, 1, 'network/server failures must not rotate credentials');
    assert.deepEqual(await failed.client.restore(), session, 'failed requests must release the single-flight lock');
  }
  const malformed = setup([Response.json({ authenticated: true })]);
  await assert.rejects(malformed.client.restore(), /Invalid session response/);
  console.log('PASS: reload restore, access expiry recovery, single-flight rotation, logout and transient failures');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
