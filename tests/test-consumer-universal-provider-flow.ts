import assert from "node:assert/strict";
import { ConsumerChatService } from "../apps/api/src/modules/consumer/chat/consumer-chat.service.ts";
import { ZAYUNO_MCP_TOOLS } from "../apps/mcp/src/tools.ts";
import { formatCustomerQuote } from "../packages/shared/src/customer-presenter.ts";

const ticketOffering = {
  id: "mangu-5",
  title: "MANGU 5",
  basePrice: 1_000_000,
  currency: "UZS",
  isAvailable: true,
  variants: [],
  optionGroups: [],
};

const providers = [
  {
    slug: "maxway",
    name: "MaxWay",
    type: "DELIVERY",
    category: "food",
    fulfillmentMode: "DELIVERY",
    capabilities: ["CATALOG", "QUOTE", "ACTION_CREATE"],
  },
  {
    // Services is intentional: a provider's public type can be broad while its
    // slug/catalog identify this test ticket integration.
    slug: "iticket-uz",
    name: "iTicket.UZ",
    type: "SERVICES",
    category: "entertainment",
    fulfillmentMode: "REMOTE",
    capabilities: ["CATALOG", "QUOTE", "ACTION_CREATE"],
  },
  {
    slug: "shopla",
    name: "Shopla",
    type: "COMMERCE",
    category: "retail",
    fulfillmentMode: "REMOTE",
    capabilities: ["CATALOG"],
  },
];

const store = new Map<string, string>();
const redis = {
  async get(key: string) { return store.get(key) || null; },
  async set(key: string, value: string) { store.set(key, value); },
  async del(key: string) { store.delete(key); },
};
const catalog = {
  async getCatalog() { return { parametersSchema: { type: "object", properties: {} } }; },
  async getOffering(_providerSlug: string, offeringId: string) {
    if (offeringId !== ticketOffering.id) throw new Error("unexpected offering");
    return ticketOffering;
  },
};

async function main() {
  const service = new ConsumerChatService(
    { async listProviders() { return providers; } } as any,
    catalog as any,
    {} as any,
    {} as any,
    redis as any,
  );

  const actions = await service.getQuickActions();
  const ticketAction = actions.actions.find((action: any) => action.key === "provider:iticket-uz");
  assert.ok(ticketAction, "A catalog-capable ticket provider must appear in home actions.");
  assert.equal(ticketAction.type, "ticket");
  assert.equal(ticketAction.prompt, "iTicket.UZ katalogini ko‘rsat");

  // Once a customer selected a provider, a fuzzy follow-up must stay within
  // that catalog instead of silently jumping to another matching provider.
  (service as any).model = {
    name: "planner-test",
    jsonClient: {
      async generateContent() {
        return {
          response: {
            text: () => JSON.stringify({
              intent: "catalog_selection",
              presentation: "recommend",
              providerSelection: "any",
              providerSlugs: ["shopla"],
              query: "burger",
              searchTerms: ["burger"],
              requestedCategories: [],
              constraints: {},
              quantity: 1,
              itemRequests: [{ query: "burger", quantity: 1 }],
              limit: 3,
              page: 0,
              allowCatalogFallback: true,
              answer: "",
            }),
            candidates: [{ finishReason: "STOP" }],
          },
        };
      },
    },
  };
  const retainedPlan = await (service as any).planWithAi(
    "Butger",
    [],
    providers,
    "",
    {
      intent: "catalog_browse",
      providerScope: "explicit",
      providerSlugs: ["maxway"],
      query: "MaxWay katalogi",
      constraints: {},
      presentation: "menu",
    },
  );
  assert.deepEqual(
    retainedPlan.providerSlugs,
    ["maxway"],
    "A typo follow-up must retain the explicitly selected provider.",
  );

  const plan = {
    intent: "catalog_selection",
    needsCatalog: true,
    providerScope: "explicit",
    providerSlugs: ["iticket-uz"],
    query: "MANGU 5 VIP",
    limit: 1,
    page: 0,
    quantity: 1,
    itemRequests: [{ query: "MANGU 5", quantity: 1 }],
    allowCatalogFallback: true,
    excludedOfferingIds: [],
  };
  const liveContext = [{ ...providers[1], offerings: [ticketOffering], metadata: {} }];
  const proposal = await (service as any).startOrderSelection(
    "customer-1",
    undefined,
    plan,
    liveContext,
    "ticket-chat",
    [{ kind: "offering", providerSlug: "iticket-uz", offeringId: "mangu-5", quantity: 1 }],
    "uz",
  );
  assert.match(proposal, /E-chipta uchun yakuniy mavjudlikni tekshiraman/);
  assert.doesNotMatch(proposal, /Yetkazish/);

  const pending = await (service as any).readPendingOrder("customer-1", "ticket-chat");
  assert.equal(pending.requiresDestination, false);
  assert.equal(pending.requiresPhone, false);

  const ticketQuote = formatCustomerQuote(
    {
      fulfillmentType: "REMOTE",
      subtotal: 1_000_000,
      totalFees: 0,
      total: 1_000_000,
      currency: "UZS",
      lines: [{ offeringTitle: "MANGU 5", quantity: 1, unitPrice: 1_000_000, lineTotal: 1_000_000 }],
      parameters: {},
    },
    providers[1],
  );
  assert.match(ticketQuote, /^Chipta topildi:/);
  assert.match(ticketQuote, /MANGU 5 × 1 — 1 000 000 so‘m/);
  assert.doesNotMatch(ticketQuote, /Yetkazib berish/);

  const createActionTool = ZAYUNO_MCP_TOOLS.find(
    (tool) => tool.name === "create_action",
  );
  assert.ok(createActionTool, "The action tool must be registered.");
  assert.ok(
    !createActionTool.inputSchema.required?.includes("customer"),
    "Contact must not be required for every provider action.",
  );
  let dispatchedAction: any;
  await createActionTool.handler(
    {
      providerSlug: "iticket-uz",
      quoteId: "ticket-quote-1",
      items: [{ offeringId: "mangu-5", quantity: 1 }],
      userConfirmed: true,
    },
    {
      async createAction(input: any) {
        dispatchedAction = input;
        return {
          id: "ticket-action-1",
          publicId: "ZY-TICKET-1",
          providerSlug: "iticket-uz",
          providerName: "iTicket.UZ",
          status: "AWAITING_PAYMENT",
          paymentStatus: "PENDING",
          total: 1_000_000,
          currency: "UZS",
          lines: [],
          fulfillmentType: "REMOTE",
          nextAction: {
            type: "OPEN_URL",
            url: "https://checkout.example/ticket-1",
            label: "To‘lovga o‘tish",
          },
          parameters: {},
        };
      },
      async getProvider() {
        return providers[1];
      },
    } as any,
  );
  assert.equal(
    dispatchedAction.customer,
    undefined,
    "The MCP action must not invent a customer phone for a remote ticket.",
  );

  console.log("Consumer universal provider flow keeps ticket fulfillment out of delivery and exposes only catalog-capable home actions.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
