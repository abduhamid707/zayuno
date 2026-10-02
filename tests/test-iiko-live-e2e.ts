/** Live demo checks. See docs/iiko-live-e2e.md. Default mode never creates orders. */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IikoProviderAdapter } from '../packages/provider-sdk/src/connectors/iiko/iiko-adapter.ts';
import type { IikoClient } from '../packages/provider-sdk/src/connectors/iiko/iiko-client.ts';
import type { ProviderAdapterConfig } from '../packages/provider-sdk/src/base-provider.ts';
import { ActionStatus, CreateActionInputSchema } from '../packages/contracts/src/action.ts';
import { RequestQuoteInputSchema } from '../packages/contracts/src/quote.ts';

type Client = Pick<IikoClient, 'getAccessToken' | 'getOrganizations' | 'getTerminalGroups' |
  'checkTerminalGroupsAlive' | 'getNomenclature' | 'getStopLists' | 'getOrderById'> &
  Partial<Pick<IikoClient, 'getExternalMenuNomenclature'>>;
export type LiveAdapter = Pick<IikoProviderAdapter, 'getCatalog' | 'requestQuote' |
  'createAction' | 'getAction' | 'cancelAction'> & { getClient(): Client };
export interface LiveDependencies {
  createAdapter?: (config: ProviderAdapterConfig) => LiveAdapter;
  log?: (message: string) => void;
  sleep?: (ms: number) => Promise<void>;
}
export interface LiveResult {
  status: 'READ_ONLY_PASSED' | 'E2E_PASSED' | 'BLOCKED' | 'FAILED';
  exitCode: 0 | 1 | 2;
}
class CheckError extends Error {
  constructor(message: string, readonly blocked = false) { super(message); }
}
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2000;
const SLUG = 'iiko-live-demo';

