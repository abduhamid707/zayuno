import assert from 'node:assert/strict';
import { CatalogService } from '../apps/api/src/modules/catalog/catalog.service';
import { ConsumerChatService } from '../apps/api/src/modules/consumer/chat/consumer-chat.service';

async function main() {
  const store = new Map<string, string>();
  let searchCalls = 0;
  let availabilityCalls = 0;
  const redis = {
    get: async (key: string) => store.get(key) || null,
    set: async (key: string, value: string) => void store.set(key, value),
    del: async (key: string) => void store.delete(key),
    delByPattern: async (pattern: string) => {
      const prefix = pattern.replace('*', '');
      let deleted = 0;
      for (const key of Array.from(store.keys())) {
        if (key.startsWith(prefix)) {
          store.delete(key);
          deleted += 1;
        }
      }
      return deleted;
    },
    acquireLock: async () => true,
    releaseLock: async () => undefined
  };
  const adapter = {
    searchOfferings: async (input: any) => {
      searchCalls += 1;
      return input.query === 'none' ? [] : [{ id: '1', title: 'Sales', isAvailable: true }];
    },
    checkAvailability: async (input: any) => {
      availabilityCalls += 1;
      return { isAvailable: true, unavailableItems: [], availableItems: input.items };
    }
  };
  const catalog = new CatalogService(
    { assertAndGetCapability: async () => adapter } as any,
    { assertProviderPublished: async () => undefined } as any,
    redis as any
  );

  await catalog.searchOfferings('hh-uz', 'sales', undefined, 'tashkent', 20);
  await catalog.searchOfferings('hh-uz', 'sales', undefined, 'tashkent', 20);
  assert.equal(searchCalls, 1, 'identical provider search must hit Redis cache');

  await catalog.searchOfferings('hh-uz', 'none', undefined, undefined, 20);
  const envelopes = Array.from(store.values()).map((value) => JSON.parse(value));
  const negative = envelopes.find((item) => Array.isArray(item.value) && item.value.length === 0);
  assert.equal(negative.freshUntil - negative.cachedAt, 120_000, 'empty search must use short negative TTL');

  const availabilityInput = { providerSlug: 'hh-uz', items: [{ offeringId: '1', quantity: 1 }] } as any;
  await catalog.checkAvailability(availabilityInput);
  await catalog.checkAvailability(availabilityInput);
  assert.equal(availabilityCalls, 2, 'final availability checks must never be cached');
  assert.ok((await catalog.invalidateProviderCache('hh-uz')) >= 2, 'provider webhook invalidation must clear cached data');

  process.env.GEMINI_API_KEY ||= 'test-only';
  let activeSearches = 0;
  let maxActiveSearches = 0;
  const chat = new ConsumerChatService(
    { listProviders: async () => [] } as any,
    {
      searchOfferings: async (_slug: string, term: string) => {
        activeSearches += 1;
        maxActiveSearches = Math.max(maxActiveSearches, activeSearches);
        await new Promise((resolve) => setTimeout(resolve, 40));
        activeSearches -= 1;
        return [
          {
            id: term,
            title: `${term} role`,
            basePrice: 0,
            currency: 'UZS',
            isAvailable: true,
            metadata: {
              employerName: 'Company',
              alternateUrl: 'https://hh.uz/vacancy/123',
              rawSalary: { from: 5_000_000, currency: 'UZS' }
            },
            description: 'Hudud: Toshkent'
          }
        ];
      },
      getCatalog: async () => ({ offerings: [] })
    } as any
  );
  const chatInternals = chat as any;
  const clarification = chatInternals.planLiveContext('menga ish kerak', []);
  assert.equal(clarification.intent, 'recruitment_clarification');
  assert.equal(clarification.needsCatalog, false);

  const plan = chatInternals.planLiveContext('sotuvchilik ishlarini top', []);
  const context = await chatInternals.loadLiveContext(plan, [{ slug: 'hh-uz', name: 'HH', category: 'recruitment' }]);
  assert.ok(maxActiveSearches > 1, 'synonym searches must execute concurrently');
  const answer = chatInternals.buildGroundedCatalogAnswer(plan, context);
  assert.match(answer, /\[Ariza topshirish]\(https:\/\/hh\.uz\/vacancy\/123\)/);

  console.log('Provider cache, no-cache availability, parallel search, and complete grounded chat output passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
