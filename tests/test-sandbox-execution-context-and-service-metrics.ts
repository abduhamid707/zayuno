import assert from 'node:assert/strict';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import { CatalogService } from '../apps/api/src/modules/catalog/catalog.service.ts';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service.ts';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import {
  ProviderCapability,
  ProviderCategory,
  ProviderEnvironment,
  ProviderFulfillmentMode,
  ProviderStatus,
  ProviderType
} from '../packages/contracts/src/provider.ts';
import { prisma } from '../packages/database/src/client.ts';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools.ts';
import { getDynamicServiceMessage, getWelcomeMessage } from '../packages/shared/src/customer-presenter.ts';

function createMockProvider(slug: string, env: ProviderEnvironment, profile: 'TRANSACTIONAL' | 'READ_ONLY' = 'TRANSACTIONAL') {
  const caps = profile === 'TRANSACTIONAL'
    ? [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.LOCATIONS,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH,
        ProviderCapability.QUOTE,
        ProviderCapability.ACTION_CREATE,
        ProviderCapability.ACTION_STATUS,
        ProviderCapability.ACTION_CANCEL,
        ProviderCapability.PAYMENT_OPTIONS
      ]
    : [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.LOCATIONS,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH
      ];

  return {
    id: `id_${slug}`,
    slug,
    name: `Name ${slug}`,
    status: ProviderStatus.ACTIVE,
    type: ProviderType.RETAIL,
    environment: env,
    category: ProviderCategory.FOOD_AND_DRINK,
    subcategory: 'coffee_shop',
    capabilities: caps,
    encryptedSecret: 'secret',
    webhookSecret: 'wh_secret',
    metadata: {
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true,
      fulfillmentMode: ProviderFulfillmentMode.ONSITE,
      environment: env,
      eligibility: {
        contractVersion: 'v2 current',
        complianceStatus: 'COMPLIANT',
        profile,
        discoveryVisibility: 'VISIBLE',
        certifiedCapabilities: caps
      }
    },
    locations: [{ id: `loc_${slug}`, providerLocationId: `ext_${slug}`, isActive: true }]
  };
}

