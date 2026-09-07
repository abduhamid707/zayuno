# Compact choice buttons

Zayuno uses a small, transparent, dependency-free MCP Apps component, not native
ChatGPT suggested replies. It attaches to provider discovery, locations, catalog,
item details, quote review, order status and payment-option results. There is no
storefront, image gallery, nested iframe, or embedded checkout form.

The existing data tools also render their own small set of authoritative choices.
This deliberately avoids an extra render-tool round trip for each selection.
There is no long-lived widget cart: selections stay in the conversation. The
underlying tools and order/payment validation continue working for non-UI agents.

## Contract

- Resource: `ui://zayuno/quick-replies-v1.html`; MIME: `text/html;profile=mcp-app`.
- Both `ui.resourceUri` and the ChatGPT compatibility `openai/outputTemplate`
  reference the same resource. Bump its URI when publishing incompatible UI changes.
- Tool-result `_meta["zayuno/quickReplies"]` carries server-built choices. It is
  delivered by `ui/notifications/tool-result` or `window.openai.toolResponseMetadata`.
- A deliberate click sends `ui/message`, with `sendFollowUpMessage` as a
  compatibility path. Exact IDs in that message prevent ambiguous selections from
  older cards. The assistant should not repeat these IDs in its customer reply.
- All buttons are text, with safe DOM construction. No external assets, network
  requests or new dependencies. Six choices per group are initially visible;
  more remain accessible with local pagination.
- Clicking a product/quantity/modifier is NOT an order confirmation. Quote
  confirmation displays line items and the verified total, binds to the exact
  quote, disables after expiry, and only sends a message. It cannot call
  `create_action` or make payments. Existing server guardrails remain authoritative.
- Sending is acknowledged before success is shown. Double clicks are locked,
  explicit failures allow retry, and an uncertain timeout does not auto-resend.
- The large `catalog-v3` resource is retained for compatibility/developer previews,
  but no customer tool attaches it. `ZAYUNO_CATALOG_WIDGET_ENABLED` does not enable
  it on the new selection flow.

## Verify

```sh
pnpm exec tsx apps/mcp/tests/test-quick-replies.ts
pnpm test:review
pnpm build
pnpm exec tsx apps/mcp/tests/preview-quick-replies.ts
```

The preview at `http://127.0.0.1:8766` is explicitly a **local simulated host with
sample data**. It verifies layout and message dispatch, not actual ChatGPT delivery.
The automated suite also tests HTTP resource/tool metadata and SDK-handler parity.

## After deployment

1. Check `/health`: `quickRepliesEnabled: true` and the new `uiResource` above.
2. Refresh/update Zayuno in ChatGPT app settings so its tool descriptors reload.
   Reconnect only if the app has no refresh option or still uses old descriptors.
3. Start a new chat with the refreshed app and send:
   “MaxWay katalogini och. Mahsulotlarni tanlash tugmalarini ko‘rsat. Buyurtma yaratma.”
4. Click a product. Expect one follow-up message with that exact product, then
   item/quantity choices. Verify no order was created. Repeat with provider choice.
5. Test unavailable products, keyboard focus, narrow/mobile layout and send errors.
   Do not create production orders or process payments as part of a UI smoke test.

Host-specific ChatGPT rendering and messaging must still be checked after deploy;
neither a successful MCP response nor the local preview proves that host behavior.
Emergency UI opt-out: set `ZAYUNO_QUICK_REPLIES_ENABLED=false` and redeploy; tools
remain available without an attached component.

Official implementation references:
[MCP Apps UI and portable messaging](https://developers.openai.com/plugins/build/chatgpt-ui),
[metadata and ChatGPT compatibility APIs](https://developers.openai.com/plugins/reference).
