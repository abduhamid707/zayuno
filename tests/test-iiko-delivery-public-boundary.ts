import assert from 'node:assert/strict';
import Ajv from 'ajv';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { IikoProviderAdapter } from '../packages/provider-sdk/src/connectors/iiko/iiko-adapter';
import { toPublicQuote, toPublicCatalog } from '../packages/shared/src/public-commerce';
import { formatCustomerQuote } from '../packages/shared/src/customer-presenter';
import { ZAYUNO_MCP_TOOLS, registerZayunoTools } from '../apps/mcp/src/tools';
import { QuotesController } from '../apps/api/dist/modules/quotes/quotes.controller.js';
import { CatalogController } from '../apps/api/dist/modules/catalog/catalog.controller.js';

async function main() {
  // Resolve the same SDK version as the MCP app, rather than the legacy root SDK.
  const mcpRequire = createRequire(new URL('../apps/mcp/package.json', import.meta.url));
  const { McpServer } = await import(pathToFileURL(mcpRequire.resolve('@modelcontextprotocol/sdk/server/mcp.js')).href);
  const { Client } = await import(pathToFileURL(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js')).href);
  const { InMemoryTransport } = await import(pathToFileURL(mcpRequire.resolve('@modelcontextprotocol/sdk/inMemory.js')).href);
  const zone = { name: 'Markaz', coordinates: [
    { latitude: 41, longitude: 69 }, { latitude: 42, longitude: 69 },
    { latitude: 42, longitude: 70 }, { latitude: 41, longitude: 70 },
  ] };
  let settings: any = { organizationId: 'org', restrictions: [], deliveryZones: [] };
  let allowedZone: string | null = null;
  let isAllowed = true;
  let creates = 0;
  let geocodes = 0;
  let lastCreate: any;
  const client: any = {
    getOrganizations: async () => [{ id: 'org', currencyIsoName: 'UZS' }],
    getTerminalGroups: async () => [{ id: 'branch', organizationId: 'org', timeZone: '05:00:00' }],
    getNomenclature: async () => ({ groups: [], products: [{ id: 'osh', name: 'Osh', sizePrices: [{ price: { currentPrice: 35000 } }] }] }),
    getStopLists: async () => ({}),
    getDeliveryRestrictions: async () => ({ deliveryRestrictions: [settings] }),
    getAllowedDeliveryRestrictions: async (request: any) => {
      geocodes++;
      return { isAllowed, location: request.orderLocation || { latitude: 41.3, longitude: 69.2 },
        allowedItems: [{ organizationId: 'org', terminalGroupId: 'branch', zone: allowedZone, deliveryDurationInMinutes: 60 }] };
    },
    getOrderById: async () => ({ orders: [] }),
    createDeliveryOrder: async (request: any) => {
      creates++; lastCreate = request;
      return { orderInfo: { id: request.order.id, organizationId: 'org', creationStatus: 'Success', order: { status: 'WaitCooking' } } };
    },
  };
  const adapter = new IikoProviderAdapter({ slug: 'restaurant', config: { organizationId: 'org', terminalGroupId: 'branch', currency: 'UZS' } }, client);
  const input: any = { providerSlug: 'restaurant', items: [{ offeringId: 'osh', quantity: 1 }], customer: { phone: '+998901234567' }, destination: { raw: 'Furqat a2 D17, Tashkent' } };
  const addresses = [
    ['Tashkent', 41.3, 69.2], ['Registon, Samarqand', 39.654, 66.975],
    ['Nukus', 42.46, 59.61], ['Moscow, Red Square, Russia', 55.753544, 37.621202],
    ['asdfghjkl qwerty 123', null, null],
  ];
  for (const [raw, latitude, longitude] of addresses) {
    const destination = { raw, ...(latitude !== null ? { coordinates: { latitude, longitude } } : {}) };
    await assert.rejects(adapter.requestQuote({ ...input, destination }), (e: any) => e.details?.reason === 'DELIVERY_COVERAGE_NOT_CONFIGURED');
  }
  assert.equal(geocodes, 0, 'Empty configuration must reject before geocoding or permissive allowed responses');
  settings = { organizationId: 'org', restrictions: [{ terminalGroupId: 'branch', zone: null }], deliveryZones: [] };
  await assert.rejects(adapter.requestQuote(input), (e: any) => e.details?.reason === 'DELIVERY_COVERAGE_NOT_CONFIGURED');
  settings = { organizationId: 'org', restrictions: [{ terminalGroupId: 'branch', zone: 'Markaz' }], deliveryZones: [zone] };
  for (const name of [null, 'Unknown zone']) {
    allowedZone = name;
    await assert.rejects(adapter.requestQuote(input), (e: any) => e.code === 'RESOURCE_UNAVAILABLE');
  }
  allowedZone = 'Markaz';
  for (const [raw, latitude, longitude] of addresses.slice(1, 4)) {
    await assert.rejects(adapter.requestQuote({ ...input, destination: { raw, coordinates: { latitude, longitude } } }), (e: any) => e.code === 'RESOURCE_UNAVAILABLE');
  }
  isAllowed = false;
  await assert.rejects(adapter.requestQuote(input), (e: any) => e.code === 'RESOURCE_UNAVAILABLE');
  isAllowed = true;
  const quote = await adapter.requestQuote(input);
  assert.equal(quote.parameters?.deliveryCoverage, 'VERIFIED');
  settings.deliveryZones = [{ name: 'Markaz', coordinates: [
    { latitude: 41.3, longitude: 69.2 }, { latitude: 41.3, longitude: 69.2 }, { latitude: 41.3, longitude: 69.2 },
  ] }];
  await assert.rejects(adapter.requestQuote(input), (e: any) => e.code === 'RESOURCE_UNAVAILABLE');
  settings.deliveryZones = [zone];
  const boundaryQuote = await adapter.requestQuote({ ...input, destination: { ...input.destination, coordinates: { latitude: 41, longitude: 69.5 } } });
  assert.equal(boundaryQuote.parameters?.deliveryCoverage, 'VERIFIED');
  const actionInput = { ...input, quoteId: quote.id, quote: { ...quote, fees: quote.totalFees, discount: 0 }, userConfirmed: true };
  settings = { organizationId: 'org', restrictions: [], deliveryZones: [] };
  await assert.rejects(adapter.createAction(actionInput as any), (e: any) => e.details?.reason === 'DELIVERY_COVERAGE_NOT_CONFIGURED');
  assert.equal(creates, 0, 'Old VERIFIED quote must not bypass removed delivery configuration');
  settings = { organizationId: 'org', restrictions: [{ terminalGroupId: 'another-branch', zone: 'Markaz' }], deliveryZones: [zone] };
  await assert.rejects(adapter.requestQuote(input), (e: any) => e.code === 'RESOURCE_UNAVAILABLE');
  settings.restrictions[0].terminalGroupId = 'branch';
  await adapter.createAction(actionInput as any);
  assert.equal(creates, 1);
  assert.deepEqual(lastCreate.order.deliveryPoint.coordinates, { latitude: 41.3, longitude: 69.2 });

  const privateQuote: any = { ...quote, requirements: { customerRequirements: { phone: 'REQUIRED', internal: 'private-marker' }, organizationId: 'private-marker' },
    parameters: { ...quote.parameters, activeOrderWarnings: ['Sizda faol buyurtma bor.'], internalUnknown: 'private-marker' } };
  const original = JSON.stringify(privateQuote);
  const projected = toPublicQuote(privateQuote);
  assert.equal(projected.paymentMethod, 'CASH');
  assert.deepEqual(projected.activeOrderWarnings, ['Sizda faol buyurtma bor.']);
  assert.match(formatCustomerQuote(projected), /kuryerga/);
  assert.match(formatCustomerQuote(projected), /faol buyurtma/);
  assert.equal(JSON.stringify(privateQuote), original);
  const privateOffering: any = { id: 'osh', providerId: 'internal-provider', offeringCode: 'osh', title: 'Osh', basePrice: 35000, currency: 'UZS',
    metadata: { iikoProductId: 'private-marker' }, variants: [{ id: 'size', name: 'Large', basePrice: 45000, metadata: { sizeId: 'private-marker' } }],
    optionGroups: [{ id: 'group', name: 'Sauce', isRequired: true, options: [{ id: 'sauce', name: 'Sauce', priceDelta: 1000, metadata: { internal: 'private-marker' } }] }] };
  const privateCatalog = { providerSlug: 'restaurant', offerings: [privateOffering], categories: [], metadata: { organizationId: 'private-marker' } };
  assert.equal(toPublicCatalog(privateCatalog).offerings[0].variants[0].id, 'size');
  const assertClean = (value: any) => {
    const json = JSON.stringify(value);
    assert.doesNotMatch(json, /organizationId|terminalGroupId|iikoProductId|deliveryCoordinates|etaSource|terminalTimeZone|private-marker|internal-provider/);
    assert.equal(value.parameters, undefined);
  };
  assertClean(projected);
  assertClean(toPublicCatalog(privateCatalog));
  const api: any = {
    requestQuote: async (args: any) => {
      assert.equal(args.customer.phone, '+998901234567');
      if (args.destination?.coordinates) assert.deepEqual(args.destination.coordinates, { latitude: 41.3, longitude: 69.2 });
      return privateQuote;
    },
    getCatalog: async () => privateCatalog,
    searchCatalog: async () => privateCatalog,
    getOffering: async () => privateOffering,
  };
  const quoteController = new QuotesController(api);
  assertClean(await quoteController.requestQuote(input));
  const catalogController = new CatalogController({ getCatalog: api.getCatalog, getOffering: api.getOffering, searchOfferings: api.searchCatalog } as any);
  assertClean(await catalogController.getCatalog('restaurant'));
  assertClean(await catalogController.getOffering('restaurant', 'osh'));
  assertClean(await catalogController.searchOfferingsStructured({ providerSlug: 'restaurant', query: 'osh', limit: 20 }));

  // Test SDK-generated tools/list, not only the handwritten JSON descriptor.
  const server = new McpServer({ name: 'boundary-test', version: '1' });
  registerZayunoTools(server, api);
  const agent = new Client({ name: 'strict-client', version: '1' });
  const [agentTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await agent.connect(agentTransport);
  try {
    const tools = await agent.listTools();
    const tool = tools.tools.find(t => t.name === 'request_quote')!;
    const schema: any = tool.inputSchema;
    assert.equal(schema.properties.customer.properties.phone.type, 'string');
    const args = { ...input, customer: { phone: '+998901234567' }, destination: { ...input.destination, coordinates: { latitude: 41.3, longitude: 69.2 } } };
    assert.ok(new Ajv({ strict: false }).compile(schema)(args));
    const result: any = await agent.callTool({ name: 'request_quote', arguments: args });
    assert.equal(result.isError, undefined);
    assertClean(result.structuredContent);
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    for (const name of ['get_catalog', 'search_catalog', 'get_offering']) {
      const response: any = await agent.callTool({ name, arguments: { providerSlug: 'restaurant', offeringId: 'osh', select: ['id', 'metadata.iikoProductId', 'variants', 'optionGroups'] } });
      assertClean(response.structuredContent);
      assertClean(JSON.parse(response.content[0].text));
    }
    const httpDescriptor = ZAYUNO_MCP_TOOLS.find(t => t.name === 'request_quote')!;
    assert.equal(httpDescriptor.inputSchema.properties.customer.properties.phone.type, 'string');
    const wire = await httpDescriptor.handler(args, api);
    assert.deepEqual(JSON.parse(JSON.stringify(wire)), result.structuredContent);
    assert.ok(new Ajv({ strict: false }).compile(httpDescriptor.outputSchema!)(wire));
  } finally {
    await agent.close(); await server.close();
  }
  console.log('PASS: empty coverage and distant addresses blocked; configured zone checked; old quotes guarded; SDK customer.phone schema and quote/catalog public boundaries verified.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
