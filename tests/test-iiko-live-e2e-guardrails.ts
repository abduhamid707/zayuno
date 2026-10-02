import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { runLiveE2E, type LiveAdapter } from './test-iiko-live-e2e.ts';
import { ActionStatus, NormalizedActionSchema } from '../packages/contracts/src/action.ts';
import { CatalogSchema } from '../packages/contracts/src/catalog.ts';
import { NormalizedQuoteSchema } from '../packages/contracts/src/quote.ts';

const ORG = '11111111-1111-4111-8111-111111111111';
const TERMINAL = '22222222-2222-4222-8222-222222222222';
const ORDER = '33333333-3333-4333-8333-333333333333';
const SLUG = 'iiko-live-demo';
const basicEnv = { IIKO_API_LOGIN: 'synthetic-secret', IIKO_ORGANIZATION_ID: ORG, IIKO_TERMINAL_GROUP_ID: TERMINAL };
// Synthetic contacts below are only passed to in-memory mocks. Tests forbid real fetch calls.
const orderEnv = { ...basicEnv, IIKO_E2E_MODE: 'order', IIKO_E2E_CONFIRM_DEMO_ORDER: 'true',
  IIKO_TEST_CUSTOMER_NAME: 'Synthetic fixture', IIKO_TEST_PHONE: '+12025550123',
  IIKO_TEST_ADDRESS: 'Fixture address', IIKO_TEST_CITY: 'Fixture city',
  IIKO_TEST_OFFERING_ID: 'product', IIKO_TEST_VARIANT_ID: 'large',
  IIKO_TEST_CURRENCY: 'RUB', IIKO_TEST_MAX_TOTAL: '150' };

