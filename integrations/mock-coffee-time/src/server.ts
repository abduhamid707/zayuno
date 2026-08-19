import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors, { type CorsOptions } from 'cors';
import crypto from 'crypto';
import {
  ActionStatus, PaymentMethodType, PaymentStatus, ProviderCapability, ProviderStatus, ProviderType,
  type CreateActionInput, type NormalizedAction, type NormalizedQuote, type QuoteLine, type RequestQuoteInput
} from '@zayuno/contracts';
import { COFFEE_CATEGORIES, COFFEE_LOCATIONS, COFFEE_OFFERINGS } from './data';

type StoredAction = NormalizedAction & { sandboxState: 'AWAITING_PAYMENT' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED' };
const SLUG = 'coffee-time';
const DISCLAIMER = 'Coffee Time sandbox demo. No real orders or payments.';
const makeId = (prefix: string) => `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
const html = (value: unknown) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');

export function createCoffeeTimeSandboxApp(): Express {
  const app = express();
  const allowedOrigins = new Set((process.env.CORS_ALLOWED_ORIGINS || [
    'https://zayuno.uz',
    'https://admin.zayuno.uz',
    'https://partners.zayuno.uz',
    'https://developers.zayuno.uz',
    'https://coffee-time-sandbox.shopla.uz'
  ].join(',')).split(',').map(value => value.trim()).filter(Boolean));
  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      const localDevelopment = process.env.NODE_ENV !== 'production' && !!origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (!origin || allowedOrigins.has(origin) || localDevelopment) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-provider-api-key', 'idempotency-key'],
    credentials: false,
    maxAge: 86400,
    optionsSuccessStatus: 204
  };
  app.use(cors(corsOptions));
  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof Error && error.message === 'Origin is not allowed by CORS.') {
      return res.status(403).json({ message: error.message });
    }
    return next(error);
  });
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  const quotes = new Map<string, NormalizedQuote>();
  const actions = new Map<string, StoredAction>();
  const idempotency = new Map<string, string>();
  const apiKey = process.env.PROVIDER_API_KEY || '';
  const webhookSecret = process.env.ZAYUNO_WEBHOOK_SECRET || '';
  const zayunoApi = (process.env.ZAYUNO_API_URL || 'http://api:4000').replace(/\/$/, '');
  const publicBase = (process.env.PROVIDER_PUBLIC_BASE_URL || 'http://localhost:4005').replace(/\/$/, '');

  const auth = (req: Request, res: Response, next: () => void) => {
    if (apiKey && req.header('x-provider-api-key') !== apiKey) return void res.status(401).json({ message: 'Invalid provider API key.' });
    next();
  };
  const findAction = (key: string) => actions.get(key) || [...new Set(actions.values())].find(action => action.id === key || action.publicId === key || action.externalActionId === key);

  function linesFor(input: RequestQuoteInput | CreateActionInput): QuoteLine[] {
    return input.items.map(item => {
      const offering = COFFEE_OFFERINGS.find(value => value.id === item.offeringId || value.offeringCode === item.offeringId);
      if (!offering || !offering.isAvailable) throw new Error(`Offering unavailable: ${item.offeringId}`);
      const variant = item.variantId ? offering.variants?.find(value => value.id === item.variantId) : undefined;
      if (item.variantId && !variant) throw new Error(`Variant not found: ${item.variantId}`);
      let optionsTotal = 0;
      for (const selected of item.selectedOptions || []) {
        const group = offering.optionGroups?.find(value => value.id === selected.groupId);
        const option = group?.options.find(value => value.id === selected.optionId && value.isAvailable);
        if (!option) throw new Error(`Option unavailable: ${selected.groupId}/${selected.optionId}`);
        optionsTotal += option.priceDelta * (selected.quantity || 1) * item.quantity;
      }
      const unitPrice = variant?.basePrice ?? offering.basePrice;
      return { offeringId: offering.id, offeringTitle: offering.title, variantId: variant?.id, variantTitle: variant?.name, unitPrice, quantity: item.quantity, optionsTotal, lineTotal: unitPrice * item.quantity + optionsTotal, selectedOptions: item.selectedOptions || [] };
    });
  }

  async function webhook(action: StoredAction, eventType: string): Promise<void> {
    if (!webhookSecret) return;
    const payload = { eventId: makeId('ct_evt'), eventType, providerSlug: SLUG, externalActionId: action.externalActionId, newStatus: action.status, newPaymentStatus: action.paymentStatus, timestamp: new Date().toISOString(), payload: { sandboxState: action.sandboxState } };
    const raw = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
    const response = await fetch(`${zayunoApi}/api/v1/webhooks/${SLUG}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-provider-signature': signature }, body: raw });
    if (!response.ok) throw new Error(`Zayuno webhook returned HTTP ${response.status}`);
  }

  app.get('/health', (_req, res) => res.json({ status: 'HEALTHY', latencyMs: 1, message: DISCLAIMER, timestamp: new Date().toISOString() }));
  app.use(['/provider-info','/locations','/catalog','/offerings','/search','/quote','/actions'], auth);
  app.get('/provider-info', (_req, res) => res.json({ id: SLUG, slug: SLUG, name: 'Coffee Time', description: DISCLAIMER, status: ProviderStatus.SANDBOX, type: ProviderType.DELIVERY, category: 'food_delivery', geography: ['UZ','Tashkent'], adapterType: 'remote-http', authMethod: 'API_KEY', capabilities: Object.values(ProviderCapability), baseUrl: publicBase, isCertified: false, isPublished: false, metadata: { sandbox: true } }));
  app.get('/locations', (req, res) => res.json(req.query.activeOnly === 'false' ? COFFEE_LOCATIONS : COFFEE_LOCATIONS.filter(value => value.isActive)));
  app.get('/catalog', (req, res) => { const category = String(req.query.category || ''); res.json({ providerSlug: SLUG, locationId: req.query.locationId || undefined, categories: COFFEE_CATEGORIES, offerings: category ? COFFEE_OFFERINGS.filter(value => value.categorySlug === category) : COFFEE_OFFERINGS, version: '1.0.0', updatedAt: new Date().toISOString() }); });
  app.get('/offerings/:id', (req, res) => { const item = COFFEE_OFFERINGS.find(value => value.id === req.params.id || value.offeringCode === req.params.id); return item ? res.json(item) : res.status(404).json({ message: 'Offering not found.' }); });
  app.get('/search', (req, res) => { const q = String(req.query.q || '').toLowerCase(); res.json(COFFEE_OFFERINGS.filter(value => value.title.toLowerCase().includes(q) || value.description?.toLowerCase().includes(q) || value.tags?.some(tag => tag.includes(q))).slice(0, Number(req.query.limit || 20))); });

  app.post('/quote', (req, res) => {
    try { const input = req.body as RequestQuoteInput; const lines = linesFor(input); const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0); const fee = input.fulfillmentType === 'PICKUP' ? 0 : 10000; const quote: NormalizedQuote = { id: makeId('ct_quote'), providerSlug: SLUG, locationId: input.locationId, lines, subtotal, fees: fee ? [{ name: 'Test yetkazib berish', amount: fee }] : [], totalFees: fee, discounts: [], totalDiscount: 0, total: subtotal + fee, currency: 'UZS', expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), estimatedDurationMinutes: 25, parameters: { sandbox: true } }; quotes.set(quote.id, quote); return res.json(quote); }
    catch (error: any) { return res.status(400).json({ message: error.message }); }
  });
  app.post('/actions', (req, res) => {
    try { const input = req.body as CreateActionInput; const key = req.header('idempotency-key') || input.idempotencyKey; if (!key || input.userConfirmed !== true || !input.quoteId) return res.status(400).json({ message: 'Idempotency key, quoteId and explicit confirmation are required.' }); const old = idempotency.get(key); if (old) return res.json(findAction(old)); const quote = quotes.get(input.quoteId); if (!quote) return res.status(400).json({ message: 'Quote not found or expired.' }); const now = new Date().toISOString(); const externalId = makeId('CT'); const checkout = `${publicBase}/pay/${externalId}`; const action: StoredAction = { id: makeId('ct_action'), publicId: `CT-SB-${crypto.randomInt(10000,99999)}`, providerSlug: SLUG, providerName: 'Coffee Time', externalActionId: externalId, quoteId: quote.id, locationId: input.locationId, status: ActionStatus.AWAITING_PAYMENT, sandboxState: 'AWAITING_PAYMENT', nextAction: { type: 'OPEN_URL', url: checkout, label: 'Coffee Time test checkout', expiresAt: quote.expiresAt }, lines: quote.lines, subtotal: quote.subtotal, fees: quote.totalFees, discount: quote.totalDiscount, total: quote.total, currency: quote.currency, customer: input.customer, destination: input.destination, fulfillmentType: input.fulfillmentType || 'STANDARD', paymentMethod: input.paymentMethod || 'payme', paymentStatus: PaymentStatus.PENDING, paymentUrl: checkout, idempotencyKey: key, parameters: input.parameters || {}, metadata: { sandbox: true }, timeline: [{ id: makeId('timeline'), status: ActionStatus.AWAITING_PAYMENT, description: 'Test order created.', source: 'AI_AGENT', createdAt: now }], createdAt: now, updatedAt: now }; actions.set(action.id, action); actions.set(externalId, action); idempotency.set(key, action.id); return res.status(201).json(action); }
    catch (error: any) { return res.status(400).json({ message: error.message }); }
  });
  app.get('/actions/:id', (req, res) => { const action = findAction(req.params.id); return action ? res.json(action) : res.status(404).json({ message: 'Action not found.' }); });
  app.post('/actions/:id/cancel', async (req, res) => { const action = findAction(req.params.id); if (!action) return res.status(404).json({ message: 'Action not found.' }); if (['COMPLETED','CANCELLED'].includes(action.sandboxState)) return res.status(409).json({ message: 'Terminal action cannot be cancelled.' }); const previousStatus = action.status; action.status = ActionStatus.CANCELLED; action.sandboxState = 'CANCELLED'; await webhook(action, 'action.cancelled'); return res.json({ success: true, actionId: action.publicId, previousStatus, newStatus: action.status, refundInitiated: false }); });
  app.get('/actions/:id/payment-options', (req, res) => { const action = findAction(req.params.id); return action ? res.json([{ id: 'ct_test_checkout', name: 'Coffee Time test checkout', type: PaymentMethodType.EXTERNAL_PROVIDER, isOnline: true, checkoutUrl: action.paymentUrl, supportedCurrencies: ['UZS'], metadata: { sandbox: true } }]) : res.status(404).json({ message: 'Action not found.' }); });

  app.get('/pay/:id', (req, res) => { const action = findAction(req.params.id); if (!action) return res.status(404).send('Order not found.'); const button = action.sandboxState === 'AWAITING_PAYMENT' ? `<form method="post" action="/pay/${html(action.externalActionId)}/success"><button>Test to‘lovni tasdiqlash</button></form>` : ''; return res.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width"><style>body{font-family:Arial;background:#17100b;color:#fff;padding:32px}.card{max-width:640px;margin:auto;background:#291b12;padding:28px;border-radius:20px}button{padding:14px 18px;background:#d97706;color:white;border:0;border-radius:12px;font-weight:700}</style><main class="card"><b>SANDBOX</b><h1>Coffee Time Checkout</h1><p>${DISCLAIMER}</p><p>Order: ${html(action.externalActionId)}</p><h2>${action.total.toLocaleString('uz-UZ')} UZS</h2><p>Status: ${action.sandboxState}</p>${button}</main>`); });
  app.post('/pay/:id/success', async (req, res) => { const action = findAction(req.params.id); if (!action) return res.status(404).send('Order not found.'); if (action.sandboxState !== 'AWAITING_PAYMENT') return res.status(409).send('Payment already processed or action is terminal.'); action.paymentStatus = PaymentStatus.PAID; action.status = ActionStatus.CONFIRMED; action.sandboxState = 'ACCEPTED'; await webhook(action, 'payment.received'); return res.redirect(303, `/pay/${encodeURIComponent(req.params.id)}`); });
  return app;
}
