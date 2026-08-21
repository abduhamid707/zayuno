import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import crypto from 'crypto';
import {
  ActionStatus,
  PaymentMethodType,
  PaymentStatus,
  ProviderCapability,
  ProviderStatus,
  ProviderType,
  type CreateActionInput,
  type NormalizedAction,
  type NormalizedQuote,
  type Offering,
  type QuoteLine,
  type RequestQuoteInput
} from '@zayuno/contracts';
import { MOCK_EVOS_CATEGORIES, MOCK_EVOS_LOCATIONS, MOCK_EVOS_OFFERINGS } from './data';

type ProviderLifecycle = 'AWAITING_PAYMENT' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
type StoredAction = NormalizedAction & { providerLifecycle: ProviderLifecycle };

const PROVIDER_SLUG = process.env.PROVIDER_SLUG || 'mock-evos';
const DISCLAIMER = 'Sandbox demo only. Not affiliated with the real EVOS company.';

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function isTerminalLifecycle(action: StoredAction): boolean {
  return action.providerLifecycle === 'COMPLETED' || action.providerLifecycle === 'CANCELLED' || action.status === ActionStatus.FAILED;
}

function canCancel(action: StoredAction): boolean {
  return !isTerminalLifecycle(action);
}

function canSimulatePayment(action: StoredAction): boolean {
  return action.providerLifecycle === 'AWAITING_PAYMENT' && action.status === ActionStatus.AWAITING_PAYMENT && action.paymentStatus === PaymentStatus.PENDING;
}

