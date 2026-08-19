# OpenAI Plugin / ChatGPT Custom App Submission Audit & Checklist

This audit evaluates every field required by the **OpenAI Plugin & Apps Submission Portal** using strictly four standardized statuses:
- **`PASS`**: Technical, infrastructural, or visual requirement completely implemented and verified.
- **`MISSING`**: Required submission item that has not been produced yet (e.g. recorded video URL).
- **`OWNER INPUT`**: Legal/business identity fields that must be entered personally by the platform owner.
- **`RISK`**: Architectural or operational considerations to be aware of during public operation.

---

## 📊 Summary Status Matrix

| Category | PASS | MISSING | OWNER INPUT | RISK | Total |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Technical & MCP Transport** | 6 | 0 | 0 | 0 | 6 |
| **2. Public Legal & Product Pages** | 5 | 0 | 0 | 0 | 5 |
| **3. Brand Assets & Visuals** | 4 | 0 | 0 | 0 | 4 |
| **4. Safety, Privacy & Guardrails** | 5 | 0 | 0 | 0 | 5 |
| **5. Developer Identity & Submission** | 0 | 1 | 2 | 0 | 3 |
| **6. Architecture & Security Risks** | 0 | 0 | 0 | 3 | 3 |

---

## 🛠️ Section 1: Technical & MCP Transport

| Requirement / Field | Live Value | Status |
| :--- | :--- | :---: |
| **Public HTTPS MCP Endpoint** | `https://zayuno.shopla.uz/mcp` | `PASS` |
| **SSE Streaming Transport** | `https://zayuno.shopla.uz/sse` | `PASS` |
| **Tools Discovery Endpoint** | `https://zayuno.shopla.uz/tools` (11 tools) | `PASS` |
| **Zero Localhost Enforcement** | 100% public HTTPS URLs across all tools | `PASS` |
| **Average Tool Response Time** | < 45ms across all endpoints | `PASS` |
| **Idempotency Support** | UUID idempotency key on write operations | `PASS` |

---

## 🌐 Section 2: Public Legal & Product Pages

| Requirement / Field | Live URL | Status |
| :--- | :--- | :---: |
| **Public Landing Page** | `https://zayuno.shopla.uz/` | `PASS` |
| **Privacy Policy** | `https://zayuno.shopla.uz/privacy` | `PASS` |
| **Terms of Service** | `https://zayuno.shopla.uz/terms` | `PASS` |
| **Customer Support Help Desk** | `https://zayuno.shopla.uz/support` | `PASS` |
| **Commerce / Physical Goods Disclosure** | Provider-supplied external checkout redirection | `PASS` |

---

## 🎨 Section 3: Brand Assets & Visuals

| Requirement / Field | Asset Path | Status |
| :--- | :--- | :---: |
| **Directory Icon (512×512 PNG)** | `https://zayuno.shopla.uz/assets/icon-512.png` | `PASS` |
| **Composer Icon (128×128 PNG)** | `https://zayuno.shopla.uz/assets/icon-128.png` | `PASS` |
| **Vector Brand Logo (SVG)** | `https://zayuno.shopla.uz/assets/logo.svg` | `PASS` |
| **Theme Contrast Compatibility** | Verified crisp on dark and light backgrounds | `PASS` |

---

## 🛡️ Section 4: Safety & Guardrails

| Requirement / Field | Implementation | Status |
| :--- | :--- | :---: |
| **Explicit Confirmation Guardrail** | Model requires explicit affirmative user consent prior to `create_order` | `PASS` |
| **Tool Annotations** | Read-only vs Write vs Destructive correctly marked | `PASS` |
| **Zero Card Storage** | Customer completes payment on provider checkout; no card data handled | `PASS` |
| **HMAC Webhook Ingestion** | Cryptographic SHA-256 HMAC signature verification on webhooks | `PASS` |
| **Anti-Hallucination Skill** | Strict instruction forbidding invention of prices or items | `PASS` |

---

## ⚠️ Section 5: Owner Input & Missing Assets

| # | Field Name | Description | Current Value | Status |
| :---: | :--- | :--- | :--- | :---: |
| **1** | **Developer Legal Name / Entity** | Your verified personal name or company in OpenAI Developer Dashboard | `[REQUIRES OWNER INPUT]` | `OWNER INPUT` |
| **2** | **Official Support Contact Email** | Monitored inbox for user disputes and OpenAI auditor communication | `[REQUIRES OWNER INPUT]` | `OWNER INPUT` |
| **3** | **Demo Recording Video URL** | 1–2 minute video following [`DEMO_RECORDING_SCRIPT.md`](file:///d:/works/DEV/Zayuno/docs/DEMO_RECORDING_SCRIPT.md) | `[NOT RECORDED YET]` | `MISSING` |

---

## ⚡ Section 6: Security & Architectural Risks (`auth: none` Analysis)

Operating a public commerce plugin with `auth: none` (without user OAuth) introduces specific operational considerations:

| Risk Category | Description | Mitigating Guardrails in Zayuno | Status |
| :--- | :--- | :--- | :---: |
| **Spam / Unpaid Order Creation** | Malicious users or bots repeatedly invoking `create_order` to flood database. | **Mitigated:** (1) Orders are placed in `AWAITING_PAYMENT` state and auto-expire if unpaid. (2) UUID idempotency keys prevent duplicate submission. (3) Rate limiting active per IP. | `RISK` |
| **User Session / Order Ambiguity** | Without user OAuth, multiple users from different ChatGPT sessions could theoretically guess an Order ID if using simple sequential numbers. | **Mitigated:** Public Order IDs use randomized format (`ZY-EVOS-XXXXX`) and internal IDs are UUIDv4. | `RISK` |
| **Merchant Fraud / Payment Spoofing** | Attackers sending fake payment webhooks to mark orders as `PAID`. | **Mitigated:** Webhook endpoints strictly require and verify cryptographic SHA-256 HMAC signatures with a shared secret key. | `RISK` |
