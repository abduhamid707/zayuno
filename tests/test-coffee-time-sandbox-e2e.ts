import assert from 'node:assert/strict';
import { createCoffeeTimeSandboxApp } from '../integrations/mock-coffee-time/src/server';

process.env.PROVIDER_API_KEY = 'coffee-local-test-key';
process.env.PROVIDER_PUBLIC_BASE_URL = 'https://coffee-time-sandbox.shopla.uz';

const server = createCoffeeTimeSandboxApp().listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Sandbox test server did not bind.');
const base = `http://127.0.0.1:${address.port}`;
const headers = { 'content-type': 'application/json', 'x-provider-api-key': 'coffee-local-test-key' };

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const body = await response.json();
  assert.ok(response.ok, `${path} failed: ${JSON.stringify(body)}`);
  return body;
}

try {
  const allowedPreflight = await fetch(`${base}/catalog`, {
    method: 'OPTIONS',
    headers: {
      origin: 'https://partners.zayuno.uz',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'x-provider-api-key'
    }
  });
  assert.equal(allowedPreflight.status, 204);
  assert.equal(allowedPreflight.headers.get('access-control-allow-origin'), 'https://partners.zayuno.uz');

  const blockedPreflight = await fetch(`${base}/catalog`, {
    method: 'OPTIONS',
    headers: { origin: 'https://evil.example', 'access-control-request-method': 'GET' }
  });
  assert.equal(blockedPreflight.status, 403);
  assert.equal(blockedPreflight.headers.get('access-control-allow-origin'), null);

  const unauthorized = await fetch(`${base}/catalog`);
  assert.equal(unauthorized.status, 401);

  const info = await request('/provider-info');
  const locations = await request('/locations');
  const catalog = await request('/catalog');
  const search = await request('/search?q=standard');
  assert.equal(info.slug, 'coffee-time');
  assert.ok(locations.length >= 1);
  assert.ok(catalog.offerings.length >= 1);
  assert.ok(search.length >= 1);

  const item = catalog.offerings[0];
  const quote = await request('/quote', { method: 'POST', body: JSON.stringify({ providerSlug: 'coffee-time', locationId: locations[0].id, items: [{ offeringId: item.id, quantity: 2, selectedOptions: [] }] }) });
  assert.ok(quote.total > 0);
  const action = await request('/actions', { method: 'POST', headers: { 'idempotency-key': 'coffee-local-e2e' }, body: JSON.stringify({ idempotencyKey: 'coffee-local-e2e', providerSlug: 'coffee-time', quoteId: quote.id, locationId: locations[0].id, customer: { name: 'Test Customer', phone: '+998901234567' }, items: [{ offeringId: item.id, quantity: 2, selectedOptions: [] }], userConfirmed: true }) });
  assert.equal(action.status, 'AWAITING_PAYMENT');
  const status = await request(`/actions/${action.externalActionId}`);
  assert.equal(status.publicId, action.publicId);
  console.log(`Coffee Time sandbox E2E passed: ${locations.length} locations, ${catalog.offerings.length} offerings, quote ${quote.total} UZS, action ${action.publicId}.`);
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
