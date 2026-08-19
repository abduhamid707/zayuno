import assert from 'node:assert/strict';
import { CreateActionInputSchema } from '../packages/contracts/src/action.ts';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools.ts';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';

async function assertRejects(input: any, expected: string) {
  const service = new ActionsService(null as any, null as any, null as any);
  await assert.rejects(() => service.createAction(input), new RegExp(expected));
}

async function main() {
  const valid = {
    idempotencyKey: 'guardrail-test', providerSlug: 'mock-evos', quoteId: 'quote-1',
    items: [{ offeringId: 'item-1', quantity: 1 }],
    customer: { name: 'Sandbox Tester', phone: '+998900000000' }, userConfirmed: true
  };

  assert.equal(CreateActionInputSchema.safeParse(valid).success, true);
  assert.equal(CreateActionInputSchema.safeParse({ ...valid, quoteId: undefined }).success, false);
  assert.equal(CreateActionInputSchema.safeParse({ ...valid, userConfirmed: false }).success, false);
  assert.equal(CreateActionInputSchema.safeParse({ ...valid, userConfirmed: undefined }).success, false);

  const createTool = ZAYUNO_MCP_TOOLS.find(tool => tool.name === 'create_action');
  assert.ok(createTool, 'create_action must be advertised.');
  assert.ok(createTool.inputSchema.required?.includes('quoteId'), 'create_action must require quoteId.');
  assert.ok(createTool.inputSchema.required?.includes('userConfirmed'), 'create_action must require confirmation.');

  await assertRejects({ ...valid, userConfirmed: undefined }, 'Explicit user confirmation is required');
  await assertRejects({ ...valid, quoteId: undefined }, 'verified quoteId is required');
  console.log('Action guardrails passed: confirmation and an existing quote are required before dispatch.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
