import assert from 'node:assert/strict';
import { IikoProviderAdapter } from '../packages/provider-sdk/src/connectors/iiko/iiko-adapter';
import { searchIikoCatalog } from '../packages/provider-sdk/src/connectors/iiko/catalog-search';
import { assertActionRequirements } from '../apps/api/src/common/action-requirements';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service';
import { prisma } from '../packages/database/src/client';
import { normalizeProviderCategory } from '../packages/contracts/src/provider';
import { formatCustomerActionStatus, formatCustomerQuote, formatCustomerPaymentOptions } from '../packages/shared/src/customer-presenter';
import { getAgentErrorPresentation } from '../packages/shared/src/errors';
import { toPublicAction } from '../packages/shared/src/public-action';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools';

async function main() {
  const offerings: any[] = [
    { id: 'olivye', title: 'Olivye', description: 'Kartoshka va sabzili salat' },
    { id: 'kabob', title: 'Qozon kabob', description: 'Kartoshkali go‘sht' },
    { id: 'osh', title: 'Osh', description: 'Guruch, go‘sht va sabzi bilan tayyorlanadi' },
  ];
  for (const query of ['Osh', 'osh', 'palov', 'plov', 'pilaf', 'плов', 'oshh', 'paloff', 'osh plov palov']) {
    assert.equal(searchIikoCatalog(offerings, query)[0]?.id, 'osh', query);
  }
  assert.deepEqual(searchIikoCatalog(offerings, 'osh').map(o => o.id), ['osh']);
  assert.equal(searchIikoCatalog(offerings, 'guruch gosht sabzi')[0].id, 'osh');
  assert.equal(searchIikoCatalog(offerings, 'guruchli ovqat')[0].id, 'osh');
  assert.equal(searchIikoCatalog(offerings, 'sushi').length, 0);
  for (const alias of ['food', 'food_delivery', 'restaurant', 'meal', 'osh', 'ovqat', 'taom']) assert.equal(normalizeProviderCategory(alias), 'FOOD_AND_DRINK');

  assert.throws(() => assertActionRequirements({ adapterType: 'iiko' }, { items: [{ offeringId: 'osh' }] }, 'QUOTE'), (e: any) => e.details.missingFields.includes('locations.DESTINATION') && e.details.missingFields.includes('customer.phone'));
  assertActionRequirements({ adapterType: 'iiko' }, { items: [{ offeringId: 'osh' }], destination: { raw: 'Furqat 2' }, customer: { phone: '+998901234567' } }, 'QUOTE');

  let allowed = true; let coverageConfigured = true; let creates = 0; let lastRequest: any;
  const orders = new Map<string, any>();
  const client: any = {
    getOrganizations: async () => [{ id: 'org', currencyIsoName: 'UZS', name: 'Restoran' }],
    getTerminalGroups: async () => [{ id: 'branch', organizationId: 'org', name: 'Filial', timeZone: '05:00:00' }],
    getNomenclature: async () => ({ groups: [], products: [{ id: 'osh', name: 'Osh', sizePrices: [{ price: { currentPrice: 35000 } }] }] }),
    getStopLists: async () => ({}),
    getDeliveryRestrictions: async () => ({ deliveryRestrictions: [{ organizationId: 'org', restrictions: coverageConfigured ? [{ terminalGroupId: 'branch', zone: 'Markaz' }] : [], deliveryZones: coverageConfigured ? [{ name: 'Markaz', coordinates: [{ latitude: 41, longitude: 69 }, { latitude: 42, longitude: 69 }, { latitude: 42, longitude: 70 }, { latitude: 41, longitude: 70 }] }] : [] }] }),
    getAllowedDeliveryRestrictions: async () => ({ isAllowed: allowed, location: { latitude: 41.3, longitude: 69.2 }, allowedItems: allowed ? [{ organizationId: 'org', terminalGroupId: 'branch', deliveryDurationInMinutes: 60, zone: 'Markaz' }] : [] }),
    getOrderById: async (_org: string, ids: string[]) => ({ orders: ids.map(id => orders.get(id)).filter(Boolean) }),
    createDeliveryOrder: async (request: any) => {
      creates++; lastRequest = request;
      orders.set(request.order.id, { id: request.order.id, organizationId: 'org', creationStatus: 'Success', order: { status: 'WaitCooking', sum: 35000, completeBefore: request.order.completeBefore } });
      throw new Error('Simulated timeout AFTER iiko accepted the order');
    },
  };
  const adapter = new IikoProviderAdapter({ slug: 'restaurant', config: { organizationId: 'org', terminalGroupId: 'branch', currency: 'UZS' } }, client);
  const quoteInput: any = { providerSlug: 'restaurant', items: [{ offeringId: 'osh', quantity: 1 }], destination: { raw: 'Furqat 2' } };
  const quote = await adapter.requestQuote(quoteInput);
  assert.equal(quote.estimatedDurationMinutes, 60);
  assert.equal(quote.parameters?.deliveryCoverage, 'VERIFIED');
  assert.match(formatCustomerQuote(quote), /kuryerga/);
  allowed = false;
  await assert.rejects(adapter.requestQuote(quoteInput), (e: any) => e.code === 'RESOURCE_UNAVAILABLE');
  coverageConfigured = false;
  allowed = true; // iiko geocodes any address despite empty coverage configuration.
  await assert.rejects(adapter.requestQuote(quoteInput), (e: any) => {
    const presentation = getAgentErrorPresentation(e);
    assert.equal(presentation.reason, 'DELIVERY_COVERAGE_NOT_CONFIGURED');
    assert.equal(presentation.recommendedAction, 'CONTACT_SUPPORT');
    assert.equal(presentation.retryable, false);
    return e.code === 'VALIDATION_ERROR';
  });
  coverageConfigured = true;
  allowed = true;
  await assert.rejects(adapter.requestQuote({ ...quoteInput, destination: undefined }), (e: any) => e.details.requiredBeforeQuote.includes('destination'));
  const actionInput: any = { ...quoteInput, customer: { phone: '+998901234567' }, quoteId: quote.id, quote: { ...quote, fees: quote.totalFees, discount: 0 }, userConfirmed: true, idempotencyKey: 'first-key' };
  const created = await adapter.createAction(actionInput);
  const retried = await adapter.createAction({ ...actionInput, idempotencyKey: 'another-key' });
  assert.equal(creates, 1, 'Timeout and different retry keys must still resolve to one iiko order');
  assert.equal(created.externalActionId, retried.externalActionId);
  assert.ok(lastRequest.order.completeBefore);
  assert.doesNotMatch(lastRequest.order.comment, /ZY-QT|quote/i);
  assert.ok(lastRequest.order.comment.length < 30);
  assert.equal(created.paymentStatus, 'PENDING');
  assert.match(formatCustomerActionStatus(created), /tayyorlash navbatida/);
  assert.match(formatCustomerActionStatus(created), /kuryerga/);
  const live = await adapter.getAction({ providerSlug: 'restaurant', actionId: created.externalActionId! });
  assert.match(formatCustomerActionStatus(live), /yetkazish vaqti/);
  const publicAction = toPublicAction(created);
  assert.equal(publicAction.fulfillmentStatus, 'WaitCooking');
  assert.equal(publicAction.paymentMethod, 'CASH');
  assert.equal((publicAction as any).metadata, undefined);
  assert.equal((publicAction as any).externalActionId, undefined);
  const mcpStatus = await ZAYUNO_MCP_TOOLS.find(tool => tool.name === 'get_action')!.handler({ actionId: publicAction.actionId }, { getAction: async () => publicAction } as any);
  assert.match(mcpStatus.customerMessage, /tayyorlash navbatida/);
  assert.match(mcpStatus.customerMessage, /kuryerga/);
  assert.match(mcpStatus.customerMessage, /yetkazish vaqti/);
  assert.equal(mcpStatus.fulfillmentStatus, 'WaitCooking');
  let quotedCustomer: any; let createdCustomer: any;
  const mcpArgs = { providerSlug: 'restaurant', quoteId: quote.id, userConfirmed: true, customer: { phone: '901234567' }, destination: quoteInput.destination };
  await ZAYUNO_MCP_TOOLS.find(tool => tool.name === 'request_quote')!.handler(mcpArgs, { requestQuote: async (input: any) => { quotedCustomer = input.customer; return quote; } } as any);
  await ZAYUNO_MCP_TOOLS.find(tool => tool.name === 'create_action')!.handler(mcpArgs, { createAction: async (input: any) => { createdCustomer = input.customer; return publicAction; } } as any);
  assert.deepEqual(quotedCustomer, createdCustomer, 'MCP quote and create must normalize contacts identically');
  assert.equal(createdCustomer.phone, '+998901234567');
  assert.equal((await adapter.getLocations()).at(0)?.serviceRadiusKm, undefined);
  await assert.rejects(adapter.createAction({ ...actionInput, paymentMethod: 'PAYME' }));
  assert.match(formatCustomerPaymentOptions([{ type: 'CASH_ON_DELIVERY', isOnline: false }]), /naqd/);
  assert.equal(getAgentErrorPresentation({ code: 'CAPABILITY_NOT_SUPPORTED' }, 'get_payment_options').recommendedAction, 'STOP');
  assert.doesNotMatch(getAgentErrorPresentation({ code: 'CAPABILITY_NOT_SUPPORTED' }, 'get_payment_options').customerMessage, /Katalog/);
  assert.deepEqual(getAgentErrorPresentation({ code: 'VALIDATION_ERROR', details: { missingFields: ['customer.phone', 'locations.DESTINATION', '<secret>'] } }).requiredBeforeQuote, ['customer.phone', 'locations.DESTINATION']);

  // Quote-scoped lock is the same for requests carrying different client keys.
  const locks: string[] = []; let released = '';
  const core = new ActionsService({} as any, {} as any, {
    acquireLock: async (key: string) => { locks.push(key); return !key.startsWith('action-quote:'); },
    releaseLock: async (key: string) => { released = key; },
  } as any);
  for (const key of ['one', 'two']) await assert.rejects(core.createAction({ providerSlug: 'restaurant', quoteId: 'q', items: [], userConfirmed: true, idempotencyKey: key } as any, 'user'), (e: any) => e.code === 'IDEMPOTENCY_CONFLICT');
  assert.equal(locks[1], locks[3]); assert.ok(released.startsWith('action:user:'));
  const original = { actionFindMany: prisma.action.findMany, quoteCreate: prisma.quote.create, providerFindMany: prisma.provider.findMany };
  try {
    let lookups = 0;
    (prisma.action as any).findMany = async ({ where }: any) => {
      lookups++; assert.equal(where.userId, 'caller'); assert.equal(where.customerPhone, '+998901234567');
      return [{ id: 'active', publicId: 'ZY-123', lines: [{ offeringId: 'osh', offeringTitle: 'Osh', quantity: 1 }] }, { id: 'finished', publicId: 'ZY-OLD', lines: [{ offeringId: 'osh', offeringTitle: 'Osh', quantity: 1 }] }];
    };
    (prisma.quote as any).create = async () => ({});
    const provider: any = { id: 'provider', slug: 'restaurant', adapterType: 'iiko' };
    const quotes = new QuotesService({ assertAndGetCapability: async () => ({ requestQuote: async () => ({ ...quote }), getAction: async ({ actionId }: any) => ({ status: actionId === 'active' ? 'PROCESSING' : 'COMPLETED' }) }) } as any,
      { assertProviderPublished: async () => provider, assertProviderCapabilityEligible: async () => {} } as any);
    const warned = await quotes.requestQuote({ ...quoteInput, customer: { phone: '+998901234567' } }, { userId: 'caller' });
    assert.equal(warned.parameters?.activeOrderWarnings.length, 1);
    assert.match(formatCustomerQuote(warned), /alohida buyurtma/);
    await quotes.requestQuote({ ...quoteInput, customer: { phone: '+998901234567' } });
    assert.equal(lookups, 1, 'Unscoped requests must never disclose active orders');

    (prisma.provider as any).findMany = async ({ where }: any) => { assert.equal(where.OR, undefined); return [{ slug: 'restaurant', name: 'Restoran', category: 'FOOD_AND_DRINK', geography: ['UZ'], capabilities: ['SEARCH'], locations: [] }]; };
    const discovery: any = new ProvidersService({ getAdapter: async () => ({ searchOfferings: async ({ query }: any) => searchIikoCatalog(offerings, query) }) } as any);
    discovery.isDiscoveryReady = () => true; discovery.mapToProviderInfo = (p: any) => ({ ...p });
    const discovered = await discovery.findProviders({ category: 'food_delivery', geography: 'Toshkent', query: 'palov' });
    assert.equal(discovered.total, 1);
    assert.equal(discovered.providers[0].metadata.discoveryGeographyVerified, false);
  } finally {
    (prisma.action as any).findMany = original.actionFindMany; (prisma.quote as any).create = original.quoteCreate; (prisma.provider as any).findMany = original.providerFindMany;
  }
  console.log('PASS: whole-word search, aliases/typos/multi-query, quote requirements, verified coverage/ETA, timeout reconciliation, quote-scoped locks, cash semantics, precise fulfillment and short POS reference.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
