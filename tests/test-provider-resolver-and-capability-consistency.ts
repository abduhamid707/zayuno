import assert from 'node:assert/strict';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service.ts';
import { CatalogService } from '../apps/api/src/modules/catalog/catalog.service.ts';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import { ProviderRegistryService } from '../apps/api/src/modules/providers/provider-registry.service.ts';
import {
  ProviderCapability,
  ProviderCategory,
  ProviderEnvironment,
  ProviderFulfillmentMode,
  ProviderStatus,
  ProviderType
} from '../packages/contracts/src/provider.ts';
import { AvailabilityStatus } from '../packages/contracts/src/catalog.ts';
import {
  NotFoundError,
  normalizeZayunoErrorCode,
  getAgentErrorPresentation
} from '../packages/shared/src/errors.ts';
import { CapabilityNotSupportedError, ProviderError } from '../packages/provider-sdk/src/errors.ts';
import { RemoteHttpProviderAdapter } from '../packages/provider-sdk/src/remote-http-adapter.ts';
import { prisma } from '../packages/database/src/client.ts';

async function runConsistencySuite() {
  console.log('================================================================');
  console.log('🛡️ ZAYUNO PROVIDER RESOLVER, CAPABILITY & ERROR CONSISTENCY SUITE');
  console.log('================================================================\n');

  // --- Fixtures ---
  const liveRecruitment = {
    id: 'prov-hh-id',
    slug: 'hh-uz',
    name: 'HeadHunter Uzbekistan',
    status: ProviderStatus.ACTIVE,
    type: ProviderType.SERVICES,
    environment: ProviderEnvironment.LIVE,
    category: ProviderCategory.SERVICES,
    subcategory: 'recruitment',
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS
    ],
    metadata: {
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      environment: ProviderEnvironment.LIVE
    },
    locations: []
  };

  const sandboxCoffee = {
    id: 'prov-sb-coffee-id',
    slug: 'coffee-time-sandbox',
    name: 'Coffee Time Sandbox',
    status: ProviderStatus.SANDBOX,
    type: ProviderType.RETAIL,
    environment: ProviderEnvironment.SANDBOX,
    category: ProviderCategory.FOOD_AND_DRINK,
    subcategory: 'coffee_shop',
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.LOCATIONS,
      ProviderCapability.CATALOG,
      ProviderCapability.SEARCH,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.ACTION_CANCEL
    ],
    metadata: {
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true,
      fulfillmentMode: ProviderFulfillmentMode.ONSITE,
      environment: ProviderEnvironment.SANDBOX
    },
    locations: [
      { id: 'loc-sb-1', providerLocationId: 'branch-central', name: 'Central Branch', isActive: true }
    ]
  };

  const liveTicketNoSearch = {
    id: 'prov-ticket-id',
    slug: 'iticket-live',
    name: 'iTicket Live',
    status: ProviderStatus.ACTIVE,
    type: ProviderType.SERVICES,
    environment: ProviderEnvironment.LIVE,
    category: ProviderCategory.TICKETING,
    subcategory: 'events',
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      // NOTE: SEARCH and AVAILABILITY are intentionally OMITTED
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.ACTION_CANCEL
    ],
    metadata: {
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true,
      fulfillmentMode: ProviderFulfillmentMode.REMOTE,
      environment: ProviderEnvironment.LIVE
    },
    locations: []
  };

  const allProviders = [liveRecruitment, sandboxCoffee, liveTicketNoSearch];

  // Mock DB Prisma provider lookups
  (prisma.provider as any).findUnique = async ({ where }: any) => {
    return allProviders.find(p => p.slug === where.slug) || null;
  };
  (prisma.provider as any).findMany = async ({ where }: any) => {
    return allProviders.filter(p => {
      if (where.environment && p.environment !== where.environment) return false;
      if (where.status && p.status !== where.status) return false;
      return true;
    });
  };
  (prisma.location as any).findFirst = async ({ where }: any) => {
    const prov = allProviders.find(p => p.id === where.providerId || (where.provider?.slug && p.slug === where.provider.slug));
    return prov?.locations.find(l => l.id === where.id || l.providerLocationId === where.providerLocationId) || null;
  };

  // Mock Registry
  const mockRegistry = {
    assertAndGetCapability: async (providerSlug: string, capability: ProviderCapability) => {
      const prov = allProviders.find(p => p.slug === providerSlug);
      if (!prov) throw new NotFoundError('Provider', providerSlug);
      if (!prov.capabilities.includes(capability)) {
        throw new CapabilityNotSupportedError(providerSlug, capability);
      }
      return {
        hasCapability: (cap: ProviderCapability) => prov.capabilities.includes(cap),
        getCatalog: async () => ({
          providerSlug,
          categories: [{ id: 'cat-1', name: 'Standard' }],
          offerings: [{ id: 'item-1', name: 'Item 1', variants: [] }]
        }),
        getOffering: async ({ offeringId }: any) => ({
          id: offeringId,
          name: 'Item 1',
          variants: []
        }),
        searchOfferings: prov.capabilities.includes(ProviderCapability.SEARCH)
          ? async () => [{ id: 'item-1', name: 'Item 1', variants: [] }]
          : undefined,
        requestQuote: async () => ({
          quoteId: 'quote-123',
          providerSlug,
          lines: [],
          total: { amount: 10000, currency: 'UZS' },
          expiresAt: new Date(Date.now() + 60000).toISOString()
        }),
        createAction: async () => ({
          id: 'act-123',
          publicId: 'ZY-TEST-001',
          status: 'PENDING'
        }),
        cancelAction: async () => ({
          success: true,
          previousStatus: 'PENDING',
          newStatus: 'CANCELLED',
          refundInitiated: false
        })
      };
    },
    getAdapter: async (slug: string) => {
      return (mockRegistry as any).assertAndGetCapability(slug, ProviderCapability.METADATA);
    }
  };

  // Construct Services
  const providersService = new ProvidersService(mockRegistry as any);
  (providersService as any).prisma = prisma;
  (global as any).prisma = prisma;

  const mockRedis = {
    get: async () => null,
    set: async () => {},
    del: async () => {},
    acquireLock: async () => true,
    releaseLock: async () => true,
    delByPattern: async () => 0
  };

  const catalogService = new CatalogService(mockRegistry as any, providersService, mockRedis as any);
  const quotesService = new QuotesService(mockRegistry as any, providersService);
  const actionsService = new ActionsService(
    mockRegistry as any,
    { publish: async () => {} } as any,
    mockRedis as any,
    providersService
  );

  // -------------------------------------------------------------------------
  // TEST 1: Single Provider Resolver & Environment Context Enforcement
  // -------------------------------------------------------------------------
  console.log('👉 [Test 1] Canonical Provider Resolver: Environment Context Enforcement...');
  {
    // 1a. Sandbox provider resolved without explicit environment (defaults to LIVE) -> throws ENVIRONMENT_NOT_ALLOWED
    let caughtLiveDefault = false;
    try {
      await providersService.resolveCanonicalProvider('coffee-time-sandbox');
    } catch (err: any) {
      caughtLiveDefault = true;
      assert.equal(err.code, 'ENVIRONMENT_NOT_ALLOWED');
    }
    assert.ok(caughtLiveDefault, 'Expected ENVIRONMENT_NOT_ALLOWED when accessing sandbox provider from default LIVE context');

    // 1b. Sandbox provider resolved with explicit environment="SANDBOX" -> succeeds
    const sbExplicit = await providersService.resolveCanonicalProvider('coffee-time-sandbox', 'SANDBOX');
    assert.equal(sbExplicit.slug, 'coffee-time-sandbox');
    assert.equal(sbExplicit.environment, ProviderEnvironment.SANDBOX);
    assert.equal(sbExplicit.status, ProviderStatus.SANDBOX);

    // 1c. Sandbox provider requested with explicit environment="LIVE" -> throws ENVIRONMENT_NOT_ALLOWED
    let caughtLiveFilter = false;
    try {
      await providersService.resolveCanonicalProvider('coffee-time-sandbox', 'LIVE');
    } catch (err: any) {
      caughtLiveFilter = true;
      assert.equal(err.code, 'ENVIRONMENT_NOT_ALLOWED');
    }
    assert.ok(caughtLiveFilter, 'Expected ENVIRONMENT_NOT_ALLOWED when requesting sandbox provider with environment=LIVE');

    // 1d. Live provider resolved without explicit environment (defaults to LIVE) -> succeeds
    const live = await providersService.resolveCanonicalProvider('hh-uz');
    assert.equal(live.slug, 'hh-uz');
    assert.equal(live.environment, ProviderEnvironment.LIVE);

    // 1e. Live provider requested with environment="SANDBOX" -> throws ENVIRONMENT_NOT_ALLOWED
    let caughtSbFilter = false;
    try {
      await providersService.resolveCanonicalProvider('hh-uz', 'SANDBOX');
    } catch (err: any) {
      caughtSbFilter = true;
      assert.equal(err.code, 'ENVIRONMENT_NOT_ALLOWED');
    }
    assert.ok(caughtSbFilter, 'Expected ENVIRONMENT_NOT_ALLOWED when requesting live provider with environment=SANDBOX');

    console.log('   ✅ Single canonical provider resolution successfully enforces environment boundaries.');
  }

  // -------------------------------------------------------------------------
  // TEST 2: Capability Manifest & Execution 1:1 Parity (No Silent Fallback)
  // -------------------------------------------------------------------------
  console.log('👉 [Test 2] Capability Manifest 1:1 Parity: No Silent Fallback for SEARCH...');
  {
    // 2a. Provider WITHOUT SEARCH capability (iticket-live) called with searchOfferings
    let caughtSearchCap = false;
    try {
      await catalogService.searchOfferings('iticket-live', 'concert');
    } catch (err: any) {
      caughtSearchCap = true;
      assert.equal(err.code, 'CAPABILITY_NOT_SUPPORTED');
      assert.equal(err.details?.capability, ProviderCapability.SEARCH);
    }
    assert.ok(caughtSearchCap, 'Expected CAPABILITY_NOT_SUPPORTED when provider lacks SEARCH; zero silent fallback allowed');

    // 2b. Provider WITH SEARCH capability (coffee-time-sandbox) called with searchOfferings in SANDBOX environment
    const results = await catalogService.searchOfferings('coffee-time-sandbox', 'latte', undefined, undefined, 20, undefined, 'SANDBOX');
    assert.ok(Array.isArray(results), 'Expected search results array for provider with SEARCH capability');

    console.log('   ✅ Strict capability parity verified: undeclared capabilities rejected without fallback.');
  }

  // -------------------------------------------------------------------------
  // TEST 3: Deterministic Order of Validation Invariant
  // Provider Not Found -> Capability Not Supported -> Location Not Found -> Execution
  // -------------------------------------------------------------------------
  console.log('👉 [Test 3] Deterministic Validation Order Invariant Across All Tools...');
  {
    // 3a. Step 1: Provider does not exist -> PROVIDER_NOT_FOUND (even with invalid capability & invalid location)
    try {
      await catalogService.getCatalog('non-existent-provider', 'fake-loc');
      assert.fail('Expected error');
    } catch (err: any) {
      assert.equal(err.code, 'PROVIDER_NOT_FOUND', 'Provider check must fail first');
    }

    try {
      await catalogService.searchOfferings('non-existent-provider', 'query', undefined, 'fake-loc');
      assert.fail('Expected error');
    } catch (err: any) {
      assert.equal(err.code, 'PROVIDER_NOT_FOUND', 'Provider check must fail first for search');
    }

    try {
      await quotesService.requestQuote({
        providerSlug: 'non-existent-provider',
        items: [{ offeringId: 'item-1', quantity: 1 }],
        locationId: 'fake-loc'
      });
      assert.fail('Expected error');
    } catch (err: any) {
      assert.equal(err.code, 'PROVIDER_NOT_FOUND', 'Provider check must fail first for quotes');
    }

    // 3b. Step 2: Provider exists, but lacks capability -> CAPABILITY_NOT_SUPPORTED (even with invalid location)
    try {
      // iticket-live does not have SEARCH capability
      await catalogService.searchOfferings('iticket-live', 'concert', undefined, 'fake-loc-1234');
      assert.fail('Expected error');
    } catch (err: any) {
      assert.equal(err.code, 'CAPABILITY_NOT_SUPPORTED', 'Capability check must precede location validation');
    }

    // 3c. Step 3: Provider exists and has capability, but locationId is invalid -> LOCATION_NOT_FOUND
    try {
      // coffee-time-sandbox has CATALOG capability in SANDBOX environment, but 'fake-loc-invalid' does not exist
      await catalogService.getCatalog('coffee-time-sandbox', 'fake-loc-invalid', undefined, undefined, 'SANDBOX');
      assert.fail('Expected error');
    } catch (err: any) {
      assert.equal(err.code, 'LOCATION_NOT_FOUND', 'Location check must fail after capability check passes');
    }

    try {
      // coffee-time-sandbox has SEARCH capability in SANDBOX environment, but 'fake-loc-invalid' does not exist
      await catalogService.searchOfferings('coffee-time-sandbox', 'latte', undefined, 'fake-loc-invalid', 20, undefined, 'SANDBOX');
      assert.fail('Expected error');
    } catch (err: any) {
      assert.equal(err.code, 'LOCATION_NOT_FOUND', 'Location check must fail for search after capability passes');
    }

    try {
      // coffee-time-sandbox has QUOTE capability in SANDBOX environment, but 'fake-loc-invalid' does not exist
      await quotesService.requestQuote({
        providerSlug: 'coffee-time-sandbox',
        items: [{ offeringId: 'item-1', quantity: 1 }],
        locationId: 'fake-loc-invalid',
        environment: 'SANDBOX'
      });
      assert.fail('Expected error');
    } catch (err: any) {
      assert.equal(err.code, 'LOCATION_NOT_FOUND', 'Location check must fail for quote after capability passes');
    }

    console.log('   ✅ Deterministic validation order invariant (Provider -> Capability -> Location -> Run) strictly confirmed.');
  }

  // -------------------------------------------------------------------------
  // TEST 4: Availability Semantics & Heuristic Bug Fix
  // -------------------------------------------------------------------------
  console.log('👉 [Test 4] Availability Semantics & Heuristic Bug Protection...');
  {
    // 4a. checkAvailability on provider without AVAILABILITY capability returns canonical NOT_SUPPORTED
    const availResult = await catalogService.checkAvailability({
      providerSlug: 'iticket-live',
      items: [{ offeringId: 'item-1', quantity: 2 }]
    });
    assert.equal(availResult.availabilityStatus, AvailabilityStatus.NOT_SUPPORTED);
    assert.equal(availResult.isAvailable, null);

    // 4b. Verify that upstream messages containing 'mock provider' and 'not found' do NOT become PROVIDER_NOT_FOUND!
    const mockUpstreamMsg = 'Endpoint POST /availability not found on iTicket mock provider.';
    const normalizedCode = normalizeZayunoErrorCode(undefined, 404, mockUpstreamMsg);
    assert.notEqual(normalizedCode, 'PROVIDER_NOT_FOUND', 'Mock provider 404 must NOT be classified as PROVIDER_NOT_FOUND');
    assert.equal(normalizedCode, 'RESOURCE_NOT_FOUND');

    // 4c. Verify genuine provider not found message DOES normalize to PROVIDER_NOT_FOUND
    const genuineProvNotFound = 'Provider with slug "unknown-provider" not found';
    const genuineCode = normalizeZayunoErrorCode('PROVIDER_NOT_FOUND', 404, genuineProvNotFound);
    assert.equal(genuineCode, 'PROVIDER_NOT_FOUND');

    // 4d. Verify RemoteHttpAdapter maps /availability 404 to CAPABILITY_NOT_SUPPORTED
    const adapter = new RemoteHttpProviderAdapter({
      providerSlug: 'iticket-mock',
      baseUrl: 'http://localhost:3005',
      authMethod: 'API_KEY',
      apiKey: 'test-key'
    });

    const remoteFailureMethod = (adapter as any).remoteFailure.bind(adapter);
    const mappedErr = remoteFailureMethod('/availability', 404, { message: mockUpstreamMsg });
    assert.equal(mappedErr.code, 'CAPABILITY_NOT_SUPPORTED');
    assert.notEqual(mappedErr.code, 'PROVIDER_NOT_FOUND');

    console.log('   ✅ Availability truthfulness verified: zero false PROVIDER_NOT_FOUND errors.');
  }

  // -------------------------------------------------------------------------
  // TEST 5: Error Normalization (Extreme Requests & Capacity Exhaustion)
  // -------------------------------------------------------------------------
  console.log('👉 [Test 5] Error Normalization for Extreme Requests & Inventory Limits...');
  {
    // 5a. 999,999 tickets request exceeded capacity
    const capacityExceededMsg = 'Requested 999999 tickets exceeds maximum allowed quantity of 10.';
    const capacityCode = normalizeZayunoErrorCode(undefined, 422, capacityExceededMsg);
    assert.equal(capacityCode, 'CAPACITY_EXCEEDED');

    const capacityPresentation = getAgentErrorPresentation({
      errorCode: capacityCode,
      statusCode: 422,
      message: capacityExceededMsg
    });
    assert.equal(capacityPresentation.errorCode, 'CAPACITY_EXCEEDED');
    assert.equal(capacityPresentation.retryable, false);
    assert.equal(capacityPresentation.recommendedAction, 'REFINE_SELECTION');
    assert.ok(capacityPresentation.customerMessage.toLowerCase().includes('miqdor'), 'Expected Uzbek customer explanation');

    // 5b. Sold out / Insufficient inventory
    const soldOutMsg = 'All seats in sector A are sold out';
    const soldOutCode = normalizeZayunoErrorCode(undefined, 409, soldOutMsg);
    assert.equal(soldOutCode, 'RESOURCE_UNAVAILABLE');

    const soldOutPresentation = getAgentErrorPresentation({
      errorCode: soldOutCode,
      statusCode: 409,
      message: soldOutMsg
    });
    assert.equal(soldOutPresentation.errorCode, 'RESOURCE_UNAVAILABLE');
    assert.equal(soldOutPresentation.retryable, false);
    assert.equal(soldOutPresentation.recommendedAction, 'REFINE_SELECTION');

    // 5c. RemoteHttpAdapter capacity error normalization
    const adapter = new RemoteHttpProviderAdapter({
      providerSlug: 'iticket-mock',
      baseUrl: 'http://localhost:3005',
      authMethod: 'API_KEY',
      apiKey: 'test-key'
    });
    const remoteFailure = (adapter as any).remoteFailure.bind(adapter);
    const upstreamCapacityErr = remoteFailure('/quote', 400, {
      message: 'Too many tickets requested: 999999'
    });
    assert.equal(upstreamCapacityErr.code, 'CAPACITY_EXCEEDED');
    assert.equal(upstreamCapacityErr.statusCode, 422);
    assert.equal(upstreamCapacityErr.details?.retryable, false);

    console.log('   ✅ Extreme request errors normalized to canonical 422/409 codes with non-retryable guidance.');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL TESTS PASSED! PLATFORM CONSISTENCY & ERRORS 100% VERIFIED');
  console.log('================================================================');
}

runConsistencySuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