export function createMockEvosApp(): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const getProviderSlug = () => process.env.PROVIDER_SLUG || 'evos';

  const quotes = new Map<string, NormalizedQuote>();
  const actions = new Map<string, StoredAction>();
  const idempotency = new Map<string, string>();

  const providerApiKey = process.env.PROVIDER_API_KEY || '';
  const webhookSecret = process.env.ZAYUNO_WEBHOOK_SECRET || '';
  const zayunoApiUrl = (process.env.ZAYUNO_API_URL || 'http://api:4000').replace(/\/$/, '');

  function checkoutBaseUrl(): string {
    const fallback = process.env.NODE_ENV === 'production'
      ? 'https://evos-sandbox.shopla.uz'
      : `http://localhost:${process.env.PORT || 4001}`;
    const configured = (process.env.MOCK_EVOS_CHECKOUT_BASE_URL || fallback).replace(/\/$/, '');
    const parsed = new URL(configured);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'zayuno.uz' || hostname.endsWith('.zayuno.uz')) {
      throw new Error('Mock provider checkout must not use a Zayuno-owned domain.');
    }
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('Production mock provider checkout URL must use HTTPS.');
    }
    return configured;
  }

  function providerAuth(req: Request, res: Response, next: () => void): void {
    if (providerApiKey && req.header('x-provider-api-key') !== providerApiKey) {
      res.status(401).json({ message: 'Invalid provider API key.' });
      return;
    }
    next();
  }

  function calculateLines(input: RequestQuoteInput | CreateActionInput): QuoteLine[] {
    return input.items.map(item => {
      const offering = MOCK_EVOS_OFFERINGS.find(candidate => candidate.id === item.offeringId || candidate.offeringCode === item.offeringId);
      if (!offering || !offering.isAvailable) throw new Error(`Offering unavailable: ${item.offeringId}`);

      const variant = item.variantId ? offering.variants?.find(candidate => candidate.id === item.variantId) : undefined;
      if (item.variantId && !variant) throw new Error(`Variant not found: ${item.variantId}`);
      const unitPrice = variant?.basePrice ?? offering.basePrice;
      let optionsTotal = 0;

      for (const selected of item.selectedOptions || []) {
        const group = offering.optionGroups?.find(candidate => candidate.id === selected.groupId);
        const option = group?.options.find(candidate => candidate.id === selected.optionId && candidate.isAvailable);
        if (!group || !option) throw new Error(`Option not found: ${selected.groupId}/${selected.optionId}`);
        optionsTotal += option.priceDelta * (selected.quantity || 1) * item.quantity;
      }

      for (const group of offering.optionGroups || []) {
        if (group.isRequired && !(item.selectedOptions || []).some(selected => selected.groupId === group.id)) {
          throw new Error(`Required option group missing: ${group.name}`);
        }
      }

      return {
        offeringId: offering.id,
        offeringTitle: offering.title,
        variantId: variant?.id,
        variantTitle: variant?.name,
        unitPrice,
        quantity: item.quantity,
        optionsTotal,
        lineTotal: unitPrice * item.quantity + optionsTotal,
        selectedOptions: item.selectedOptions || []
      };
    });
  }

  function findAction(actionId: string): StoredAction | undefined {
    return actions.get(actionId) || Array.from(actions.values()).find(action =>
      action.id === actionId || action.publicId === actionId || action.externalActionId === actionId
    );
  }

  async function dispatchWebhook(action: StoredAction, eventType: string, description: string): Promise<void> {
    if (!webhookSecret) return;
    const currentSlug = getProviderSlug();
    const payload = {
      eventId: id('mock_evos_evt'),
      eventType,
      providerSlug: currentSlug,
      externalActionId: action.externalActionId,
      newStatus: action.status,
      newPaymentStatus: action.paymentStatus,
      timestamp: new Date().toISOString(),
      description,
      payload: { providerLifecycle: action.providerLifecycle, sandbox: true }
    };
    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    try {
      const response = await fetch(`${zayunoApiUrl}/api/v1/webhooks/${currentSlug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-provider-signature': signature },
        body: rawBody
      });
      if (!response.ok) {
        console.warn(`[mock-evos] Webhook dispatch returned HTTP ${response.status}`);
      }
    } catch {
      // Non-blocking in local testing
    }
  }

  app.get('/health', (_req, res) => res.json({
    status: 'HEALTHY', latencyMs: 1, message: DISCLAIMER, timestamp: new Date().toISOString()
  }));

  app.use(['/provider-info', '/locations', '/catalog', '/offerings', '/search', '/quote', '/actions'], providerAuth);

  app.get('/provider-info', (_req, res) => {
    const currentSlug = getProviderSlug();
    return res.json({
      id: currentSlug,
      slug: currentSlug,
      name: 'Mock EVOS',
      description: DISCLAIMER,
      status: ProviderStatus.SANDBOX,
      type: ProviderType.DELIVERY,
      category: 'food_delivery',
      geography: ['UZ', 'Tashkent'],
      adapterType: 'remote-http',
      authMethod: 'API_KEY',
      capabilities: Object.values(ProviderCapability),
      baseUrl: process.env.PROVIDER_PUBLIC_BASE_URL,
      isCertified: false,
      isPublished: false,
      metadata: { sandbox: true, affiliation: 'none' }
    });
  });

  app.get('/locations', (req, res) => {
    const activeOnly = req.query.activeOnly !== 'false';
    res.json(activeOnly ? MOCK_EVOS_LOCATIONS.filter(location => location.isActive) : MOCK_EVOS_LOCATIONS);
  });

  app.get('/catalog', (req, res) => {
    const category = String(req.query.category || '');
    const offerings = category ? MOCK_EVOS_OFFERINGS.filter(item => item.categorySlug === category) : MOCK_EVOS_OFFERINGS;
    res.json({
      providerSlug: getProviderSlug(),
      locationId: req.query.locationId || undefined,
      categories: MOCK_EVOS_CATEGORIES,
      offerings,
      version: '1.0.0',
      updatedAt: new Date().toISOString()
    });
  });

  app.get('/offerings/:offeringId', (req, res) => {
    const offering = MOCK_EVOS_OFFERINGS.find(item => item.id === req.params.offeringId || item.offeringCode === req.params.offeringId);
    if (!offering) return res.status(404).json({ message: 'Offering not found.' });
    return res.json(offering);
  });

  app.get('/search', (req, res) => {
    const query = String(req.query.q || '').toLowerCase();
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    res.json(MOCK_EVOS_OFFERINGS.filter(item =>
      item.title.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query) || item.tags?.some(tag => tag.includes(query))
    ).slice(0, limit));
  });

  app.post('/quote', (req, res) => {
    try {
      const input = req.body as RequestQuoteInput;
      const lines = calculateLines(input);
      const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
      const deliveryFee = input.fulfillmentType === 'PICKUP' ? 0 : 12000;
      const quote: NormalizedQuote = {
        id: id('mock_evos_quote'),
        providerSlug: PROVIDER_SLUG,
        locationId: input.locationId,
        lines,
        subtotal,
        fees: deliveryFee ? [{ name: 'Mock delivery fee', amount: deliveryFee }] : [],
        totalFees: deliveryFee,
        discounts: [], totalDiscount: 0,
        total: subtotal + deliveryFee,
        currency: 'UZS',
        expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
        estimatedDurationMinutes: 30,
        parameters: { sandbox: true, promoCode: input.promoCode }
      };
      quotes.set(quote.id, quote);
      res.json(quote);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post('/actions', (req, res) => {
    try {
      const input = req.body as CreateActionInput;
      const idempotencyKey = req.header('idempotency-key') || input.idempotencyKey;
      if (!idempotencyKey) return res.status(400).json({ message: 'Idempotency key is required.' });
      const existingId = idempotency.get(idempotencyKey);
      if (existingId) return res.json(actions.get(existingId));
      if (input.userConfirmed !== true) return res.status(400).json({ message: 'Explicit user confirmation is required.' });
      if (!input.quoteId) return res.status(400).json({ message: 'A valid quoteId is required.' });
      const quote = quotes.get(input.quoteId);
      if (!quote || new Date(quote.expiresAt).getTime() < Date.now()) return res.status(400).json({ message: 'Quote is missing or expired.' });

      const now = new Date().toISOString();
      const actionId = id('mock_evos_action');
      const externalActionId = id('MEV');
      const checkoutUrl = `${checkoutBaseUrl()}/pay/${encodeURIComponent(externalActionId)}`;
      const action: StoredAction = {
        id: actionId,
        publicId: `MOCK-EVOS-${crypto.randomInt(10000, 99999)}`,
        providerSlug: PROVIDER_SLUG,
        providerName: 'Mock EVOS',
        externalActionId,
        quoteId: quote.id,
        locationId: input.locationId,
        status: ActionStatus.AWAITING_PAYMENT,
        providerLifecycle: 'AWAITING_PAYMENT',
        nextAction: { type: 'OPEN_URL', url: checkoutUrl, label: 'Open Mock EVOS checkout', expiresAt: quote.expiresAt },
        lines: quote.lines,
        subtotal: quote.subtotal,
        fees: quote.totalFees,
        discount: quote.totalDiscount,
        total: quote.total,
        currency: quote.currency,
        customer: input.customer,
        destination: input.destination,
        fulfillmentType: input.fulfillmentType || 'STANDARD',
        paymentMethod: input.paymentMethod || 'payme',
        paymentStatus: PaymentStatus.PENDING,
        paymentUrl: checkoutUrl,
        idempotencyKey,
        parameters: input.parameters || {},
        metadata: { sandbox: true, disclaimer: DISCLAIMER, providerLifecycle: 'AWAITING_PAYMENT' },
        timeline: [{ id: id('timeline'), status: ActionStatus.AWAITING_PAYMENT, description: 'Mock order created; awaiting sandbox payment.', source: 'AI_AGENT', createdAt: now }],
        createdAt: now,
        updatedAt: now
      };
      actions.set(actionId, action);
      actions.set(externalActionId, action);
      idempotency.set(idempotencyKey, actionId);
      return res.status(201).json(action);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  });

  app.get('/actions/:actionId', (req, res) => {
    const action = findAction(req.params.actionId);
    if (!action) return res.status(404).json({ message: 'Mock action not found.' });
    return res.json(action);
  });

  app.post('/actions/:actionId/cancel', async (req, res) => {
    const action = findAction(req.params.actionId);
    if (!action) return res.status(404).json({ message: 'Mock action not found.' });
    if (!canCancel(action)) return res.status(409).json({ message: `Action cannot be cancelled in terminal state ${action.providerLifecycle}.` });
    const previousStatus = action.status;
    action.status = ActionStatus.CANCELLED;
    action.providerLifecycle = 'CANCELLED';
    action.updatedAt = new Date().toISOString();
    try { await dispatchWebhook(action, 'action.cancelled', 'Mock order cancelled.'); } catch (error: any) { return res.status(502).json({ message: error.message }); }
    return res.json({ success: true, actionId: action.publicId, previousStatus, newStatus: ActionStatus.CANCELLED, message: 'Mock order cancelled.', refundInitiated: false });
  });

  app.get('/actions/:actionId/payment-options', (req, res) => {
    const action = findAction(req.params.actionId);
    if (!action) return res.status(404).json({ message: 'Mock action not found.' });
    return res.json([
      { id: 'mock_payme', name: 'Mock Payme handoff', type: PaymentMethodType.PAYME, isOnline: true, checkoutUrl: action.nextAction?.url, supportedCurrencies: ['UZS'], metadata: { sandbox: true } },
      { id: 'mock_cash', name: 'Mock cash on delivery', type: PaymentMethodType.CASH_ON_DELIVERY, isOnline: false, instructions: 'Sandbox instruction only.', supportedCurrencies: ['UZS'], metadata: { sandbox: true } }
    ]);
  });

  app.get('/pay/:externalActionId', (req, res) => {
    const action = findAction(req.params.externalActionId);
    if (!action) return res.status(404).send('Mock order not found.');
    const rows = action.lines.map(line => `<tr><td>${escapeHtml(line.offeringTitle)}</td><td>${line.quantity}</td><td>${line.lineTotal.toLocaleString('en-US')} UZS</td></tr>`).join('');
    const paymentControl = canSimulatePayment(action) ? `<form method="post" action="/pay/${encodeURIComponent(action.externalActionId!)}/simulate-success"><button class="pay" type="submit">Simulate successful payment</button></form>` : '';
    const advanceControl = action.providerLifecycle === 'ACCEPTED' || action.providerLifecycle === 'PREPARING' || action.providerLifecycle === 'READY' ? `<form method="post" action="/pay/${encodeURIComponent(action.externalActionId!)}/advance"><button class="next" type="submit">Advance mock status</button></form>` : '';
    const cancelControl = canCancel(action) ? `<form method="post" action="/pay/${encodeURIComponent(action.externalActionId!)}/cancel"><button class="cancel" type="submit">Simulate cancellation</button></form>` : '';
    return res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mock EVOS Sandbox Checkout</title><style>body{font-family:Inter,Arial,sans-serif;background:#07111f;color:#e5eefb;margin:0;padding:32px}.card{max-width:720px;margin:auto;background:#101c2d;border:1px solid #26364d;border-radius:20px;padding:28px}.badge{display:inline-block;background:#f59e0b;color:#111827;padding:6px 10px;border-radius:999px;font-weight:700}table{width:100%;border-collapse:collapse;margin:22px 0}td{padding:12px;border-bottom:1px solid #26364d}button{border:0;border-radius:12px;padding:12px 16px;font-weight:700;cursor:pointer;margin:4px}.pay{background:#22c55e;color:#06220f}.next{background:#38bdf8;color:#06202c}.cancel{background:#ef4444;color:white}.muted{color:#94a3b8}.total{font-size:24px;font-weight:800}</style></head><body><main class="card"><span class="badge">SANDBOX DEMO</span><h1>Mock EVOS Checkout</h1><p class="muted">${DISCLAIMER} No card details are collected and no real payment occurs.</p><p>Order: <strong>${escapeHtml(action.externalActionId)}</strong></p><p>Status: <strong>${escapeHtml(action.providerLifecycle)}</strong></p><table>${rows}</table><p class="total">${action.total.toLocaleString('en-US')} UZS</p>${paymentControl}${advanceControl}${cancelControl}</main></body></html>`);
  });

  app.post('/pay/:externalActionId/simulate-success', async (req, res) => {
    const action = findAction(req.params.externalActionId);
    if (!action) return res.status(404).send('Mock order not found.');
    if (!canSimulatePayment(action)) return res.status(409).send('Payment cannot be simulated for this action state.');
    action.paymentStatus = PaymentStatus.PAID;
    action.status = ActionStatus.CONFIRMED;
    action.providerLifecycle = 'ACCEPTED';
    action.updatedAt = new Date().toISOString();
    try { await dispatchWebhook(action, 'payment.received', 'Mock payment received; provider accepted the order.'); }
    catch (error: any) { return res.status(502).send(escapeHtml(error.message)); }
    return res.redirect(303, `/pay/${encodeURIComponent(req.params.externalActionId)}`);
  });

  app.post('/pay/:externalActionId/advance', async (req, res) => {
    const action = findAction(req.params.externalActionId);
    if (!action) return res.status(404).send('Mock order not found.');
    if (isTerminalLifecycle(action)) return res.status(409).send(`Action is already terminal: ${action.providerLifecycle}.`);
    if (action.providerLifecycle === 'ACCEPTED') {
      action.providerLifecycle = 'PREPARING'; action.status = ActionStatus.PROCESSING;
    } else if (action.providerLifecycle === 'PREPARING') {
      action.providerLifecycle = 'READY'; action.status = ActionStatus.PROCESSING;
    } else if (action.providerLifecycle === 'READY') {
      action.providerLifecycle = 'COMPLETED'; action.status = ActionStatus.COMPLETED;
    }
    action.updatedAt = new Date().toISOString();
    try { await dispatchWebhook(action, action.status === ActionStatus.COMPLETED ? 'action.completed' : 'action.status_updated', `Mock provider status: ${action.providerLifecycle}`); }
    catch (error: any) { return res.status(502).send(escapeHtml(error.message)); }
    return res.redirect(303, `/pay/${encodeURIComponent(req.params.externalActionId)}`);
  });

  app.post('/pay/:externalActionId/cancel', async (req, res) => {
    const action = findAction(req.params.externalActionId);
    if (!action) return res.status(404).send('Mock order not found.');
    if (!canCancel(action)) return res.status(409).send(`Action cannot be cancelled in terminal state ${action.providerLifecycle}.`);
    action.status = ActionStatus.CANCELLED;
    action.providerLifecycle = 'CANCELLED';
    action.updatedAt = new Date().toISOString();
    try { await dispatchWebhook(action, 'action.cancelled', 'Mock order cancelled from provider checkout.'); }
    catch (error: any) { return res.status(502).send(escapeHtml(error.message)); }
    return res.redirect(303, `/pay/${encodeURIComponent(req.params.externalActionId)}`);
  });

  return app;
}
