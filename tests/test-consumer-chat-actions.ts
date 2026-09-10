import assert from "node:assert/strict";
import { ConsumerChatService } from "../apps/api/src/modules/consumer/chat/consumer-chat.service";
import { normalizeChatActions } from "../apps/api/src/modules/consumer/chat/chat-actions";

async function main() {
  const store = new Map<string, string>();
  const redis = {
    get: async (key: string) => store.get(key) || null,
    set: async (key: string, value: string) => {
      store.set(key, value);
    },
    del: async (key: string) => {
      store.delete(key);
    },
  };
  let orders = 0;
  const chat: any = new ConsumerChatService(
    {} as any,
    {} as any,
    {} as any,
    {
      createAction: async (input: any) => {
        orders++;
        assert.equal(input.userConfirmed, true);
        return { id: "order", publicId: "ZY-1" };
      },
      getPaymentOptions: async () => [],
    } as any,
    redis as any,
  );
  const input = { userId: "a", conversationId: "chat-a", prompt: "Tayyor" };
  const state: any = {
    version: 3,
    stage: "awaiting_confirmation",
    providerSlug: "food",
    providerName: "Food",
    items: [
      {
        offeringId: "x",
        offeringTitle: "Pitsa",
        quantity: 1,
        variants: [],
        optionGroups: [],
        selectedOptions: [],
        resolvedOptionGroupIds: [],
      },
    ],
    requiresPhone: false,
    requiresDestination: false,
    parameters: {},
    idempotencyKey: "order-key",
    quote: {
      id: "q1",
      total: 99000,
      subtotal: 99000,
      totalFees: 0,
      totalDiscount: 0,
      currency: "UZS",
      lines: [],
      expiresAt: new Date(Date.now() + 600000).toISOString(),
    },
  };
  await chat.savePendingOrder(
    input.userId,
    structuredClone(state),
    input.conversationId,
  );
  const candidates = [
    {
      kind: "confirm",
      label: "Buyurtmani tasdiqlash",
      prompt: "Buyurtmani yuboring",
    },
    {
      kind: "cancel",
      label: "Bekor qilish",
      prompt: "Buyurtmani bekor qiling",
    },
  ];
  chat.model = {
    jsonClient: {
      generateContent: async () => ({
        response: { text: () => JSON.stringify({ actions: candidates }) },
      }),
    },
  };
  let emitted: any;
  const interaction = await chat.suggestNextActions(
    input,
    "99 000 so‘m. Tasdiqlaysizmi?",
    undefined,
    (value: any) => {
      emitted = value;
    },
  );
  assert.equal(interaction.kind, "action_suggestions");
  assert.deepEqual(emitted, interaction);
  assert.equal(interaction.actions.length, 2);
  const actionId = interaction.actions[0].id;
  assert.equal(
    await chat.resolveSuggestedAction({ ...input, userId: "other", actionId }),
    undefined,
    "cross-account clicks must not resolve",
  );
  assert.equal(
    await chat.resolveSuggestedAction({
      ...input,
      conversationId: "other",
      actionId,
    }),
    undefined,
    "cross-chat clicks must not resolve",
  );
  const result = await chat.prepareChat({
    ...input,
    prompt: "tampered request body",
    actionId,
  });
  assert.match(result.directAnswer, /yuborildi/);
  assert.equal(
    orders,
    1,
    "structured confirmation must work without another AI intent round trip",
  );
  const replay = await chat.prepareChat({ ...input, actionId });
  assert.match(replay.directAnswer, /oldingi holat/);
  assert.equal(
    orders,
    1,
    "duplicate confirmation must not place another order",
  );

  await chat.savePendingOrder(
    input.userId,
    structuredClone(state),
    input.conversationId,
  );
  const old = await chat.suggestNextActions(input, "Tayyor");
  await chat.savePendingOrder(
    input.userId,
    { ...state, quote: { ...state.quote, id: "q2", total: 109000 } },
    input.conversationId,
  );
  const stale = await chat.prepareChat({
    ...input,
    actionId: old.actions[0].id,
  });
  assert.match(stale.directAnswer, /109,000/);
  assert.equal(orders, 1, "quote changes must invalidate old confirmation");
  const fresh = await chat.suggestNextActions(input, "Tayyor");
  await chat.prepareChat({
    ...input,
    actionId: fresh.actions.find((a: any) => a.kind === "cancel").id,
  });
  assert.equal(
    await chat.readPendingOrder(input.userId, input.conversationId),
    null,
  );
  assert.equal(orders, 1);

  const collecting = {
    ...state,
    stage: "collecting_requirements",
    quote: undefined,
    requiresPhone: true,
  };
  await chat.savePendingOrder(input.userId, collecting, input.conversationId);
  const partial = await chat.suggestNextActions(
    input,
    "Telefoningizni yuboring",
  );
  assert.ok(
    partial.actions.every(
      (a: any) => a.kind !== "confirm" && a.kind !== "continue",
    ),
    "missing contact must never be bypassed",
  );
  const optional = {
    ...collecting,
    requiresPhone: false,
    items: [
      {
        ...state.items[0],
        optionGroups: [
          {
            id: "extras",
            name: "Sous",
            minSelections: 0,
            maxSelections: 1,
            options: [{ id: "sauce", name: "Sous" }],
          },
        ],
      },
    ],
  };
  assert.ok(
    !chat.allowedChatActions(optional).includes("continue"),
    "automatically skipped optional groups should not add an unnecessary step",
  );
  assert.ok(
    !chat
      .allowedChatActions({
        ...state,
        quote: { ...state.quote, expiresAt: new Date(0).toISOString() },
      })
      .includes("confirm"),
  );
  assert.equal(
    normalizeChatActions(
      [{ kind: "confirm", label: "Davom etish", prompt: "Ha" }],
      ["confirm"],
      state.quote.expiresAt,
    ).length,
    0,
  );
  assert.equal(
    normalizeChatActions(
      [{ kind: "pay", label: "Pay", prompt: "Pay" }],
      ["reply"],
      state.quote.expiresAt,
    ).length,
    0,
  );
  chat.model.jsonClient.generateContent = async () => {
    throw new Error("offline");
  };
  assert.equal(
    await chat.suggestNextActions(input, "Javob"),
    undefined,
    "optional AI failure must not fail the response",
  );
  console.log(
    "Chat actions: dynamic payload, streaming, explicit confirmation, duplicate/stale/tenant protection, optional continuation, and AI failure passed.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