function fixture(options: { neverCancel?: boolean; pendingCreation?: boolean; failStatus?: boolean; wrongSum?: boolean } = {}) {
  const logs: string[] = [];
  let creates = 0, cancels = 0, sleeps = 0, rawReads = 0, cancelReads = 0;
  let cancelled = false;
  const catalog = CatalogSchema.parse({ providerSlug: SLUG, categories: [], offerings: [{
    id: 'product', providerId: SLUG, offeringCode: 'p', title: 'Fixture', currency: 'RUB', basePrice: 100,
    variants: [{ id: 'small', name: 'Stopped', basePrice: 50, isAvailable: false },
      { id: 'large', name: 'Available', basePrice: 100, isAvailable: true }]
  }] });
  const quote = NormalizedQuoteSchema.parse({ id: 'quote', providerSlug: SLUG, locationId: TERMINAL,
    lines: [{ offeringId: 'product', offeringTitle: 'Fixture', variantId: 'large', unitPrice: 100, quantity: 1, lineTotal: 100 }],
    subtotal: 100, total: 100, currency: 'RUB', expiresAt: new Date(Date.now() + 60000).toISOString(),
    parameters: { organizationId: ORG } });
  const action = (status = ActionStatus.PROCESSING) => NormalizedActionSchema.parse({
    id: ORDER, publicId: 'demo', providerSlug: SLUG, externalActionId: ORDER, status,
    lines: quote.lines, subtotal: 100, total: 100, currency: 'RUB',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  const nomenclature = { groups: [], products: [{ id: 'product', name: 'Fixture', sizePrices: [
    { sizeId: 'small' as string | null, price: { currentPrice: 50, isIncludedInMenu: false } },
    { sizeId: 'large' as string | null, price: { currentPrice: 100, isIncludedInMenu: true } }
  ] }] };
  const client: ReturnType<LiveAdapter['getClient']> = {
    getAccessToken: async () => 'synthetic-token',
    getOrganizations: async () => [{ id: ORG, name: 'Demo fixture', currencyIsoName: 'RUB' }],
    getTerminalGroups: async (ids) => {
      assert.deepEqual(ids, [ORG]);
      return [{ id: TERMINAL, organizationId: ORG, name: 'Demo terminal' }];
    },
    checkTerminalGroupsAlive: async (terminalIds, orgIds) => {
      assert.deepEqual(terminalIds, [TERMINAL]); assert.deepEqual(orgIds, [ORG]);
      return [{ terminalGroupId: TERMINAL, organizationId: ORG, isAlive: true }];
    },
    getNomenclature: async (id) => { assert.equal(id, ORG); return nomenclature; },
    getStopLists: async (ids) => {
      assert.deepEqual(ids, [ORG]);
      return { terminalGroupStopLists: [{ organizationId: ORG, items: [{ terminalGroupId: TERMINAL, items: [] }] }] };
    },
    getOrderById: async (orgId, ids) => {
      assert.equal(orgId, ORG); assert.deepEqual(ids, [ORDER]);
      rawReads++;
      if (options.failStatus && !cancels) throw new Error('synthetic-secret');
      if (cancels) {
        cancelReads++;
        cancelled = !options.neverCancel && cancelReads >= 2;
      }
      return { orders: [{ id: ORDER, organizationId: ORG, timestamp: Date.now(),
        creationStatus: options.pendingCreation && rawReads === 1 ? 'InProgress' : 'Success',
        order: { status: cancelled ? 'Cancelled' : 'WaitCooking', sum: options.wrongSum ? 120 : 100 } }] };
    }
  };
  const adapter: LiveAdapter = {
    getClient: () => client,
    getCatalog: async (input) => { assert.equal(input.locationId, TERMINAL); return catalog; },
    requestQuote: async (input) => {
      assert.equal(input.locationId, TERMINAL);
      assert.equal(input.items[0].variantId, nomenclature.products[0].sizePrices[1].sizeId || undefined);
      return quote;
    },
    createAction: async (input) => {
      creates++;
      assert.equal(input.locationId, TERMINAL); assert.equal(input.userConfirmed, true);
      assert.equal(input.customer?.phone, orderEnv.IIKO_TEST_PHONE);
      assert.equal(input.destination?.raw, orderEnv.IIKO_TEST_ADDRESS);
      return action();
    },
    getAction: async () => action(cancelled ? ActionStatus.CANCELLED : ActionStatus.PROCESSING),
    cancelAction: async () => {
      cancels++;
      return { success: false, actionId: ORDER, previousStatus: ActionStatus.PROCESSING,
        newStatus: ActionStatus.PROCESSING, message: 'InProgress', refundInitiated: false };
    }
  };
  const run = (env: NodeJS.ProcessEnv = basicEnv) => runLiveE2E(env, {
    createAdapter: (config) => {
      assert.equal(config.config?.organizationId, ORG);
      assert.equal(config.config?.terminalGroupId, TERMINAL);
      return adapter;
    },
    log: (line) => logs.push(line), sleep: async () => { sleeps++; }
  });
  return { run, adapter, client, catalog, quote, nomenclature, logs,
    counts: () => ({ creates, cancels, sleeps, rawReads }) };
}

async function main() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Offline harness tests must never reach the network'); };
  let count = 0;
  const test = async (name: string, body: () => Promise<void>) => { await body(); count++; console.log('PASS: ' + name); };
  try {
    await test('missing credentials are BLOCKED before adapter creation', async () => {
      const result = await runLiveE2E({}, { log: () => {}, createAdapter: () => { throw new Error('must not be called'); } });
      assert.deepEqual(result, { status: 'BLOCKED', exitCode: 2 });
    });
    await test('read-only uses correct SDK arguments, available variant, and creates no order', async () => {
      const f = fixture(); assert.equal((await f.run()).status, 'READ_ONLY_PASSED');
      assert.equal(f.counts().creates, 0); assert.equal(f.counts().cancels, 0);
      assert.ok(!f.logs.some((line) => line.includes('synthetic-token')));
    });
    await test('order opt-in, target and approved contact fields are required before network calls', async () => {
      for (const key of ['IIKO_E2E_CONFIRM_DEMO_ORDER', 'IIKO_ORGANIZATION_ID', 'IIKO_TERMINAL_GROUP_ID',
        'IIKO_TEST_PHONE', 'IIKO_TEST_ADDRESS', 'IIKO_TEST_MAX_TOTAL']) {
        const env: NodeJS.ProcessEnv = { ...orderEnv }; delete env[key];
        const result = await runLiveE2E(env, { log: () => {}, createAdapter: () => { throw new Error('must not be called'); } });
        assert.equal(result.status, 'BLOCKED', key); assert.equal(result.exitCode, 2);
      }
    });
    await test('foreign terminal and offline terminal prevent dispatch', async () => {
      for (const foreign of [true, false]) {
        const f = fixture();
        if (foreign) f.client.getTerminalGroups = async () => [{ id: TERMINAL, organizationId: ORDER, name: 'Other' }];
        else f.client.checkTerminalGroupsAlive = async () => [{ terminalGroupId: TERMINAL, organizationId: ORG, isAlive: false }];
        assert.equal((await f.run(orderEnv)).exitCode, 1); assert.equal(f.counts().creates, 0);
      }
    });
    await test('missing menu is BLOCKED rather than a passing E2E', async () => {
      const f = fixture(); f.catalog.offerings = [];
      assert.deepEqual(await f.run(), { status: 'BLOCKED', exitCode: 2 });
    });
    await test('provider errors cannot leak secrets or pass', async () => {
      const f = fixture(); f.client.getAccessToken = async () => { throw new Error('password=synthetic-secret token=synthetic-token'); };
      assert.equal((await f.run()).exitCode, 1);
      assert.ok(!f.logs.join('\n').includes('synthetic-secret')); assert.ok(!f.logs.join('\n').includes('synthetic-token'));
    });
    await test('amount/currency limits prevent order submission', async () => {
      for (const overrides of [{ IIKO_TEST_MAX_TOTAL: '99' }, { IIKO_TEST_CURRENCY: 'USD' }]) {
        const f = fixture(); assert.equal((await f.run({ ...orderEnv, ...overrides })).exitCode, 1);
        assert.equal(f.counts().creates, 0);
      }
    });
    await test('standard variant does not send a product ID as productSizeId', async () => {
      const f = fixture(); f.catalog.offerings[0].variants![1].id = 'product';
      f.nomenclature.products[0].sizePrices[1].sizeId = null;
      f.quote.lines[0].variantId = undefined;
      assert.equal((await f.run()).status, 'READ_ONLY_PASSED');
    });
    await test('eventual creation and cancellation require provider confirmation', async () => {
      const f = fixture({ pendingCreation: true });
      assert.deepEqual(await f.run(orderEnv), { status: 'E2E_PASSED', exitCode: 0 });
      assert.equal(f.counts().creates, 1); assert.equal(f.counts().cancels, 1); assert.ok(f.counts().sleeps >= 2);
    });
    await test('unconfirmed cancellation fails after bounded polling', async () => {
      const f = fixture({ neverCancel: true });
      assert.equal((await f.run(orderEnv)).exitCode, 1);
      assert.equal(f.counts().cancels, 1); assert.equal(f.counts().sleeps, 14);
      assert.ok(!f.logs.includes('STATUS: E2E_PASSED'));
    });
    await test('a successful cancel response cannot override an active provider order', async () => {
      const f = fixture({ neverCancel: true });
      f.adapter.cancelAction = async () => ({ success: true, actionId: ORDER,
        previousStatus: ActionStatus.PROCESSING, newStatus: ActionStatus.CANCELLED,
        message: 'Accepted', refundInitiated: false });
      assert.equal((await f.run(orderEnv)).status, 'FAILED');
      assert.equal(f.counts().sleeps, 14);
    });
    await test('failed cancellation status reads cannot pass', async () => {
      const f = fixture();
      f.adapter.cancelAction = async () => {
        f.client.getOrderById = async () => { throw new Error('unavailable'); };
        return { success: false, actionId: ORDER, previousStatus: ActionStatus.PROCESSING,
          newStatus: ActionStatus.PROCESSING, message: 'InProgress', refundInitiated: false };
      };
      assert.equal((await f.run(orderEnv)).exitCode, 1); assert.equal(f.counts().sleeps, 14);
    });
    await test('status/price failures still attempt cleanup and remain failures', async () => {
      for (const option of [{ failStatus: true }, { wrongSum: true }]) {
        const f = fixture(option); assert.equal((await f.run(orderEnv)).status, 'FAILED');
        assert.equal(f.counts().cancels, 1);
        assert.ok(f.logs.includes('Final cancellation confirmed by iiko and the adapter.'));
      }
    });
    await test('unknown creation outcome is not automatically resubmitted', async () => {
      const f = fixture(); let attempts = 0;
      f.adapter.createAction = async () => { attempts++; throw new Error('network failure'); };
      assert.equal((await f.run(orderEnv)).exitCode, 1); assert.equal(attempts, 1);
      assert.ok(f.logs.some((line) => line.includes('Creation outcome is unknown')));
    });
    await test('even a rejected promise without an Error is a failure', async () => {
      const f = fixture(); f.client.getAccessToken = () => Promise.reject(undefined);
      assert.equal((await f.run()).exitCode, 1);
    });
    await test('CLI returns actual nonzero exit code for missing keys', async () => {
      const env = { ...process.env };
      for (const key of Object.keys(env)) if (key.startsWith('IIKO_')) delete env[key];
      const result = spawnSync(process.execPath, ['--import', 'tsx', 'tests/test-iiko-live-e2e.ts'], { env, encoding: 'utf8', timeout: 15000 });
      assert.equal(result.status, 2, result.stderr); assert.ok(result.stdout.includes('STATUS: BLOCKED'));
    });
    console.log(count + ' offline live-runner guardrail tests passed.');
  } finally { globalThis.fetch = originalFetch; }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
