import assert from 'node:assert/strict';
import { ProviderCapability, ProviderFulfillmentMode, ProviderStatus, ProviderType, type ProviderAdapter } from '../packages/contracts/src/provider';
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

const physicalBooking: ProviderAdapter = {
  ...metadataOnly('expected-provider'),
  getProviderInfo: async () => ({
    ...(await metadataOnly('expected-provider').getProviderInfo!()),
    type: ProviderType.BOOKINGS,
    fulfillmentMode: ProviderFulfillmentMode.ONSITE
  })
};
const physicalBookingReport = await new ProviderCertificationRunner(physicalBooking).runAllTests();
assert.equal(physicalBookingReport.isProductionReady, false);
assert.ok(physicalBookingReport.missingMandatoryCapabilities.includes(ProviderCapability.LOCATIONS));
assert.ok(physicalBookingReport.tests.some(test => test.testId === 'discovery-readiness' && test.status === 'FAIL'));

const remoteBooking: ProviderAdapter = {
  ...metadataOnly('expected-provider'),
  getProviderInfo: async () => ({
    ...(await metadataOnly('expected-provider').getProviderInfo!()),
    type: ProviderType.BOOKINGS,
    fulfillmentMode: ProviderFulfillmentMode.REMOTE
  })
};
const remoteBookingReport = await new ProviderCertificationRunner(remoteBooking).runAllTests();
assert.equal(remoteBookingReport.missingMandatoryCapabilities.includes(ProviderCapability.LOCATIONS), false);
assert.equal(remoteBookingReport.tests.some(test => test.testId === 'discovery-readiness'), false);

console.log('Provider certification guard tests passed.');
