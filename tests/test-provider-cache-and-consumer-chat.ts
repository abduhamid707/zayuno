import assert from "node:assert/strict";
import { CatalogService } from "../apps/api/src/modules/catalog/catalog.service";
import { ConsumerChatService } from "../apps/api/src/modules/consumer/chat/consumer-chat.service";

async function main() {
  const store = new Map<string, string>();
  let searchCalls = 0;
  let availabilityCalls = 0;
  const redis = {
    get: async (key: string) => store.get(key) || null,
    set: async (key: string, value: string) => void store.set(key, value),
    del: async (key: string) => void store.delete(key),
    delByPattern: async (pattern: string) => {
      const prefix = pattern.replace("*", "");
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
    releaseLock: async () => undefined,
  };
  const adapter = {
    searchOfferings: async (input: any) => {
      searchCalls += 1;
      return input.query === "none"
        ? []
        : [{ id: "1", title: "Sales", isAvailable: true }];
    },
    checkAvailability: async (input: any) => {
      availabilityCalls += 1;
      return {
        isAvailable: true,
        unavailableItems: [],
        availableItems: input.items,
      };
    },
  };
  const catalog = new CatalogService(
    { assertAndGetCapability: async () => adapter } as any,
    { assertProviderPublished: async () => undefined } as any,
    redis as any,
  );

  await catalog.searchOfferings("hh-uz", "sales", undefined, "tashkent", 20);
  await catalog.searchOfferings("hh-uz", "sales", undefined, "tashkent", 20);
  assert.equal(
    searchCalls,
    1,
    "identical provider search must hit Redis cache",
  );

  await catalog.searchOfferings("hh-uz", "none", undefined, undefined, 20);
  const envelopes = Array.from(store.values()).map((value) =>
    JSON.parse(value),
  );
  const negative = envelopes.find(
    (item) => Array.isArray(item.value) && item.value.length === 0,
  );
  assert.equal(
    negative.freshUntil - negative.cachedAt,
    120_000,
    "empty search must use short negative TTL",
  );

  const availabilityInput = {
    providerSlug: "hh-uz",
    items: [{ offeringId: "1", quantity: 1 }],
  } as any;
  await catalog.checkAvailability(availabilityInput);
  await catalog.checkAvailability(availabilityInput);
  assert.equal(
    availabilityCalls,
    2,
    "final availability checks must never be cached",
  );
  assert.ok(
    (await catalog.invalidateProviderCache("hh-uz")) >= 2,
    "provider webhook invalidation must clear cached data",
  );

  process.env.GEMINI_API_KEY ||= "test-only";
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
            currency: "UZS",
            isAvailable: true,
            metadata: {
              employerName: "Company",
              alternateUrl: "https://hh.uz/vacancy/123",
              rawSalary: { from: 5_000_000, currency: "UZS" },
            },
            description: "Hudud: Toshkent",
          },
        ];
      },
      getCatalog: async () => ({ offerings: [] }),
    } as any,
  );
  const chatInternals = chat as any;
  const clarification = chatInternals.planLiveContext("menga ish kerak", []);
  assert.equal(clarification.intent, "recruitment_clarification");
  assert.equal(clarification.needsCatalog, false);

  const plan = chatInternals.planLiveContext("sotuvchilik ishlarini top", []);
  const context = await chatInternals.loadLiveContext(plan, [
    {
      slug: "hh-uz",
      name: "HH",
      category: "recruitment",
      capabilities: ["CATALOG", "SEARCH"],
    },
  ]);
  assert.ok(
    maxActiveSearches > 1,
    "synonym searches must execute concurrently",
  );
  const answer = chatInternals.buildGroundedCatalogAnswer(plan, context);
  assert.match(answer, /\[Ariza topshirish]\(https:\/\/hh\.uz\/vacancy\/123\)/);

  let maxifoodCatalogCalls = 0;
  const dynamicFoodChat = new ConsumerChatService(
    {
      listProviders: async () => [
        {
          slug: "maxifood-express",
          name: "MaxiFood Express",
          type: "DELIVERY",
          category: "food_delivery",
          capabilities: ["CATALOG", "QUOTE", "ACTION_CREATE"],
        },
        {
          slug: "courier-only",
          name: "Courier Only",
          type: "SERVICES",
          category: "logistics",
          capabilities: ["CATALOG"],
        },
      ],
    } as any,
    {
      searchOfferings: async () => {
        throw new Error(
          "SEARCH must not be called for a catalog-only provider",
        );
      },
      getCatalog: async (slug: string) => {
        assert.equal(slug, "maxifood-express");
        maxifoodCatalogCalls += 1;
        return {
          offerings: [
            {
              id: "burger-1",
              title: "Maxi Burger",
              basePrice: 35_000,
              currency: "UZS",
              isAvailable: true,
            },
            {
              id: "pizza-1",
              title: "Pepperoni Pizza",
              basePrice: 70_000,
              currency: "UZS",
              isAvailable: true,
            },
          ],
        };
      },
    } as any,
  );
  (dynamicFoodChat as any).planWithAi = async () => ({
    intent: "food_browse",
    needsCatalog: true,
    providerScope: "food",
    providerSlugs: [],
    query: "fast food",
    limit: 6,
    page: 0,
    allowCatalogFallback: true,
    excludedOfferingIds: [],
  });
  const preparedFood = await (dynamicFoodChat as any).prepareChat({
    prompt: "men fast-food yemoqchiman",
    messages: [],
    userId: "test-user",
  });
  assert.equal(
    maxifoodCatalogCalls,
    1,
    "catalog-only food provider must be queried dynamically",
  );
  assert.match(preparedFood.directAnswer, /Maxi Burger/);
  assert.match(preparedFood.directAnswer, /Pepperoni Pizza/);
  assert.doesNotMatch(preparedFood.directAnswer, /Courier Only/);

  const openCatalogPlan = {
    ...(dynamicFoodChat as any).planLiveContext("burger", []),
    intent: "food_browse",
    needsCatalog: true,
    query: "burger",
  };
  const rankedCatalog = (dynamicFoodChat as any).rankCatalogForPlan(
    [
      { id: "pizza", title: "Pizza" },
      { id: "burger", title: "Burger" },
    ],
    openCatalogPlan,
  );
  assert.equal(
    rankedCatalog.length,
    2,
    "catalog ranking must never hide offerings",
  );
  assert.equal(
    rankedCatalog[0].id,
    "burger",
    "matching offerings should only move to the top",
  );

  delete (dynamicFoodChat as any).planWithAi;
  (dynamicFoodChat as any).models = [
    {
      name: "semantic-test",
      client: {
        generateContent: async () => ({
          response: {
            candidates: [{ finishReason: "STOP" }],
            text: () =>
              JSON.stringify({
                intent: "food_browse",
                needsCatalog: true,
                providerSlugs: ["maxifood-express"],
                query: "fast food",
                limit: 6,
                page: 0,
                allowCatalogFallback: true,
              }),
          },
        }),
      },
    },
  ];
  const semanticPlan = await (dynamicFoodChat as any).planWithAi(
    "tabiiy tildagi ovqat so‘rovi",
    [],
    [
      {
        slug: "maxifood-express",
        type: "DELIVERY",
        category: "food_delivery",
        capabilities: ["CATALOG"],
      },
      {
        slug: "second-food-provider",
        type: "DELIVERY",
        category: "food_delivery",
        capabilities: ["CATALOG"],
      },
    ],
  );
  assert.deepEqual(
    semanticPlan.providerSlugs,
    ["maxifood-express", "second-food-provider"],
    "AI planning must keep every active catalog-capable delivery provider open",
  );

  const selectionAnswer = (dynamicFoodChat as any).buildGroundedCatalogAnswer(
    {
      ...semanticPlan,
      intent: "food_selection",
      limit: 10,
    },
    [
      {
        slug: "maxifood-express",
        name: "MaxiFood Express",
        offerings: [
          { title: "Klassik Gamburger", salary: "28000 UZS" },
          { title: "Dabl Chizburger", salary: "38000 UZS" },
        ],
      },
      {
        slug: "coffee-time",
        name: "Coffee Time Sandbox Demo",
        offerings: [],
      },
    ],
  );
  assert.match(selectionAnswer, /Klassik Gamburger/);
  assert.doesNotMatch(selectionAnswer, /Dabl Chizburger/);
  assert.doesNotMatch(
    selectionAnswer,
    /demo provider/i,
    "an empty demo provider must not label real provider results as demo",
  );

  const capabilities = await (dynamicFoodChat as any).prepareChat({
    prompt: "rostan ham qanday yordam bera olasan?",
    messages: [],
    userId: "test-user",
  });
  assert.match(capabilities.directAnswer, /MaxiFood Express/);
  assert.match(capabilities.directAnswer, /Courier Only/);

  const providerListing = await (dynamicFoodChat as any).prepareChat({
    prompt: "senda qanday providerlar bor aniqlashtirchi",
    messages: [],
    userId: "test-user",
  });
  assert.equal(providerListing.plan.intent, "provider_listing");
  assert.match(providerListing.directAnswer, /MaxiFood Express/);

  console.log(
    "Provider cache, dynamic food discovery, catalog fallback, parallel search, and complete grounded chat output passed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
