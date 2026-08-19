import crypto from 'node:crypto';

const apiBase = (process.env.ZAYUNO_PUBLIC_API_URL || 'https://api.zayuno.uz').replace(/\/$/, '');
const apiKey = process.env.ZAYUNO_API_KEY;
if (!apiKey) throw new Error('ZAYUNO_API_KEY is required. The script never prints it.');

async function api(path, init = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, ...(init.headers || {}) },
    redirect: init.redirect || 'follow'
  });
  const raw = await response.text();
  let body;
  try { body = raw ? JSON.parse(raw) : undefined; } catch { body = raw; }
  if (!response.ok) throw new Error(`${path} failed with HTTP ${response.status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  return body;
}

const tomorrow = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date(Date.now() + 24 * 60 * 60_000));
const parameters = {
  origin: 'Toshkent', destination: 'Guliston', departureDate: tomorrow,
  passengers: { adults: 1, children: 0, infants: 0 },
  preferences: { carClass: 'KUPE', seatLevel: 'LOWER', departurePeriod: 'AFTERNOON' }
};

const trips = await api('/api/v1/search', {
  method: 'POST', body: JSON.stringify({ providerSlug: 'poyez-sandbox', query: '', limit: 10, parameters })
});
if (!Array.isArray(trips) || trips.length === 0) throw new Error('No matching sandbox trips found.');
const trip = trips[0];
const variant = trip.variants.find(value => value.metadata?.carClass === 'KUPE' && value.isAvailable) || trip.variants.find(value => value.isAvailable);
if (!variant) throw new Error('No available sandbox car variant found.');

const availability = await api('/api/v1/availability', {
  method: 'POST', body: JSON.stringify({ providerSlug: 'poyez-sandbox', items: [{ offeringId: trip.id, variantId: variant.id, quantity: 1, selectedOptions: [] }], parameters })
});
if (!availability.isAvailable) throw new Error(`Inventory unavailable: ${JSON.stringify(availability.unavailableItems)}`);
const seatNumber = availability.availableItems?.[0]?.metadata?.recommendedSeats?.[0]?.number;
if (!seatNumber) throw new Error('Provider did not recommend an available seat.');

const quote = await api('/api/v1/quotes', {
  method: 'POST', body: JSON.stringify({
    providerSlug: 'poyez-sandbox', fulfillmentType: 'DIGITAL_TICKET',
    items: [{ offeringId: trip.id, variantId: variant.id, quantity: 1, selectedOptions: [] }],
    parameters: { ...parameters, selectedSeatNumbers: [seatNumber] }
  })
});
const idempotencyKey = `poyez-production-e2e-${crypto.randomUUID()}`;
const action = await api('/api/v1/actions', {
  method: 'POST', headers: { 'idempotency-key': idempotencyKey },
  body: JSON.stringify({
    idempotencyKey, providerSlug: 'poyez-sandbox', quoteId: quote.id,
    items: quote.lines.map(line => ({ offeringId: line.offeringId, variantId: line.variantId, quantity: line.quantity, selectedOptions: line.selectedOptions })),
    customer: { name: 'Production Sandbox E2E', phone: '+998900000000', email: 'sandbox-e2e@example.test' },
    fulfillmentType: 'DIGITAL_TICKET', userConfirmed: true
  })
});
if (!action.paymentUrl && !action.nextAction?.url) throw new Error('Action did not return provider-owned secure handoff URL.');
const checkoutUrl = action.nextAction?.url || action.paymentUrl;
const checkout = await fetch(checkoutUrl);
if (!checkout.ok) throw new Error(`Checkout failed with HTTP ${checkout.status}`);
const checkoutHtml = await checkout.text();
const csrf = checkoutHtml.match(/name="csrfToken" value="([^"]+)"/)?.[1];
if (!csrf) throw new Error('Checkout CSRF token missing.');

async function postCheckout(suffix) {
  const response = await fetch(`${checkoutUrl}/${suffix}`, {
    method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken: csrf })
  });
  if (response.status !== 303) throw new Error(`Checkout ${suffix} failed with HTTP ${response.status}: ${await response.text()}`);
}
await postCheckout('details');
await postCheckout('success');

let finalAction;
for (let attempt = 0; attempt < 10; attempt++) {
  finalAction = await api(`/api/v1/actions/${encodeURIComponent(action.publicId || action.id)}`);
  if (finalAction.paymentStatus === 'PAID' && finalAction.status === 'CONFIRMED') break;
  await new Promise(resolve => setTimeout(resolve, 500));
}
if (finalAction?.paymentStatus !== 'PAID' || finalAction?.status !== 'CONFIRMED') {
  throw new Error(`Webhook state did not converge: ${JSON.stringify({ status: finalAction?.status, paymentStatus: finalAction?.paymentStatus })}`);
}
console.log(JSON.stringify({
  ok: true, provider: 'poyez-sandbox', trip: trip.title, seatNumber,
  quoteTotal: quote.total, actionId: action.publicId || action.id,
  status: finalAction.status, paymentStatus: finalAction.paymentStatus
}, null, 2));