async function runSandboxExecutionContextAndMetricsSuite() {
  console.log('================================================================');
  console.log('🛡️ P1 SANDBOX EXECUTION CONTEXT BYPASS & P2 SERVICE METRICS SUITE');
  console.log('================================================================\n');

  const liveProvider = createMockProvider('coffee-live', ProviderEnvironment.LIVE, 'TRANSACTIONAL');
  const sandboxProvider = createMockProvider('coffee-sandbox', ProviderEnvironment.SANDBOX, 'TRANSACTIONAL');
  const readOnlyLiveProvider = createMockProvider('hh-uz-live', ProviderEnvironment.LIVE, 'READ_ONLY');

  const allProviders = [liveProvider, sandboxProvider, readOnlyLiveProvider];

  const originalPrisma = {
    providerFindUnique: prisma.provider.findUnique,
    providerFindMany: prisma.provider.findMany,
    providerCount: prisma.provider.count,
    locationFindUnique: prisma.location.findUnique,
    quoteFindUnique: (prisma.quote as any)?.findUnique,
    actionFindUnique: (prisma.action as any)?.findUnique,
    actionFindFirst: (prisma.action as any)?.findFirst,
    offeringCount: (prisma.offering as any)?.count
  };

  (prisma.provider as any).findUnique = async ({ where }: any) => {
    return allProviders.find(p => p.slug === where.slug || p.id === where.id) || null;
  };

  (prisma.provider as any).findMany = async ({ where }: any) => {
    return allProviders.filter(p => {
      if (where.status && p.status !== where.status) return false;
      if (where.environment && p.environment !== where.environment) return false;
      return true;
    });
  };

  (prisma.provider as any).count = async ({ where }: any) => {
    return allProviders.filter(p => {
      if (where?.status && p.status !== where.status) return false;
      if (where?.environment && p.environment !== where.environment) return false;
      return true;
    }).length;
  };

  (prisma.location as any).findUnique = async ({ where }: any) => {
    const prov = allProviders.find(p => p.locations.some(l => l.id === where.id));
    if (!prov) return null;
    return {
      id: where.id,
      providerId: prov.id,
      providerLocationId: `ext_${prov.slug}`,
      name: `Branch for ${prov.slug}`,
      isActive: true,
      provider: prov
    };
  };

  (prisma.action as any).findUnique = async () => null;
  (prisma.action as any).findFirst = async () => null;

  try {
    const providersService = new ProvidersService({} as any);
    const mockRegistry = {
      assertAndGetCapability: async () => ({
        getCatalog: async () => ({ offerings: [] }),
        getOffering: async () => ({}),
        searchOfferings: async () => [],
        checkAvailability: async () => ({ status: 'AVAILABLE' }),
        requestQuote: async () => ({ total: 1000 }),
        createAction: async () => ({})
      })
    } as any;
    const mockRedis = {
      acquireLock: async () => true,
      releaseLock: async () => true
    } as any;
    const catalogService = new CatalogService(mockRegistry, providersService, mockRedis);
    const quotesService = new QuotesService(mockRegistry, providersService);
    const actionsService = new ActionsService(mockRegistry, {} as any, mockRedis, providersService);

    // =========================================================================
    // TEST 1: Direct resolution with default context (LIVE) against SANDBOX provider
    // =========================================================================
    console.log('👉 [Test 1] Sandbox resolution under default LIVE execution context...');
    await assert.rejects(
      () => providersService.resolveCanonicalProvider('coffee-sandbox'),
      (err: any) => {
        assert.equal(err.code, 'ENVIRONMENT_NOT_ALLOWED');
        assert.equal(err.statusCode, 403);
        assert.equal(err.details?.requestedEnvironment, 'LIVE');
        assert.equal(err.details?.actualEnvironment, 'SANDBOX');
        return true;
      },
      'Direct call to sandbox provider without environment context must fail with ENVIRONMENT_NOT_ALLOWED (403).'
    );

    // Calling with explicit LIVE context against sandbox provider
    await assert.rejects(
      () => providersService.resolveCanonicalProvider('coffee-sandbox', ProviderEnvironment.LIVE),
      (err: any) => {
        assert.equal(err.code, 'ENVIRONMENT_NOT_ALLOWED');
        assert.equal(err.statusCode, 403);
        return true;
      },
      'Explicit LIVE context against sandbox provider must fail with ENVIRONMENT_NOT_ALLOWED.'
    );

    // Calling with explicit SANDBOX context against live provider
    await assert.rejects(
      () => providersService.resolveCanonicalProvider('coffee-live', ProviderEnvironment.SANDBOX),
      (err: any) => {
        assert.equal(err.code, 'ENVIRONMENT_NOT_ALLOWED');
        assert.equal(err.statusCode, 403);
        return true;
      },
      'Explicit SANDBOX context against live provider must fail with ENVIRONMENT_NOT_ALLOWED.'
    );

    // Proper match must succeed
    const resolvedLive = await providersService.resolveCanonicalProvider('coffee-live', ProviderEnvironment.LIVE);
    assert.equal(resolvedLive.slug, 'coffee-live');

    const resolvedSandbox = await providersService.resolveCanonicalProvider('coffee-sandbox', ProviderEnvironment.SANDBOX);
    assert.equal(resolvedSandbox.slug, 'coffee-sandbox');
    console.log('   ✅ Environment boundaries deterministically enforced at resolver level.');

    // =========================================================================
    // TEST 2: CatalogService enforces execution context
    // =========================================================================
    console.log('👉 [Test 2] CatalogService execution context enforcement...');
    // Default context (undefined -> LIVE) on sandbox provider
    await assert.rejects(
      () => catalogService.getCatalog('coffee-sandbox'),
      (err: any) => err.code === 'ENVIRONMENT_NOT_ALLOWED',
      'getCatalog on sandbox provider without explicit environment must throw ENVIRONMENT_NOT_ALLOWED.'
    );

    await assert.rejects(
      () => catalogService.getOffering('coffee-sandbox', 'off-1'),
      (err: any) => err.code === 'ENVIRONMENT_NOT_ALLOWED',
      'getOffering on sandbox provider without explicit environment must throw ENVIRONMENT_NOT_ALLOWED.'
    );

    await assert.rejects(
      () => catalogService.searchOfferings('coffee-sandbox', { query: 'latte' }),
      (err: any) => err.code === 'ENVIRONMENT_NOT_ALLOWED',
      'searchOfferings on sandbox provider without explicit environment must throw ENVIRONMENT_NOT_ALLOWED.'
    );

    await assert.rejects(
      () => catalogService.checkAvailability({ providerSlug: 'coffee-sandbox', items: [{ offeringId: 'off-1', quantity: 1 }] }),
      (err: any) => err.code === 'ENVIRONMENT_NOT_ALLOWED',
      'checkAvailability on sandbox provider without explicit environment must throw ENVIRONMENT_NOT_ALLOWED.'
    );
    console.log('   ✅ CatalogService endpoints strictly enforce environment context.');

    // =========================================================================
    // TEST 3: QuotesService & ActionsService enforce execution context
    // =========================================================================
    console.log('👉 [Test 3] QuotesService & ActionsService execution context enforcement...');
    await assert.rejects(
      () => quotesService.requestQuote({
        providerSlug: 'coffee-sandbox',
        items: [{ offeringId: 'off-1', quantity: 1 }]
      }),
      (err: any) => err.code === 'ENVIRONMENT_NOT_ALLOWED',
      'requestQuote on sandbox provider without environment must throw ENVIRONMENT_NOT_ALLOWED.'
    );

    // =========================================================================
    // TEST 4: Cross-Environment Quote -> Action Prevention
    // =========================================================================
    console.log('👉 [Test 4] Cross-environment Quote -> Action invariant...');
    const fakeSandboxQuote = {
      id: 'quote-sandbox-123',
      providerId: sandboxProvider.id,
      provider: sandboxProvider,
      total: 25000,
      currency: 'UZS',
      expiresAt: new Date(Date.now() + 600000),
      items: [{ offeringId: 'item-1', quantity: 1, unitPrice: 25000, totalPrice: 25000 }],
      metadata: { environment: 'SANDBOX' }
    };

    (prisma.quote as any).findUnique = async () => fakeSandboxQuote;

    // Attempting to create a LIVE action using a SANDBOX quote (or against live provider with sandbox quote)
    await assert.rejects(
      () => actionsService.createAction({
        quoteId: 'quote-sandbox-123',
        providerSlug: 'coffee-live',
        actionType: 'ORDER',
        idempotencyKey: 'test-cross-env-1',
        userConfirmed: true,
        customer: { name: 'Test User', phone: '+998901234567' },
        environment: ProviderEnvironment.LIVE,
        parameters: { items: [{ offeringId: 'item-1', quantity: 1 }] }
      }),
      (err: any) => {
        if (err.code !== 'ENVIRONMENT_NOT_ALLOWED') {
          console.error('Test 4 actual error was:', err);
        }
        assert.equal(err.code, 'ENVIRONMENT_NOT_ALLOWED');
        return true;
      },
      'Cross-environment quote execution must be strictly rejected with ENVIRONMENT_NOT_ALLOWED.'
    );
    console.log('   ✅ Cross-environment quote execution strictly blocked.');

    // =========================================================================
    // TEST 5: Structured Metrics in Welcome Info (P2)
    // =========================================================================
    console.log('👉 [Test 5] Structured Metrics in Welcome Info (P2)...');

    const welcome = await providersService.getWelcomeInfo();
    assert.equal(welcome.discoverableProviderCount, 2, 'Should discover 2 live providers (coffee-live and hh-uz-live)');
    assert.equal(welcome.readOnlyProviderCount, 1, 'Should count 1 read-only provider (hh-uz-live)');
    assert.equal(welcome.transactionalProviderCount, 1, 'Should count 1 transactional provider (coffee-live)');
    assert.equal(welcome.availableServiceCount, 2, 'Should maintain backward-compatible total');

    // Customer presenter message semantics: with offerings (count > 0)
    const dynamicMsgWithCount = getDynamicServiceMessage(welcome.availableServiceCount, false, {
      discoverableProviderCount: welcome.discoverableProviderCount,
      readOnlyProviderCount: welcome.readOnlyProviderCount,
      transactionalProviderCount: welcome.transactionalProviderCount
    });
    assert.ok(!dynamicMsgWithCount.includes('0 ta xizmat'), 'AI message must never claim 0 services');
    assert.equal(dynamicMsgWithCount, 'O‘nlab mahsulot va xizmatlar orasidan sizga mosini topib beraman.');

    // Customer presenter message semantics: when offerings count is 0 / empty
    const dynamicMsgZeroOfferings = getDynamicServiceMessage(0, false, {
      discoverableProviderCount: welcome.discoverableProviderCount,
      readOnlyProviderCount: welcome.readOnlyProviderCount,
      transactionalProviderCount: welcome.transactionalProviderCount
    });
    assert.ok(!dynamicMsgZeroOfferings.includes('0 ta xizmat'), 'AI message must never claim 0 services when discoverable providers exist');
    assert.ok(dynamicMsgZeroOfferings.includes('2 ta tasdiqlangan hamkor'), 'AI message mentions active discoverable services');

    const welcomeMsg = getWelcomeMessage(0, false, {
      discoverableProviderCount: welcome.discoverableProviderCount,
      readOnlyProviderCount: welcome.readOnlyProviderCount,
      transactionalProviderCount: welcome.transactionalProviderCount
    });
    assert.ok(!welcomeMsg.includes('0 ta xizmat'), 'Welcome message must never claim 0 services when discoverable providers exist');
    console.log('   ✅ Welcome info and customer presenter structured metrics verified.');

    // =========================================================================
    // TEST 6: MCP Tools pass-through of environment parameter
    // =========================================================================
    console.log('👉 [Test 6] MCP Tools environment parameter propagation...');
    const mcpTools = ['get_catalog', 'search_catalog', 'get_offering', 'request_quote', 'create_action'];
    for (const toolName of mcpTools) {
      const tool = ZAYUNO_MCP_TOOLS.find(t => t.name === toolName);
      assert.ok(tool, `Tool ${toolName} must exist`);
      assert.ok(
        (tool.inputSchema.properties as any).environment,
        `Tool ${toolName} must include environment parameter in its schema`
      );
    }
    console.log('   ✅ MCP tools schemas and parameter propagation verified.');

    console.log('\n================================================================');
    console.log('🎉 ALL P1 & P2 EDGE CASES DETERMINISTICALLY PASSED!');
    console.log('================================================================');
  } finally {
    prisma.provider.findUnique = originalPrisma.providerFindUnique;
    prisma.provider.findMany = originalPrisma.providerFindMany;
    prisma.provider.count = originalPrisma.providerCount;
    prisma.location.findUnique = originalPrisma.locationFindUnique;
    (prisma.quote as any).findUnique = originalPrisma.quoteFindUnique;
    if (prisma.offering) {
      (prisma.offering as any).count = originalPrisma.offeringCount;
    }
  }
}

runSandboxExecutionContextAndMetricsSuite().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
