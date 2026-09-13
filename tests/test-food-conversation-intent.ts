import assert from "node:assert/strict";
import { ConsumerChatService } from "../apps/api/src/modules/consumer/chat/consumer-chat.service";
import { CONSUMER_GEMINI_MODEL, readFoodBudget, lowestAvailableFoodPrice } from "../apps/api/src/modules/consumer/chat/food-request";

const providers = [
  { slug: "evos", name: "EVOS", type: "FOOD", capabilities: ["CATALOG"], fulfillmentMode: "DELIVERY" },
  { slug: "bellissimo", name: "Bellissimo Pizza", type: "FOOD", capabilities: ["CATALOG"], fulfillmentMode: "DELIVERY" },
  { slug: "yaponamama", name: "Yaponamama", type: "FOOD", capabilities: ["CATALOG"], fulfillmentMode: "DELIVERY" },
  { slug: "flowers", name: "Flowers", type: "RETAIL", category: "flowers", capabilities: ["CATALOG"] },
];
const dish = (id: string, title: string, category: string, price = 35000, extra = {}) => ({ id, title, categorySlug: category, categoryTitle: category, basePrice: price, currency: "UZS", isAvailable: true, variants: [], optionGroups: [], ...extra });
const menus: Record<string, any[]> = {
  evos: [
    ...Array.from({ length: 105 }, (_, i) => dish(`shawarma-${i}`, `Shaurma ${i}`, "shaurma")),
    dish("lavash", "Mol go‘shtli lavash", "lavash", 34000, { variants: [{ id: "m", name: "M", basePrice: 34000 }, { id: "l", name: "L", basePrice: 41000 }] }),
    dish("burger", "Cheeseburger", "burger", 30000),
  ],
  bellissimo: [dish("croissant", "Kruassan Barbekyu", "croissant", 94000), dish("pizza", "Margarita pitsa", "pizza", 45000), dish("expensive", "Premium pitsa", "pizza", 180000)],
  yaponamama: [dish("roll", "Lososli roll", "sushi", 42000)],
};
const route = (overrides: any = {}) => ({ intent: "food_browse", presentation: "menu", needsCatalog: true, providerSlugs: [], query: "lavash va burger", searchTerms: ["lavash", "burger"], requestedCategories: ["lavash", "burger"], constraints: { budgetScope: "unspecified" }, limit: 6, ...overrides });

export function fixture() {
  process.env.GEMINI_API_KEY ||= "offline-test-key";
  const state = new Map<string, string>();
  const calls = { catalogs: [] as string[], actions: [] as any[], quotes: [] as any[], instructions: [] as string[] };
  let schema: any;
  let fees = 5000;
  let failCatalog = false;
  let json: (prompt: string) => any = () => { throw new Error("Unexpected model operation"); };
  const redis = { get: async (key: string) => state.get(key), set: async (key: string, value: string) => state.set(key, value), del: async (key: string) => state.delete(key) };
  const catalog = {
    getCatalog: async (slug: string) => { calls.catalogs.push(slug); if (failCatalog) throw new Error("Provider unavailable"); return { offerings: menus[slug] || [], parametersSchema: schema }; },
    getOffering: async (slug: string, id: string) => menus[slug]?.find(item => item.id === id),
    checkAvailability: async () => ({ isAvailable: true, unavailableItems: [] }),
  };
  const service: any = new ConsumerChatService({ listProviders: async () => providers, getProviderBySlug: async (slug: string) => providers.find(p => p.slug === slug) } as any, catalog as any,
    { requestQuote: async (input: any) => {
      calls.quotes.push(input);
      const lines = input.items.map((item: any) => {
        const offering = menus[input.providerSlug].find(o => o.id === item.offeringId);
        const variant = offering.variants.find((v: any) => v.id === item.variantId);
        return { ...item, offeringTitle: offering.title, lineTotal: (variant?.basePrice ?? offering.basePrice) * item.quantity };
      });
      const subtotal = lines.reduce((sum: number, line: any) => sum + line.lineTotal, 0);
      return { id: "quote-1", lines, subtotal, totalFees: fees, totalDiscount: 0, total: subtotal + fees, currency: "UZS", expiresAt: new Date(Date.now() + 60000).toISOString() };
    } } as any,
    { createAction: async (input: any) => { calls.actions.push(input); return { id: "action-1", publicId: "ORDER-1" }; }, getPaymentOptions: async () => [] } as any, redis as any);
  const realJson = service.model.jsonClient;
  const realText = service.model.client;
  service.model.jsonClient = { generateContent: async (prompt: string) => { calls.instructions.push(prompt); const result = json(prompt); return { response: { text: () => JSON.stringify(result), candidates: [{ finishReason: "STOP" }] } }; } };
  service.model.client = { generateContent: async () => ({ response: { text: () => "Yetkazish bilan jami 55 000 so‘m, budjetingiz 50 000. Arzonroq taom tanlaylikmi?", candidates: [{ finishReason: "STOP" }] } }) };
  const input = (prompt: string, messages: any[] = [], selections?: any[]) => ({ prompt, messages, selections, userId: "u", conversationId: "c" });
  return { service, calls, input, setJson: (handler: typeof json) => json = handler, setSchema: (value: any) => schema = value, setFees: (value: number) => fees = value, failCatalog: () => failCatalog = true, useLiveModel: () => { service.model.jsonClient = realJson; service.model.client = realText; } };
}

