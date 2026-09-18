import assert from 'node:assert/strict';
import {
  isProviderPublished,
  isProviderDiscoveryReady
} from '../packages/shared/src/publishing.ts';
import {
  normalizeSupportContact,
  sanitizePublicSupportContact
} from '../packages/shared/src/support-contact.ts';

import {
  ProviderStatus,
  ProviderType,
  ProviderFulfillmentMode,
  ProviderCapability
} from '../packages/contracts/src/provider.ts';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service.ts';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import { prisma } from '../packages/database/src/client.ts';


async function main() {
  console.log('🧪 Testing Canonical Provider Publishing Gate Matrix...');

  const baseProvider = {
    id: 'prov_test_01',
    slug: 'test-provider',
    name: 'Test Provider',
    status: ProviderStatus.ACTIVE,
    type: ProviderType.DELIVERY,
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.WEBHOOK
    ],
    locations: [{ id: 'loc_01', isActive: true }],
    metadata: {
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true,
      catalogSummary: { totalCount: 5, availableCount: 5 },
      activeLocationsCount: 1
    }
  };

  // 1. Publishing Gate Tests
  // Canonical valid
  assert.equal(isProviderPublished(baseProvider), true, 'Canonical approved & certified active provider must be published');

  // Status not ACTIVE (except an explicitly test-only sandbox status)
  for (const invalidStatus of [
    ProviderStatus.DRAFT,
    ProviderStatus.SUSPENDED,
    ProviderStatus.DISABLED
  ]) {
    const p = { ...baseProvider, status: invalidStatus };
    assert.equal(isProviderPublished(p), false, `Provider with status ${invalidStatus} must not be published`);
  }

  assert.equal(
    isProviderPublished({ ...baseProvider, status: ProviderStatus.SANDBOX }),
    true,
    'SANDBOX status remains available for explicit test workflows'
  );

  // Review status not APPROVED
  for (const invalidReview of [
    'DRAFT',
    'PENDING_APPROVAL',
    'CHANGES_REQUESTED',
    'REJECTED',
    'SUSPENDED'
  ]) {
    const p = { ...baseProvider, metadata: { ...baseProvider.metadata, reviewStatus: invalidReview } };
    assert.equal(isProviderPublished(p), false, `Provider with reviewStatus ${invalidReview} must not be published`);
  }

  // Legacy certification is governed by eligibility, not the publication gate.
  assert.equal(
    isProviderPublished({ ...baseProvider, metadata: { ...baseProvider.metadata, isCertified: false } }),
    true,
    'Legacy certification does not revoke the read-only publication path'
  );

  // isPublished !== true
  assert.equal(
    isProviderPublished({ ...baseProvider, metadata: { ...baseProvider.metadata, isPublished: false } }),
    false,
    'Provider with isPublished=false must not be published'
  );

  console.log('✅ Publishing Gate Matrix tests passed.');

  // 2. Capability-Aware Smart Discovery Filtering Tests
  console.log('🧪 Testing Capability-Aware Smart Discovery Filtering...');

  // A. Canonical published & ready provider
  const readyResult = isProviderDiscoveryReady(baseProvider);
  assert.equal(readyResult.isReady, true, 'Canonical ready provider must pass discovery check');

  // B. Empty or Unavailable Catalog
  const emptyCatalogProvider = {
    ...baseProvider,
    metadata: {
      ...baseProvider.metadata,
      emptyCatalog: true,
      catalogSummary: { totalCount: 0, availableCount: 0 }
    }
  };
  const emptyCatalogResult = isProviderDiscoveryReady(emptyCatalogProvider);
  assert.equal(emptyCatalogResult.isReady, false, 'Provider with empty catalog must be hidden from AI discovery');
  assert.ok(emptyCatalogResult.unreadyReasons.includes('CATALOG_EMPTY'));

  // C. Physical Provider (DELIVERY) without active locations
  const physicalNoLocProvider = {
    ...baseProvider,
    locations: [],
    metadata: {
      ...baseProvider.metadata,
      activeLocationsCount: 0
    }
  };
  const physicalNoLocResult = isProviderDiscoveryReady(physicalNoLocProvider);
  assert.equal(physicalNoLocResult.isReady, false, 'Physical delivery provider without active locations must be hidden');
  assert.ok(physicalNoLocResult.unreadyReasons.includes('NO_ACTIVE_LOCATIONS'));

  // D. Digital / Remote Provider (DIGITAL) without locations -> MUST BE READY!
  const digitalProvider = {
    ...baseProvider,
    type: ProviderType.DIGITAL,
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE
    ],
    locations: [],
    metadata: {
      ...baseProvider.metadata,
      activeLocationsCount: 0
    }
  };
  const digitalResult = isProviderDiscoveryReady(digitalProvider);
  assert.equal(digitalResult.isReady, true, 'Digital/remote provider without locations must be ready for discovery');

  const remoteBookingProvider = {
    ...baseProvider,
    type: ProviderType.BOOKINGS,
    locations: [],
    metadata: {
      ...baseProvider.metadata,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      activeLocationsCount: 0
    }
  };
  const remoteBookingResult = isProviderDiscoveryReady(remoteBookingProvider);
  assert.equal(remoteBookingResult.isReady, true, 'Remote booking provider must not require a physical branch');

  // E. Unhealthy Provider (DOWN)
  const unhealthyProvider = {
    ...baseProvider,
    metadata: {
      ...baseProvider.metadata,
      healthStatus: 'DOWN'
    }
  };
  const unhealthyResult = isProviderDiscoveryReady(unhealthyProvider);
  assert.equal(unhealthyResult.isReady, false, 'Unhealthy DOWN provider must be hidden from AI discovery');
  assert.ok(unhealthyResult.unreadyReasons.includes('HEALTH_DOWN'));

  console.log('✅ Smart Discovery Filtering tests passed.');

  // 3. Structured Support Contract Tests
  console.log('🧪 Testing Structured Support Contract & Legacy Migration...');

  // A. Legacy phone string
  const phoneNormalized = normalizeSupportContact('+998901234567');
  assert.deepEqual(phoneNormalized, { phone: '+998901234567' });

  // B. Telegram handle string
  const tgNormalized = normalizeSupportContact('@evos_support');
  assert.equal(tgNormalized?.telegram, '@evos_support');
  assert.equal(tgNormalized?.supportUrl, 'https://t.me/evos_support');

  // C. Email string
  const emailNormalized = normalizeSupportContact('support@evos.uz');
  assert.deepEqual(emailNormalized, { email: 'support@evos.uz' });

  // D. Full structured object
  const fullSupport = {
    phone: '+998712000000',
    telegram: '@evos_help',
    email: 'help@evos.uz',
    workingHours: '08:00 - 23:00',
    supportUrl: 'https://evos.uz/support',
    locale: 'uz',
    internalEscalationSecret: 'DO_NOT_LEAK_123',
    internalNotes: 'VIP priority partner'
  };
  const structuredNormalized = normalizeSupportContact(fullSupport);
  assert.equal(structuredNormalized?.phone, '+998712000000');
  assert.equal(structuredNormalized?.telegram, '@evos_help');
  assert.equal(structuredNormalized?.email, 'help@evos.uz');
  assert.equal(structuredNormalized?.workingHours, '08:00 - 23:00');
  assert.equal((structuredNormalized as any).internalEscalationSecret, undefined, 'Internal secrets must be stripped');

  // E. Sanitization for public response
  const sanitized = sanitizePublicSupportContact(structuredNormalized);
  assert.equal(sanitized?.phone, '+998712000000');
  assert.equal((sanitized as any).internalNotes, undefined);

  console.log('✅ Structured Support Contract tests passed.');

  // 4. Quote and Action Service Gate Checks
  console.log('🧪 Testing Quote & Action Guardrails against Uncertified/Unapproved Providers...');

  const originalFindUnique = prisma.provider.findUnique;
  const originalFindUniqueAction = prisma.action.findUnique;
  const originalFindFirstAction = prisma.action.findFirst;
  try {
    // Mock unapproved provider in DB
    (prisma.provider as any).findUnique = async () => ({
      ...baseProvider,
      metadata: { reviewStatus: 'PENDING_APPROVAL', isCertified: false, isPublished: false }
    });
    // createAction checks idempotency before resolving the provider. Keep this
    // guardrail unit test independent of the test runner's database setup.
    (prisma.action as any).findUnique = async () => null;
    (prisma.action as any).findFirst = async () => null;

    const mockRedis = {
      acquireLock: async () => true,
      releaseLock: async () => {},
      get: async () => null,
      set: async () => {}
    };

    const quotesService = new QuotesService({} as any);
    await assert.rejects(
      () =>
        quotesService.requestQuote({
          providerSlug: 'test-provider',
          items: [{ offeringId: 'item_1', quantity: 1 }]
        }),
      (error: any) => error?.code === 'PROVIDER_NOT_FOUND',
      'QuotesService must reject unapproved/uncertified provider'
    );

    const actionsService = new ActionsService({} as any, {} as any, mockRedis as any);
    await assert.rejects(
      () =>
        actionsService.createAction({
          idempotencyKey: 'idemp_gate_test',
          providerSlug: 'test-provider',
          quoteId: 'quote_test_01',
          customer: { name: 'Tester', phone: '+998901234567' },
          items: [{ offeringId: 'item_1', quantity: 1 }],
          userConfirmed: true
        }),
      (error: any) => error?.code === 'PROVIDER_NOT_FOUND',
      'ActionsService must reject unapproved/uncertified provider'
    );
  } finally {
    prisma.provider.findUnique = originalFindUnique;
    prisma.action.findUnique = originalFindUniqueAction;
    prisma.action.findFirst = originalFindFirstAction;
  }

  console.log('✅ Quote & Action Gate checks passed.');
  console.log('\n🎉 ALL PUBLISHING GATE, DISCOVERY READINESS, AND SUPPORT TESTS PASSED!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
