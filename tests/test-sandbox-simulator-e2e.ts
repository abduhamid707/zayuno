import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { ActionStatus, PaymentStatus } from '../packages/contracts/src/action.ts';
import { ProviderCapability, ProviderStatus, ProviderType } from '../packages/contracts/src/provider.ts';

import { ProviderCertificationRunner } from '../packages/provider-sdk/src/certification.ts';
import { SandboxProviderAdapter } from '../integrations/sandbox-provider/src/sandbox-adapter.ts';

async function main() {
  console.log('🧪 Testing Full Local Sandbox Simulator & Certification E2E...');

  // 1. Adapter initialization
  const adapter = new SandboxProviderAdapter({
    providerSlug: 'sandbox-provider',
    baseUrl: 'https://sandbox.zayuno.example',
    apiKey: 'zy_test_sandbox_api_key_123',
    webhookSecret: 'zy_test_webhook_secret_456'
  });

  // 2. Automated Capability Certification Runner Test
  console.log('  1. Running universal capability certification runner...');
  const runner = new ProviderCertificationRunner(adapter);
  const report = await runner.runAllTests();

  if (!report.isCertified) {
    console.error('Failed tests in report:', report.tests.filter(t => !t.passed));
  }

  assert.equal(report.isCertified, true, 'Sandbox adapter must pass certification');
  assert.equal(report.isProductionReady, true, 'All mandatory capabilities must be certified');
  assert.equal(report.failedCount, 0, `Expected 0 failed tests, got ${report.failedCount}`);
  assert.ok(report.totalTests >= 7, 'Must test at least 7 capabilities');

  // 3. Step-by-Step Simulator Lifecycle (Find -> Quote -> Confirm -> Action -> Webhook -> Status)
  console.log('  2. Testing end-to-end simulator lifecycle...');

  // Step A: Catalog & Item Discovery
  const catalog = await adapter.getCatalog({ providerSlug: 'sandbox-provider' });
  assert.ok(catalog.offerings.length > 0, 'Catalog must contain offerings');
  const testOffering = catalog.offerings[0];

  // Step B: Quote Request & Quote Math Verification
  const quote = await adapter.requestQuote({
    providerSlug: 'sandbox-provider',
    items: [{
      offeringId: testOffering.id,
      quantity: 2
    }]
  });

  assert.ok(quote.id, 'Quote must have an ID');
  assert.ok(quote.total > 0, 'Quote total must be positive');
  assert.equal(
    quote.total,
    quote.subtotal + (quote.totalFees || 0) - (quote.totalDiscount || 0),
    'Quote total must strictly equal subtotal + fees - discount'
  );

  // Step C: Action creation requires user confirmation
  const idempotencyKey = `sim_e2e_${Date.now()}`;

  // Step D: Confirmed Action Dispatch
  const action = await adapter.createAction({
    idempotencyKey,
    providerSlug: 'sandbox-provider',
    quoteId: quote.id,
    customer: { name: 'Simulator Customer', phone: '+998901234567' },
    items: [{ offeringId: testOffering.id, quantity: 2 }],
    userConfirmed: true
  });

  assert.ok(action.id, 'Action must have an ID');
  assert.equal(action.status, ActionStatus.AWAITING_PAYMENT);
  assert.ok(action.nextAction?.url, 'Action in AWAITING_PAYMENT must have checkout URL');

  // Step E: Duplicate Idempotency Replay
  const dupAction = await adapter.createAction({
    idempotencyKey,
    providerSlug: 'sandbox-provider',
    quoteId: quote.id,
    customer: { name: 'Simulator Customer', phone: '+998901234567' },
    items: [{ offeringId: testOffering.id, quantity: 2 }],
    userConfirmed: true
  });
  assert.equal(dupAction.id, action.id, 'Duplicate idempotency must return identical action');

  // Step F: Webhook Event Processing with Valid HMAC
  const webhookSecret = 'zy_test_webhook_secret_456';
  const webhookPayload = JSON.stringify({
    eventId: `evt_${Date.now()}`,
    eventType: 'action.status_updated',
    providerSlug: 'sandbox-provider',
    actionId: action.id,
    status: ActionStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID,
    timestamp: new Date().toISOString()
  });

  const validSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(webhookPayload)
    .digest('hex');

  const isValidWebhook = await adapter.verifyWebhook(
    { 'x-signature': validSignature, 'x-provider': 'sandbox-provider' },
    webhookPayload,
    webhookSecret
  );
  assert.equal(isValidWebhook, true, 'Valid HMAC signature must be accepted');

  // Step G: Forged / Invalid Webhook Signature Must Be Rejected
  const isForgedWebhook = await adapter.verifyWebhook(
    { 'x-signature': 'forged_invalid_signature_hex', 'x-provider': 'sandbox-provider' },
    webhookPayload,
    webhookSecret
  );
  assert.equal(isForgedWebhook, false, 'Forged HMAC signature must be rejected');

  // Step H: Action Status Query
  const statusCheck = await adapter.getAction({
    providerSlug: 'sandbox-provider',
    actionId: action.id
  });
  assert.ok(statusCheck.status, 'Status check must return action status');

  // Step I: Action Cancellation Lifecycle
  const cancelRes = await adapter.cancelAction({
    providerSlug: 'sandbox-provider',
    actionId: action.id,
    reason: 'Customer requested cancellation'
  });
  assert.equal(cancelRes.success, true, 'Cancellation must succeed');

  console.log('✅ Local Sandbox Simulator & Certification E2E Tests Passed!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