function selectFrom(prompt: string, category: string, quantity = 1, variantId?: string) {
  const facts = JSON.parse(prompt.split("LIVE_CATALOG=")[1]);
  const index = facts.findIndex((item: any) => item.category === category);
  assert.ok(index >= 0, `Missing category in candidate pool: ${category}`);
  return { items: [{ index, quantity, variantId }], coverage: [{ category, indices: [index] }], reply: "So‘rovingizga mosini topdim." };
}

async function main() {
  for (const [text, expected] of [["50minga pitsa", 50000], ["150minglik ovqat", 150000], ["50 mingdan oshmasin", 50000], ["до 50 тыс сум", 50000], ["under 50k", 50000], ["50,000 UZS", 50000], ["956662277 Furqat", undefined]] as const) assert.equal(readFoodBudget(text), expected);
  assert.equal(lowestAvailableFoodPrice(dish("x", "x", "x", 100000, { variants: [{ basePrice: 45000 }, { basePrice: 20000, isAvailable: false }] })), 45000);

  const outage = fixture();
  assert.equal(outage.service.model.name, CONSUMER_GEMINI_MODEL);
  outage.setJson(() => { throw new Error("Model unavailable"); });
  await assert.rejects(() => outage.service.processMessage(outage.input("Lavash")), /Food planning unavailable/);
  assert.equal(outage.calls.catalogs.length, 0, "Model outage must not choose the first restaurant");

  const menu = fixture();
  menu.setJson(prompt => {
    if (!prompt.includes("LIVE_CATALOG=")) return route();
    const facts = JSON.parse(prompt.split("LIVE_CATALOG=")[1]);
    const indices = facts.map((item: any, index: number) => [item.category, index]).filter(([cat]: any) => ["lavash", "burger"].includes(cat));
    return { items: indices.map(([, index]: any) => ({ index, quantity: 1 })), coverage: ["lavash", "burger"].map(category => ({ category, indices: indices.filter(([cat]: any) => cat === category).map(([, index]: any) => index) })), reply: "Lavashlar va burgerlar shu yerda." };
  });
  const shown = await menu.service.processMessage(menu.input("Lavash va burgerlarni ko‘rsat"));
  assert.equal(shown.interaction.kind, "catalog_menu");
  assert.deepEqual(shown.interaction.sections.flatMap((s: any) => s.offerings.map((o: any) => o.offeringId)).sort(), ["burger", "lavash"]);
  assert.ok(!menu.calls.catalogs.includes("flowers"));
  assert.equal(menu.calls.actions.length, 0);
  const plan = { ...menu.service.emptyPlan("food_browse"), needsCatalog: true, query: "", providerSlugs: ["evos"], limit: 10 };
  const full = await menu.service.loadLiveContext(plan, providers);
  assert.equal(full[0].offerings.length, 107, "No first-10, first-30 or first-80 menu truncation");

  const missing = fixture();
  missing.setJson(prompt => prompt.includes("LIVE_CATALOG=") ? { ...selectFrom(prompt, "lavash"), coverage: [{ category: "lavash", indices: [0] }] } : route());
  await assert.rejects(() => missing.service.processMessage(missing.input("Lavash va burger")), /Incomplete food category coverage/);

  const selectionOutage = fixture();
  selectionOutage.setJson(prompt => { if (prompt.includes("LIVE_CATALOG=")) throw new Error("Invalid selection response"); return route(); });
  await assert.rejects(() => selectionOutage.service.processMessage(selectionOutage.input("Pitsalarni ko‘rsat")), /Food selection unavailable/);
  assert.equal(selectionOutage.calls.actions.length, 0);

  const pizza = fixture();
  pizza.setJson(prompt => prompt.includes("LIVE_CATALOG=") ? selectFrom(prompt, "pizza") : route({ query: "pitsalar", requestedCategories: ["pizza"] }));
  const pizzas = await pizza.service.processMessage(pizza.input("Menga pitsalarni korsata olasanmi?"));
  assert.deepEqual(pizzas.interaction.sections.flatMap((s: any) => s.offerings.map((o: any) => o.offeringId)), ["pizza"]);
  assert.doesNotMatch(pizzas.content, /Menyuda hozir mavjud|Qaysi.*katalog/);

  const order = fixture();
  order.setJson(prompt => prompt.includes("LIVE_CATALOG=") ? selectFrom(prompt, "lavash", 2, "l") : route({ intent: "food_selection", presentation: "recommend", query: "2 ta katta lavash", requestedCategories: ["lavash"], constraints: { maxBudget: 90000, budgetScope: "total" } }));
  const proposal = await order.service.processMessage(order.input("Menga 2 ta katta lavash buyurtma qil"));
  let pending = await order.service.readPendingOrder("u", "c");
  assert.equal(pending.stage, "proposed");
  assert.equal(pending.items.length, 1);
  assert.equal(pending.items[0].quantity, 2);
  assert.equal(pending.items[0].selectedVariantId, "l");
  assert.deepEqual(proposal.interaction.groups[0].choices.map((c: any) => c.title), ["Ha", "Yo‘q"]);
  assert.equal(order.calls.quotes.length, 0);
  const oldChoice = proposal.interaction.groups[0].choices[0];
  await order.service.processMessage(order.input("Ha", [], [oldChoice]));
  assert.equal(order.calls.actions.length, 0);
  await assert.rejects(() => order.service.processMessage(order.input("Ha", [], [oldChoice])), /expired/);
  pending = await order.service.readPendingOrder("u", "c");
  order.service.applyPendingTurn(pending, order.service.nextOrderRequirement(pending), { intent: "provide_details", phone: "+998901112233" }, "901112233");
  assert.equal(pending.address, undefined);
  assert.match(order.service.formatRequirementPrompt(pending, order.service.nextOrderRequirement(pending)), /manzilingiz/);
  order.service.applyPendingTurn(pending, order.service.nextOrderRequirement(pending), { intent: "provide_details", address: "Toshkent, Furqat 2A" }, "Furqat 2A");
  await order.service.advanceOrderCollection("u", pending, "c");
  assert.equal(order.calls.actions.length, 0, "Quote still needs explicit final consent");
  await order.service.processMessage(order.input("Tasdiqlayman"));
  assert.equal(order.calls.actions.length, 1);
  assert.equal(order.calls.actions[0].items[0].quantity, 2);

  const budget = fixture();
  budget.setFees(10000);
  budget.setJson(prompt => prompt.includes("LIVE_CATALOG=") ? selectFrom(prompt, "pizza") : route({ intent: "food_selection", presentation: "recommend", requestedCategories: ["pizza"], query: "50minga pitsa", constraints: { maxBudget: 50000, budgetScope: "unspecified" } }));
  await budget.service.processMessage(budget.input("50minga pitsa zakaz qil"));
  pending = await budget.service.readPendingOrder("u", "c");
  Object.assign(pending, { stage: "collecting_requirements", phone: "+998901112233", address: "Furqat 2A" });
  await budget.service.advanceOrderCollection("u", pending, "c");
  assert.equal(pending.budgetExceeded, true);
  assert.equal(budget.service.buildRequirementInteraction(pending), undefined);
  await budget.service.processMessage(budget.input("Ha"));
  assert.equal(budget.calls.actions.length, 0, "55k quote cannot bypass a 50k total cap");
  assert.deepEqual(budget.service.filterOfferingsForBudget(menus.bellissimo, "10minga pitsa"), [], "No expensive-item fallback when nothing fits");

  const timing = fixture();
  timing.setSchema({ type: "object", properties: { deliveryAt: { type: "string", format: "date-time", title: "Delivery date and time" } } });
  timing.setJson(prompt => prompt.includes("LIVE_CATALOG=") ? { ...selectFrom(prompt, "pizza"), scheduleParameter: "deliveryAt" } : route({ presentation: "recommend", query: "bugun kechga pitsa", requestedCategories: ["pizza"], constraints: { requestedTime: "bugun kechga", budgetScope: "unspecified" } }));
  const scheduled = await timing.service.processMessage(timing.input("Bugun kechga pitsa buyurtma qil"));
  assert.equal(scheduled.interaction.layout, "actions");
  await timing.service.processMessage(timing.input("Ha"));
  pending = await timing.service.readPendingOrder("u", "c");
  const req = timing.service.nextOrderRequirement(pending);
  assert.equal(req.key, "deliveryAt");
  assert.match(timing.service.formatRequirementPrompt(pending, req), /bugun kechga/);
  assert.equal(timing.service.applyPendingTurn(pending, req, { intent: "ask_question", choice: "19:00" }, "promo bormi?"), false);
  assert.equal(timing.service.applyPendingTurn(pending, req, { intent: "provide_details", choice: "maybe tonight" }, "tonight"), false);
  const date = new Date(Date.now() + 86400000).toISOString();
  assert.equal(timing.service.applyPendingTurn(pending, req, { intent: "provide_details", choice: date }, date), true);
  Object.assign(pending, { phone: "+998901112233", address: "Furqat 2A" });
  const quoteText = await timing.service.advanceOrderCollection("u", pending, "c");
  assert.equal(timing.calls.quotes[0].parameters.deliveryAt, date);
  assert.match(quoteText, /So‘ralgan vaqt/);

  const unavailable = fixture();
  unavailable.setJson(prompt => prompt.includes("LIVE_CATALOG=") ? { items: [], coverage: [{ category: "pizza", indices: [], reason: "Mos pitsa topilmadi." }], reply: "Kechga yetkazish tasdiqlanmagan. Hozirgi buyurtma uchun qidiraymi?" } : route({ presentation: "recommend", requestedCategories: ["pizza"], query: "tonight pizza", constraints: { requestedTime: "tonight" } }));
  const noSchedule = await unavailable.service.processMessage(unavailable.input("Tonight pizza"));
  assert.equal(noSchedule.interaction, undefined);
  assert.equal(await unavailable.service.readPendingOrder("u", "c"), null);

  const followup = fixture();
  followup.setJson(() => route({ presentation: "recommend", query: "50minga pitsa bugun kechga Yaponamama", providerSlugs: ["yaponamama"], requestedCategories: ["pizza"], constraints: { maxBudget: 50000, requestedTime: "bugun kechga", budgetScope: "total" } }));
  const followupPlan = await followup.service.planWithAi("Yaponamama", [{ role: "user", content: "Bugun kechga 50minga pitsa zakaz qil" }, { role: "assistant", content: "Qaysi restoran?" }], providers);
  assert.equal(followupPlan.constraints.maxBudget, 50000);
  assert.equal(followupPlan.constraints.requestedTime, "bugun kechga");
  assert.equal(followupPlan.presentation, "recommend");

  const languages = fixture();
  languages.setJson(prompt => prompt.includes("LIVE_CATALOG=") ? selectFrom(prompt, "pizza") : route({ presentation: "recommend", requestedCategories: ["pizza"], query: "pizza" }));
  const english = await languages.service.processMessage(languages.input("Please order one pizza"));
  assert.deepEqual(english.interaction.groups[0].choices.map((c: any) => c.title), ["Yes", "No"]);
  await languages.service.clearPendingOrder("u", "c");
  const russian = await languages.service.processMessage(languages.input("Закажи пиццу"));
  assert.deepEqual(russian.interaction.groups[0].choices.map((c: any) => c.title), ["Да", "Нет"]);

  console.log("PASS: single model, outage isolation, complete categories/catalog, exact variant/quantity, total budget, scheduled fields, consent stages, language and request continuation.");
}

if (process.argv[1]?.endsWith("test-food-conversation-intent.ts")) main().catch(error => { console.error(error); process.exitCode = 1; });
