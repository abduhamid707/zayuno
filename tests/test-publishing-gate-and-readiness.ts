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

  // Status not ACTIVE
  for (const invalidStatus of [
    ProviderStatus.DRAFT,
    ProviderStatus.SANDBOX,
    ProviderStatus.SUSPENDED,
    ProviderStatus.DISABLED
  ]) {
    const p = { ...baseProvider, status: invalidStatus };
    assert.equal(isProviderPublished(p), false, `Provider with status ${invalidStatus} must not be published`);
  }

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

  // isCertified !== true
  assert.equal(
    isProviderPublished({ ...baseProvider, metadata: { ...baseProvider.metadata, isCertified: false } }),
    false,
    'Uncertified provider must not be published'
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
  assert.ok(unhealthyResult.unreadyReasons.includes('PROVIDER_UNHEALTHY_OR_UNAVAILABLE'));

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
  try {
    // Mock unapproved provider in DB
    (prisma.provider as any).findUnique = async () => ({
      ...baseProvider,
      metadata: { reviewStatus: 'PENDING_APPROVAL', isCertified: false, isPublished: false }
    });

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
      /Provider is not published for public quotes/i,
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
      /Provider is not published for public actions/i,
      'ActionsService must reject unapproved/uncertified provider'
    );
  } finally {
    prisma.provider.findUnique = originalFindUnique;
  }

  console.log('✅ Quote & Action Gate checks passed.');
  console.log('\n🎉 ALL PUBLISHING GATE, DISCOVERY READINESS, AND SUPPORT TESTS PASSED!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