export async function runLiveE2E(
  env: NodeJS.ProcessEnv = process.env,
  dependencies: LiveDependencies = {}
): Promise<LiveResult> {
  const log = dependencies.log ?? console.log;
  const sleep = dependencies.sleep ?? ((ms) => new Promise<void>((done) => setTimeout(done, ms)));
  const factory = dependencies.createAdapter ?? ((config) => new IikoProviderAdapter(config));
  const value = (key: string) => env[key]?.trim() || '';
  const required = (key: string) => {
    const result = value(key);
    if (!result) throw new CheckError('Set ' + key + '.', true);
    return result;
  };
  const check = (condition: unknown, message: string): void => {
    if (!condition) throw new CheckError(message);
  };
  let stage = 'configuration';
  let failed = false;
  let failure: unknown;
  let adapter: LiveAdapter | undefined;
  let client: Client | undefined;
  let orderId: string | undefined;
  let organizationId = '';
  let orderMode = false;
  let createStarted = false;

  // Provider errors/details can contain credentials or PII. Log only our own diagnostics.
  const report = (error: unknown) => log(error instanceof CheckError
    ? error.message : 'Provider operation failed during ' + stage + '; raw error details withheld.');

  try {
    const mode = value('IIKO_E2E_MODE') || 'read-only';
    if (!['read-only', 'order'].includes(mode)) throw new CheckError('IIKO_E2E_MODE must be read-only or order.', true);
    orderMode = mode === 'order';
    const apiKey = value('IIKO_API_KEY') || value('IIKO_API_LOGIN');
    if (!apiKey) throw new CheckError('Set IIKO_API_KEY or IIKO_API_LOGIN. No live checks ran.', true);
    const appId = value('IIKO_APP_ID');
    const clientSecret = value('IIKO_CLIENT_SECRET');
    if (Boolean(appId) !== Boolean(clientSecret)) {
      throw new CheckError('Provide both IIKO_APP_ID and IIKO_CLIENT_SECRET for v2, or neither for v1.', true);
    }
    organizationId = value('IIKO_ORGANIZATION_ID');
    const terminalId = value('IIKO_TERMINAL_GROUP_ID');
    for (const [name, id] of [['IIKO_ORGANIZATION_ID', organizationId], ['IIKO_TERMINAL_GROUP_ID', terminalId]]) {
      if (id && !GUID.test(id)) throw new CheckError(name + ' must be a UUID.', true);
    }

    let customerName = '', phone = '', address = '', city = '', expectedCurrency = '';
    let maxTotal = 0;
    if (orderMode) {
      if (value('IIKO_E2E_CONFIRM_DEMO_ORDER') !== 'true') {
        throw new CheckError('Order mode requires IIKO_E2E_CONFIRM_DEMO_ORDER=true for the selected demo target.', true);
      }
      required('IIKO_ORGANIZATION_ID');
      required('IIKO_TERMINAL_GROUP_ID');
      required('IIKO_TEST_OFFERING_ID');
      required('IIKO_TEST_VARIANT_ID');
      customerName = required('IIKO_TEST_CUSTOMER_NAME');
      phone = required('IIKO_TEST_PHONE');
      address = required('IIKO_TEST_ADDRESS');
      city = required('IIKO_TEST_CITY');
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new CheckError('IIKO_TEST_PHONE must be an approved test number in international format.', true);
      expectedCurrency = required('IIKO_TEST_CURRENCY').toUpperCase();
      maxTotal = Number(required('IIKO_TEST_MAX_TOTAL'));
      if (!Number.isFinite(maxTotal) || maxTotal <= 0) throw new CheckError('IIKO_TEST_MAX_TOTAL must be positive and finite.', true);
    }

    adapter = factory({
      slug: SLUG, baseUrl: 'https://api-ru.iiko.services', timeoutMs: 10000,
      config: { apiKey, apiLogin: value('IIKO_API_LOGIN'), appId, clientSecret,
        organizationId: organizationId || undefined, terminalGroupId: terminalId || undefined,
        externalMenuId: value('IIKO_EXTERNAL_MENU_ID') || undefined }
    });
    client = adapter.getClient();
    stage = 'authentication';
    check(await client.getAccessToken(), 'Authentication returned no token.');
    log('Authentication confirmed.');

    stage = 'organization and terminal selection';
    const organizations = await client.getOrganizations();
    if (!organizationId) {
      log('Available organization IDs: ' + organizations.filter((org) => GUID.test(org.id)).map((org) => org.id).join(', '));
      throw new CheckError('Set IIKO_ORGANIZATION_ID to the intended demo organization.', true);
    }
    const organization = organizations.find((org) => org.id === organizationId);
    check(organization, 'The selected organization is not accessible to this API key.');
    const terminals = await client.getTerminalGroups([organizationId]);
    const terminal = terminals.find((item) => item.id === terminalId && item.organizationId === organizationId);
    if (!terminalId) {
      log('Available terminal IDs: ' + terminals.filter((item) => item.organizationId === organizationId && GUID.test(item.id)).map((item) => item.id).join(', '));
      throw new CheckError('Set IIKO_TERMINAL_GROUP_ID to the intended demo terminal.', true);
    }
    check(terminal, 'The terminal does not belong to the selected organization.');
    const alive = await client.checkTerminalGroupsAlive([terminalId], [organizationId]);
    check(alive.some((item) => item.terminalGroupId === terminalId && item.organizationId === organizationId && item.isAlive),
      'The selected terminal is offline or its status is unknown.');

    stage = 'menu and stop-list';
    const nomenclature = value('IIKO_EXTERNAL_MENU_ID') && client.getExternalMenuNomenclature
      ? await client.getExternalMenuNomenclature(organizationId, value('IIKO_EXTERNAL_MENU_ID'))
      : await client.getNomenclature(organizationId);
    const stopLists = await client.getStopLists([organizationId]);
    const stops = stopLists.terminalGroupStopLists
      .filter((org) => org.organizationId === organizationId)
      .flatMap((org) => org.items).filter((group) => group.terminalGroupId === terminalId)
      .flatMap((group) => group.items);
    log('Menu: ' + nomenclature.products.length + ' products; terminal stop-list: ' + stops.length + ' entries.');
    const catalog = await adapter.getCatalog({ providerSlug: SLUG, locationId: terminalId });
    const offeringId = value('IIKO_TEST_OFFERING_ID');
    const variantId = value('IIKO_TEST_VARIANT_ID');
    const offering = catalog.offerings.find((item) =>
      (!offeringId || item.id === offeringId) && item.isAvailable &&
      !item.optionGroups?.some((group) => group.isRequired || group.minSelections > 0 || group.options.some((option) => option.isDefault)) &&
      item.variants?.some((variant) => variant.isAvailable && (!variantId || variant.id === variantId)));
    if (!offering) throw new CheckError('No selected available item without required modifiers. Configure a simple demo menu item.', true);
    const variant = offering.variants?.find((item) => item.isAvailable && (!variantId || item.id === variantId));
    if (!variant) throw new CheckError('The selected variant is unavailable.', true);
    if (GUID.test(offering.id) && GUID.test(variant.id)) {
      log('Selected offering ID: ' + offering.id + '; variant ID: ' + variant.id);
    }
    // No-size products use their product ID as the catalog variant ID, not as iiko productSizeId.
    const product = nomenclature.products.find((item) => item.id === offering.id);
    const size = product?.sizePrices.find((item) => (item.sizeId || offering.id) === variant.id);
    check(size && size.price.isIncludedInMenu && size.price.currentPrice > 0, 'Selected variant has no active iiko price.');
    check(!product?.modifiers?.some((item) => (item.minAmount ?? 0) > 0 || (item.defaultAmount ?? 0) > 0),
      'Choose a demo item without mandatory/default simple modifiers.');

    stage = 'quote';
    const items = [{ offeringId: offering.id, variantId: size?.sizeId || undefined, quantity: 1 }];
    const quote = await adapter.requestQuote(RequestQuoteInputSchema.parse({
      providerSlug: SLUG, locationId: terminalId, items,
      ...(orderMode ? { customer: { name: customerName, phone }, destination: { raw: address, city } } : {})
    }));
    check(Number.isFinite(quote.total) && quote.total > 0 && Date.parse(quote.expiresAt) > Date.now(), 'Quote has an invalid total or expiry.');
    check(quote.currency === organization?.currencyIsoName?.toUpperCase(), 'Quote currency does not match the organization.');
    check(quote.parameters?.organizationId === organizationId && quote.locationId === terminalId, 'Quote target does not match the selected demo target.');
    check(quote.lines.length === 1 && quote.lines[0].offeringId === offering.id && quote.lines[0].quantity === 1 &&
      quote.lines[0].variantId === (size?.sizeId || undefined) && quote.lines[0].optionsTotal === 0 &&
      Math.abs(quote.lines[0].unitPrice - variant.basePrice) < 0.005,
    'Quote lines do not match the selected demo item and size.');
    log('Quote confirmed: ' + quote.total + ' ' + quote.currency + '.');

    if (orderMode) {
      check(quote.currency === expectedCurrency && quote.total <= maxTotal, 'Quote exceeds the authorized test amount or currency.');
      stage = 'order creation';
      createStarted = true;
      const created = await adapter.createAction(CreateActionInputSchema.parse({
        providerSlug: SLUG, locationId: terminalId, quoteId: quote.id, items,
        quote: { id: quote.id, subtotal: quote.subtotal, fees: quote.totalFees,
          discount: quote.totalDiscount, total: quote.total, currency: quote.currency, lines: quote.lines },
        userConfirmed: true, customer: { name: customerName, phone }, destination: { raw: address, city }
      }));
      if (created.externalActionId && GUID.test(created.externalActionId)) orderId = created.externalActionId;
      check(orderId, 'Order creation returned no valid external order ID.');
      log('Demo order ID: ' + orderId);

      stage = 'order status and amount';
      let createdConfirmed = false;
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        const response = await client.getOrderById(organizationId, [orderId!]);
        const order = response.orders.find((item) => item.id === orderId && item.organizationId === organizationId);
        check(order?.creationStatus !== 'Error', 'iiko rejected order creation.');
        if (order?.creationStatus === 'Success' && order.order?.status) {
          check(order.order.status !== 'Cancelled', 'The test order was cancelled before status validation.');
          check(typeof order.order.sum === 'number' && Math.abs(order.order.sum - quote.total) < 0.005,
            'iiko order amount differs from the confirmed quote.');
          const tracked = await adapter.getAction({ providerSlug: SLUG, actionId: orderId! });
          check(tracked.status !== ActionStatus.FAILED && tracked.status !== ActionStatus.CANCELLED &&
            tracked.currency === quote.currency && Math.abs(tracked.total - quote.total) < 0.005,
          'Normalized order status/amount does not match iiko and the quote.');
          createdConfirmed = true;
          break;
        }
        if (attempt + 1 < POLL_ATTEMPTS) await sleep(POLL_INTERVAL_MS);
      }
      check(createdConfirmed, 'iiko did not confirm order creation within the polling limit.');
      log('Order creation, status and provider amount confirmed.');
    }
  } catch (error) {
    failed = true;
    failure = error;
    report(error);
  } finally {
    // Cleanup also runs after failed status/amount checks when the created order ID is known.
    if (orderId && adapter && client) {
      stage = 'cancellation and cleanup';
      let cancelled = false;
      try {
        // Send once; poll status without resending an InProgress cancellation.
        try {
          await adapter.cancelAction({ providerSlug: SLUG, actionId: orderId, reason: 'Zayuno demo E2E cleanup' });
        } catch {
          log('Cancellation request could not be confirmed; checking the order directly.');
        }
        for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
          try {
            const response = await client.getOrderById(organizationId, [orderId]);
            const order = response.orders.find((item) => item.id === orderId && item.organizationId === organizationId);
            if (order?.order?.status === 'Cancelled') {
              const tracked = await adapter.getAction({ providerSlug: SLUG, actionId: orderId });
              if (tracked.status === ActionStatus.CANCELLED) { cancelled = true; break; }
            }
          } catch { /* Retry reads only, within the fixed polling limit. */ }
          if (attempt + 1 < POLL_ATTEMPTS) await sleep(POLL_INTERVAL_MS);
        }
        check(cancelled, 'Cancellation remains unconfirmed. Inspect the logged demo order ID in iiko before retrying.');
        log('Final cancellation confirmed by iiko and the adapter.');
      } catch (error) {
        failed = true;
        failure = new CheckError('Demo order cleanup was not confirmed; manual follow-up is required.');
        report(error);
      }
    } else if (createStarted) {
      log('Creation outcome is unknown and no order ID was received. Inspect the demo terminal before retrying; no automatic resubmission was made.');
    }
  }

  const result: LiveResult = failed
    ? { status: failure instanceof CheckError && failure.blocked ? 'BLOCKED' : 'FAILED',
        exitCode: failure instanceof CheckError && failure.blocked ? 2 : 1 }
    : { status: orderMode ? 'E2E_PASSED' : 'READ_ONLY_PASSED', exitCode: 0 };
  log('STATUS: ' + result.status + (result.status === 'READ_ONLY_PASSED' ? ' (no order created; full E2E not run)' : ''));
  return result;
}

// Importing the runner for offline tests must not perform network calls.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runLiveE2E().then((result) => { process.exitCode = result.exitCode; }).catch(() => {
    console.error('STATUS: FAILED (unexpected runner error; details withheld)');
    process.exitCode = 1;
  });
}
