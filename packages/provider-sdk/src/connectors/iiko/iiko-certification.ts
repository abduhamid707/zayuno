import { z } from 'zod';
import { ActionStatus, CreateActionInputSchema, ProviderCapability as Cap, ProviderCapabilityProfile,
  ProviderType, ProviderFulfillmentMode, RequestQuoteInputSchema } from '@zayuno/contracts';
import type { CertificationReport, CertificationTestResult } from '../../certification';
import type { IikoProviderAdapter } from './iiko-adapter';

// Native iiko uses authenticated status reads, not the remote-provider HTTP/webhook protocol.
export const IikoCertificationInputSchema = z.object({
  confirmTestOrder: z.literal(true), customerName: z.string().trim().min(1).max(80),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/), city: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(300), currency: z.enum(['UZS', 'USD', 'EUR', 'RUB']),
  maxTotal: z.number().finite().positive().max(1000000)
}).strict();
export type IikoCertificationInput = z.infer<typeof IikoCertificationInputSchema>;
export const IIKO_CERTIFICATION_TEST_IDS = ['metadata', 'health', 'locations', 'catalog', 'search', 'quote', 'action_create', 'action_status', 'action_cancel'];

export async function certifyIiko(adapter: IikoProviderAdapter, rawInput: unknown,
  sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))): Promise<CertificationReport> {
  const input = IikoCertificationInputSchema.parse(rawInput);
  const config = adapter.getConfig().config || {};
  if (!config.organizationId || !config.terminalGroupId || !config.externalMenuId) throw new Error('iiko target configuration is incomplete.');
  const slug = adapter.getConfig().slug;
  const tests: CertificationTestResult[] = [];
  let orderId: string | undefined;
  const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
  const probe = async (id: string, cap: Cap, fn: () => Promise<void>) => {
    const start = Date.now();
    try {
      await fn(); tests.push({ testId: id, name: id, capability: cap, isMandatory: true,
        passed: true, status: 'PASS', durationMs: Date.now() - start });
    } catch {
      // Never persist upstream errors, credentials, customer contact or address in reports.
      tests.push({ testId: id, name: id, capability: cap, isMandatory: true, passed: false,
        status: 'FAIL', durationMs: Date.now() - start, error: `${id} tekshiruvi o‘tmadi.` });
      throw new Error(`${id} failed`);
    }
  };
  let quote: any, items: any[] = [], catalog: any;
  try {
    await probe('metadata', Cap.METADATA, async () => {
      const info = await adapter.getProviderInfo();
      assert(info.adapterType === 'iiko' && info.slug === slug, 'Wrong adapter.');
      assert(IIKO_CERTIFICATION_TEST_IDS.every(id => info.capabilities.includes(id.toUpperCase() as Cap)), 'Missing native capabilities.');
      const groups = await adapter.getClient().getTerminalGroups([config.organizationId]);
      assert(groups.some(group => group.id === config.terminalGroupId && group.organizationId === config.organizationId), 'Wrong terminal target.');
    });
    await probe('health', Cap.HEALTH, async () => {
      const alive = await adapter.getClient().checkTerminalGroupsAlive([config.terminalGroupId], [config.organizationId]);
      assert(alive.some(group => group.terminalGroupId === config.terminalGroupId && group.organizationId === config.organizationId && group.isAlive), 'POS offline.');
      assert((await adapter.checkHealth()).status === 'HEALTHY', 'Unhealthy.');
    });
    await probe('locations', Cap.LOCATIONS, async () => {
      const locations = await adapter.getLocations({ providerSlug: slug, activeOnly: true });
      assert(locations.some(location => location.isActive !== false), 'No active location.');
    });
    await probe('catalog', Cap.CATALOG, async () => {
      catalog = await adapter.getCatalog({ providerSlug: slug, locationId: config.terminalGroupId });
      assert(catalog.offerings.some((offering: any) => offering.isAvailable && offering.basePrice > 0), 'Empty menu.');
    });
    await probe('search', Cap.SEARCH, async () => {
      const first = catalog.offerings.find((offering: any) => offering.isAvailable && offering.basePrice > 0);
      const found = await adapter.searchOfferings({ providerSlug: slug, locationId: config.terminalGroupId, query: first.title, limit: 20 });
      assert(found.some(offering => offering.id === first.id), 'Search mismatch.');
    });
    await probe('quote', Cap.QUOTE, async () => {
      const menu = await adapter.getClient().getExternalMenuNomenclature(config.organizationId, config.externalMenuId);
      const offering = catalog.offerings.find((item: any) => item.isAvailable && item.basePrice > 0 &&
        !item.optionGroups?.some((group: any) => group.isRequired || group.minSelections > 0 || group.options.some((option: any) => option.isDefault)) &&
        item.variants?.some((variant: any) => variant.isAvailable && variant.basePrice > 0));
      assert(offering, 'Use an available simple test dish.');
      const variant = offering.variants.find((item: any) => item.isAvailable && item.basePrice > 0);
      const product = menu.products.find(item => item.id === offering.id);
      const size = product?.sizePrices.find(item => (item.sizeId || offering.id) === variant.id);
      assert(size?.price.isIncludedInMenu && size.price.currentPrice > 0, 'Invalid price.');
      assert(!product?.modifiers?.some(item => (item.minAmount ?? 0) > 0 || (item.defaultAmount ?? 0) > 0), 'Required modifiers.');
      items = [{ offeringId: offering.id, variantId: size?.sizeId || undefined, quantity: 1 }];
      quote = await adapter.requestQuote(RequestQuoteInputSchema.parse({ providerSlug: slug, locationId: config.terminalGroupId, items,
        customer: { name: input.customerName, phone: input.phone }, destination: { raw: input.address, city: input.city } }));
      assert(quote.total > 0 && quote.total <= input.maxTotal && quote.currency === input.currency && Date.parse(quote.expiresAt) > Date.now(), 'Quote exceeds approved amount/currency.');
      assert(quote.parameters?.organizationId === config.organizationId && quote.locationId === config.terminalGroupId, 'Quote target mismatch.');
    });
    await probe('action_create', Cap.ACTION_CREATE, async () => {
      const created = await adapter.createAction(CreateActionInputSchema.parse({ providerSlug: slug, locationId: config.terminalGroupId,
        quoteId: quote.id, items, userConfirmed: true, customer: { name: input.customerName, phone: input.phone },
        destination: { raw: input.address, city: input.city },
        quote: { id: quote.id, subtotal: quote.subtotal, fees: quote.totalFees, discount: quote.totalDiscount,
          total: quote.total, currency: quote.currency, lines: quote.lines } }));
      orderId = created.externalActionId;
      assert(orderId && /^[0-9a-f-]{36}$/i.test(orderId), 'No order ID.');
    });
    await probe('action_status', Cap.ACTION_STATUS, async () => {
      for (let attempt = 0; attempt < 15; attempt++) {
        const response = await adapter.getClient().getOrderById(config.organizationId, [orderId!]);
        const order = response.orders.find(item => item.id === orderId && item.organizationId === config.organizationId);
        assert(order?.creationStatus !== 'Error', 'Creation rejected.');
        if (order?.creationStatus === 'Success' && order.order?.status) {
          assert(order.order.status !== 'Cancelled' && Math.abs((order.order.sum ?? -1) - quote.total) < 0.005, 'Order amount mismatch.');
          const tracked = await adapter.getAction({ providerSlug: slug, actionId: orderId! });
          assert(tracked.status !== ActionStatus.FAILED && tracked.status !== ActionStatus.CANCELLED && tracked.currency === quote.currency && Math.abs(tracked.total - quote.total) < 0.005, 'Normalized status mismatch.');
          return;
        }
        await sleep(2000);
      }
      throw new Error('Creation timeout.');
    });
  } catch { /* Failed stage recorded above; cleanup still runs. */ }
  if (orderId) {
    try {
      await probe('action_cancel', Cap.ACTION_CANCEL, async () => {
        try { await adapter.cancelAction({ providerSlug: slug, actionId: orderId!, reason: 'Zayuno native iiko certification cleanup' }); } catch { /* poll once sent */ }
        for (let attempt = 0; attempt < 15; attempt++) {
          const response = await adapter.getClient().getOrderById(config.organizationId, [orderId!]);
          const order = response.orders.find(item => item.id === orderId && item.organizationId === config.organizationId);
          if (order?.order?.status === 'Cancelled') {
            assert((await adapter.getAction({ providerSlug: slug, actionId: orderId! })).status === ActionStatus.CANCELLED, 'Adapter cancellation mismatch.');
            return;
          }
          await sleep(2000);
        }
        throw new Error('Cleanup unresolved.');
      });
    } catch { /* Report retains ID for cashier cleanup. Never retry create. */ }
  }
  const passed = IIKO_CERTIFICATION_TEST_IDS.every(id => tests.some(test => test.testId === id && test.passed));
  return { certificationVersion: 2, mode: 'NATIVE_IIKO', scope: 'AUTOMATED_INTEGRATION', operationalReviewRequired: true,
    operationalReviewRequirements: ['Restaurant ownership and test-order permission', 'Delivery coverage and payment arrangements'],
    providerSlug: slug, totalTests: tests.length, passedCount: tests.filter(test => test.passed).length,
    failedCount: tests.filter(test => !test.passed).length, skippedCount: IIKO_CERTIFICATION_TEST_IDS.length - tests.length,
    isCertified: passed, isProductionReady: passed, missingMandatoryCapabilities: [],
    capabilitiesTested: tests.filter(test => test.passed).map(test => test.capability), profile: ProviderCapabilityProfile.TRANSACTIONAL,
    providerType: ProviderType.DELIVERY, fulfillmentMode: ProviderFulfillmentMode.DELIVERY,
    discoveryReadiness: { isReady: passed, reasons: passed ? [] : ['NATIVE_IIKO_CHECK_FAILED'] }, tests,
    ...(orderId ? { nativeEvidence: { adapterType: 'iiko' as const, statusTransport: 'POLLING' as const, orderId, checkedAt: new Date().toISOString() } } : {}) };
}
