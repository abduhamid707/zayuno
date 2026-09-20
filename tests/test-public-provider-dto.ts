import assert from 'node:assert/strict';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';

async function main() {
  const service = new ProvidersService({} as any);
  const fixture = {
    id: 'internal-provider-id',
    slug: 'provider-demo',
    name: 'Provider Demo',
    description: 'Public description',
    logoUrl: 'https://cdn.example/logo.png',
    status: 'ACTIVE',
    type: 'SERVICES',
    environment: 'LIVE',
    fulfillmentMode: 'REMOTE',
    category: 'PROFESSIONAL_SERVICES',
    subcategory: 'consulting',
    geography: ['UZ'],
    adapterType: 'remote-http',
    authMethod: 'API_KEY',
    capabilities: ['CATALOG', 'QUOTE'],
    baseUrl: 'https://provider-internal.example/api',
    supportContact: { email: 'support@example.com' },
    isCertified: true,
    isPublished: true,
    metadata: {
      ownerUserId: 'usr_internal_owner',
      lastCertificationReport: { endpoint: '/internal/certification' },
      healthMonitoring: { lastFailureAt: '2026-09-18T00:00:00.000Z' }
    }
  };
  (service as any).resolveCanonicalProvider = async () => fixture;
  (service as any).getProviderBySlug = async () => fixture;

  const provider = await service.getPublicProviderBySlug('provider-demo');
  assert.deepEqual(Object.keys(provider).sort(), [
    'branding',
    'capabilities',
    'category',
    'description',
    'environment',
    'fulfillmentMode',
    'geography',
    'logoUrl',
    'manifest',
    'name',
    'slug',
    'status',
    'subcategory',
    'supportContact',
    'type'
  ]);
  assert.equal(provider.slug, 'provider-demo');
  assert.equal((provider as any).baseUrl, undefined);
  assert.equal((provider as any).adapterType, undefined);
  assert.equal((provider as any).authMethod, undefined);
  assert.equal((provider as any).metadata, undefined);
  assert.equal((provider as any).id, undefined);

  console.log('Public provider DTO exposes only stable customer and agent discovery fields.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
