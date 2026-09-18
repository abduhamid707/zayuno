import assert from 'node:assert/strict';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import { CatalogService } from '../apps/api/src/modules/catalog/catalog.service.ts';
import {
  ProviderCapability,
  ProviderCategory,
  ProviderEnvironment,
  ProviderFulfillmentMode,
  ProviderStatus,
  ProviderType,
  ProviderHealthState
} from '../packages/contracts/src/provider.ts';
import { prisma } from '../packages/database/src/client.ts';
import { calculateProviderEligibility } from '../packages/shared/src/provider-eligibility.ts';

interface BenchResult {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  max: number;
}

function computePercentiles(latencies: number[]): BenchResult {
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  return {
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    p99: Number(p99.toFixed(2)),
    avg: Number((sum / latencies.length).toFixed(2)),
    max: Number(latencies[latencies.length - 1].toFixed(2))
  };
}

async function runScaleAndResilienceSuite() {
  console.log('================================================================');
  console.log('⚡ ZAYUNO V4: 1,000 SYNTHETIC PROVIDERS & SCALE BENCHMARK (V & W)');
  console.log('================================================================\n');

  console.log('👉 [Phase 1] Synthesizing 1,000 diverse providers...');
  const syntheticProviders: any[] = [];
  const syntheticLocations: any[] = [];

  const categories = [
    ProviderCategory.FOOD_AND_DRINK,
    ProviderCategory.RETAIL,
    ProviderCategory.SERVICES,
    ProviderCategory.ENTERTAINMENT,
    ProviderCategory.TRANSPORT
  ];

  for (let i = 1; i <= 1000; i++) {
    const isLive = i % 2 === 0;
    const isTransactional = i % 3 === 0;
    const isCompliant = i % 5 !== 0; // 80% compliant, 20% recertification
    const isDegraded = i % 20 === 0;
    const isDown = i % 50 === 0;

    const healthState = isDown
      ? ProviderHealthState.DOWN
      : isDegraded
        ? ProviderHealthState.DEGRADED
        : ProviderHealthState.HEALTHY;

    const caps = isTransactional
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

    const slug = `synthetic-provider-${i}`;
    const prov = {
      id: `prov-synth-${i}`,
      slug,
      name: `Synthetic Provider #${i}`,
      status: ProviderStatus.ACTIVE,
      type: ProviderType.RETAIL,
      environment: isLive ? ProviderEnvironment.LIVE : ProviderEnvironment.SANDBOX,
      category: categories[i % categories.length],
      subcategory: 'general',
      capabilities: caps,
      encryptedSecret: `secret_${i}`,
      webhookSecret: `wh_secret_${i}`,
      metadata: {
        reviewStatus: 'APPROVED',
        isCertified: isCompliant,
        isPublished: true,
        fulfillmentMode: ProviderFulfillmentMode.DELIVERY,
        environment: isLive ? ProviderEnvironment.LIVE : ProviderEnvironment.SANDBOX,
        health: {
          state: healthState,
          consecutiveFailures: isDown ? 3 : isDegraded ? 1 : 0,
          consecutiveSuccesses: isDown || isDegraded ? 0 : 5,
          isTemporarilyUnavailable: isDown
        },
        eligibility: {
          contractVersion: 'v2 current',
          complianceStatus: isCompliant ? 'COMPLIANT' : 'RECERTIFICATION_REQUIRED',
          profile: isTransactional ? 'TRANSACTIONAL' : 'READ_ONLY',
          discoveryVisibility: 'VISIBLE',
          certifiedCapabilities: caps
        }
      },
      locations: [
        { id: `loc-synth-${i}`, providerLocationId: `loc-ext-${i}`, isActive: true }
      ]
    };

    syntheticProviders.push(prov);
    syntheticLocations.push({
      id: `loc-synth-${i}`,
      providerId: prov.id,
      providerLocationId: `loc-ext-${i}`,
      name: `Branch ${i}`,
      isActive: true,
      provider: { slug: prov.slug }
    });
  }

  console.log(`   ✅ Generated ${syntheticProviders.length} synthetic providers in memory.`);

  // Mock Prisma
  const originalPrisma = {
    providerFindUnique: prisma.provider.findUnique,
    providerFindMany: prisma.provider.findMany,
    providerCount: prisma.provider.count,
    locationFindFirst: prisma.location.findFirst,
    locationFindMany: prisma.location.findMany
  };

  const providerMap = new Map<string, any>();
  for (const p of syntheticProviders) {
    providerMap.set(p.slug, p);
    providerMap.set(p.id, p);
  }

  (prisma.provider as any).findUnique = async ({ where }: any) => {
    if (where.slug) return providerMap.get(where.slug) || null;
    if (where.id) return providerMap.get(where.id) || null;
    return null;
  };

  (prisma.provider as any).findMany = async ({ where }: any) => {
    return syntheticProviders.filter((p) => {
      if (where.status && p.status !== where.status) return false;
      if (where.environment && p.environment !== where.environment) return false;
      return true;
    });
  };

  (prisma.provider as any).count = async () => syntheticProviders.length;

  (prisma.location as any).findFirst = async ({ where }: any) => {
    return syntheticLocations.find((loc) => {
      if (where.provider?.slug && loc.provider.slug !== where.provider.slug) return false;
      if (where.providerId && loc.providerId !== where.providerId) return false;
      if (where.OR) {
        return where.OR.some((c: any) => c.id === loc.id || c.providerLocationId === loc.providerLocationId);
      }
      return true;
    }) || null;
  };

  // Setup registry with generic adapter factory (no provider-specific logic)
  const registry: any = {
    getAdapter: async (slug: string) => {
      const p = providerMap.get(slug);
      if (!p) return null;
      return {
        info: p,
        getCatalog: async () => ({ providerSlug: slug, categories: [], offerings: [] })
      };
    },
    assertAndGetCapability: async (slug: string, cap: ProviderCapability) => {
      const p = providerMap.get(slug);
      if (!p) throw new Error(`Provider ${slug} not found`);
      return {
        info: p,
        getCatalog: async () => ({ providerSlug: slug, categories: [], offerings: [] })
      };
    }
  };

  const redisService: any = {
    acquireLock: async () => true,
    releaseLock: async () => {},
    get: async () => null,
    set: async () => {},
    delByPattern: async () => 0
  };

  const providersService = new ProvidersService(registry);
  const catalogService = new CatalogService(registry, providersService, redisService);

  try {
    // =========================================================================
    // SECTION V: Benchmark 1,000 Providers Lookup & Eligibility Latency
    // =========================================================================
    console.log('\n👉 [Section V] Benchmarking Discovery & Capability Resolution on 1,000 Providers...');
    const discoveryStart = performance.now();
    const discoveryResult = await providersService.findProviders({
      environment: ProviderEnvironment.LIVE,
      status: ProviderStatus.ACTIVE,
      limit: 1000
    });
    const discoveryDurationMs = performance.now() - discoveryStart;

    assert.equal(discoveryResult.total, 500, '500 of the 1,000 synthetic providers must be LIVE');
    console.log(`   📊 Discovery of 1,000 providers completed in ${discoveryDurationMs.toFixed(2)}ms (found ${discoveryResult.total} LIVE)`);
    assert.ok(discoveryDurationMs < 200, 'Full list discovery over 1,000 providers must be under 200ms');

    // Benchmark individual provider resolver + capability checks (p50, p95, p99)
    const latencies: number[] = [];
    const sampleSlugs = Array.from({ length: 200 }).map(() => {
      const randomIdx = Math.floor(Math.random() * 1000) + 1;
      return `synthetic-provider-${randomIdx}`;
    });

    for (const slug of sampleSlugs) {
      const start = performance.now();
      const pEnv = Number(slug.split('-')[2]) % 2 === 0 ? ProviderEnvironment.LIVE : ProviderEnvironment.SANDBOX;
      const p = await providersService.getProviderBySlug(slug, pEnv);
      assert.ok(p, `Provider ${slug} must be resolvable`);
      assert.ok(p.capabilities.length > 0, 'Capabilities must resolve');
      const elapsed = performance.now() - start;
      latencies.push(elapsed);
    }

    const bench = computePercentiles(latencies);
    console.log(`   📊 Latency Benchmarks (200 random samples across 1,000 providers):`);
    console.log(`      • p50: ${bench.p50}ms`);
    console.log(`      • p95: ${bench.p95}ms`);
    console.log(`      • p99: ${bench.p99}ms`);
    console.log(`      • avg: ${bench.avg}ms, max: ${bench.max}ms`);

    assert.ok(bench.p50 < 10, 'p50 latency must be under 10ms');
    assert.ok(bench.p95 < 25, 'p95 latency must be under 25ms');
    assert.ok(bench.p99 < 50, 'p99 latency must be under 50ms');

    // =========================================================================
    // SECTION V (Part 2): Adding Provider #1001 with ZERO Core Code Changes
    // =========================================================================
    console.log('\n👉 [Section V.2] Dynamic Provider #1001 Onboarding Invariant Proof...');
    const provider1001 = {
      id: 'prov-synth-1001',
      slug: 'ultra-new-provider-1001',
      name: 'Dynamic Enterprise Provider 1001',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.RETAIL,
      environment: ProviderEnvironment.LIVE,
      category: ProviderCategory.SERVICES,
      subcategory: 'cloud_hosting',
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.CATALOG
      ],
      metadata: {
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        fulfillmentMode: ProviderFulfillmentMode.REMOTE,
        environment: ProviderEnvironment.LIVE,
        eligibility: {
          contractVersion: 'v2 current',
          complianceStatus: 'COMPLIANT',
          profile: 'READ_ONLY',
          discoveryVisibility: 'VISIBLE',
          certifiedCapabilities: [
            ProviderCapability.METADATA,
            ProviderCapability.HEALTH,
            ProviderCapability.CATALOG
          ]
        }
      }
    };

    syntheticProviders.push(provider1001);
    providerMap.set(provider1001.slug, provider1001);
    providerMap.set(provider1001.id, provider1001);

    // Resolve provider 1001 through core without ANY hardcoding
    const resolved1001 = await providersService.getProviderBySlug('ultra-new-provider-1001');
    assert.equal(resolved1001.slug, 'ultra-new-provider-1001');
    assert.equal(resolved1001.name, 'Dynamic Enterprise Provider 1001');

    const published1001 = await providersService.assertProviderPublished('ultra-new-provider-1001', ProviderEnvironment.LIVE);
    assert.equal(published1001.slug, 'ultra-new-provider-1001');

    console.log('   ✅ Provider #1001 operates instantly with zero modifications to core codebase.');

    // =========================================================================
    // SECTION W: 1,000+ Concurrency Load Simulation
    // =========================================================================
    console.log('\n👉 [Section W] High Concurrency Load Test (1,000 concurrent lookups)...');
    const loadStart = performance.now();
    const concurrentRequests = Array.from({ length: 1000 }).map((_, idx) => {
      const id = (idx % 1000) + 1;
      const targetSlug = `synthetic-provider-${id}`;
      const targetEnv = id % 2 === 0 ? ProviderEnvironment.LIVE : ProviderEnvironment.SANDBOX;
      return providersService.getProviderBySlug(targetSlug, targetEnv);
    });

    const loadResults = await Promise.all(concurrentRequests);
    const loadDuration = performance.now() - loadStart;
    const rps = (1000 / (loadDuration / 1000)).toFixed(0);

    assert.equal(loadResults.length, 1000);
    console.log(`   📊 1,000 concurrent lookups resolved in ${loadDuration.toFixed(2)}ms (~ ${rps} req/sec)`);
    assert.ok(loadDuration < 1500, '1,000 in-process concurrent lookups must finish well within 1.5s');

    console.log('\n================================================================');
    console.log('🎉 SCALE & RESILIENCE SUITE (SECTIONS V & W) PASSED CLEANLY!');
    console.log('================================================================\n');
  } finally {
    prisma.provider.findUnique = originalPrisma.providerFindUnique;
    prisma.provider.findMany = originalPrisma.providerFindMany;
    prisma.provider.count = originalPrisma.providerCount;
    prisma.location.findFirst = originalPrisma.locationFindFirst;
    prisma.location.findMany = originalPrisma.locationFindMany;
  }
}

runScaleAndResilienceSuite().catch((err) => {
  console.error('❌ Scale and Resilience Suite Failed:', err);
  process.exit(1);
});
