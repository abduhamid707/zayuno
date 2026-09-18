import assert from 'node:assert/strict';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import {
  ProviderCategory,
  ProviderEnvironment,
  ProviderInfoSchema,
  ProviderStatus,
  ProviderType
} from '../packages/contracts/src/provider.ts';
import { prisma } from '../packages/database/src/client.ts';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools.ts';

function provider(slug: string, environment: ProviderEnvironment, category: ProviderCategory) {
  return {
    id: `provider_${slug}`,
    slug,
    name: slug,
    status: ProviderStatus.ACTIVE,
    type: ProviderType.SERVICES,
    environment,
    category,
    subcategory: 'test_service',
    adapterType: 'remote-http',
    capabilities: ['METADATA'],
    config: {},
    metadata: {
      environment,
      category,
      subcategory: 'test_service',
      fulfillmentMode: 'REMOTE',
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true
    },
    locations: []
  };
}

async function main() {
  const legacy = ProviderInfoSchema.parse({
    ...provider('legacy-food', ProviderEnvironment.LIVE, ProviderCategory.FOOD_AND_DRINK),
    environment: 'production',
    category: 'food_delivery'
  });
  assert.equal(legacy.environment, ProviderEnvironment.LIVE);
  assert.equal(legacy.category, ProviderCategory.FOOD_AND_DRINK);

  const records = [
    provider('live-food', ProviderEnvironment.LIVE, ProviderCategory.FOOD_AND_DRINK),
    provider('sandbox-food', ProviderEnvironment.SANDBOX, ProviderCategory.FOOD_AND_DRINK),
    provider('live-retail', ProviderEnvironment.LIVE, ProviderCategory.RETAIL)
  ];
  const originalFindMany = prisma.provider.findMany;
  const originalFindUnique = prisma.provider.findUnique;
  const calls: any[] = [];
  try {
    (prisma.provider as any).findMany = async ({ where }: any) => {
      calls.push(where);
      return records.filter((record) =>
        (!where.status || record.status === where.status) &&
        (!where.environment || record.environment === where.environment)
      );
    };
    (prisma.provider as any).findUnique = async ({ where }: any) =>
      records.find((record) => record.slug === where.slug) || null;

    const service = new ProvidersService({} as any);
    const defaultProviders = await service.listPublicProviders();
    assert.deepEqual(defaultProviders.map((value) => value.slug), ['live-food', 'live-retail']);
    assert.ok(defaultProviders.every((value) => value.environment === ProviderEnvironment.LIVE));
    assert.equal(calls.at(-1).environment, ProviderEnvironment.LIVE);

    const legacyCategory = await service.findPublicProviders({
      category: 'food_delivery',
      limit: 20,
      offset: 0
    });
    assert.deepEqual(legacyCategory.providers.map((value) => value.slug), ['live-food']);
    assert.equal(legacyCategory.providers[0].category, ProviderCategory.FOOD_AND_DRINK);

    const sandbox = await service.findPublicProviders({
      category: ProviderCategory.FOOD_AND_DRINK,
      environment: ProviderEnvironment.SANDBOX,
      limit: 20,
      offset: 0
    });
    assert.deepEqual(sandbox.providers.map((value) => value.slug), ['sandbox-food']);
    assert.equal(sandbox.providers[0].environment, ProviderEnvironment.SANDBOX);
    assert.equal(calls.at(-1).environment, ProviderEnvironment.SANDBOX);

    const sandboxListByStatus = await service.listPublicProviders('SANDBOX' as any);
    assert.deepEqual(sandboxListByStatus.map((value) => value.slug), ['sandbox-food']);
    assert.equal(sandboxListByStatus[0].environment, ProviderEnvironment.SANDBOX);
    assert.equal(calls.at(-1).environment, ProviderEnvironment.SANDBOX);

    const mcpFind = ZAYUNO_MCP_TOOLS.find((tool) => tool.name === 'find_providers')!;
    let mcpFilter: any;
    const mcpFindResult = await mcpFind.handler(
      { category: 'food_delivery', environment: 'SANDBOX' },
      {
        findProviders: async (filter: any) => {
          mcpFilter = filter;
          return {
            total: 1,
            providers: [{
              slug: 'sandbox-food',
              name: 'Sandbox Food',
              status: 'ACTIVE',
              type: 'SERVICES',
              environment: 'SANDBOX',
              category: 'FOOD_AND_DRINK',
              capabilities: ['CATALOG']
            }]
          };
        }
      } as any
    );
    assert.equal(mcpFilter.category, 'food_delivery', 'MCP must preserve the legacy alias for canonical API normalization.');
    assert.equal(mcpFilter.environment, 'SANDBOX');
    assert.equal(mcpFindResult.providers[0].environment, 'SANDBOX');
    assert.equal(mcpFindResult.providers[0].category, 'FOOD_AND_DRINK');

    // Canonical resolver preserves registered sandbox environment when environment is omitted
    assert.deepEqual(
      await service.getCapabilities('sandbox-food'),
      ['METADATA'],
      'Canonical resolver preserves registered sandbox environment when environment is omitted.'
    );
    // Explicit LIVE filter on a sandbox provider must reject
    await assert.rejects(
      () => service.getCapabilities('sandbox-food', ProviderEnvironment.LIVE),
      /Provider/, 
      'Explicit LIVE filter on a sandbox provider must reject.'
    );
    assert.deepEqual(
      await service.getCapabilities('sandbox-food', ProviderEnvironment.SANDBOX),
      ['METADATA'],
      'Sandbox capability lookup works when environment is explicitly SANDBOX.'
    );

    const mcpCapabilities = ZAYUNO_MCP_TOOLS.find((tool) => tool.name === 'get_provider_capabilities')!;
    let capabilityEnvironment: string | undefined;
    await mcpCapabilities.handler(
      { providerSlug: 'sandbox-food', environment: 'SANDBOX' },
      {
        getProviderCapabilities: async (_slug: string, environment?: string) => {
          capabilityEnvironment = environment;
          return ['METADATA'];
        }
      } as any
    );
    assert.equal(capabilityEnvironment, 'SANDBOX', 'MCP must forward an explicit environment to public capability lookup.');

    const mcpLocations = ZAYUNO_MCP_TOOLS.find((tool) => tool.name === 'get_locations')!;
    let locationsEnvironment: string | undefined;
    await mcpLocations.handler(
      { providerSlug: 'sandbox-food', environment: 'SANDBOX' },
      {
        getLocations: async (_slug: string, _activeOnly?: boolean, environment?: string) => {
          locationsEnvironment = environment;
          return [];
        }
      } as any
    );
    assert.equal(locationsEnvironment, 'SANDBOX', 'MCP must forward an explicit environment to public location lookup.');
  } finally {
    prisma.provider.findMany = originalFindMany;
    prisma.provider.findUnique = originalFindUnique;
  }

  console.log('Provider discovery defaults to LIVE and canonicalizes category/environment aliases.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
