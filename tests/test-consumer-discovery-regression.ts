import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emptyConversationState } from '../packages/contracts/src/conversation';
import { ConsumerChatService } from '../apps/api/src/modules/consumer/chat/consumer-chat.service';
import { SemanticIntentResolver } from '../apps/api/src/modules/consumer/chat/semantic-intent';

delete process.env.GEMINI_API_KEY;
const dish = (id: string, title: string, price: number) => ({ id, title, basePrice: price, currency: 'UZS', isAvailable: true, variants: [], optionGroups: [] });
const providers = [
  { slug: 'evos', name: 'EVOSS - Uzum Market (QORAJOY)', category: 'FOOD_AND_DRINK', capabilities: ['CATALOG', 'SEARCH'], description: 'Fast-food restoran' },
  { slug: 'hh', name: 'HeadHunter Uzbekistan Jobs', category: 'RECRUITMENT', capabilities: ['CATALOG', 'SEARCH'], description: 'Vakansiyalar' },
  { slug: 'koolo', name: 'Мой ресторан', category: 'FOOD_AND_DRINK', capabilities: ['CATALOG', 'SEARCH'], description: 'Restoran menyusi' },
];
const menus: Record<string, any[]> = { evos: [dish('lavash', 'Lavash', 28000)], hh: [dish('job', 'Dasturchi', 0)], koolo: [dish('osh', 'Osh', 35000), dish('non', 'Non', 5000)] };
const calls: Array<{ kind: string; slug: string; query?: string }> = [];
const service: any = new ConsumerChatService({ listProviders: async () => providers } as any, {
  getCatalog: async (slug: string) => { calls.push({ kind: 'catalog', slug }); return { offerings: menus[slug] }; },
  searchOfferings: async (slug: string, query: string) => { calls.push({ kind: 'search', slug, query }); return menus[slug].filter(o => o.title.toLowerCase().includes(query.toLowerCase())); },
} as any, {} as any, { createAction: () => { throw Error('Browsing must not place an order'); } } as any, {} as any);
const input = (prompt: string, selections?: any[]) => ({ prompt, selections, userId: 'discovery-regression' });
const run = (prompt: string, state: any, selections?: any[]) => service.turn(input(prompt, selections), state, async () => {});

async function main() {
  const resolver: any = new SemanticIntentResolver();
  resolver.model = { generateContent: () => { throw Error('Provider navigation should bypass the model'); } };
  for (const provider of providers) {
    assert.deepEqual(await resolver.resolve(provider.name, emptyConversationState(), providers), { intent: 'SEARCH', providerSlug: provider.slug, query: '' });
  }
  assert.equal((await resolver.resolve('Мой ресторан katalogini ko‘rsat', emptyConversationState(), providers)).query, '');
  assert.equal((await new SemanticIntentResolver().resolve('osh yemoqchiman', emptyConversationState(), providers)).query, 'osh');

  for (const provider of providers) {
    const state = emptyConversationState();
    const greeting = await run('salom', state);
    assert.equal(greeting.interaction.kind, 'provider_list');
    calls.length = 0;
    const result = await run(provider.name, state);
    assert.equal(state.providerSlug, provider.slug);
    assert.equal(result.interaction.components[0].offering.id, menus[provider.slug][0].id);
    assert.deepEqual(calls, [{ kind: 'catalog', slug: provider.slug }], 'A name must open the catalog, never search for salom/the provider');
    assert.doesNotMatch(result.content, /topilmadi|Biz bilan qoling/);
  }

  const old = emptyConversationState(); old.query = 'salom';
  service.resolver.resolve = async () => { throw Error('Structured selection must bypass model'); };
  await run('Мой ресторан', old, [{ kind: 'provider', providerSlug: 'koolo' }]);
  assert.equal(old.offerings.length, 2);
  service.resolver = new SemanticIntentResolver();

  const state = emptyConversationState();
  await run('salom', state);
  calls.length = 0;
  const osh = await run('osh yemoqchiman', state);
  assert.equal(state.providerSlug, 'koolo', 'Find the restaurant that actually has osh');
  assert.equal(state.selectedOffering.id, 'osh');
  assert.equal(osh.interaction.components[0].offering.basePrice, 35000);
  assert.ok(calls.every(call => call.slug !== 'hh'), 'Food discovery must not query job providers');
  assert.ok(calls.filter(call => call.kind === 'search').every(call => call.query === 'osh'));

  // The model may suggest an unrelated provider. Verify against live category/catalog data.
  const uncertain = emptyConversationState();
  service.resolver.resolve = async () => ({ intent: 'SEARCH', query: 'osh', providerSlug: 'evos' });
  await run('osh yemoqchiman', uncertain);
  assert.equal(uncertain.providerSlug, 'koolo');
  service.resolver = new SemanticIntentResolver();

  const missing = emptyConversationState(); missing.providerSlug = 'koolo';
  const noMatch = await run('sushi kerak', missing);
  assert.match(noMatch.content, /mahsulot topilmadi/);
  assert.doesNotMatch(noMatch.content, /Biz bilan qoling|biz uchun muhim|💙/);
  assert.deepEqual(noMatch.interaction.providers.map((p: any) => p.slug), ['koolo']);
  const recovery = await run('Мой ресторан', missing, [{ kind: 'provider', providerSlug: 'koolo' }]);
  assert.equal(recovery.interaction.components.length, 2, 'Card navigation clears an unsuccessful search');
  const reopened = await run('Мой ресторан', missing);
  assert.equal(reopened.interaction.components.length, 2);

  // Mobile must send an explicit provider choice, with no pending cart/composer choices.
  const mobile = readFileSync('apps/mobile/app/(app)/index.tsx', 'utf8');
  const handler = mobile.slice(mobile.indexOf('const handleSelectProvider'), mobile.indexOf('const messages = useMemo'));
  assert.match(handler, /kind: "provider"/);
  assert.match(handler, /providerSlug: provider.slug/);
  assert.match(handler, /\}\], \[\]\)/);
  console.log('PASS: greetings, all provider names/cards, stale query recovery, grounded osh discovery, unrelated model routing, concise empty results and mobile provider payload.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
