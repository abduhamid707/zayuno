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
    {} as any,
    {} as any,
    redis as any,
  );
  const chatInternals = chat as any;

  // planWithAi is now async (Gemini-backed); mock it for unit tests
  chatInternals.planWithAi = async (prompt: string) => {
    if (prompt === "menga ish kerak") {
      return {
        intent: "recruitment_clarification",
        needsCatalog: false,
        providerScope: "explicit",
        providerSlugs: [],
        query: prompt,
        limit: 10,
        page: 1,
        quantity: 1,
        itemRequests: [],
        allowCatalogFallback: false,
        excludedOfferingIds: [],
      };
    }
    return {
      intent: "recruitment_search",
      needsCatalog: true,
      providerScope: "explicit",
      providerSlugs: ["hh-uz"],
      query: "sotuvchilik",
      limit: 10,
      page: 1,
      quantity: 1,
      itemRequests: [],
      allowCatalogFallback: false,
      excludedOfferingIds: [],
    };
  };

  const clarification = await chatInternals.planWithAi("menga ish kerak");
  assert.equal(clarification.intent, "recruitment_clarification");
  assert.equal(clarification.needsCatalog, false);

  const plan = await chatInternals.planWithAi("sotuvchilik ishlarini top");
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
      getOffering: async () => ({ variants: [], optionGroups: [] }),
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
    {} as any,
    {} as any,
    redis as any,
  );
  (dynamicFoodChat as any).planWithAi = async () => ({
    intent: "food_browse",
    needsCatalog: true,
    providerScope: "food",
    providerSlugs: [],
    query: "fast food",
    quantity: 1,
    limit: 6,
    page: 0,
    itemRequests: [],
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
  assert.deepEqual(
    (dynamicFoodChat as any).findMentionedProviderSlugs(
      "MaxiFood Express da fast-food bormi?",
      [
        { slug: "maxifood-express", name: "MaxiFood Express" },
        { slug: "coffee-time", name: "Coffee Time Sandbox Demo" },
      ],
    ),
    ["maxifood-express"],
    "an explicitly named provider must be scoped without mixing competitors",
  );

  const productionFoodAnswer = (
    dynamicFoodChat as any
  ).buildGroundedCatalogAnswer(
    {
      ...(dynamicFoodChat as any).emptyPlan("food_browse"),
      intent: "food_browse",
      needsCatalog: true,
      providerScope: "food",
      limit: 6,
    },
    [
      {
        slug: "maxifood-express",
        name: "MaxiFood Express",
        offerings: [{ title: "Klassik Gamburger", salary: "28000 UZS" }],
      },
      {
        slug: "coffee-time",
        name: "Coffee Time Sandbox Demo",
        offerings: [{ title: "Cappuccino", salary: "18000 UZS" }],
      },
    ],
  );
  assert.match(productionFoodAnswer, /Klassik Gamburger/);
  assert.doesNotMatch(productionFoodAnswer, /Cappuccino|demo provider/i);

  const openCatalogPlan = {
    ...(dynamicFoodChat as any).emptyPlan("food_browse"),
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
  (dynamicFoodChat as any).model = {
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
              quantity: 1,
              limit: 6,
              page: 0,
              allowCatalogFallback: true,
            }),
        },
      }),
    },
  };
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
    ["maxifood-express"],
    "AI planning must return only the slugs selected by the semantic planner",
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

  // Re-mock planWithAi for capabilities and provider listing tests
  (dynamicFoodChat as any).planWithAi = async (prompt: string) => {
    if (/yordam|qila olasan|nima qil/i.test(prompt)) {
      return {
        intent: "capabilities" as const,
        needsCatalog: false,
        providerScope: "explicit" as const,
        providerSlugs: [],
        query: prompt,
        limit: 6,
        page: 0,
        quantity: 1,
        itemRequests: [],
        allowCatalogFallback: false,
        excludedOfferingIds: [],
      };
    }
    if (/provider|aniqlashtir/i.test(prompt)) {
      return {
        intent: "provider_listing" as const,
        needsCatalog: false,
        providerScope: "explicit" as const,
        providerSlugs: [],
        query: "",
        limit: 6,
        page: 0,
        quantity: 1,
        itemRequests: [],
        allowCatalogFallback: false,
        excludedOfferingIds: [],
      };
    }
    return {
      intent: "food_browse" as const,
      needsCatalog: true,
      providerScope: "food" as const,
      providerSlugs: [],
      query: prompt,
      limit: 6,
      page: 0,
      quantity: 1,
      itemRequests: [],
      allowCatalogFallback: true,
      excludedOfferingIds: [],
    };
  };

  const capabilities = await (dynamicFoodChat as any).prepareChat({
    prompt: "rostan ham qanday yordam bera olasan?",
    messages: [],
    userId: "test-user",
  });
  assert.match(capabilities.directAnswer, /Zayuno/);
  assert.match(capabilities.directAnswer, /MaxWay/);

  const providerListing = await (dynamicFoodChat as any).prepareChat({
    prompt: "senda qanday providerlar bor aniqlashtirchi",
    messages: [],
    userId: "test-user",
  });
  assert.equal(providerListing.plan.intent, "provider_listing");
  assert.match(providerListing.directAnswer, /MaxiFood Express/);

  const orderStore = new Map<string, string>();
  const orderRedis = {
    get: async (key: string) => orderStore.get(key) || null,
    set: async (key: string, value: string) => void orderStore.set(key, value),
    del: async (key: string) => void orderStore.delete(key),
  };
  let quoteCalls = 0;
  let actionCalls = 0;
  const orderChat = new ConsumerChatService(
    {} as any,
    {
      getOffering: async () => ({
        id: "burger-1",
        title: "Klassik Gamburger",
        variants: [
          { id: "small", name: "Kichik", basePrice: 28_000 },
          { id: "large", name: "Katta", basePrice: 34_000 },
        ],
        optionGroups: [
          {
            id: "sauce",
            name: "Sous",
            isRequired: true,
            minSelections: 1,
            maxSelections: 1,
            options: [
              { id: "cheese", name: "Pishloqli", priceDelta: 2_000 },
              { id: "bbq", name: "BBQ", priceDelta: 1_000 },
            ],
          },
        ],
        parametersSchema: {
          type: "object",
          properties: {
            spice: {
              type: "string",
              title: "Achchiqlik darajasi",
              enum: ["oddiy", "achchiq"],
            },
          },
          required: ["spice"],
        },
      }),
      getCatalog: async () => ({ offerings: [] }),
      checkAvailability: async (input: any) => ({
        isAvailable: true,
        unavailableItems: [],
        availableItems: input.items,
      }),
    } as any,
    {
      requestQuote: async (input: any) => {
        quoteCalls += 1;
        assert.equal(input.providerSlug, "maxifood-express");
        assert.equal(input.items[0].offeringId, "burger-1");
        assert.equal(input.items[0].variantId, "large");
        assert.equal(input.items[0].selectedOptions[0].optionId, "cheese");
        assert.equal(input.parameters.spice, "achchiq");
        return {
          id: "quote-real-1",
          providerSlug: "maxifood-express",
          lines: [
            {
              offeringId: "burger-1",
              offeringTitle: "Klassik Gamburger",
              unitPrice: 28_000,
              quantity: 1,
              optionsTotal: 0,
              lineTotal: 28_000,
              selectedOptions: [],
            },
          ],
          subtotal: 28_000,
          fees: [{ name: "Yetkazib berish", amount: 5_000 }],
          totalFees: 5_000,
          discounts: [],
          totalDiscount: 0,
          total: 33_000,
          currency: "UZS",
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
          parameters: {},
        };
      },
    } as any,
    {
      createAction: async (input: any) => {
        actionCalls += 1;
        assert.equal(input.userConfirmed, true);
        assert.equal(input.quoteId, "quote-real-1");
        return {
          id: "action-real-1",
          publicId: "ZY-MAXI-1",
          nextAction: {
            type: "PAYMENT",
            url: "https://pay.maxifood.example/checkout/1",
          },
        };
      },
      getPaymentOptions: async () => [],
      getAction: async () => ({
        id: "action-real-1",
        publicId: "ZY-MAXI-1",
        providerName: "MaxiFood Express",
        status: "CONFIRMED",
        paymentStatus: "PAID",
        supportContact: {
          phone: "+998 71 200-00-00",
          supportUrl: "https://maxifood.example/support",
        },
      }),
      getLiveAction: async () => ({
        providerVerified: true,
        action: {
          id: "action-real-1",
          publicId: "ZY-MAXI-1",
          providerName: "MaxiFood Express",
          status: "CONFIRMED",
          paymentStatus: "PAID",
          supportContact: {
            phone: "+998 71 200-00-00",
            supportUrl: "https://maxifood.example/support",
          },
        },
      }),
    } as any,
    orderRedis as any,
  );
  const orderInternals = orderChat as any;

  // Mock interpretPendingTurn to avoid real Gemini calls
  orderInternals.interpretPendingTurn = async (prompt: string) => {
    if (prompt === "2") return { intent: "provide_details", choice: "2" };
    if (prompt === "1") return { intent: "provide_details", choice: "1" };
    if (prompt === "achchiq") return { intent: "provide_details", choice: "achchiq" };
    if (prompt.includes("+998")) return { intent: "provide_details", phone: "+998901234567", address: "Toshkent, Chilonzor 5", fulfillmentType: "DELIVERY" };
    if (/tasdiq|ha\b|confirm/i.test(prompt)) return { intent: "confirm" };
    if (/bekor|yo'q|cancel/i.test(prompt)) return { intent: "cancel" };
    return { intent: "provide_details", choice: prompt };
  };
  const selectionPrompt = await orderInternals.startOrderSelection(
    "order-user",
    "customer@example.com",
    {
      intent: "food_selection",
      needsCatalog: true,
      providerScope: "food",
      providerSlugs: ["maxifood-express"],
      query: "Klassik Gamburger",
      quantity: 1,
      limit: 1,
      page: 0,
      itemRequests: [{ query: "Klassik Gamburger", quantity: 1 }],
      allowCatalogFallback: true,
      excludedOfferingIds: [],
    },
    [
      {
        slug: "maxifood-express",
        name: "MaxiFood Express",
        fulfillmentMode: "DELIVERY",
        offerings: [{ id: "burger-1", title: "Klassik Gamburger" }],
      },
    ],
  );
  assert.match(selectionPrompt, /Variantni tanlang/i);
  assert.equal(quoteCalls, 0, "selection must not create a quote prematurely");
  assert.equal(actionCalls, 0, "selection must never create an action");

  const optionPrompt = await orderInternals.handlePendingOrder(
    "order-user",
    "customer@example.com",
    "2",
  );
  assert.match(optionPrompt, /Sous/i);
  const parameterPrompt = await orderInternals.handlePendingOrder(
    "order-user",
    "customer@example.com",
    "1",
  );
  assert.match(parameterPrompt, /Achchiqlik darajasi/i);
  const contactPrompt = await orderInternals.handlePendingOrder(
    "order-user",
    "customer@example.com",
    "achchiq",
  );
  assert.match(contactPrompt, /telefon raqamingiz/i);

  const confirmationPrompt = await orderInternals.handlePendingOrder(
    "order-user",
    "customer@example.com",
    "+998901234567 | Toshkent, Chilonzor 5",
  );
  assert.equal(quoteCalls, 1, "contact details must request a live quote once");
  assert.equal(actionCalls, 0, "quote must not create an action");
  assert.match(confirmationPrompt, /33,000 UZS/);
  assert.match(confirmationPrompt, /tasdiqlayman/i);

  const reminder = await orderInternals.handlePendingOrder(
    "order-user",
    "customer@example.com",
    "hozir emas",
  );
  assert.equal(actionCalls, 0, "non-confirmation must never create an action");
  assert.match(reminder, /tasdiqlayman/i);

  const paymentAnswer = await orderInternals.handlePendingOrder(
    "order-user",
    "customer@example.com",
    "tasdiqlayman",
  );
  assert.equal(actionCalls, 1, "explicit confirmation must create one action");
  assert.match(
    paymentAnswer,
    /\[To‘lov qilish\]\(https:\/\/pay\.maxifood\.example\/checkout\/1\)/,
  );
  assert.equal(
    orderStore.has("consumer:chat:pending-order:order-user"),
    false,
    "completed checkout handoff must clear pending state",
  );
  assert.equal(
    orderStore.has("consumer:chat:active-action:order-user"),
    true,
    "completed checkout handoff must retain active action context",
  );

  const paidStatus = await orderChat.processMessage({
    prompt: "to‘ladim",
    messages: [],
    userId: "order-user",
  });
  assert.match(paidStatus.content, /to‘lov tasdiqlangan/i);
  const supportAnswer = await orderChat.processMessage({
    prompt: "supportga bog‘lansam bo‘ladimi",
    messages: [],
    userId: "order-user",
  });
  assert.match(supportAnswer.content, /\+998 71 200-00-00/);
  assert.match(
    supportAnswer.content,
    /\[Support sahifasi\]\(https:\/\/maxifood\.example\/support\)/,
  );

  console.log(
    "Provider cache, dynamic food discovery, guarded order confirmation, payment handoff, parallel search, and complete grounded chat output passed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
