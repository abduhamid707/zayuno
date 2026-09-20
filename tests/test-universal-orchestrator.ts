import assert from 'node:assert/strict';
import { ConsumerChatService } from '../apps/api/src/modules/consumer/chat/consumer-chat.service';
import { RedisService } from '../apps/api/src/common/services/redis.service';
import { SemanticIntentResolver } from '../apps/api/src/modules/consumer/chat/semantic-intent';
import { formatCustomerQuote, formatCustomerActionStatus, isDemoOrSandboxProvider } from '../packages/shared/src/customer-presenter';

async function main() {
  process.env.REDIS_URL = process.env.UNIVERSAL_TEST_REDIS_URL || 'redis://127.0.0.1:16379';
  delete process.env.GEMINI_API_KEY;
  const redis = new RedisService(); redis.onModuleInit();
  await new Promise<void>(resolve => redis.getClient().once('ready', resolve));
  try {
    let quoteCalls = 0, dispatches = 0;
    const provider: any = { slug: 'provider-1001', name: 'New provider', environment: 'LIVE',
      capabilities: ['CATALOG','SEARCH','QUOTE','ACTION_CREATE','ACTION_CANCEL','ACTION_STATUS'],
      manifest: { version: 1, customerRequirements: { phone: 'REQUIRED' } } };
    const offering: any = { id: 'offering-1', title: 'Mangu 5', basePrice: 10, currency: 'UZS', isAvailable: true,
      variants: [{ id: 'variant-1', name: 'VIP', basePrice: 20, isAvailable: true }, { id: 'variant-2', name: 'Standard', basePrice: 10, isAvailable: true }] };
    const providers: any = { listProviders: async () => [provider], getProviderBySlug: async () => provider };
    const catalog: any = { searchOfferings: async () => [offering], getCatalog: async () => ({ offerings: [offering] }) };
    const quotes: any = { requestQuote: async (input: any) => { quoteCalls++; return { id: `quote-${quoteCalls}`, providerSlug: provider.slug,
      lines: [{ offeringId: offering.id, offeringTitle: offering.title, variantId: input.items[0]?.variantId, quantity: input.items[0]?.quantity || 1, unitPrice: 20, lineTotal: 20 * (input.items[0]?.quantity || 1) }],
      total: 20 * (input.items[0]?.quantity || 1), subtotal: 20, totalFees: 0, totalDiscount: 0, currency: 'UZS', expiresAt: new Date(Date.now() + 60000).toISOString() }; } };
    const actions: any = { createAction: async (input: any) => { dispatches++; assert.equal(input.customer.phone, '+998901234567');
      assert.equal(input.items[0].quantity, 2); assert.equal(input.userConfirmed, true); return { id: 'action', publicId: 'ZY-ACT-test', status: 'CREATED', providerSlug: provider.slug }; },
      cancelAction: async () => ({ success: true }), getLiveAction: async () => ({ action: { status: 'CREATED' } }) };
    const create = () => new ConsumerChatService(providers, catalog, quotes, actions, redis);
    let service = create();
    const session = { userId: `orchestrator-${Date.now()}`, conversationId: 'one' };
    const send = (prompt: string, selections?: any[]) => service.processMessage({ ...session, prompt, selections });
    await send('New provider');
    await send('Mangu 5');
    const selected = await send('VIP');
    assert.ok(selected.content.includes('phone'));
    service = create(); // Simulated process restart, no local business state.
    await send('2 ta qil');
    assert.equal(quoteCalls, 2);
    await send('ha');
    assert.equal(dispatches, 0);
    const completed = await send('+998901234567');
    assert.equal(dispatches, 1);
    assert.ok(completed.content.length);
    await send('ha'); assert.equal(dispatches, 1);
    await send('bekor qil');
    assert.equal((await send('ha')).interaction.kind, 'provider_list');
    const resolver = new SemanticIntentResolver();
    const { emptyConversationState } = await import('../packages/contracts/src/conversation');
    assert.equal((await resolver.resolve('2 ta qil', emptyConversationState(), [])).quantity, 2);
    assert.equal((await resolver.resolve('albatta', emptyConversationState(), [])).intent, 'ACCEPT');
    assert.equal(isDemoOrSandboxProvider({ slug: 'coffee-time', environment: 'LIVE' }), false);
    assert.equal(isDemoOrSandboxProvider({ slug: 'unseen', environment: 'SANDBOX' }), true);
    assert.ok(!formatCustomerActionStatus({ paymentStatus: 'PAID', environment: 'SANDBOX' }).includes('To‘lov qabul qilindi'));
    const presented = formatCustomerQuote({ total: 0, subtotal: 20, currency: 'UZS', fees: [{ name: 'Processing', amount: 2 }],
      parameters: { arbitrary: 'value' } }, { manifest: { presentationHints: { fields: [{ path: 'parameters.arbitrary', label: 'Declared label' }] } } });
    assert.ok(presented.includes('Declared label: value'));
    assert.ok(presented.includes('Jami: 0'));
    assert.ok(presented.includes('Processing'));
    console.log('PASS: grounded variant → quote → modify → restart → accept → missing contact → single action → status/cancel; generic presentation');
  } finally { redis.onModuleDestroy(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
