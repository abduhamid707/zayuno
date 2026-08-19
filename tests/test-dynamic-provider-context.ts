import assert from 'node:assert/strict';
import http from 'node:http';
import { ProviderCapability } from '../packages/contracts/src/provider';
import { RemoteHttpProviderAdapter } from '../packages/provider-sdk/src/remote-http-adapter';

process.env.NODE_ENV = 'test';
const received: Array<{ method: string; url: URL; body?: any }> = [];
const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', chunk => chunks.push(Buffer.from(chunk)));
  req.on('end', () => {
    const url = new URL(req.url || '/', 'http://provider.test');
    const raw = Buffer.concat(chunks).toString('utf8');
    const body = raw ? JSON.parse(raw) : undefined;
    received.push({ method: req.method || 'GET', url, body });
    res.setHeader('content-type', 'application/json');
    if (url.pathname === '/catalog') return res.end(JSON.stringify({ providerSlug: 'dynamic-test', categories: [], offerings: [] }));
    if (url.pathname.startsWith('/offerings/')) return res.end(JSON.stringify({ id: 'trip-1', providerId: 'dynamic-test', offeringCode: 'T1', title: 'Trip', basePrice: 1, currency: 'UZS', isAvailable: true, variants: [], optionGroups: [], tags: [], metadata: {} }));
    if (url.pathname === '/search') return res.end(JSON.stringify([]));
    if (url.pathname === '/availability') return res.end(JSON.stringify({ isAvailable: true, unavailableItems: [], availableItems: [{ offeringId: 'trip-1', remainingCapacity: 3 }], checkedAt: new Date().toISOString(), parameters: body?.parameters || {} }));
    return res.writeHead(404).end(JSON.stringify({ message: 'Not found' }));
  });
});
server.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Dynamic adapter test server did not bind.');

const adapter = new RemoteHttpProviderAdapter({
  slug: 'dynamic-test',
  baseUrl: `http://127.0.0.1:${address.port}`,
  secret: 'dynamic-test-secret',
  metadata: { capabilities: [ProviderCapability.CATALOG, ProviderCapability.SEARCH] }
});
const parameters = { origin: 'Tashkent', destination: 'Gulistan', departureDate: '2026-08-20', passengers: { adults: 1 } };

try {
  await adapter.getCatalog({ providerSlug: 'dynamic-test', parameters });
  await adapter.getOffering({ providerSlug: 'dynamic-test', offeringId: 'trip/1', parameters });
  await adapter.searchOfferings({ providerSlug: 'dynamic-test', query: '', limit: 5, parameters });
  const availability = await adapter.checkAvailability({ providerSlug: 'dynamic-test', items: [{ offeringId: 'trip-1', quantity: 1, selectedOptions: [] }], parameters });
  assert.equal(availability.availableItems?.[0]?.remainingCapacity, 3);

  const catalogCall = received.find(call => call.url.pathname === '/catalog');
  assert.deepEqual(JSON.parse(catalogCall?.url.searchParams.get('context') || '{}'), parameters);
  const offeringCall = received.find(call => call.url.pathname.startsWith('/offerings/'));
  assert.equal(offeringCall?.url.pathname, '/offerings/trip%2F1', 'Offering IDs must be URL encoded.');
  assert.deepEqual(JSON.parse(offeringCall?.url.searchParams.get('context') || '{}'), parameters);
  const searchCall = received.find(call => call.url.pathname === '/search');
  assert.deepEqual(JSON.parse(searchCall?.url.searchParams.get('context') || '{}'), parameters);
  const availabilityCall = received.find(call => call.url.pathname === '/availability');
  assert.equal(availabilityCall?.method, 'POST');
  assert.deepEqual(availabilityCall?.body.parameters, parameters);
  console.log('Dynamic provider context forwarding contract is covered for catalog, offering, search, and availability.');
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
