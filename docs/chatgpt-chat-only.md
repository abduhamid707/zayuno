# Chat-only customer experience

Zayuno now returns ordinary chat content: concise product names and prices,
conversation-based selections, verified quotes, and explicit order confirmation.
There are no UI templates, quick-reply buttons, iframe resources or preview routes.
Catalog data (including media fields) and all 15 business tools remain available
to agents. Order and payment guardrails are unchanged.

`/health` reports `uiMode: "chat-only"`, `uiResource: null` and
`quickRepliesEnabled: false`. Old widget environment flags cannot re-enable UI.
After deploying, refresh the app's tool definitions and start a new conversation;
existing chat messages may still contain previously rendered components.

Verification: `pnpm exec tsx apps/mcp/tests/test-chat-only.ts`,
`pnpm test:review`, and `pnpm --filter @zayuno/mcp build`.
