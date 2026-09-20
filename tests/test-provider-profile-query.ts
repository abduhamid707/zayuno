import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { providerProfileQuery } from '../apps/provider-portal/src/provider-profile-query';

const requirePortal = createRequire(new URL('../apps/provider-portal/package.json', import.meta.url));
const { QueryClient, QueryObserver } = requirePortal('@tanstack/react-query');

async function main() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  let calls = 0;
  const provider = { id: 'business-a', slug: 'business-a', status: 'DRAFT' };
  const apiFetch = async (path: string) => {
    assert.equal(path, '/api/v1/providers/me');
    calls++;
    return Response.json(provider);
  };
  const options = (token: string, account: { providerId?: string | null } | null) =>
    providerProfileQuery(token, account, apiFetch);

  const observer = new QueryObserver(client, options('', null));
  const unsubscribe = observer.subscribe(() => {});
  try {
    assert.equal(calls, 0, 'signed-out query must stay disabled');
    observer.setOptions(options('session-a', { providerId: null }));
    await observer.refetch();
    assert.equal(observer.getCurrentResult().status, 'success');
    assert.equal(observer.getCurrentResult().data, null, 'new owner reaches empty/onboarding state');
    assert.equal(calls, 0, 'unassigned owners must not repeatedly call providers/me');

    // Registration assigns a provider before the token changes. The observed
    // query must automatically leave the cached null result with that same token.
    observer.setOptions(options('session-a', { providerId: provider.id }));
    await observer.refetch();
    assert.deepEqual(observer.getCurrentResult().data, provider);
    assert.ok(calls > 0, 'new assignment must fetch the business without another login');

    observer.setOptions(options('session-b', { providerId: null }));
    await observer.refetch();
    assert.equal(observer.getCurrentResult().data, null, 'another account must not inherit the provider');

    for (const account of [null, {}, { providerId: provider.id }]) {
      const result = await client.fetchQuery(options('legacy-or-assigned', account));
      assert.deepEqual(result, provider, 'unknown assignment must still be checked at the API');
    }

    for (const message of ['Request failed (400)', 'Requires one of roles', 'Request failed (403)', 'Request failed (404)', 'Network error']) {
      const failure = new Error(message);
      const query = providerProfileQuery('session-a', { providerId: provider.id }, async () => { throw failure; });
      await assert.rejects(client.fetchQuery({ ...query, retry: false }), error => error === failure);
      assert.equal(client.getQueryState(query.queryKey)?.status, 'error', 'real failures must keep the retry UI');
    }
    console.log('PASS: provider session, unassigned onboarding, assignment transition, account isolation and real API errors');
  } finally {
    unsubscribe();
    client.clear();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
