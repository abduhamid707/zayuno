#!/usr/bin/env sh
set -eu

cd /root/zayuno
set -a
. ./.env
set +a

if [ -z "${ZAYUNO_API_KEY:-}" ]; then
  echo "ZAYUNO_API_KEY is missing." >&2
  exit 1
fi

docker exec -i \
  -w /app/apps/api \
  -e E2E_API_KEY="$ZAYUNO_API_KEY" \
  zayuno-api node - <<'NODE'
const assert = require('node:assert/strict');

const coreBase = 'http://127.0.0.1:4000/api/v1';
const providerBase = 'http://mock-coffee-time:4005';
const apiHeaders = { 'content-type': 'application/json', 'x-api-key': process.env.E2E_API_KEY };

async function core(path, init = {}) {
  const response = await fetch(`${coreBase}${path}`, {
    ...init,
    headers: { ...apiHeaders, ...(init.headers || {}) }
  });
  const body = await response.json();
  assert.ok(response.ok, `${path} failed (${response.status}): ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  const locations = await core('/providers/coffee-time/locations');
  const catalog = await core(`/providers/coffee-time/catalog?locationId=${encodeURIComponent(locations[0].id)}`);
  const offering = catalog.offerings[0];
  assert.ok(offering && offering.id, 'Coffee Time catalog is empty.');

  const quote = await core('/quotes', {
    method: 'POST',
    body: JSON.stringify({
      providerSlug: 'coffee-time',
      locationId: locations[0].id,
      items: [{ offeringId: offering.id, quantity: 1, selectedOptions: [] }]
    })
  });

  const idempotencyKey = `coffee_prod_e2e_${Date.now()}`;
  const actionInput = {
    idempotencyKey,
    providerSlug: 'coffee-time',
    quoteId: quote.id,
    locationId: locations[0].id,
    customer: { name: 'Zayuno Production E2E', phone: '+998901234567' },
    destination: { raw: 'Tashkent production sandbox test' },
    items: [{ offeringId: offering.id, quantity: 1, selectedOptions: [] }],
    userConfirmed: true
  };
  const action = await core('/actions', { method: 'POST', body: JSON.stringify(actionInput) });
  const duplicate = await core('/actions', { method: 'POST', body: JSON.stringify(actionInput) });
  assert.equal(duplicate.publicId, action.publicId, 'Idempotent action returned a different ID.');
  assert.equal(action.status, 'AWAITING_PAYMENT');

  const payment = await fetch(`${providerBase}/pay/${encodeURIComponent(action.externalActionId)}/success`, {
    method: 'POST',
    redirect: 'manual'
  });
  assert.equal(payment.status, 303, `Sandbox payment failed with HTTP ${payment.status}.`);

  let current;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    current = await core(`/actions/${encodeURIComponent(action.publicId)}`);
    if (current.paymentStatus === 'PAID' && current.status === 'CONFIRMED') break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.equal(current.paymentStatus, 'PAID');
  assert.equal(current.status, 'CONFIRMED');

  console.log(JSON.stringify({
    result: 'COFFEE_TIME_PRODUCTION_E2E_PASSED',
    locations: locations.length,
    offerings: catalog.offerings.length,
    total: quote.total,
    actionId: action.publicId,
    paymentStatus: current.paymentStatus,
    actionStatus: current.status
  }));
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
NODE
