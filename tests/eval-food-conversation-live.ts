// Explicit live model evaluation against local catalog fixtures. It never calls
// a real provider, creates a real order, or sends customer data.
import assert from "node:assert/strict";
import { config } from "dotenv";
import { fixture } from "./test-food-conversation-intent";

async function main() {
  if (!process.argv.includes("--live")) throw new Error("Pass --live to use the configured Gemini key");
  config({ path: "apps/api/.env", quiet: true });
  config({ path: ".env", quiet: true });
  if (!process.env.GEMINI_API_KEY?.trim()) throw new Error("GEMINI_API_KEY is not configured");
  const cases = [
    { prompt: "Menga pitsalarni korsata olasanmi?", menu: true, ids: ["pizza", "expensive"] },
    { prompt: "Lavash va burgerlarni ko‘rsat", menu: true, ids: ["lavash", "burger"] },
    { prompt: "Menga 2 ta katta lavash buyurtma qil", menu: false, quantity: 2, variantId: "l" },
    { prompt: "Menga bugun kechga 50minga pitsalar zakaz qil", menu: false, unsupportedTiming: true },
    { prompt: "3 kishiga 150minglik fast-food top", menu: false, budget: 150000 },
    { prompt: "Покажи бургеры и лаваши", menu: true, ids: ["lavash", "burger"] },
  ];
  for (const example of cases) {
    const f = fixture();
    f.useLiveModel();
    if (process.argv.includes("--trace")) {
      const client = f.service.model.jsonClient;
      f.service.model.jsonClient = { generateContent: async (...args: any[]) => {
        const response = await client.generateContent(...args);
        console.log("MODEL_DECISION", response.response.text());
        return response;
      } };
    }
    const started = Date.now();
    const result = await f.service.processMessage(f.input(example.prompt));
    console.log(JSON.stringify({ prompt: example.prompt, elapsedMs: Date.now() - started, interaction: result.interaction?.kind, answer: result.content }));
    const state = await f.service.readPendingOrder("u", "c");
    assert.ok(result.content?.trim(), "No silent response");
    assert.equal(f.calls.actions.length, 0);
    if (example.menu) {
      assert.equal(result.interaction?.kind, "catalog_menu");
      const ids = result.interaction.sections.flatMap((section: any) => section.offerings.map((item: any) => item.offeringId));
      assert.deepEqual([...ids].sort(), [...example.ids!].sort());
    } else {
      assert.notEqual(result.interaction?.kind, "catalog_menu");
      assert.notEqual(result.interaction?.kind, "provider_list");
      if (example.quantity) {
        assert.equal(state?.items.length, 1);
        assert.equal(state?.items[0].quantity, example.quantity);
        assert.equal(state?.items[0].selectedVariantId, example.variantId);
      }
      if (example.unsupportedTiming) assert.equal(state, null);
      if (example.budget && state) assert.equal(state.constraints.maxBudget, example.budget);
    }
    // The configured free-tier key allows 15 requests/minute. Three model calls
    // per scenario are spaced out without changing models or hiding failures.
    if (example !== cases[cases.length - 1]) await new Promise(resolve => setTimeout(resolve, Math.max(0, 14000 - (Date.now() - started))));
  }
  console.log("PASS: live Gemini 3.5 Flash-Lite semantic evaluation (local catalog, no real orders).");
}
main().catch(error => { console.error(error?.name, error?.status || "", String(error?.message || error).replace(/AIza[\w-]+/g, "[redacted]")); process.exitCode = 1; });
