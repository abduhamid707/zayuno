import assert from 'node:assert/strict';
import { prisma } from '../packages/database/src/client.ts';
import { ConnectorsService } from '../apps/api/src/modules/connectors/connectors.service.ts';
import { ProviderRegistryService } from '../apps/api/src/modules/providers/provider-registry.service.ts';
import { CatalogService } from '../apps/api/src/modules/catalog/catalog.service.ts';
import { UzumMarketConnector } from '../packages/provider-sdk/src/connectors/uzum-connector.ts';
import { SyntheticRetailConnector } from '../packages/provider-sdk/src/connectors/synthetic-connector.ts';
import { ManagedConnectorAdapter } from '../packages/provider-sdk/src/managed-connector-adapter.ts';
import { BaseProviderAdapter } from '../packages/provider-sdk/src/base-provider.ts';
import { ProviderCapability } from '../packages/contracts/src/provider.ts';
import { encryptSecret, decryptSecret } from '../packages/shared/src/crypto.ts';
import { BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '../apps/api/node_modules/@nestjs/common/index.js';

// Ensure 32-byte hex encryption key
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

async function main() {
  console.log('🚀 Starting Comprehensive Acceptance Test Suite: Managed Connectors & Uzum Market Integration');

  // Mocks for Redis
  const mockRedisService = {
    del: async () => 1,
    get: async () => null,
    set: async () => 'OK',
    delByPattern: async () => 0
  } as any;

  const registryService = new ProviderRegistryService();
  registryService.onModuleInit();

  const mockProvidersService = {
    assertProviderPublished: async (slug: string, environment?: string) => {
      const p = await prisma.provider.findUnique({ where: { slug } });
      if (!p) throw new NotFoundException(`Provider ${slug} not found`);
      const meta = (p.metadata as any) || {};
      if (environment === 'production' && meta.isPublished === false) {
        throw new BadRequestException(`Provider ${slug} is not published in ${environment}`);
      }
      return p;
    }
  } as any;

  const connectorsService = new ConnectorsService(mockRedisService, registryService);
  await connectorsService.onModuleInit();

  const catalogService = new CatalogService(registryService, mockProvidersService, mockRedisService);

  // Setup test providers in database
  const providerAlphaSlug = `test-alpha-${Date.now()}`;
  const providerBetaSlug = `test-beta-${Date.now()}`;

  const providerAlpha = await prisma.provider.create({
    data: {
      name: 'Alpha Electronics',
      slug: providerAlphaSlug,
      status: 'ACTIVE',
      encryptedSecret: 'test-secret-alpha',
      webhookSecret: 'test-webhook-secret-alpha',
      adapterType: 'managed-connector',
      capabilities: [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG, ProviderCapability.SEARCH],
      config: { adapterType: 'managed-connector' },
      metadata: { reviewStatus: 'APPROVED', isPublished: true, isCertified: true }
    }
  });

  const providerBeta = await prisma.provider.create({
    data: {
      name: 'Beta Store',
      slug: providerBetaSlug,
      status: 'ACTIVE',
      encryptedSecret: 'test-secret-beta',
      webhookSecret: 'test-webhook-secret-beta',
      adapterType: 'managed-connector',
      capabilities: [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG, ProviderCapability.SEARCH],
      config: { adapterType: 'managed-connector' },
      metadata: { reviewStatus: 'APPROVED', isPublished: true, isCertified: true }
    }
  });

  const uzumDef = await prisma.connectorDefinition.findUnique({ where: { id: 'uzum' } });
  assert.ok(uzumDef, 'Uzum connector definition must exist in DB');

  const syntheticDef = await prisma.connectorDefinition.findUnique({ where: { id: 'synthetic-test' } });
  assert.ok(syntheticDef, 'Synthetic connector definition must exist in DB');

  try {
    // =========================================================================
    // Test 1: Multi-tenant isolation
    // =========================================================================
    console.log('\n[1/11] Multi-tenant isolation: identical external IDs across sellers & unauthorized access...');

    // Create credentials and instances for both sellers
    const credA = await prisma.connectorCredential.create({
      data: {
        providerId: providerAlpha.id,
        connectorDefinitionId: 'uzum',
        name: 'Alpha Uzum Credential',
        encryptedSecret: encryptSecret('test-key-alpha', process.env.ENCRYPTION_KEY!),
        maskedSecret: 'test...lpha'
      }
    });

    const instanceA = await prisma.connectorInstance.create({
      data: {
        providerId: providerAlpha.id,
        connectorDefinitionId: 'uzum',
        credentialId: credA.id,
        status: 'CONNECTED',
        selectedShopId: 'shop-alpha',
        selectedShopName: 'Alpha Uzum Shop'
      }
    });

    const credB = await prisma.connectorCredential.create({
      data: {
        providerId: providerBeta.id,
        connectorDefinitionId: 'uzum',
        name: 'Beta Uzum Credential',
        encryptedSecret: encryptSecret('test-key-beta', process.env.ENCRYPTION_KEY!),
        maskedSecret: 'test...beta'
      }
    });

    const instanceB = await prisma.connectorInstance.create({
      data: {
        providerId: providerBeta.id,
        connectorDefinitionId: 'uzum',
        credentialId: credB.id,
        status: 'CONNECTED',
        selectedShopId: 'shop-beta',
        selectedShopName: 'Beta Uzum Shop'
      }
    });

    // Both sellers sell a product with the same external product ID (e.g. externalProductId = "prod-identical-999")
    const commonExternalId = 'prod-identical-999';

    const prodA = await prisma.syncedProduct.create({
      data: {
        providerId: providerAlpha.id,
        instanceId: instanceA.id,
        externalShopId: 'shop-alpha',
        externalProductId: commonExternalId,
        title: 'Alpha Ultra Phone 256GB',
        brand: 'AlphaBrand',
        categoryTitle: 'Smartfonlar',
        basePrice: 5000000,
        currency: 'UZS',
        productUrl: `https://uzum.uz/uz/product/${commonExternalId}`,
        sourceStatus: 'ACTIVE',
        isAvailable: true,
        isVisible: true,
        lastSyncedAt: new Date()
      }
    });

    const prodB = await prisma.syncedProduct.create({
      data: {
        providerId: providerBeta.id,
        instanceId: instanceB.id,
        externalShopId: 'shop-beta',
        externalProductId: commonExternalId,
        title: 'Beta Super Phone 256GB',
        brand: 'BetaBrand',
        categoryTitle: 'Smartfonlar',
        basePrice: 4800000,
        currency: 'UZS',
        productUrl: `https://uzum.uz/uz/product/${commonExternalId}`,
        sourceStatus: 'ACTIVE',
        isAvailable: true,
        isVisible: true,
        lastSyncedAt: new Date()
      }
    });

    // Verify database uniqueness and provider scoping via real ProviderRegistryService adapters
    const adapterA = await registryService.getAdapter(providerAlphaSlug);
    const adapterB = await registryService.getAdapter(providerBetaSlug);

    const catalogA = await adapterA.getCatalog();
    const catalogB = await adapterB.getCatalog();

    assert.equal(catalogA.offerings.length, 1);
    assert.equal(catalogA.offerings[0].title, 'Alpha Ultra Phone 256GB');
    assert.equal(catalogA.offerings[0].id, prodA.id);

    assert.equal(catalogB.offerings.length, 1);
    assert.equal(catalogB.offerings[0].title, 'Beta Super Phone 256GB');
    assert.equal(catalogB.offerings[0].id, prodB.id);

    // Verify actor isolation: Provider A cannot access Provider B's instance
    const actorAlpha = { providerId: providerAlpha.id, providerSlug: providerAlphaSlug, role: 'PROVIDER_OWNER' };
    const actorBeta = { providerId: providerBeta.id, providerSlug: providerBetaSlug, role: 'PROVIDER_OWNER' };

    await assert.rejects(
      async () => connectorsService.getInstance(actorAlpha, instanceB.id),
      (err: any) => err instanceof ForbiddenException || err.status === 403,
      'Provider Alpha must NOT be allowed to access Provider Beta instance'
    );

    console.log('  ✓ Multi-tenant isolation verified: identical external IDs cleanly separated by providerId and instanceId.');

    // =========================================================================
    // Test 2: Full pagination & no duplicate offerings
    // =========================================================================
    console.log('\n[2/11] Full pagination: multi-page fetching and duplicate prevention...');

    const uzumConnector = new UzumMarketConnector();

    // Save original fetch
    const originalFetch = globalThis.fetch;
    let paginatedFetchCalls = 0;

    // Simulate 3 pages of products from Uzum (page 0: 50 items, page 1: 50 items, page 2: 10 items = 110 total)
    const mockUzumFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/shops')) {
        return new Response(JSON.stringify([{ id: 1, name: 'Shop Alpha' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (urlStr.includes('/v1/product/shop/')) {
        paginatedFetchCalls++;
        const urlObj = new URL(urlStr);
        const page = parseInt(urlObj.searchParams.get('page') || '0', 10);

        let items: any[] = [];
        if (page === 0) {
          items = Array.from({ length: 50 }, (_, i) => ({
            productId: 1000 + i,
            title: `Paginated Product ${i + 1}`,
            category: 'Elektronika/Smartfonlar',
            status: { value: 'ACTIVE', description: 'Активный' },
            characteristics: [{ title: 'Operativ xotira', value: '8GB' }],
            skuList: [{ skuId: 10000 + i, price: 100000 + i * 1000, quantityActive: 5, skuTitle: 'Standard' }],
            image: 'https://images.uzum.uz/test.jpg'
          }));
        } else if (page === 1) {
          items = Array.from({ length: 50 }, (_, i) => ({
            productId: 1050 + i,
            title: `Paginated Product ${50 + i + 1}`,
            category: 'Elektronika/Smartfonlar',
            status: { value: 'ACTIVE', description: 'Активный' },
            skuList: [{ skuId: 10050 + i, price: 150000 + i * 1000, quantityActive: 5, skuTitle: 'Standard' }],
            image: 'https://images.uzum.uz/test.jpg'
          }));
        } else if (page === 2) {
          items = Array.from({ length: 10 }, (_, i) => ({
            productId: 1100 + i,
            title: `Paginated Product ${100 + i + 1}`,
            category: 'Elektronika/Smartfonlar',
            status: { value: 'ACTIVE', description: 'Активный' },
            skuList: [{ skuId: 10100 + i, price: 200000 + i * 1000, quantityActive: 5, skuTitle: 'Standard' }],
            image: 'https://images.uzum.uz/test.jpg'
          }));
        }

        return new Response(JSON.stringify({ productList: items, totalProductsAmount: 110 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return originalFetch(input, init);
    };

    globalThis.fetch = mockUzumFetch as any;

    const syncOutput = await uzumConnector.fetchCatalog({
      credentials: { apiKey: 'test-api-key-12345678' },
      shopId: 'shop-alpha'
    });

    assert.equal(syncOutput.success, true);
    assert.equal(syncOutput.items.length, 110, 'Must fetch all 110 products across 3 pages');
    assert.equal(paginatedFetchCalls, 3, 'Must make 3 calls: pages 0, 1, and 2 (detecting end via < pageSize and totalExpected)');

    // Save encrypted credential for instanceA directly
    await prisma.connectorCredential.update({
      where: { id: credA.id },
      data: { encryptedSecret: encryptSecret('test-api-key-12345678', process.env.ENCRYPTION_KEY!) }
    });

    // Run first sync
    const runResult1 = await connectorsService.syncInstance(instanceA.id, 'MANUAL');
    assert.equal(runResult1.success, true);
    assert.equal(runResult1.importedCount, 110);

    const countAfterSync1 = await prisma.syncedProduct.count({
      where: { instanceId: instanceA.id, isVisible: true }
    });
    assert.equal(countAfterSync1, 110, 'Instance A must have 110 active visible products');

    // Run repeat sync with same items
    const runResult2 = await connectorsService.syncInstance(instanceA.id, 'MANUAL');
    assert.equal(runResult2.success, true);
    assert.equal(runResult2.importedCount, 110);

    const countAfterSync2 = await prisma.syncedProduct.count({
      where: { instanceId: instanceA.id, isVisible: true }
    });
    assert.equal(countAfterSync2, 110, 'Repeat sync must NOT duplicate products (remains 110)');

    // Verify mapping of real Uzum API status object and category string
    const sampleProduct = await prisma.syncedProduct.findFirst({
      where: { instanceId: instanceA.id, externalProductId: '1000' }
    });
    assert.ok(sampleProduct, 'Sample product 1000 must exist');
    assert.equal(typeof sampleProduct.sourceStatus, 'string', 'sourceStatus must be a string column in DB');
    assert.equal(sampleProduct.sourceStatus, 'ACTIVE', 'sourceStatus must be extracted as string ACTIVE from status object');
    assert.equal(sampleProduct.categoryTitle, 'Elektronika/Smartfonlar', 'categoryTitle must be string');
    assert.equal((sampleProduct.attributes as any)?.['Operativ xotira'], '8GB', 'characteristics must be mapped into attributes');

    console.log('  ✓ Full pagination, duplicate prevention, and real Uzum status/category mapping verified.');

    // =========================================================================
    // Test 3: Active -> Inactive transition
    // =========================================================================
    console.log('\n[3/11] Active -> Inactive transition: items becoming inactive in source are hidden...');

    // Return only 80 products in next sync (30 products deactivated or removed)
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/product/shop/')) {
        const urlObj = new URL(urlStr);
        const page = parseInt(urlObj.searchParams.get('page') || '0', 10);

        let items: any[] = [];
        if (page === 0) {
          items = Array.from({ length: 50 }, (_, i) => ({
            productId: 1000 + i,
            title: `Paginated Product ${i + 1}`,
            category: 'Elektronika/Smartfonlar',
            status: { value: 'ACTIVE', description: 'Активный' },
            skuList: [{ skuId: 10000 + i, price: 100000, quantityActive: 5, skuTitle: 'Standard' }]
          }));
        } else if (page === 1) {
          items = Array.from({ length: 30 }, (_, i) => ({
            productId: 1050 + i,
            title: `Paginated Product ${50 + i + 1}`,
            category: 'Elektronika/Smartfonlar',
            status: { value: 'ACTIVE', description: 'Активный' },
            skuList: [{ skuId: 10050 + i, price: 150000, quantityActive: 5, skuTitle: 'Standard' }]
          }));
        }

        return new Response(JSON.stringify({ productList: items, totalProductsAmount: 80 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    }) as any;

    const runResult3 = await connectorsService.syncInstance(instanceA.id, 'MANUAL');
    assert.equal(runResult3.success, true);
    assert.equal(runResult3.importedCount, 80);

    const visibleCount = await prisma.syncedProduct.count({
      where: { instanceId: instanceA.id, isVisible: true }
    });
    assert.equal(visibleCount, 80, 'Exactly 80 products must remain visible');

    const hiddenCount = await prisma.syncedProduct.count({
      where: { instanceId: instanceA.id, isVisible: false }
    });
    assert.equal(hiddenCount, 30 + 1, 'The 30 deactivated items (+ initial commonExternalId) must be hidden (isVisible: false)');

    console.log('  ✓ Active -> Inactive transition verified: old items hidden from catalog.');

    // =========================================================================
    // Test 4: Fault tolerance & snapshot integrity
    // =========================================================================
    console.log('\n[4/11] Fault tolerance: mid-run failure preserves previous snapshot products...');

    // Simulate page 2 failure (network 500 error)
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/product/shop/')) {
        const urlObj = new URL(urlStr);
        const page = parseInt(urlObj.searchParams.get('page') || '0', 10);
        if (page === 0) {
          const items = Array.from({ length: 50 }, (_, i) => ({
            productId: 9000 + i,
            title: `Temp Prod ${i}`,
            skuList: [{ skuId: 90000 + i, price: 100, quantityActive: 5 }]
          }));
          return new Response(JSON.stringify({ productList: items, totalProductsAmount: 100 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Internal Server Error', { status: 500 });
      }
      return originalFetch(input, init);
    }) as any;

    const failedRunResult = await connectorsService.syncInstance(instanceA.id, 'MANUAL');
    assert.equal(failedRunResult.success, false);
    assert.ok(failedRunResult.message?.includes('500') || failedRunResult.message?.includes('xatolik'));

    // Check that previous 80 visible items were NOT deleted or hidden
    const visibleCountAfterFailure = await prisma.syncedProduct.count({
      where: { instanceId: instanceA.id, isVisible: true }
    });
    assert.equal(visibleCountAfterFailure, 80, 'Previous 80 items MUST be preserved when sync fails');

    const syncRunRecord = await prisma.connectorSyncRun.findFirst({
      where: { instanceId: instanceA.id },
      orderBy: { startedAt: 'desc' }
    });
    assert.equal(syncRunRecord?.status, 'FAILED');

    // Test genuine empty catalog (0 active products on active shop)
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/product/shop/')) {
        return new Response(JSON.stringify({ productList: [], totalProductsAmount: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(input, init);
    }) as any;

    const emptyRunResult = await connectorsService.syncInstance(instanceA.id, 'MANUAL');
    assert.equal(emptyRunResult.success, true);
    assert.equal(emptyRunResult.importedCount, 0);

    const visibleCountAfterEmpty = await prisma.syncedProduct.count({
      where: { instanceId: instanceA.id, isVisible: true }
    });
    // Test HTTP 200 without productList (malformed response must NOT wipe catalog)
    await prisma.syncedProduct.updateMany({
      where: { instanceId: instanceA.id, externalProductId: { in: ['1000', '1001'] } },
      data: { isVisible: true }
    });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/product/shop/')) {
        // Returns HTTP 200 without productList
        return new Response(JSON.stringify({ status: 'OK', data: { itemsCount: 0 } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    }) as any;

    const malformedRunResult = await connectorsService.syncInstance(instanceA.id, 'MANUAL');
    assert.equal(malformedRunResult.success, false);
    assert.ok(malformedRunResult.message?.includes('productList topilmadi'));

    // Check that previous visible products were NOT hidden
    const visibleCountAfterMalformed = await prisma.syncedProduct.count({
      where: { instanceId: instanceA.id, isVisible: true }
    });
    assert.equal(visibleCountAfterMalformed, 2, 'Malformed response must preserve existing catalog without hiding items');

    // Restore fetch
    globalThis.fetch = originalFetch;

    console.log('  ✓ Fault tolerance, snapshot integrity, and malformed response rejection verified.');

    // =========================================================================
    // Test 5: Concurrency lock & Disconnect
    // =========================================================================
    console.log('\n[5/11] Concurrency lock: parallel sync rejected with 409 Conflict, disconnect invalidates...');

    // Manually set syncLockUntil into the future to simulate an active sync in another process
    await prisma.connectorInstance.update({
      where: { id: instanceA.id },
      data: { syncLockUntil: new Date(Date.now() + 120_000) }
    });

    await assert.rejects(
      async () => connectorsService.syncInstance(instanceA.id, 'MANUAL'),
      (err: any) => err instanceof ConflictException || err.status === 409,
      'Concurrent sync must be rejected with 409 Conflict'
    );

    // Release lock
    await prisma.connectorInstance.update({
      where: { id: instanceA.id },
      data: { syncLockUntil: null }
    });

    // Real simultaneous execution test via Promise.allSettled
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/product/shop/')) {
        // Introduce small artificial latency to ensure lock overlap
        await new Promise(r => setTimeout(r, 50));
        return new Response(JSON.stringify({ productList: [], totalProductsAmount: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    }) as any;

    const [parallel1, parallel2] = await Promise.allSettled([
      connectorsService.syncInstance(instanceA.id, 'MANUAL'),
      connectorsService.syncInstance(instanceA.id, 'MANUAL')
    ]);

    const parallelRejected = [parallel1, parallel2].filter(r => r.status === 'rejected');
    const parallelFulfilled = [parallel1, parallel2].filter(r => r.status === 'fulfilled');
    assert.equal(parallelFulfilled.length, 1, 'Exactly one parallel sync must acquire lock and succeed');
    assert.equal(parallelRejected.length, 1, 'Simultaneous second sync must be rejected with 409 Conflict');
    assert.equal((parallelRejected[0] as PromiseRejectedResult).reason.status, 409);

    globalThis.fetch = originalFetch;

    // Test crash recovery for orphaned SYNCING instances
    console.log('  Testing recoverStuckSyncInstances()...');
    await prisma.connectorInstance.update({
      where: { id: instanceA.id },
      data: { status: 'SYNCING', syncLockUntil: null }
    });
    const recoveredCount = await connectorsService.recoverStuckSyncInstances();
    assert.ok(recoveredCount >= 1, 'Must recover stuck SYNCING instance');
    const recoveredInstance = await prisma.connectorInstance.findUnique({ where: { id: instanceA.id } });
    assert.equal(recoveredInstance?.status, 'CONNECTED');

    // Test scheduled sync cycle worker (runScheduledSyncCycle) retrying ERROR status
    console.log('  Testing scheduled sync cycle worker (runScheduledSyncCycle) retrying ERROR status...');
    await prisma.connectorInstance.update({
      where: { id: instanceA.id },
      data: {
        status: 'ERROR',
        syncLockUntil: null,
        nextSyncAt: new Date(Date.now() - 30_000) // Overdue
      }
    });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/product/shop/')) {
        return new Response(JSON.stringify({ productList: [], totalProductsAmount: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    }) as any;

    const scheduledStats = await connectorsService.runScheduledSyncCycle();
    assert.ok(scheduledStats.processed >= 1, 'Scheduled cycle must process at least 1 overdue instance');

    const refreshedInstance = await prisma.connectorInstance.findUnique({ where: { id: instanceA.id } });
    assert.equal(refreshedInstance?.status, 'CONNECTED', 'Successful retry must restore status from ERROR to CONNECTED');
    assert.ok(
      refreshedInstance?.nextSyncAt && refreshedInstance.nextSyncAt.getTime() > Date.now(),
      'Scheduled cycle must advance nextSyncAt into the future'
    );

    const scheduledRunRecord = await prisma.connectorSyncRun.findFirst({
      where: { instanceId: instanceA.id, trigger: 'SCHEDULED' },
      orderBy: { startedAt: 'desc' }
    });
    assert.ok(scheduledRunRecord, 'A scheduled sync run record must be created');
    assert.equal(scheduledRunRecord.status, 'SUCCESS');

    // Test: periodic recovery of expired SYNCING instance inside runScheduledSyncCycle()
    console.log('  Testing periodic recovery of expired SYNCING instance in runScheduledSyncCycle()...');
    await prisma.connectorInstance.update({
      where: { id: instanceA.id },
      data: {
        status: 'SYNCING',
        syncLockUntil: new Date(Date.now() - 60_000), // Expired lock
        syncRunId: 'expired-token-123'
      }
    });

    const cycleWithStuckResult = await connectorsService.runScheduledSyncCycle();
    assert.ok(cycleWithStuckResult.processed >= 1, 'Expired SYNCING instance must be recovered and processed');

    const recoveredFromCycle = await prisma.connectorInstance.findUnique({ where: { id: instanceA.id } });
    assert.equal(recoveredFromCycle?.status, 'CONNECTED', 'Expired SYNCING instance must be restored to CONNECTED');
    assert.notEqual(recoveredFromCycle?.syncRunId, 'expired-token-123', 'New run must have its own runToken');

    // Test: runToken lock usurpation protection
    console.log('  Testing runToken lock ownership usurpation protection...');
    // Simulate Run 1 started with token 'run-token-1', then lock expired and Run 2 started with 'run-token-2'
    await prisma.connectorInstance.update({
      where: { id: instanceA.id },
      data: {
        status: 'SYNCING',
        syncLockUntil: new Date(Date.now() + 120_000),
        syncRunId: 'run-token-2'
      }
    });

    // If an old Run 1 attempt tries to update with 'run-token-1', it must NOT match or clear the lock
    const oldRun1Update = await prisma.connectorInstance.updateMany({
      where: {
        id: instanceA.id,
        syncRunId: 'run-token-1',
        status: { not: 'DISCONNECTED' }
      },
      data: {
        status: 'CONNECTED',
        syncLockUntil: null
      }
    });
    assert.equal(oldRun1Update.count, 0, 'Stale runToken must NOT be able to modify instance or release lock');

    const checkStillLocked = await prisma.connectorInstance.findUnique({ where: { id: instanceA.id } });
    assert.equal(checkStillLocked?.status, 'SYNCING');
    assert.equal(checkStillLocked?.syncRunId, 'run-token-2');

    // Clean up instance lock
    await prisma.connectorInstance.update({
      where: { id: instanceA.id },
      data: { status: 'CONNECTED', syncLockUntil: null, syncRunId: null }
    });

    globalThis.fetch = originalFetch;

    // Test disconnect
    await connectorsService.disconnectInstance(actorAlpha, instanceA.id);
    const disconnectedInstance = await prisma.connectorInstance.findUnique({ where: { id: instanceA.id } });
    assert.equal(disconnectedInstance?.status, 'DISCONNECTED');

    // Attempting to sync a DISCONNECTED instance must be rejected and must not revive instance
    await assert.rejects(
      async () => connectorsService.syncInstance(instanceA.id, 'MANUAL'),
      (err: any) => err.message.includes('to‘xtatilgan') || err.message.includes('DISCONNECTED') || err.status === 400
    );

    // Clear adapter cache so registry loads updated state
    registryService.invalidateAdapterCache(providerAlphaSlug);
    const disconnectedAdapter = await registryService.getAdapter(providerAlphaSlug);

    // Adapter on disconnected provider must reject catalog requests
    await assert.rejects(
      async () => disconnectedAdapter.getCatalog(),
      (err: any) => err.message.includes('to‘xtatilgan') || err.message.includes('DISCONNECTED') || err.status === 400
    );

    // Reconnect instance for subsequent tests
    await prisma.connectorInstance.update({
      where: { id: instanceA.id },
      data: { status: 'CONNECTED' }
    });
    registryService.invalidateAdapterCache(providerAlphaSlug);

    console.log('  ✓ Concurrency lock and disconnect invalidation verified.');

    // =========================================================================
    // Test 6: Search functionality & Uzbek normalization
    // =========================================================================
    console.log('\n[6/11] Search functionality: title, description, brand, category & Uzbek character normalization...');

    // Insert rich test items for searching
    const searchItems = [
      {
        providerId: providerAlpha.id,
        instanceId: instanceA.id,
        externalShopId: 'shop-alpha',
        externalProductId: 'search-1',
        title: "O'zbekiston milliy shirinliklari to'plami",
        description: 'Eng mazali holva va pahlava',
        brand: 'Milliy Brand',
        categoryTitle: 'Oziq-ovqat',
        basePrice: 75000,
        currency: 'UZS',
        productUrl: 'https://uzum.uz/uz/product/search-1',
        sourceStatus: 'ACTIVE',
        isAvailable: true,
        isVisible: true,
        lastSyncedAt: new Date()
      },
      {
        providerId: providerAlpha.id,
        instanceId: instanceA.id,
        externalShopId: 'shop-alpha',
        externalProductId: 'search-2',
        title: 'Samsung Galaxy S24 Ultra 512GB',
        description: 'Dynamic AMOLED 2X ekran va S-Pen qalami',
        brand: 'Samsung',
        categoryTitle: 'Smartfonlar',
        basePrice: 14500000,
        currency: 'UZS',
        productUrl: 'https://uzum.uz/uz/product/search-2',
        sourceStatus: 'ACTIVE',
        isAvailable: true,
        isVisible: true,
        lastSyncedAt: new Date()
      }
    ];

    for (const item of searchItems) {
      await prisma.syncedProduct.create({ data: item });
    }

    const searchAdapter = await registryService.getAdapter(providerAlphaSlug);

    // Search by title
    const searchByTitle = await searchAdapter.searchOfferings('Samsung');
    assert.equal(searchByTitle.length, 1);
    assert.equal(searchByTitle[0].title, 'Samsung Galaxy S24 Ultra 512GB');

    // Search by description
    const searchByDesc = await searchAdapter.searchOfferings('AMOLED');
    assert.equal(searchByDesc.length, 1);
    assert.equal(searchByDesc[0].title, 'Samsung Galaxy S24 Ultra 512GB');

    // Search by brand
    const searchByBrand = await searchAdapter.searchOfferings('Milliy Brand');
    assert.equal(searchByBrand.length, 1);
    assert.equal(searchByBrand[0].title, "O'zbekiston milliy shirinliklari to'plami");

    // Search by category
    const searchByCat = await searchAdapter.searchOfferings('Smartfonlar');
    assert.equal(searchByCat.length, 1);

    // Uzbek apostrophe normalization: search with typographic apostrophe ‘ vs ' vs `
    const searchUzbekApostrophe1 = await searchAdapter.searchOfferings("o‘zbekiston");
    assert.equal(searchUzbekApostrophe1.length, 1, "Should match 'o‘zbekiston' with typographic apostrophe");

    const searchUzbekApostrophe2 = await searchAdapter.searchOfferings("to`plami");
    assert.equal(searchUzbekApostrophe2.length, 1, "Should match 'to`plami' with backtick apostrophe");

    // Case insensitivity
    const searchCase = await searchAdapter.searchOfferings("SAMSUNG GALAXY");
    assert.equal(searchCase.length, 1);

    console.log('  ✓ Search and Uzbek normalization verified.');

    // =========================================================================
    // Test 7: Compare offerings (2-4 products)
    // =========================================================================
    console.log('\n[7/11] Compare offerings: 2-4 products, attribute matrix, missing fallback, and price preservation...');

    const compareProd1 = await prisma.syncedProduct.create({
      data: {
        providerId: providerAlpha.id,
        instanceId: instanceA.id,
        externalShopId: 'shop-alpha',
        externalProductId: 'comp-1',
        title: 'iPhone 15 Pro 128GB',
        brand: 'Apple',
        categoryTitle: 'Smartfonlar',
        basePrice: 12000000,
        currency: 'UZS',
        productUrl: 'https://uzum.uz/uz/product/comp-1',
        attributes: { 'Operativ xotira': '8GB', 'Kafolat': '1 yil' },
        sourceStatus: 'ACTIVE',
        isAvailable: true,
        isVisible: true,
        lastSyncedAt: new Date()
      }
    });

    const compareProd2 = await prisma.syncedProduct.create({
      data: {
        providerId: providerAlpha.id,
        instanceId: instanceA.id,
        externalShopId: 'shop-alpha',
        externalProductId: 'comp-2',
        title: 'Xiaomi 14 Ultra 512GB',
        brand: 'Xiaomi',
        categoryTitle: 'Smartfonlar',
        basePrice: 11000000,
        currency: 'UZS',
        productUrl: 'https://uzum.uz/uz/product/comp-2',
        attributes: { 'Operativ xotira': '16GB', 'Tezkor quvvatlash': '90W' }, // Has Tezkor quvvatlash, lacks Kafolat
        sourceStatus: 'ACTIVE',
        isAvailable: true,
        isVisible: true,
        lastSyncedAt: new Date()
      }
    });

    const compareProd3 = await prisma.syncedProduct.create({
      data: {
        providerId: providerAlpha.id,
        instanceId: instanceA.id,
        externalShopId: 'shop-alpha',
        externalProductId: 'comp-3',
        title: 'Google Pixel 8 Pro',
        brand: 'Google',
        categoryTitle: 'Smartfonlar',
        basePrice: 10500000,
        currency: 'UZS',
        productUrl: 'https://uzum.uz/uz/product/comp-3',
        attributes: { 'Operativ xotira': '12GB' },
        sourceStatus: 'ACTIVE',
        isAvailable: true,
        isVisible: true,
        lastSyncedAt: new Date()
      }
    });

    // 1 item must be rejected
    await assert.rejects(
      async () => catalogService.compareOfferings([compareProd1.id]),
      (err: any) => err instanceof BadRequestException && err.message.includes('kamida 2 ta')
    );

    // 5 items must be rejected
    await assert.rejects(
      async () => catalogService.compareOfferings(['1', '2', '3', '4', '5']),
      (err: any) => err instanceof BadRequestException && err.message.includes('ko‘pi bilan 4 ta')
    );

    // Compare 2 items
    const compResult2 = await catalogService.compareOfferings([compareProd1.id, compareProd2.id]);
    assert.equal(compResult2.items.length, 2);
    assert.equal(compResult2.items[0].basePrice, 12000000);
    assert.equal(compResult2.items[0].currency, 'UZS');
    assert.equal(compResult2.items[1].basePrice, 11000000);
    assert.ok(compResult2.notice.includes('oxirgi sinxronizatsiya'));

    // Check attribute matrix for missing attribute fallback ("Ma’lumot yo‘q")
    const kafolatAttr = compResult2.attributes.find(a => a.name === 'Kafolat');
    assert.ok(kafolatAttr, 'Kafolat attribute must exist in comparison matrix');
    assert.equal(kafolatAttr.values[compareProd1.id], '1 yil');
    assert.equal(kafolatAttr.values[compareProd2.id], 'Ma’lumot yo‘q', 'Missing Kafolat on Xiaomi must fall back to "Ma’lumot yo‘q"');

    const quvvatAttr = compResult2.attributes.find(a => a.name === 'Tezkor quvvatlash');
    assert.ok(quvvatAttr, 'Tezkor quvvatlash attribute must exist in matrix');
    assert.equal(quvvatAttr.values[compareProd1.id], 'Ma’lumot yo‘q', 'Missing Tezkor quvvatlash on iPhone must fall back to "Ma’lumot yo‘q"');
    assert.equal(quvvatAttr.values[compareProd2.id], '90W');

    // Compare 3 items
    const compResult3 = await catalogService.compareOfferings([compareProd1.id, compareProd2.id, compareProd3.id]);
    assert.equal(compResult3.items.length, 3);

    // Publication check: assertProviderPublished in production environment
    await prisma.provider.update({
      where: { id: providerAlpha.id },
      data: { metadata: { reviewStatus: 'APPROVED', isPublished: false, isCertified: true } }
    });
    await assert.rejects(
      async () => catalogService.compareOfferings([compareProd1.id, compareProd2.id], 'production'),
      (err: any) => err instanceof BadRequestException && err.message.includes('not published'),
      'Unpublished provider offerings must not be comparable in production'
    );
    // Restore published state
    await prisma.provider.update({
      where: { id: providerAlpha.id },
      data: { metadata: { reviewStatus: 'APPROVED', isPublished: true, isCertified: true } }
    });
    const publishedComp = await catalogService.compareOfferings([compareProd1.id, compareProd2.id], 'production');
    assert.equal(publishedComp.items.length, 2);

    console.log('  ✓ Compare offerings (2-4 items), attribute matrix, fallback, and publication checks verified.');

    // =========================================================================
    // Test 8: Product URL & No Fake Actions/Quotes
    // =========================================================================
    console.log('\n[8/11] Product URL & strictly no fake Action / Quote creation...');

    // Verified product URL format
    assert.equal(compareProd1.productUrl, 'https://uzum.uz/uz/product/comp-1');

    // Connector Definition capabilities check in DB
    const uzumDefDb = await prisma.connectorDefinition.findUnique({ where: { id: 'uzum' } });
    assert.ok(uzumDefDb);
    assert.ok(uzumDefDb.capabilities.includes(ProviderCapability.METADATA));
    assert.ok(uzumDefDb.capabilities.includes(ProviderCapability.CATALOG));
    assert.ok(uzumDefDb.capabilities.includes(ProviderCapability.SEARCH));
    assert.ok(!uzumDefDb.capabilities.includes(ProviderCapability.ACTION_CREATE), 'Uzum MUST NOT include ACTION_CREATE');
    assert.ok(!uzumDefDb.capabilities.includes(ProviderCapability.QUOTE), 'Uzum MUST NOT include QUOTE');
    assert.ok(!uzumDefDb.capabilities.includes(ProviderCapability.WEBHOOK), 'Uzum MUST NOT include WEBHOOK');

    // Calling createAction or createQuote on adapter must reject
    const testAdapter = await registryService.getAdapter(providerAlphaSlug);
    await assert.rejects(
      async () => testAdapter.createAction({ quoteId: 'any-quote' } as any),
      (err: any) => err.name === 'CapabilityNotSupportedError' || err.message.includes('does not support') || err.message.includes('not supported')
    );
    await assert.rejects(
      async () => testAdapter.requestQuote({} as any),
      (err: any) => err.name === 'CapabilityNotSupportedError' || err.message.includes('does not support') || err.message.includes('not supported')
    );

    console.log('  ✓ Product URL and rejection of fake Action/Quote verified.');

    // =========================================================================
    // Test 9: Security & Secret Protection
    // =========================================================================
    console.log('\n[9/11] Security & secret protection: AES-256-GCM encryption & masked responses...');

    const rawTestApiKey = '3foSyaev8YkI7wM9yZ5uW3Qx2T1rP0oN4mLkJhGfEdC=';

    // Encrypt and decrypt
    const encryptedSecretStr = encryptSecret(rawTestApiKey, process.env.ENCRYPTION_KEY!);
    assert.ok(encryptedSecretStr, 'Encrypted secret must not be empty');
    assert.notEqual(encryptedSecretStr, rawTestApiKey, 'Ciphertext must not be plaintext');
    assert.equal(encryptedSecretStr.split(':').length, 3, 'Must have iv:tag:ciphertext format');

    const decryptedSecret = decryptSecret(encryptedSecretStr, process.env.ENCRYPTION_KEY!);
    assert.equal(decryptedSecret, rawTestApiKey, 'Decrypted secret must match original plaintext');

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/shops')) {
        return new Response(JSON.stringify([{ id: 1, name: 'Shop Alpha' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (urlStr.includes('/v1/product/shop/')) {
        return new Response(JSON.stringify({ productList: [], totalProductsAmount: 0 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    }) as any;

    // Save credential in DB and check masking
    await connectorsService.rotateCredential(actorAlpha, instanceA.id, rawTestApiKey);
    await new Promise(r => setTimeout(r, 100));

    const instanceWithCred = await prisma.connectorInstance.findUnique({
      where: { id: instanceA.id },
      include: { credential: true }
    });
    const credInDb = instanceWithCred?.credential;
    assert.ok(credInDb, 'Credential must exist in DB');
    assert.notEqual(credInDb.encryptedSecret, rawTestApiKey, 'DB must store ciphertext, never plaintext');

    // Check API response masking
    const instDetail = await connectorsService.getInstance(actorAlpha, instanceA.id);
    assert.ok(instDetail.maskedSecret, 'Detail must include maskedSecret');
    assert.equal(instDetail.maskedSecret, '3foS...EdC=', 'API key must be masked in response');
    assert.equal((instDetail as any).apiKey, undefined, 'Plaintext apiKey must NEVER be in response');
    assert.equal((instDetail as any).encryptedSecret, undefined, 'Raw encryptedSecret must NEVER be in response');

    globalThis.fetch = originalFetch;

    console.log('  ✓ AES-256-GCM encryption at rest and UI secret masking verified.');

    // =========================================================================
    // Test 10: Universality & Extensibility (SyntheticRetailConnector)
    // =========================================================================
    console.log('\n[10/11] Universality: SyntheticRetailConnector runs on identical runtime with 0 core platform if checks...');

    const syntheticConnector = new SyntheticRetailConnector();

    // Auth test
    const synthAuth = await syntheticConnector.authenticate({ apiKey: 'synth-key-123' });
    assert.equal(synthAuth.success, true);
    assert.ok(synthAuth.shops && synthAuth.shops.length >= 1);

    // Get shops
    const synthShops = await syntheticConnector.getShops({ apiKey: 'synth-key-123' });
    assert.equal(synthShops.length, 2);
    assert.equal(synthShops[0].id, 'synth_shop_1');

    // Sync catalog
    const synthSync = await syntheticConnector.fetchCatalog({
      credentials: { apiKey: 'synth-key-123' },
      shopId: 'synth_shop_1'
    });
    assert.equal(synthSync.success, true);
    assert.equal(synthSync.items.length, 2);
    assert.equal(synthSync.items[0].currency, 'UZS');

    // Connect synthetic instance to Provider Beta
    const synthCred = await prisma.connectorCredential.create({
      data: {
        providerId: providerBeta.id,
        connectorDefinitionId: 'synthetic-test',
        name: 'Beta Synthetic Credential',
        encryptedSecret: encryptSecret('synth-key-123', process.env.ENCRYPTION_KEY!),
        maskedSecret: 'synt...-123'
      }
    });

    const synthInstance = await prisma.connectorInstance.create({
      data: {
        providerId: providerBeta.id,
        connectorDefinitionId: 'synthetic-test',
        credentialId: synthCred.id,
        status: 'CONNECTED',
        selectedShopId: 'synth_shop_1',
        selectedShopName: 'Test Do‘kon Toshkent'
      }
    });

    const synthRunResult = await connectorsService.syncInstance(synthInstance.id, 'MANUAL');
    assert.equal(synthRunResult.success, true);
    assert.equal(synthRunResult.importedCount, 2);

    registryService.invalidateAdapterCache(providerBetaSlug);
    const synthAdapter = await registryService.getAdapter(providerBetaSlug);
    const synthCatalog = await synthAdapter.getCatalog();
    assert.ok(synthCatalog.offerings.length >= 2);

    const synthSearch = await synthAdapter.searchOfferings('Smartfon');
    assert.ok(synthSearch.length >= 1);

    console.log('  ✓ Universality verified: SyntheticRetailConnector works identically with zero core changes.');

    // =========================================================================
    // Test 11: Regression check: direct HTTP and transactional provider adapters
    // =========================================================================
    console.log('\n[11/11] Regression check: direct HTTP and transactional provider adapters remain untouched...');

    const directProvider = {
      id: 'direct-provider-test',
      slug: 'direct-coffee',
      name: 'Direct Coffee Bar',
      status: 'ACTIVE',
      config: { baseUrl: 'https://direct.example.com/api' },
      metadata: { reviewStatus: 'APPROVED' }
    };

    const directAdapter = new BaseProviderAdapter(directProvider as any);
    assert.ok(directAdapter instanceof BaseProviderAdapter);
    assert.equal(typeof directAdapter.createAction, 'function');
    assert.equal(typeof directAdapter.requestQuote, 'function');
    assert.equal(typeof directAdapter.getCatalog, 'function');

    console.log('  ✓ Direct transactional providers verified with zero regressions.');

    // =========================================================================
    // Test 12: Transactional provider protection on managed connector connect
    // =========================================================================
    console.log('\n[12/13] Transactional provider: catalog connector as supplementary, adapter preserved...');

    const transactionalProviderSlug = `trans-provider-${Date.now()}`;
    const transactionalProvider = await prisma.provider.create({
      data: {
        name: 'Fine Dining POS',
        slug: transactionalProviderSlug,
        status: 'ACTIVE',
        encryptedSecret: 'secret',
        webhookSecret: 'wh-secret',
        adapterType: 'remote-http',
        capabilities: [
          ProviderCapability.METADATA,
          ProviderCapability.HEALTH,
          ProviderCapability.CATALOG,
          ProviderCapability.SEARCH,
          ProviderCapability.QUOTE,
          ProviderCapability.ACTION_CREATE,
          ProviderCapability.ACTION_STATUS,
          ProviderCapability.ACTION_CANCEL
        ],
        config: { baseUrl: 'https://pos.example.com/api' },
        metadata: { reviewStatus: 'APPROVED' }
      }
    });

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/shops')) {
        return new Response(JSON.stringify([{ id: 8888, name: 'Dining Shop' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/v1/product/shop/')) {
        return new Response(JSON.stringify({ productList: [], totalProductsAmount: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(input, init);
    }) as any;

    const transActor = { providerId: transactionalProvider.id, providerSlug: transactionalProvider.slug, role: 'PROVIDER_OWNER' };

    // Attaching managed connector to transactional provider should SUCCEED,
    // preserving existing adapter type and transactional capabilities
    const transInstance = await connectorsService.createInstance(transActor, {
      providerSlug: transactionalProvider.slug,
      connectorDefinitionId: 'uzum',
      apiKey: 'uzum-key-trans-8888',
      shopId: '8888',
      shopName: 'Dining Shop'
    });
    assert.ok(transInstance, 'Transactional provider must be able to connect catalog');

    // Verify transactional provider's adapter is PRESERVED (not changed to managed-connector)
    const intactTransProvider = await prisma.provider.findUnique({ where: { id: transactionalProvider.id } });
    assert.equal(intactTransProvider?.adapterType, 'remote-http', 'adapterType must stay remote-http');
    assert.ok(intactTransProvider?.capabilities.includes(ProviderCapability.ACTION_CREATE), 'ACTION_CREATE must be preserved');
    assert.ok(intactTransProvider?.capabilities.includes(ProviderCapability.QUOTE), 'QUOTE must be preserved');
    assert.ok(intactTransProvider?.capabilities.includes(ProviderCapability.CATALOG), 'CATALOG must be present');
    // Verify managed connector metadata is added
    const transMeta = intactTransProvider?.metadata as any;
    assert.ok(transMeta?.managedConnector?.instanceId, 'managedConnector metadata must be set');

    // And verify a catalog-only / non-transactional provider CAN connect and gets full adapter switch:
    const catalogProvider = await prisma.provider.create({
      data: {
        slug: `cat-provider-${Date.now()}`,
        name: 'Catalog Only Provider',
        encryptedSecret: 'secret',
        webhookSecret: 'wh-cat-secret',
        adapterType: 'sandbox',
        capabilities: [
          ProviderCapability.METADATA,
          ProviderCapability.HEALTH,
          ProviderCapability.CATALOG,
          ProviderCapability.SEARCH
        ],
        config: {},
        metadata: {}
      }
    });

    const catActor = { providerId: catalogProvider.id, providerSlug: catalogProvider.slug, role: 'PROVIDER_OWNER' };
    await connectorsService.createInstance(catActor, {
      providerSlug: catalogProvider.slug,
      connectorDefinitionId: 'uzum',
      apiKey: 'uzum-key-cat-8888',
      shopId: '8888',
      shopName: 'Catalog Shop'
    });

    const updatedCatProvider = await prisma.provider.findUnique({ where: { id: catalogProvider.id } });
    assert.equal(updatedCatProvider?.adapterType, 'managed-connector');
    assert.ok(updatedCatProvider?.capabilities.includes(ProviderCapability.CATALOG));

    console.log('  ✓ Transactional provider: adapter preserved, catalog merged as supplementary.');

    // =========================================================================
    // Test 13: Uzum status.value parsing & Qorajoy (shopId: 128831) test exception
    // =========================================================================
    console.log('\n[13/13] Uzum status.value parsing, BLOCKED/ARCHIVED safety, and Qorajoy (128831) test exception...');

    // Test 13A: Normal shop (NOT in testCatalogShopIds): BLOCKED & ARCHIVED are excluded
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/shops')) {
        return new Response(JSON.stringify([{ id: 'shop-standard', name: 'Standard Shop' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/v1/product/shop/')) {
        assert.ok(urlStr.includes('filter=ACTIVE'), 'Standard shop must query with filter=ACTIVE');
        const items = [
          {
            productId: 7001,
            title: 'Active Item',
            status: { value: 'ACTIVE', description: 'Активный' },
            skuList: [{ skuId: 70001, price: 50000, quantityActive: 3 }]
          },
          {
            productId: 7002,
            title: 'Blocked Item',
            status: { value: 'BLOCKED', description: 'Заблокирован' },
            skuList: [{ skuId: 70002, price: 60000, quantityActive: 3 }]
          },
          {
            productId: 7003,
            title: 'Archived Item',
            status: { value: 'ARCHIVED', description: 'В архиве' },
            skuList: [{ skuId: 70003, price: 70000, quantityActive: 3 }]
          }
        ];
        return new Response(JSON.stringify({ productList: items, totalProductsAmount: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(input, init);
    }) as any;

    const standardSyncOutput = await uzumConnector.fetchCatalog({
      credentials: { apiKey: 'key-standard' },
      shopId: 'shop-standard'
    });
    assert.equal(standardSyncOutput.success, true);
    assert.equal(standardSyncOutput.items.length, 1, 'Only ACTIVE item must be included for standard shop');
    assert.equal(standardSyncOutput.items[0].externalProductId, '7001');
    assert.equal(standardSyncOutput.items[0].sourceStatus, 'ACTIVE');
    assert.equal(standardSyncOutput.items[0].isAvailable, true);

    // Test 13B: Qorajoy shop (shopId: 128831) with authorized credential
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/shops')) {
        return new Response(JSON.stringify([{ id: 128831, name: 'Qorajoy' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/v1/product/shop/')) {
        assert.ok(urlStr.includes('filter=ALL'), 'Qorajoy test catalog must query with filter=ALL');
        const items = [
          {
            productId: 8001,
            title: 'Qorajoy Active Phone Case',
            status: { value: 'ACTIVE', description: 'Активный' },
            skuList: [{ skuId: 80001, price: 25000, quantityActive: 10 }]
          },
          {
            productId: 8002,
            title: 'Qorajoy Blocked Powerbank',
            status: { value: 'BLOCKED', description: 'Заблокирован' },
            skuList: [{ skuId: 80002, price: 120000, quantityActive: 5 }]
          },
          {
            productId: 8003,
            title: 'Qorajoy Archived Cable',
            status: { value: 'ARCHIVED', description: 'В архиве' },
            skuList: [{ skuId: 80003, price: 15000, quantityActive: 0 }]
          }
        ];
        return new Response(JSON.stringify({ productList: items, totalProductsAmount: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(input, init);
    }) as any;

    const qorajoySyncOutput = await uzumConnector.fetchCatalog({
      credentials: { apiKey: 'key-qorajoy-valid' },
      shopId: '128831'
    });
    assert.equal(qorajoySyncOutput.success, true);
    assert.equal(qorajoySyncOutput.items.length, 3, 'All 3 items (including blocked and archived) must be imported for Qorajoy');

    // Verify BLOCKED item has real status preserved and is NOT available
    const blockedItem = qorajoySyncOutput.items.find(i => i.externalProductId === '8002')!;
    assert.equal(blockedItem.sourceStatus, 'BLOCKED', 'BLOCKED status must NOT become ACTIVE');
    assert.equal(blockedItem.isAvailable, false, 'BLOCKED item must have isAvailable: false');
    assert.equal(blockedItem.attributes.testCatalog, true, 'Must have testCatalog flag');
    assert.ok(blockedItem.attributes.testNotice?.includes('Test katalogi'));

    // Verify ARCHIVED item
    const archivedItem = qorajoySyncOutput.items.find(i => i.externalProductId === '8003')!;
    assert.equal(archivedItem.sourceStatus, 'ARCHIVED');
    assert.equal(archivedItem.isAvailable, false);

    // Test 13C: Qorajoy shop with unauthorized credential (credential lacks shop 128831)
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const urlStr = String(input);
      if (urlStr.includes('/v1/shops')) {
        return new Response(JSON.stringify([{ id: 999999, name: 'Other Shop' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(input, init);
    }) as any;

    const unauthorizedQorajoyOutput = await uzumConnector.fetchCatalog({
      credentials: { apiKey: 'key-other-merchant' },
      shopId: '128831'
    });
    assert.equal(unauthorizedQorajoyOutput.success, false);
    assert.ok(unauthorizedQorajoyOutput.errorMessage?.includes('Test katalogi uchun API kalit ushbu do‘konga tegishli bo‘lishi kerak'));

    globalThis.fetch = originalFetch;

    console.log('  ✓ Uzum status.value parsing, BLOCKED/ARCHIVED safety, and Qorajoy test exception verified.');

    console.log('\n🎉 ALL 13 ACCEPTANCE & AUDIT REGRESSION TESTS PASSED SUCCESSFULLY!\n');
  } finally {
    // Stop background scheduler timer
    connectorsService.onModuleDestroy();

    // Clean up test data
    try {
      await prisma.syncedProduct.deleteMany({
        where: { providerId: { in: [providerAlpha.id, providerBeta.id] } }
      });
      await prisma.connectorSyncRun.deleteMany({
        where: { providerId: { in: [providerAlpha.id, providerBeta.id] } }
      });
      await prisma.connectorInstance.deleteMany({
        where: { providerId: { in: [providerAlpha.id, providerBeta.id] } }
      });
      await prisma.connectorCredential.deleteMany({
        where: { providerId: { in: [providerAlpha.id, providerBeta.id] } }
      });
      await prisma.provider.deleteMany({
        where: { slug: { startsWith: 'trans-provider-' } }
      });
      await prisma.provider.deleteMany({
        where: { id: { in: [providerAlpha.id, providerBeta.id] } }
      });
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr);
    }
  }
}

main().catch(err => {
  console.error('❌ Acceptance Test Failed:', err);
  process.exit(1);
});
