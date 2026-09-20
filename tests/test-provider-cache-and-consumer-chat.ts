import assert from 'node:assert/strict';
import { CatalogService } from '../apps/api/src/modules/catalog/catalog.service';
import { ConsumerChatService } from '../apps/api/src/modules/consumer/chat/consumer-chat.service';

function createRedis() {
  const values = new Map<string, string>();
  const client = {
    status: 'ready',
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string, ...args: any[]) => {
      if (args.includes('NX') && values.has(key)) return null;
      values.set(key, value);
      return 'OK';
    },
    eval: async (_script: string, keyCount: number, ...args: any[]) => {
      if (keyCount === 2) {
        const [key, lock, token, payload] = args;
        if (values.get(lock) !== token) return 0;
        values.set(key, payload);
        return 1;
      }
      const [lock, token] = args;
      if (values.get(lock) === token) {
        values.delete(lock);
        return 1;
      }
      return 0;
    },
  };
  return {
    get: client.get,
    set: async (key: string, value: string) => { values.set(key, value); },
    del: async (key: string) => { values.delete(key); },
    delByPattern: async (pattern: string) => {
      const prefix = pattern.replace('*', '');
      let deleted = 0;
      for (const key of [...values.keys()]) if (key.startsWith(prefix)) { values.delete(key); deleted++; }
      return deleted;
    },
    acquireLock: async () => true,
    releaseLock: async () => undefined,
    getClient: () => client,
    values,
  };
}

async function main() {
  const redis = createRedis();
  let searchCalls = 0;
  let availabilityCalls = 0;
  const adapter = {
    searchOfferings: async (input: any) => {
      searchCalls += 1;
      return input.query === 'none' ? [] : [{ id: '1', title: 'Sales', isAvailable: true }];
    },
    checkAvailability: async (input: any) => {
      availabilityCalls += 1;
      return { isAvailable: true, unavailableItems: [], availableItems: input.items };
    },
  };
  const catalog = new CatalogService(
    { assertAndGetCapability: async () => adapter } as any,
    { assertProviderPublished: async () => undefined, assertProviderCapabilityEligible: async () => undefined, assertValidLocation: async () => undefined } as any,
    redis as any,
  );

  await catalog.searchOfferings('hh-uz', 'sales', undefined, 'tashkent', 20);
  await catalog.searchOfferings('hh-uz', 'sales', undefined, 'tashkent', 20);
  assert.equal(searchCalls, 1, 'identical provider search must hit Redis cache');
  await catalog.searchOfferings('hh-uz', 'none', undefined, undefined, 20);
  const envelopes = [...redis.values.values()].map(value => JSON.parse(value));
  const negative = envelopes.find(item => Array.isArray(item.value) && item.value.length === 0);
  assert.equal(negative.freshUntil - negative.cachedAt, 120_000, 'empty search must use short negative TTL');

  const availabilityInput = { providerSlug: 'hh-uz', items: [{ offeringId: '1', quantity: 1 }] } as any;
  await catalog.checkAvailability(availabilityInput);
  await catalog.checkAvailability(availabilityInput);
  assert.equal(availabilityCalls, 2, 'final availability checks must never be cached');
  const unsupportedCatalog = new CatalogService(
    { assertAndGetCapability: async () => ({}) } as any,
    { assertProviderPublished: async () => undefined, assertProviderCapabilityEligible: async () => undefined, assertValidLocation: async () => undefined } as any,
    redis as any,
  );
  const unsupportedAvailability = await unsupportedCatalog.checkAvailability(availabilityInput);
  assert.equal(unsupportedAvailability.availabilityStatus, 'NOT_SUPPORTED');
  assert.equal(unsupportedAvailability.isAvailable, null);
  assert.ok((await catalog.invalidateProviderCache('hh-uz')) >= 2, 'provider invalidation clears cached data');

  // Public universal chat flow: provider and offering selections are generic.
  delete process.env.GEMINI_API_KEY;
  const provider = {
    slug: 'maxway',
    name: 'MaxWay',
    environment: 'LIVE',
    status: 'ACTIVE',
    capabilities: ['CATALOG'],
    manifest: { version: 1 },
    metadata: { reviewStatus: 'APPROVED', isPublished: true, isCertified: true },
  };
  const chat = new ConsumerChatService(
    { listProviders: async () => [provider] } as any,
    { getCatalog: async () => ({ offerings: [{ id: 'maxway-burger', title: 'MaxWay Burger', basePrice: 25_000, currency: 'UZS', isAvailable: true }] }) } as any,
    {} as any,
    {} as any,
    redis as any,
  );
  const first = await chat.processMessage({ prompt: 'MaxWay menyusini ko‘rsat', messages: [], userId: 'scope-user' });
  assert.equal(first.interaction?.kind, 'universal');
  assert.equal(first.interaction?.components?.[0]?.type, 'OfferingCard');
  const second = await chat.processMessage({
    prompt: 'tanlayman',
    messages: [],
    userId: 'scope-user',
    selections: [{ kind: 'offering', providerSlug: 'maxway', offeringId: 'maxway-burger' }],
  });
  assert.equal(second.interaction?.kind, 'universal');
  assert.equal(second.interaction?.components?.[0]?.type, 'OfferingCard');
  assert.match(second.content, /MaxWay Burger/);

  console.log('Provider cache, Redis-backed universal conversation state and generic offering selection passed.');
}

main().catch(error => { console.error(error); process.exit(1); });
