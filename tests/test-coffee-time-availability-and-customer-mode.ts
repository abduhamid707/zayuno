import assert from 'node:assert/strict';
import { createCoffeeTimeSandboxApp } from '../integrations/mock-coffee-time/src/server';
import { RemoteHttpProviderAdapter } from '../packages/provider-sdk/src/remote-http-adapter';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools';
import { ZAYUNO_MCP_PROMPTS } from '../apps/mcp/src/server';
import {
  formatCustomerQuote,
  formatCustomerActionConfirmation,
  formatCustomerActionStatus,
  formatCustomerAvailability,
  formatCustomerProviders,
  formatCustomerCatalog,
  formatCustomerOfferings,
  formatCustomerOffering,
  formatCustomerLocations,
  formatCustomerPaymentOptions,
  formatCustomerError
} from '../packages/shared/src/customer-presenter';

process.env.PROVIDER_API_KEY = 'coffee-test-key-123';
process.env.PROVIDER_PUBLIC_BASE_URL = 'https://coffee-time-sandbox.shopla.uz';

async function main() {
  console.log('🧪 Running Coffee Time Availability & Customer Mode Regression Tests...');

  // =========================================================================
  // 1. Test Coffee Time Availability & No "Body has already been read" error
  // =========================================================================
  console.log('  1. Testing Coffee Time POST /availability and stream safety...');
  const server = createCoffeeTimeSandboxApp().listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Sandbox server did not bind.');
  const base = `http://127.0.0.1:${address.port}`;

  const adapter = new RemoteHttpProviderAdapter({
    providerId: 'coffee-time',
    baseUrl: base,
    authMethod: 'API_KEY',
    secret: 'coffee-test-key-123',
    timeoutMs: 5000
  });

  try {
    // 1a. Availability check via RemoteHttpProviderAdapter
    const availResult = await adapter.checkAvailability({
      providerSlug: 'coffee-time',
      items: [
        {
          offeringId: 'ct_cappuccino',
          variantId: 'large',
          quantity: 3,
          selectedOptions: [{ groupId: 'syrup', optionId: 'vanilla', quantity: 1 }]
        }
      ]
    });

    assert.equal(availResult.isAvailable, true, 'Cappuccino should be available in Coffee Time mock.');
    assert.equal(availResult.availableItems?.length, 1);
    assert.equal(availResult.availableItems?.[0].unitPrice, 24000);

    // 1b. Test non-existent offering
    const nonExistentAvail = await adapter.checkAvailability({
      providerSlug: 'coffee-time',
      items: [{ offeringId: 'ct_non_existent', quantity: 1 }]
    });
    assert.equal(nonExistentAvail.isAvailable, false);
    assert.equal(nonExistentAvail.unavailableItems?.length, 1);

    // 1c. Test raw fetch with 404 / 500 to ensure single-read body handling never throws "Body has already been read"
    const errorAdapter = new RemoteHttpProviderAdapter({
      providerId: 'coffee-time',
      baseUrl: `${base}/non-existent-endpoint`,
      authMethod: 'API_KEY',
      secret: 'coffee-test-key-123',
      timeoutMs: 5000
    });

    // When checkAvailability hits a 404 remote endpoint, it should safely fallback without crashing
    const fallbackAvail = await errorAdapter.checkAvailability({
      providerSlug: 'coffee-time',
      items: [{ offeringId: 'ct_cappuccino', quantity: 1 }]
    });
    assert.equal(fallbackAvail.isAvailable, true);
    assert.equal(fallbackAvail.parameters?.availabilityEndpointImplemented, false);

    console.log('    ✅ Coffee Time availability endpoint and stream single-read verified.');

    // =========================================================================
    // 2. Test Quote -> Confirm -> Action Creation without Idempotency Key
    // =========================================================================
    console.log('  2. Testing Coffee Time quote and action creation with server idempotency fallback...');

    // 2a. Request Quote
    const quote = await adapter.requestQuote({
      providerSlug: 'coffee-time',
      items: [
        {
          offeringId: 'ct_cappuccino',
          variantId: 'large',
          quantity: 3,
          selectedOptions: [{ groupId: 'syrup', optionId: 'vanilla', quantity: 1 }]
        }
      ],
      fulfillmentType: 'DELIVERY'
    });

    assert.ok(quote.id, 'Quote must have an ID');
    assert.equal(quote.subtotal, 81000); // 3 * (24000 + 3000)
    assert.equal(quote.totalFees, 10000); // Delivery fee
    assert.equal(quote.total, 91000); // 81000 + 10000 = 91000 UZS

    // Customer quote formatting check
    const quoteCustomerMsg = formatCustomerQuote(quote);
    assert.match(quoteCustomerMsg, /91 000 so‘m/);
    assert.match(quoteCustomerMsg, /taxminan 25 daqiqa/);
    assert.match(quoteCustomerMsg, /tasdiqlaysizmi/i);

    // 2b. Create Action without idempotencyKey from client
    const actionInput = {
      providerSlug: 'coffee-time',
      quoteId: quote.id,
      customer: { name: 'Aziz Rahimov', phone: '+998901234567' },
      items: [
        {
          offeringId: 'ct_cappuccino',
          variantId: 'large',
          quantity: 3,
          selectedOptions: [{ groupId: 'syrup', optionId: 'vanilla', quantity: 1 }]
        }
      ],
      userConfirmed: true as const
    };

    // Call createAction via mock MCP tool handler (which auto-generates / binds key to quoteId)
    const createActionTool = ZAYUNO_MCP_TOOLS.find(t => t.name === 'create_action')!;
    assert.ok(createActionTool, 'create_action tool must exist');

    let createdIdempotencyKey: string | undefined;
    const fakeClient = {
      createAction: async (input: any) => {
        createdIdempotencyKey = input.idempotencyKey;
        return adapter.createAction(input);
      }
    } as any;

    const actionResult = await createActionTool.handler(actionInput, fakeClient);
    assert.ok(createdIdempotencyKey, 'Server must generate idempotency key when omitted by client');
    assert.ok(actionResult.customerMessage, 'Action result must contain customerMessage');
    assert.match(actionResult.customerMessage, /Buyurtmangiz yaratildi\. To‘lov kutilmoqda\./);
    assert.match(actionResult.customerMessage, /Bu Coffee Time sandbox demo xizmati\. Haqiqiy buyurtma yoki to‘lov amalga oshirilmaydi\./);
    assert.match(actionResult.customerMessage, /\[To‘lov sahifasini ochish\]/);

    // 2c. Retry action creation with same quoteId -> must use the exact same idempotency key
    let retryIdempotencyKey: string | undefined;
    const retryClient = {
      createAction: async (input: any) => {
        retryIdempotencyKey = input.idempotencyKey;
        return adapter.createAction(input);
      }
    } as any;

    const retryResult = await createActionTool.handler(actionInput, retryClient);
    assert.equal(retryIdempotencyKey, createdIdempotencyKey, 'Retrying with same quoteId must reuse the exact same idempotencyKey');
    assert.equal(retryResult.publicId, actionResult.publicId, 'Retry must return the same action');

    console.log('    ✅ Action creation without client idempotencyKey and retry deduplication verified.');

  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }

  // =========================================================================
  // 3. Test Zayuno Customer Mode: All 15 Tools Return CustomerMessage & No Leaks
  // =========================================================================
  console.log('  3. Testing Zayuno Customer Mode across all 15 MCP tools...');

  const forbiddenJargonPatterns = [
    /Body has already been read/i,
    /\bUUID\b/i,
    /idempotency/i,
    /endpoint/i,
    /\bHTTP\s*\d{3}\b/i,
    /AWAITING_PAYMENT/,
    /PENDING_CONFIRMATION/,
    /stack trace/i
  ];

  for (const tool of ZAYUNO_MCP_TOOLS) {
    // 3a. Verify inputSchema does not mark idempotencyKey as required
    if (tool.name === 'create_action') {
      assert.ok(!tool.inputSchema.required?.includes('idempotencyKey'), 'create_action must not require idempotencyKey in inputSchema.required');
    }

    // 3b. Verify fake invocation returns customerMessage
    const fakeClient = {
      getWelcome: async () => ({ welcomeMessage: 'Zayuno sizga uzoqni yaqin qiladi.' }),
      findProviders: async () => [{ name: 'Coffee Time', slug: 'coffee-time' }],
      listProviders: async () => [{ name: 'Coffee Time', slug: 'coffee-time' }],
      getProvider: async () => ({ name: 'Coffee Time', slug: 'coffee-time' }),
      getProviderCapabilities: async () => ['CATALOG', 'QUOTE', 'ACTION_CREATE'],
      getLocations: async () => [{ name: 'Chilonzor', address: 'Toshkent' }],
      getCatalog: async () => ({ offerings: [{ title: 'Cappuccino', basePrice: 24000 }] }),
      searchCatalog: async () => [{ title: 'Cappuccino', basePrice: 24000 }],
      getOffering: async () => ({ title: 'Cappuccino', basePrice: 24000 }),
      checkAvailability: async () => ({ isAvailable: true }),
      requestQuote: async () => ({ id: 'q_1', subtotal: 24000, total: 24000, currency: 'UZS', lines: [{ title: 'Cappuccino', quantity: 1, lineTotal: 24000 }] }),
      createAction: async () => ({ id: 'act_1', publicId: 'ZY-TEST-1', paymentUrl: 'https://zayuno.uz/pay/1', status: 'AWAITING_PAYMENT', metadata: { sandbox: true } }),
      getAction: async () => ({ id: 'act_1', publicId: 'ZY-TEST-1', status: 'CONFIRMED', paymentStatus: 'PAID' }),
      cancelAction: async () => ({ success: true, actionId: 'ZY-TEST-1', previousStatus: 'AWAITING_PAYMENT', newStatus: 'CANCELLED' }),
      getPaymentOptions: async () => [{ checkoutUrl: 'https://zayuno.uz/pay/1' }]
    } as any;

    const mockArgs: Record<string, any> = {
      providerSlug: 'coffee-time',
      offeringId: 'ct_cappuccino',
      actionId: 'act_1',
      quoteId: 'q_1',
      items: [{ offeringId: 'ct_cappuccino', quantity: 1 }],
      customer: { name: 'Aziz', phone: '+998901234567' },
      userConfirmed: true
    };

    const res = await tool.handler(mockArgs, fakeClient);
    assert.ok(res.customerMessage, `Tool ${tool.name} must return customerMessage.`);
    assert.ok(typeof res.customerMessage === 'string' && res.customerMessage.length > 5, `Tool ${tool.name} customerMessage must be a non-empty string.`);

    for (const pattern of forbiddenJargonPatterns) {
      assert.doesNotMatch(res.customerMessage, pattern, `Tool ${tool.name} customerMessage must not contain forbidden token: ${pattern}`);
    }
  }

  // 3c. Friendly customer error message
  const friendlyError = formatCustomerError(new Error('Body has already been read at fetch stream'));
  assert.equal(friendlyError, 'Hozir buyurtmani yakunlay olmadim. Qayta urinib ko‘raymi?');

  // 3d. Check prompt instructions contain Zayuno Customer Mode
  const instructionPrompt = ZAYUNO_MCP_PROMPTS.find(p => p.name === 'customer_assistant_instructions');
  assert.ok(instructionPrompt);
  const promptText = instructionPrompt.messages[0].content.text;
  assert.match(promptText, /ZAYUNO CUSTOMER MODE QOIDALARI/);
  assert.match(promptText, /Tool’larni jim ishlatish va bitta yakuniy javob/);
  assert.match(promptText, /Hozir buyurtmani yakunlay olmadim\. Qayta urinib ko‘raymi\?/);

  console.log('    ✅ All 15 MCP tools return customerMessage and adhere to Zayuno Customer Mode.');

  console.log('🎉 ALL COFFEE TIME AVAILABILITY & CUSTOMER MODE TESTS PASSED CLEANLY!\n');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
