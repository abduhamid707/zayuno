import assert from 'node:assert/strict';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools.ts';

/**
 * Ensures every tool that MCP advertises has an executable handler and that
 * its handler forwards the documented argument shape to exactly one API-client
 * method. This protects the Streamable HTTP dispatcher from drifting away from
 * the tool catalogue.
 */
const sampleArguments: Record<string, Record<string, unknown>> = {
  get_welcome_message: {},
  find_providers: { category: 'food_delivery', query: 'demo', limit: 1 },
  list_providers: { status: 'SANDBOX' },
  get_provider: { providerSlug: 'mock-evos' },
  get_provider_capabilities: { providerSlug: 'mock-evos' },
  get_locations: { providerSlug: 'mock-evos', activeOnly: true },
  get_catalog: { providerSlug: 'mock-evos', locationId: 'demo-location', category: 'demo', parameters: { date: '2026-08-19' } },
  search_catalog: { providerSlug: 'mock-evos', query: 'drink', limit: 1, parameters: { date: '2026-08-19' } },
  search_candidates: { query: 'NestJS', skills: ['Node.js'], location: 'Toshkent' },
  search_jobs: { query: 'React developer', location: 'Toshkent' },
  get_offering: { providerSlug: 'mock-evos', offeringId: 'demo-offering', parameters: { date: '2026-08-19' } },
  check_availability: { providerSlug: 'mock-evos', items: [{ offeringId: 'demo-offering', quantity: 1 }], parameters: { date: '2026-08-19' } },
  request_quote: { providerSlug: 'mock-evos', items: [{ offeringId: 'demo-offering', quantity: 1 }] },
  create_action: {
    idempotencyKey: 'consistency-test-key', providerSlug: 'mock-evos', quoteId: 'demo-quote',
    items: [{ offeringId: 'demo-offering', quantity: 1 }],
    customer: { name: 'Sandbox Tester', phone: '+998900000000' }, userConfirmed: true
  },
  get_action: { actionId: 'demo-action' },
  cancel_action: { actionId: 'demo-action', reasonCode: 'OTHER', reason: 'consistency test' },
  get_payment_options: { actionId: 'demo-action' }
};

async function main() {
  const advertisedNames = new Set<string>();

  for (const tool of ZAYUNO_MCP_TOOLS) {
    assert.ok(tool.name, 'Every advertised tool needs a name.');
    assert.ok(!advertisedNames.has(tool.name), `Duplicate MCP tool: ${tool.name}`);
    advertisedNames.add(tool.name);
    assert.equal(typeof tool.handler, 'function', `${tool.name} has no callable handler.`);

    const args = sampleArguments[tool.name];
    assert.ok(args, `${tool.name} needs consistency-test arguments.`);
    for (const field of tool.inputSchema.required ?? []) {
      assert.notEqual(args[field], undefined, `${tool.name} is missing sample value for required field ${field}.`);
    }

    const calls: Array<{ method: string; args: unknown[] }> = [];
    const client = new Proxy({}, {
      get: (_target, property) => (...methodArgs: unknown[]) => {
        calls.push({ method: String(property), args: methodArgs });
        return Promise.resolve({ ok: true });
      }
    });

    await tool.handler(args, client as any);
    assert.equal(calls.length, 1, `${tool.name} must dispatch to exactly one API-client handler.`);
  }

  console.log(`MCP tool consistency passed for ${ZAYUNO_MCP_TOOLS.length} advertised tools.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
