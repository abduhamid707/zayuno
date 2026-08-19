import assert from 'node:assert/strict';
import { ProviderCapability, ProviderStatus, ProviderType, type ProviderAdapter } from '../packages/contracts/src/provider';
import { ProviderCertificationRunner } from '../packages/provider-sdk/src/certification';

const metadataOnly = (remoteSlug: string): ProviderAdapter => ({
  providerSlug: 'expected-provider',
  getCapabilities: () => [ProviderCapability.METADATA],
  hasCapability: capability => capability === ProviderCapability.METADATA,
  getProviderInfo: async () => ({
    id: remoteSlug,
    slug: remoteSlug,
    name: 'Certification Guard Test',
    status: ProviderStatus.SANDBOX,
    type: ProviderType.SERVICES,
    category: 'test',
    geography: ['UZ'],
    adapterType: 'remote-http',
    authMethod: 'API_KEY' as any,
    capabilities: [ProviderCapability.METADATA],
    isCertified: false,
    isPublished: false,
    metadata: {}
  })
});

const incomplete = await new ProviderCertificationRunner(metadataOnly('expected-provider')).runAllTests();
assert.equal(incomplete.isCertified, true, 'Declared tests should pass for the fixture.');
assert.equal(incomplete.isProductionReady, false, 'Missing mandatory capabilities must block production readiness.');
assert.ok(incomplete.missingMandatoryCapabilities.includes(ProviderCapability.CATALOG));

const impersonating = await new ProviderCertificationRunner(metadataOnly('different-provider')).runAllTests();
assert.equal(impersonating.isCertified, false, 'A remote provider with a mismatched slug must fail certification.');
assert.match(impersonating.tests[0].error || '', /slug mismatch/i);

console.log('Provider certification guard tests passed.');
