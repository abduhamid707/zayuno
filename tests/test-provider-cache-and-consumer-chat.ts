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

  // A provider-only menu request must pin the selected provider for the next
  // typo or short follow-up. Otherwise "MaxWay" followed by "Butger" can be
  // re-ranked into another food provider's catalog.
  const scopeStore = new Map<string, string>();
  const scopeRedis = {
    get: async (key: string) => scopeStore.get(key) || null,
    set: async (key: string, value: string) => void scopeStore.set(key, value),
    del: async (key: string) => void scopeStore.delete(key),
  };
  const scopeChat = new ConsumerChatService(
    {
      listProviders: async () => [
        { slug: "maxway", name: "MaxWay", type: "DELIVERY", capabilities: ["CATALOG"] },
        { slug: "evos", name: "EVOS", type: "DELIVERY", capabilities: ["CATALOG"] },
      ],
    } as any,
    {
      getCatalog: async () => ({ offerings: [{ id: "maxway-burger", title: "MaxWay Burger", basePrice: 25_000 }] }),
      searchOfferings: async () => [],
    } as any,
    {} as any,
    {} as any,
    scopeRedis as any,
  );
  const scopeInternals = scopeChat as any;
  let previousScopePlan: any;
  let routedProviderSlugs: string[] = [];
  scopeInternals.planWithAi = async (prompt: string, _history: any[], _providers: any[], _personalization: string, previousPlan: any) => {
    previousScopePlan = previousPlan;
    if (prompt === "MaxWay menyusini ko‘rsat") {
      return {
        intent: "provider_listing",
        needsCatalog: false,
        providerScope: "selected",
        providerSlugs: [],
        query: "MaxWay",
        limit: 6,
        page: 0,
        quantity: 1,
        itemRequests: [],
        allowCatalogFallback: false,
        excludedOfferingIds: [],
        directAnswer: "MaxWay menyusi.",
      };
    }
    return {
      intent: "catalog_browse",
      needsCatalog: true,
      providerScope: "selected",
      providerSlugs: [],
      query: "butger",
      limit: 6,
      page: 0,
      quantity: 1,
      itemRequests: [],
      allowCatalogFallback: true,
      excludedOfferingIds: [],
    };
  };
  scopeInternals.recommendFood = async (_input: any, _history: any[], plan: any, liveContext: any[]) => {
    routedProviderSlugs = plan.providerSlugs;
    return { prompt: "Butger", history: [], plan, liveContext, directAnswer: "MaxWay katalogi." };
  };
  await scopeChat.processMessage({ prompt: "MaxWay menyusini ko‘rsat", messages: [], userId: "scope-user" });
  const savedScopePlan = JSON.parse(scopeStore.get("consumer:food-request:scope-user:undefined")!).plan;
  assert.deepEqual(savedScopePlan.providerSlugs, ["maxway"]);
  await scopeChat.processMessage({ prompt: "Butger", messages: [], userId: "scope-user" });
  assert.deepEqual(previousScopePlan.providerSlugs, ["maxway"]);
  assert.deepEqual(routedProviderSlugs, ["maxway"]);

  // Free-text intent, multi-category discovery and budget recommendations now
  // use the single-model flow tested in test-food-conversation-intent.ts.
  // The former generic-catalog and fourth-off-topic-message silence assertions
  // contradicted the new behavior; cache and transaction regressions stay here.

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
      cancelAction: async (input: any) => {
        assert.equal(input.actionId, "action-real-1");
        return { status: "CANCELLED" };
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

  assert.equal(orderInternals.detectPendingCommand("Ha"), "confirm");
  assert.equal(orderInternals.detectPendingCommand("Tasdiqlayman"), "confirm");
  assert.equal(orderInternals.detectPendingCommand("подтверждаю"), "confirm");
  assert.equal(orderInternals.detectPendingCommand("confirm"), "confirm");
  assert.equal(orderInternals.detectPendingCommand("Bekor qiling"), "cancel");
  assert.equal(orderInternals.detectLanguage("Покажите красные розы"), "ru");
  assert.equal(orderInternals.detectLanguage("Show me red roses"), "en");

  await orderInternals.startOrderSelection(
    "structured-order-user",
    "customer@example.com",
    {
      intent: "catalog_selection",
      needsCatalog: true,
      providerScope: "selected",
      providerSlugs: ["maxifood-express"],
      query: "",
      quantity: 1,
      limit: 10,
      page: 0,
      itemRequests: [],
      allowCatalogFallback: true,
      excludedOfferingIds: [],
    },
    [{
      slug: "maxifood-express",
      name: "MaxiFood Express",
      fulfillmentMode: "DELIVERY",
      offerings: [
        { id: "burger-1", title: "Klassik Gamburger" },
        { id: "burger-2", title: "Pishloqli Gamburger" },
        { id: "burger-3", title: "Tovuqli Gamburger" },
        { id: "burger-4", title: "Katta Gamburger" },
      ],
    }],
    "structured-chat",
    [{ providerSlug: "maxifood-express", offeringId: "burger-1", quantity: 2 }],
    "uz",
  );
  const structuredState = JSON.parse(
    orderStore.get("consumer:chat:pending-order:structured-order-user:structured-chat")!,
  );
  assert.equal(structuredState.items.length, 1, "structured cart selection must never add fuzzy extra items");
  assert.equal(structuredState.items[0].offeringId, "burger-1");
  assert.equal(structuredState.items[0].quantity, 2);

  // Mock interpretPendingTurn to avoid real Gemini calls
  orderInternals.interpretPendingTurn = async (prompt: string) => {
    if (prompt === "2") return { intent: "provide_details", choice: "2" };
    if (prompt === "1") return { intent: "provide_details", choice: "1" };
    if (prompt === "achchiq") return { intent: "provide_details", choice: "achchiq" };
    if (/promo/i.test(prompt)) return { intent: "ask_question" };
    if (prompt === "995557755") return { intent: "provide_details", phone: "995557755" };
    if (prompt === "Toshkent, Chilonzor 5") return { intent: "provide_details", address: "Toshkent, Chilonzor 5" };
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

  const storedBeforeContact = JSON.parse(
    orderStore.get("consumer:chat:pending-order:order-user")!,
  );
  assert.equal(
    orderInternals.extractPendingContactDetails(
      "Toshkent, Chilonzor tumani, 5-mavze, 12-uy",
      storedBeforeContact,
    ).address,
    "Toshkent, Chilonzor tumani, 5-mavze, 12-uy",
    "an address may arrive before the phone number",
  );
  assert.equal(
    orderInternals.extractPromoCode("Promo code bormi?"),
    undefined,
    "a promo question must not be mistaken for a promo code",
  );
  assert.equal(orderInternals.extractPromoCode("promo: ZAYUNO10"), "ZAYUNO10");
  assert.deepEqual(
    orderInternals.parseExplicitItemRequests(
      "Detroyt seti, 26 dona, Dudlangan lososli MINIROLL 6 dona, Gril lososli miniroll, 6 dona (4 ta)",
    ),
    [
      { query: "Detroyt seti, 26 dona", quantity: 1 },
      { query: "Dudlangan lososli MINIROLL 6 dona", quantity: 1 },
      { query: "Gril lososli miniroll, 6 dona", quantity: 4 },
    ],
    "pack sizes in provider titles must remain intact while parenthesized order quantities are applied",
  );

  const promoAnswer = await orderInternals.handlePendingOrder(
    "order-user",
    "customer@example.com",
    "Promo code bormi?",
  );
  assert.match(promoAnswer, /ommaviy promo-kod/i);
  assert.match(promoAnswer, /telefon raqamingiz/i);
  assert.equal(quoteCalls, 0, "a side question must preserve the pending order");

  const addressOnlyPrompt = await orderInternals.handlePendingOrder(
    "order-user",
    "customer@example.com",
    "995557755",
  );
  assert.match(addressOnlyPrompt, /yetkazish manzilingiz/i);
  assert.doesNotMatch(
    addressOnlyPrompt,
    /telefon raqamingiz/i,
    "a separately supplied phone must be persisted and not requested again",
  );
  assert.equal(
    JSON.parse(
      orderStore.get("consumer:chat:pending-order:order-user")!,
    ).phone,
    "+998995557755",
  );

  const confirmationPrompt = await orderInternals.handlePendingOrder(
    "order-user",
    "customer@example.com",
    "Toshkent, Chilonzor 5",
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
    /\[Sinov sahifasini ochish\]\(https:\/\/pay\.maxifood\.example\/checkout\/1\)/,
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
  assert.match(paidStatus.content, /ishonchli tasdiqlamadi/i);
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

  const cancelOrderAnswer = await orderChat.processMessage({
    prompt: "bekor qil",
    messages: [],
    userId: "order-user",
  });
  assert.match(cancelOrderAnswer.content, /bekor qilindi/i);
  assert.equal(
    orderStore.has("consumer:chat:active-action:order-user"),
    false,
    "active action must be cleared after cancellation",
  );

  const idleCancel = await orderChat.processMessage({
    prompt: "bekor qil",
    messages: [],
    userId: "random-idle-user",
  });
  assert.match(idleCancel.content, /bekor qilindi/i);
  assert.doesNotMatch(idleCancel.content, /mahsulot jamoasi/i);

  console.log(
    "Provider cache, guarded order confirmation, payment handoff and parallel search passed.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
