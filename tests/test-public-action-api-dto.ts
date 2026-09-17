import assert from 'node:assert/strict';
import {
  projectPublicAction,
  projectPublicActions
} from '../apps/api/src/modules/actions/public-action-response.ts';

const rawAction = {
  id: 'db-action-private-id',
  publicId: 'ZY-ACT-PUBLIC-001',
  externalActionId: 'provider-private-action-id',
  quoteId: 'quote-private-id',
  locationId: 'location-private-id',
  providerSlug: 'declared-provider',
  providerName: 'Declared Provider',
  status: 'AWAITING_PAYMENT',
  paymentStatus: 'PENDING',
  subtotal: 50_000,
  fees: 4_000,
  discount: 0,
  total: 54_000,
  currency: 'UZS',
  fulfillmentType: 'DELIVERY',
  nextAction: {
    type: 'OPEN_URL',
    url: 'https://provider.example/checkout',
    label: 'Pay now'
  },
  paymentUrl: 'https://provider.example/checkout',
  customer: { name: 'Private Customer', phone: '+998900000000' },
  destination: { raw: 'Private delivery address' },
  paymentMethod: 'card',
  idempotencyKey: 'idempotency-private-key',
  supportContact: { email: 'support@provider.example' },
  parameters: { private: true },
  metadata: { private: true },
  timeline: [{ id: 'timeline-private-id', payload: { private: true } }],
  lines: [{ offeringId: 'private-line' }],
  createdAt: '2026-09-18T10:00:00.000Z',
  updatedAt: '2026-09-18T10:00:00.000Z'
};

const publicKeys = [
  'actionId', 'providerSlug', 'providerName', 'status', 'paymentStatus', 'total',
  'currency', 'fulfillmentType', 'nextAction', 'checkoutUrl', 'supportContact',
  'createdAt', 'updatedAt'
].sort();

function assertPublicAction(value: any) {
  assert.deepEqual(Object.keys(value).sort(), publicKeys);
  assert.equal(value.actionId, 'ZY-ACT-PUBLIC-001');
  assert.equal(value.checkoutUrl, 'https://provider.example/checkout');
  assert.doesNotMatch(
    JSON.stringify(value),
    /db-action-private-id|provider-private-action-id|quote-private-id|location-private-id|Private Customer|Private delivery address|idempotency-private-key|timeline-private-id|private-line/
  );
}

async function main() {
  // The API-key list/create/get routes all use this same projection boundary.
  assertPublicAction(projectPublicAction(rawAction as any));
  const list = projectPublicActions([rawAction] as any);
  assert.equal(list.length, 1);
  assertPublicAction(list[0]);

  console.log('API-key action endpoints return only the stable public action DTO.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
