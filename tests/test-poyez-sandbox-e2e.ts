import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';

const providerKey = 'poyez-local-provider-secret-12345';
const webhookSecret = 'poyez-local-webhook-secret-12345';
const webhookEvents: any[] = [];

const webhookServer = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', chunk => chunks.push(Buffer.from(chunk)));
  req.on('end', () => {
    const raw = Buffer.concat(chunks).toString('utf8');
    const expected = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
    assert.equal(req.headers['x-provider-signature'], expected, 'Provider webhook must have a valid HMAC signature.');
    webhookEvents.push(JSON.parse(raw));
    res.writeHead(204).end();
  });
});
webhookServer.listen(0, '127.0.0.1');
await new Promise<void>(resolve => webhookServer.once('listening', resolve));
const webhookAddress = webhookServer.address();
if (!webhookAddress || typeof webhookAddress === 'string') throw new Error('Webhook test server did not bind.');

process.env.PROVIDER_API_KEY = providerKey;
process.env.ZAYUNO_WEBHOOK_SECRET = webhookSecret;
process.env.ZAYUNO_API_URL = `http://127.0.0.1:${webhookAddress.port}`;
process.env.PROVIDER_PUBLIC_BASE_URL = 'https://poyez-sandbox.shopla.uz';
process.env.POYEZ_QUOTE_TTL_MS = '10000';
process.env.POYEZ_HOLD_TTL_MS = '4000';

const { createPoyezSandboxApp } = await import('../integrations/mock-poyez/src/server');
const providerServer = createPoyezSandboxApp().listen(0, '127.0.0.1');
await new Promise<void>(resolve => providerServer.once('listening', resolve));
const providerAddress = providerServer.address();
if (!providerAddress || typeof providerAddress === 'string') throw new Error('Poyez sandbox did not bind.');
const base = `http://127.0.0.1:${providerAddress.port}`;
const authHeaders = { 'content-type': 'application/json', 'x-provider-api-key': providerKey };

async function json(path: string, init: RequestInit = {}, expectedStatus?: number): Promise<any> {
  const response = await fetch(`${base}${path}`, { ...init, headers: { ...authHeaders, ...(init.headers || {}) }, redirect: init.redirect || 'follow' });
  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;
  if (expectedStatus !== undefined) assert.equal(response.status, expectedStatus, `${path}: ${text}`);
  else assert.ok(response.ok, `${path} failed with ${response.status}: ${text}`);
  return body;
}

async function form(path: string, csrfToken: string, expectedStatus: number): Promise<Response> {
  const response = await fetch(`${base}${path}`, {
    method: 'POST', redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken })
  });
  assert.equal(response.status, expectedStatus, `${path} returned ${response.status}`);
  return response;
}

async function checkoutToken(action: any): Promise<string> {
  const response = await fetch(action.paymentUrl);
  assert.equal(response.status, 200);
  const page = await response.text();
  assert.match(page, /SANDBOX DEMO/);
  assert.match(page, /seatmap/);
  const match = page.match(/name="csrfToken" value="([^"]+)"/);
  assert.ok(match?.[1], 'Checkout page must contain a CSRF token.');
  return match[1];
}

function actionBody(quote: any, idempotencyKey: string) {
  return {
    idempotencyKey,
    providerSlug: 'poyez-sandbox',
    quoteId: quote.id,
    items: quote.lines.map((line: any) => ({ offeringId: line.offeringId, variantId: line.variantId, quantity: line.quantity, selectedOptions: line.selectedOptions })),
    customer: { name: 'Sandbox Traveller', phone: '+998900000000', email: 'sandbox@example.test' },
    fulfillmentType: 'DIGITAL_TICKET',
    userConfirmed: true
  };
}

