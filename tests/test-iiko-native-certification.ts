import assert from 'node:assert/strict';
import { certifyIiko, IikoCertificationInputSchema } from '../packages/provider-sdk/src/connectors/iiko/iiko-certification.ts';
import { isCurrentCertification } from '../packages/shared/src/provider-eligibility.ts';
import { ActionStatus } from '../packages/contracts/src/action.ts';
import { ProviderCapability } from '../packages/contracts/src/provider.ts';

const org = 'ef4fa869-52c9-4594-b34f-c4898e45aaa9', terminal = '26873df8-3c8a-3a92-01a0-f748078f0067';
const product = '1da6c231-c013-46c3-a116-e5b39de581ba', orderId = 'de46ca14-2190-4b0c-a3c8-cbd7cf7d1d74';
const fixture = { confirmTestOrder: true, customerName: 'Test operator', phone: '+998900000000', city: 'Test city', address: 'Test address', currency: 'RUB', maxTotal: 100 };
function mock(options: { offline?: boolean; amount?: number; cancel?: boolean; creationFails?: boolean } = {}) {
  let creates = 0, cancels = 0, cancelled = false;
  const offering = { id: product, title: 'Test dish', isAvailable: true, basePrice: 100, variants: [{ id: product, isAvailable: true, basePrice: 100 }] };
  const adapter: any = {
    getConfig: () => ({ slug: 'test-iiko', config: { organizationId: org, terminalGroupId: terminal, externalMenuId: 'test-menu' } }),
    getProviderInfo: async () => ({ slug: 'test-iiko', adapterType: 'iiko', capabilities: ['METADATA','HEALTH','LOCATIONS','CATALOG','SEARCH','QUOTE','ACTION_CREATE','ACTION_STATUS','ACTION_CANCEL'] }),
    checkHealth: async () => ({ status: 'HEALTHY' }),
    getLocations: async () => [{ isActive: true }], getCatalog: async () => ({ offerings: [offering] }), searchOfferings: async () => [offering],
    requestQuote: async () => ({ id: 'q', subtotal: 100, totalFees: 0, totalDiscount: 0, total: options.amount || 100, currency: 'RUB', expiresAt: new Date(Date.now() + 10000).toISOString(), parameters: { organizationId: org }, locationId: terminal, lines: [] }),
    createAction: async () => { creates++; return { externalActionId: orderId }; },
    getAction: async () => ({ status: cancelled ? ActionStatus.CANCELLED : ActionStatus.PROCESSING, currency: 'RUB', total: 100 }),
    cancelAction: async () => { cancels++; if (options.cancel !== false) cancelled = true; return {}; },
    getClient: () => ({
      getTerminalGroups: async () => [{ id: terminal, organizationId: org }],
      checkTerminalGroupsAlive: async () => [{ terminalGroupId: terminal, organizationId: org, isAlive: !options.offline }],
      getExternalMenuNomenclature: async () => ({ products: [{ id: product, sizePrices: [{ sizeId: null, price: { isIncludedInMenu: true, currentPrice: 100 } }] }] }),
      getOrderById: async () => ({ orders: [{ id: orderId, organizationId: org, creationStatus: options.creationFails ? 'Error' : 'Success', order: { status: cancelled ? 'Cancelled' : 'WaitCooking', sum: 100 } }] })
    })
  };
  return { adapter, counts: () => ({ creates, cancels }) };
}
assert.equal(IikoCertificationInputSchema.safeParse({ ...fixture, confirmTestOrder: false }).success, false);
assert.equal(IikoCertificationInputSchema.safeParse({ ...fixture, phone: '1111' }).success, false);
const success = mock(); const report = await certifyIiko(success.adapter, fixture, async () => {});
assert.equal(report.isProductionReady, true); assert.equal(isCurrentCertification(report), true);
assert.deepEqual(success.counts(), { creates: 1, cancels: 1 });
assert.equal(isCurrentCertification({ ...report, tests: report.tests.filter(test => test.capability !== ProviderCapability.ACTION_CANCEL) }), false);
assert.equal(isCurrentCertification({ ...report, nativeEvidence: undefined }), false);
for (const options of [{ offline: true }, { amount: 101 }]) {
  const sample = mock(options); const failed = await certifyIiko(sample.adapter, fixture, async () => {});
  assert.equal(failed.isProductionReady, false); assert.equal(sample.counts().creates, 0);
}
const rejected = mock({ creationFails: true });
assert.equal((await certifyIiko(rejected.adapter, fixture, async () => {})).isProductionReady, false);
assert.deepEqual(rejected.counts(), { creates: 1, cancels: 1 });
const unresolved = mock({ cancel: false }); const failed = await certifyIiko(unresolved.adapter, fixture, async () => {});
assert.equal(failed.isProductionReady, false); assert.equal(isCurrentCertification(failed), false);
assert.equal(failed.nativeEvidence?.orderId, orderId); assert.deepEqual(unresolved.counts(), { creates: 1, cancels: 1 });
assert.ok(!JSON.stringify(report).includes(fixture.phone)); assert.ok(!JSON.stringify(report).includes(fixture.address));
console.log('PASS: native iiko lifecycle, authorization, offline/price guards, cleanup and incomplete evidence.');
