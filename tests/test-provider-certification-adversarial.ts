import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { ActionStatus } from '../packages/contracts/src/action';
import {
  ProviderCapability,
  ProviderStatus,
  ProviderType,
  type ProviderAdapter
} from '../packages/contracts/src/provider';
import { ProviderCertificationRunner } from '../packages/provider-sdk/src/certification';

const providerSlug = 'adversarial-cert-provider';
const capabilities = [
  ProviderCapability.METADATA,
  ProviderCapability.HEALTH,
  ProviderCapability.CATALOG,
  ProviderCapability.QUOTE,
  ProviderCapability.ACTION_CREATE,
  ProviderCapability.ACTION_STATUS,
  ProviderCapability.WEBHOOK
];

const offering = {
  id: 'cert-coffee',
  providerId: providerSlug,
  offeringCode: 'cert-coffee',
  title: 'Certification Coffee',
  basePrice: 10_000,
  currency: 'UZS',
  isAvailable: true,
  optionGroups: [{
    id: 'extras',
    name: 'Extras',
    minSelections: 0,
    maxSelections: 1,
    isRequired: false,
    options: [{
      id: 'vanilla',
      name: 'Vanilla syrup',
      priceDelta: 1_000,
      isAvailable: true
    }]
  }]
};

function codedError(code: string): Error & { code: string; statusCode: number } {
  const error = new Error(code) as Error & { code: string; statusCode: number };
  error.code = code;
  error.statusCode = code === 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD' ? 409 : 400;
  return error;
}

function createAdapter(rejectMalformedInput = true): ProviderAdapter {
  const actions = new Map<string, { fingerprint: string; action: any }>();
  let quoteSequence = 0;

  return {
    providerSlug,
    getCapabilities: () => capabilities,
    hasCapability: capability => capabilities.includes(capability),
    getProviderInfo: async () => ({
      id: providerSlug,
      slug: providerSlug,
      name: 'Adversarial Certification Provider',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      category: 'test',
      geography: ['UZ'],
      adapterType: 'mock',
      authMethod: 'API_KEY',
      capabilities,
      isCertified: false,
      isPublished: false,
      metadata: {}
    }) as any,
    checkHealth: async () => ({
      status: 'HEALTHY',
      latencyMs: 1,
      timestamp: new Date().toISOString()
    }),
    getCatalog: async () => ({
      providerSlug,
      categories: [],
      offerings: [offering]
    }) as any,
    getOffering: async () => offering as any,
    requestQuote: async (input: any) => {
      const item = input.items?.[0];
      const selectedOptions = item?.selectedOptions || [];
      const selectedOption = selectedOptions.find((option: any) => option.groupId === 'extras');
      const hasInvalidSelection =
        item?.offeringId !== offering.id ||
        (item?.variantId !== undefined && item.variantId !== null) ||
        (selectedOption && selectedOption.optionId !== 'vanilla');

      if (rejectMalformedInput && item?.quantity <= 0) throw codedError('INVALID_QUANTITY');
      if (rejectMalformedInput && hasInvalidSelection) {
        throw codedError(selectedOption ? 'INVALID_OPTION' : 'OFFERING_NOT_FOUND');
      }

      const itemQuantity = Number(item?.quantity || 1);
      const optionQuantity = selectedOption ? Number(selectedOption.quantity || 1) : 0;
      const optionsTotal = selectedOption
        ? rejectMalformedInput
          ? 1_000 * optionQuantity * itemQuantity
          : 1_000 * optionQuantity
        : 0;
      const lineTotal = 10_000 * itemQuantity + optionsTotal;

      return {
        id: `quote-${++quoteSequence}`,
        providerSlug,
        lines: [{
          offeringId: offering.id,
          offeringTitle: offering.title,
          quantity: itemQuantity,
          unitPrice: 10_000,
          optionsTotal,
          lineTotal,
          selectedOptions
        }],
        subtotal: lineTotal,
        totalFees: 0,
        totalDiscount: 0,
        total: lineTotal,
        currency: 'UZS',
        expiresAt: new Date(Date.now() + 60_000).toISOString()
      } as any;
    },
    createAction: async (input: any) => {
      const key = input.idempotencyKey;
      const fingerprint = JSON.stringify({
        providerSlug: input.providerSlug,
        quoteId: input.quoteId,
        locationId: input.locationId,
        items: input.items,
        customer: input.customer,
        destination: input.destination,
        fulfillmentType: input.fulfillmentType,
        paymentMethod: input.paymentMethod,
        parameters: input.parameters
      });
      const existing = actions.get(key);
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          throw codedError('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD');
        }
        return existing.action;
      }

      const action = {
        id: `action-${actions.size + 1}`,
        externalActionId: `external-${actions.size + 1}`,
        status: ActionStatus.CREATED
      };
      actions.set(key, { fingerprint, action });
      return action as any;
    },
    getAction: async () => Array.from(actions.values())[0]?.action as any,
    verifyWebhook: async (headers, rawBody, secret) => {
      const signature = String(headers['x-signature'] || '');
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      return signature === expected;
    },
    parseWebhookEvent: async () => ({
      eventId: 'evt-cert',
      eventType: 'action.status_updated',
      providerSlug,
      actionId: 'action-1',
      timestamp: new Date().toISOString(),
      description: 'Certification webhook'
    }) as any
  };
}

console.log('Testing opt-in adversarial provider certification…');

const standardReport = await new ProviderCertificationRunner(createAdapter()).runAllTests();
assert.equal(standardReport.mode, 'STANDARD');
assert.equal(standardReport.isCertified, true);
assert.equal(
  standardReport.tests.some(test => test.testId.startsWith('adversarial-')),
  false,
  'Standard certification must preserve the existing test set.'
);

const adversarialReport = await new ProviderCertificationRunner(createAdapter()).runAllTests({ mode: 'ADVERSARIAL' });
assert.equal(adversarialReport.mode, 'ADVERSARIAL');
assert.equal(adversarialReport.isCertified, true);
for (const testId of [
  'adversarial-invalid-selection',
  'adversarial-zero-quantity',
  'adversarial-option-quantity-math',
  'adversarial-idempotency-payload-collision'
]) {
  assert.equal(adversarialReport.tests.find(test => test.testId === testId)?.status, 'PASS', `${testId} must pass for a safe adapter.`);
}

const unsafeReport = await new ProviderCertificationRunner(createAdapter(false)).runAllTests({ mode: 'ADVERSARIAL' });
assert.equal(unsafeReport.isCertified, false);
assert.equal(
  unsafeReport.tests.find(test => test.testId === 'adversarial-invalid-selection')?.status,
  'FAIL',
  'Adversarial mode must fail a provider that accepts an invalid selection.'
);

console.log('Provider adversarial certification tests passed.');