try {
  const allowedPreflight = await fetch(`${base}/search`, {
    method: 'OPTIONS',
    headers: { origin: 'https://partners.zayuno.uz', 'access-control-request-method': 'GET', 'access-control-request-headers': 'x-provider-api-key' }
  });
  assert.equal(allowedPreflight.status, 204);
  assert.equal(allowedPreflight.headers.get('access-control-allow-origin'), 'https://partners.zayuno.uz');

  const blockedPreflight = await fetch(`${base}/search`, {
    method: 'OPTIONS', headers: { origin: 'https://attacker.invalid', 'access-control-request-method': 'GET' }
  });
  assert.equal(blockedPreflight.status, 403);
  assert.equal(blockedPreflight.headers.get('access-control-allow-origin'), null);

  assert.equal((await fetch(`${base}/catalog`)).status, 401);
  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.status, 'HEALTHY');

  const info = await json('/provider-info');
  assert.equal(info.slug, 'poyez-sandbox');
  assert.equal(info.type, 'TICKETING');
  assert.equal(info.metadata.dynamicInventory, true);

  const stations = await json('/stations');
  assert.ok(stations.some((station: any) => station.id === 'toshkent-janubiy'));
  assert.ok(stations.some((station: any) => station.id === 'guliston'));

  const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + 24 * 60 * 60_000));
  const context = {
    origin: 'Toshkent Janubiy', destination: 'Guliston', departureDate: tomorrow,
    passengers: { adults: 1, children: 0, infants: 0 },
    preferences: { carClass: 'KUPE', seatLevel: 'LOWER', departurePeriod: 'AFTERNOON' }
  };
  const trips = await json(`/search?context=${encodeURIComponent(JSON.stringify(context))}`);
  assert.ok(trips.length >= 1);
  assert.equal(trips[0].metadata.destinationId, 'guliston');

  const offering = trips[0];
  const kupe = offering.variants.find((variant: any) => variant.metadata.carClass === 'KUPE');
  assert.ok(kupe, 'Search result must contain a KUPE variant.');
  const seatMap = await json(`/trips/${offering.metadata.tripId}/cars/${kupe.id}/seats?date=${tomorrow}`);
  assert.ok(seatMap.seats.some((seat: any) => seat.level === 'LOWER' && seat.isAvailable));

  const availabilityBody = {
    providerSlug: 'poyez-sandbox',
    items: [{ offeringId: offering.id, variantId: kupe.id, quantity: 1, selectedOptions: [] }],
    parameters: context
  };
  const availability = await json('/availability', { method: 'POST', body: JSON.stringify(availabilityBody) });
  assert.equal(availability.isAvailable, true);
  assert.ok(availability.availableItems[0].metadata.recommendedSeats.length >= 1);

  const selectedSeat = availability.availableItems[0].metadata.recommendedSeats[0].number;
  const quoteRequest = {
    providerSlug: 'poyez-sandbox',
    items: [{
      offeringId: offering.id, variantId: kupe.id, quantity: 1,
      selectedOptions: [{ groupId: 'insurance', optionId: 'accident-insurance', quantity: 1 }]
    }],
    fulfillmentType: 'DIGITAL_TICKET',
    parameters: { ...context, selectedSeatNumbers: [selectedSeat] }
  };
  const quoteA = await json('/quote', { method: 'POST', body: JSON.stringify(quoteRequest) });
  const quoteB = await json('/quote', { method: 'POST', body: JSON.stringify(quoteRequest) });
  assert.ok(quoteA.total > kupe.basePrice);
  assert.equal(quoteA.parameters.selectedSeatNumbers[0], selectedSeat);

  const piiRejected = await json('/quote', {
    method: 'POST',
    body: JSON.stringify({ ...quoteRequest, parameters: { ...quoteRequest.parameters, passportNumber: 'DO-NOT-STORE' } })
  }, 400);
  assert.match(piiRejected.message, /Identity-document/);

  const actionA = await json('/actions', { method: 'POST', headers: { 'idempotency-key': 'poyez-e2e-a' }, body: JSON.stringify(actionBody(quoteA, 'poyez-e2e-a')) }, 201);
  assert.equal(actionA.status, 'CREATED');
  assert.equal(actionA.sandboxState, 'AWAITING_PASSENGER_DETAILS');
  const duplicateA = await json('/actions', { method: 'POST', headers: { 'idempotency-key': 'poyez-e2e-a' }, body: JSON.stringify(actionBody(quoteA, 'poyez-e2e-a')) });
  assert.equal(duplicateA.id, actionA.id);

  const collision = await json('/actions', { method: 'POST', headers: { 'idempotency-key': 'poyez-e2e-b' }, body: JSON.stringify(actionBody(quoteB, 'poyez-e2e-b')) }, 409);
  assert.match(collision.message, /no longer available/);

  const csrfA = await checkoutToken(actionA);
  await form(`/pay/${actionA.externalActionId}/details`, 'forged-token', 403);
  await form(`/pay/${actionA.externalActionId}/details`, csrfA, 303);
  const awaitingPayment = await json(`/actions/${actionA.publicId}`);
  assert.equal(awaitingPayment.status, 'AWAITING_PAYMENT');
  await form(`/pay/${actionA.externalActionId}/success`, csrfA, 303);
  const paid = await json(`/actions/${actionA.externalActionId}`);
  assert.equal(paid.paymentStatus, 'PAID');
  assert.equal(paid.status, 'CONFIRMED');

  const freshAvailability = await json('/availability', { method: 'POST', body: JSON.stringify(availabilityBody) });
  assert.ok(!freshAvailability.availableItems[0].metadata.recommendedSeats.some((seat: any) => seat.number === selectedSeat));

  const quoteC = await json('/quote', {
    method: 'POST',
    body: JSON.stringify({ ...quoteRequest, parameters: context, items: [{ offeringId: offering.id, variantId: kupe.id, quantity: 1, selectedOptions: [] }] })
  });
  const actionC = await json('/actions', { method: 'POST', headers: { 'idempotency-key': 'poyez-e2e-c' }, body: JSON.stringify(actionBody(quoteC, 'poyez-e2e-c')) }, 201);
  const csrfC = await checkoutToken(actionC);
  const cancelled = await json(`/actions/${actionC.id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'E2E cancellation test' }) });
  assert.equal(cancelled.success, true);
  await form(`/pay/${actionC.externalActionId}/success`, csrfC, 409);
  const cancelledState = await json(`/actions/${actionC.id}`);
  assert.equal(cancelledState.status, 'CANCELLED');
  assert.notEqual(cancelledState.paymentStatus, 'PAID');

  const quoteD = await json('/quote', {
    method: 'POST',
    body: JSON.stringify({ ...quoteRequest, parameters: context, items: [{ offeringId: offering.id, variantId: kupe.id, quantity: 1, selectedOptions: [] }] })
  });
  const actionD = await json('/actions', { method: 'POST', headers: { 'idempotency-key': 'poyez-e2e-d' }, body: JSON.stringify(actionBody(quoteD, 'poyez-e2e-d')) }, 201);
  await new Promise(resolve => setTimeout(resolve, 4200));
  const expired = await json(`/actions/${actionD.id}`);
  assert.equal(expired.status, 'CANCELLED');
  assert.equal(expired.sandboxState, 'EXPIRED');

  assert.ok(webhookEvents.some(event => event.eventType === 'action.awaiting_payment'));
  assert.ok(webhookEvents.some(event => event.eventType === 'payment.received'));
  assert.ok(webhookEvents.some(event => event.eventType === 'action.cancelled'));
  console.log(`Poyez sandbox E2E defined successfully: ${trips.length} trips, collision/idempotency/CSRF/terminal-state/expiry guards covered.`);
} finally {
  await Promise.all([
    new Promise<void>((resolve, reject) => providerServer.close(error => error ? reject(error) : resolve())),
    new Promise<void>((resolve, reject) => webhookServer.close(error => error ? reject(error) : resolve()))
  ]);
}
