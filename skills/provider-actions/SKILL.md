---
name: provider-actions
description: Standardized capability-based workflow for conversational AI agents to discover providers, browse catalogs, calculate verified quotes, enforce explicit user confirmation, execute actions, and track real-time fulfillment across external providers.
---

# Provider Actions Workflow Skill

This skill defines the canonical interaction flow for AI agents interacting with the Zayuno Action Infrastructure.

## Core Rules & Guardrails

1. **Capability Discovery First**:
   - Always query `list_providers` or `get_provider_capabilities` before initiating domain actions to ensure the target provider supports the required capability (e.g. `CATALOG`, `QUOTE`, `ACTION_CREATE`).

2. **Mandatory Quote Requirement**:
   - NEVER call `create_action` directly without first calling `request_quote`.
   - The quote calculates exact unit prices, option add-on charges, fulfillment fees, and taxes.

3. **Explicit Affirmative Confirmation**:
   - Present the itemized quote to the user (Offerings, Quantities, Options, Subtotal, Fees, and Total).
   - Require explicit confirmation from the user (e.g. "Do you confirm this action for a total of 60,000 UZS?") before calling `create_action`.
   - Set `userConfirmed: true` in `create_action` arguments only after user consent.

4. **Idempotency Guarantee**:
   - Always generate and supply a unique `idempotencyKey` (UUIDv4 or random cryptographic string) when calling `create_action` to prevent duplicate transactions upon network retries.

5. **Payment URL Handling**:
   - Sensitive financial data (card numbers, CVV, OTPs) is NEVER requested or processed in conversational chat.
   - When payment is required, present the provider-supplied checkout URL returned by `get_payment_options` for secure HTTPS completion.

## Step-by-Step Execution Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Agent as AI Assistant
    participant MCP as Zayuno Action Server
    participant Provider as Provider Adapter

    User->>Agent: "I want to request the standard service package from sandbox-provider"
    Agent->>MCP: get_catalog(providerSlug: "sandbox-provider")
    MCP-->>Agent: Catalog items & pricing
    Agent->>MCP: request_quote(items: [...])
    MCP-->>Agent: NormalizedQuote (Quote ID, itemized totals, expiration)
    Agent->>User: "Here is your quote summary: Total is 60,000 UZS. Would you like me to confirm this action?"
    User->>Agent: "Yes, go ahead"
    Agent->>MCP: create_action(idempotencyKey, quoteId, userConfirmed: true)
    MCP-->>Agent: NormalizedAction (Action ID, status: AWAITING_PAYMENT, checkout link)
    Agent->>User: "Action ZY-SANDBOX-98421 initiated! Complete payment here: [Checkout Link]"
```
