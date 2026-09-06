import crypto from 'node:crypto';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors, { type CorsOptions } from 'cors';
import {
  ActionStatus,
  PaymentMethodType,
  PaymentStatus,
  ProviderCapability,
  ProviderStatus,
  ProviderType,
  type AvailabilityResult,
  type CheckAvailabilityInput,
  type CreateActionInput,
  type NormalizedAction,
  type NormalizedQuote,
  type QuoteLine,
  type RequestQuoteInput
} from '@zayuno/contracts';
import {
  POYEZ_CATEGORIES,
  POYEZ_STATIONS,
  POYEZ_TRIPS,
  normalizeDate,
  resolveTripOffering,
  seatLevel,
  stationName,
  tripOffering,
  type RailCarTemplate,
  type RailTripTemplate,
  type SeatLevel
} from './data';

type SandboxState = 'AWAITING_PASSENGER_DETAILS' | 'AWAITING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
type SeatLock = { actionId: string; state: 'HELD' | 'SOLD'; expiresAt: number };
type PendingWebhook = { eventId: string; raw: string; slug?: string; attempts: number; nextAttemptAt: number };
type StoredQuote = NormalizedQuote & { createdAtMs: number; consumedByActionId?: string };
type StoredAction = NormalizedAction & {
  sandboxState: SandboxState;
  holdExpiresAt: string;
  seatKeys: string[];
  selectedSeats: Array<{ carId: string; carNumber: string; seatNumber: number; level: SeatLevel }>;
};

const SLUG = 'poyez-sandbox';
const PROVIDER_NAME = 'Poyez Sandbox';
const DISCLAIMER = 'Sandbox demo only. Not affiliated with O‘zbekiston Temir Yo‘llari. No real tickets, passport data, or payments.';
const QUOTE_TTL_MS = Number(process.env.POYEZ_QUOTE_TTL_MS || 2 * 60_000);
const HOLD_TTL_MS = Number(process.env.POYEZ_HOLD_TTL_MS || 10 * 60_000);
const MAX_BODY_BYTES = '64kb';
const makeId = (prefix: string) => `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
const html = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function stationIds(value: unknown): string[] {
  const query = String(value || '').trim().toLocaleLowerCase('uz');
  if (!query) return [];
  const exact = POYEZ_STATIONS.find(station => station.id === query || station.name.toLocaleLowerCase('uz') === query);
  if (exact) return [exact.id];
  return POYEZ_STATIONS.filter(station => station.name.toLocaleLowerCase('uz').includes(query) || query.includes(station.name.toLocaleLowerCase('uz'))).map(station => station.id);
}

function parseObject(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string' || value.length > 16_384) throw new Error('Dynamic context must be a JSON object smaller than 16KB.');
  const parsed = JSON.parse(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Dynamic context must be a JSON object.');
  return parsed;
}

function containsSensitiveIdentityData(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== 'object' || depth > 8) return false;
  const forbidden = /^(passport|passportnumber|documentnumber|identitynumber|jshshir|pinfl|cardnumber|cvv|cvc|cardexpiry|bankcard)$/i;
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => forbidden.test(key.replace(/[_-]/g, '')) || containsSensitiveIdentityData(child, depth + 1));
}

function tashkentDateParts(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+05:00`);
}

function requestedDate(value: unknown): string {
  const date = normalizeDate(value);
  if (value !== undefined && value !== null && String(value) !== date) throw new Error('Departure date must use a valid YYYY-MM-DD value.');
  const departure = tashkentDateParts(date, '23:59').valueOf();
  if (departure < Date.now()) throw new Error('Departure date cannot be in the past.');
  if (departure > Date.now() + 90 * 24 * 60 * 60_000) throw new Error('Sandbox bookings are limited to the next 90 days.');
  return date;
}

function dayOfWeek(date: string): number {
  const day = tashkentDateParts(date, '12:00').getUTCDay();
  return day === 0 ? 7 : day;
}

export function createPoyezSandboxApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const apiKey = process.env.PROVIDER_API_KEY || '';
  const webhookSecret = process.env.ZAYUNO_WEBHOOK_SECRET || '';
  const zayunoApi = (process.env.ZAYUNO_API_URL || 'http://api:4000').replace(/\/$/, '');
  const publicBase = (process.env.PROVIDER_PUBLIC_BASE_URL || 'http://localhost:4006').replace(/\/$/, '');
  if (process.env.NODE_ENV === 'production') {
    if (apiKey.length < 16) throw new Error('PROVIDER_API_KEY must contain at least 16 characters in production.');
    if (webhookSecret.length < 16) throw new Error('ZAYUNO_WEBHOOK_SECRET must contain at least 16 characters in production.');
    if (!publicBase.startsWith('https://')) throw new Error('PROVIDER_PUBLIC_BASE_URL must use HTTPS in production.');
  }

  const defaultOrigins = [
    'https://zayuno.uz',
    'https://admin.zayuno.uz',
    'https://partners.zayuno.uz',
    'https://developers.zayuno.uz',
    'https://mcp.zayuno.uz',
    'https://poyez-sandbox.shopla.uz'
  ];
  try {
    if (publicBase) {
      const parsed = new URL(publicBase);
      if (parsed.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && parsed.protocol === 'http:')) {
        if (!defaultOrigins.includes(parsed.origin)) {
          defaultOrigins.push(parsed.origin);
        }
      }
    }
  } catch {}

  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(value => value.trim()).filter(Boolean)
    : [];
  const allowedOrigins = new Set([...defaultOrigins, ...configuredOrigins]);

  const apiCors = cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const isLocalDev = process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (allowedOrigins.has(origin) || isLocalDev) {
        return callback(null, true);
      }
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-provider-api-key', 'idempotency-key', 'X-Requested-With'],
    credentials: false,
    maxAge: 86400,
    optionsSuccessStatus: 204
  });

  // Apply strict API CORS only to provider/API endpoints, bypassing /pay/* browser checkout/handoff routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/pay')) {
      return next();
    }
    return apiCors(req, res, next);
  });

  app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (error instanceof Error && error.message === 'Origin is not allowed by CORS.') {
      return res.status(403).json({ message: error.message });
    }
    return next(error);
  });
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
    return next();
  });
  app.use(express.json({ limit: MAX_BODY_BYTES }));
  app.use(express.urlencoded({ extended: false, limit: MAX_BODY_BYTES }));

  const rateBuckets = new Map<string, { startedAt: number; count: number }>();
  app.use((req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.startedAt >= 60_000) rateBuckets.set(key, { startedAt: now, count: 1 });
    else if (++bucket.count > 240) return res.status(429).json({ message: 'Too many sandbox requests. Retry in one minute.' });
    if (rateBuckets.size > 10_000) {
      for (const [bucketKey, value] of rateBuckets) if (now - value.startedAt > 5 * 60_000) rateBuckets.delete(bucketKey);
    }
    return next();
  });

  const quotes = new Map<string, StoredQuote>();
  const actions = new Map<string, StoredAction>();
  const actionAliases = new Map<string, string>();
  const idempotency = new Map<string, string>();
  const seats = new Map<string, SeatLock>();
  const checkoutTokens = new Map<string, string>();
  const pendingWebhooks = new Map<string, PendingWebhook>();

  const auth = (req: Request, res: Response, next: NextFunction) => {
    const supplied = req.header('x-provider-api-key') || '';
    const expected = Buffer.from(apiKey);
    const actual = Buffer.from(supplied);
    if (!apiKey || expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      return res.status(401).json({ message: 'Invalid provider API key.' });
    }
    return next();
  };

  const findAction = (id: string): StoredAction | undefined => {
    const canonical = actions.has(id) ? id : actionAliases.get(id);
    return canonical ? actions.get(canonical) : undefined;
  };

  const seatKey = (tripId: string, date: string, carId: string, seatNumber: number) => `${tripId}:${date}:${carId}:${seatNumber}`;

  function releaseSeats(action: StoredAction): void {
    for (const key of action.seatKeys) {
      const lock = seats.get(key);
      if (lock?.actionId === action.id) seats.delete(key);
    }
  }

  function expireHolds(): void {
    const now = Date.now();
    for (const action of actions.values()) {
      if (!['AWAITING_PASSENGER_DETAILS', 'AWAITING_PAYMENT'].includes(action.sandboxState)) continue;
      if (Date.parse(action.holdExpiresAt) > now) continue;
      releaseSeats(action);
      action.sandboxState = 'EXPIRED';
      action.status = ActionStatus.CANCELLED;
      action.updatedAt = new Date().toISOString();
      action.timeline?.push({ id: makeId('ps_timeline'), status: ActionStatus.CANCELLED, description: 'Sandbox seat hold expired before payment.', source: 'SYSTEM_WORKER', createdAt: action.updatedAt });
    }
    for (const [quoteId, quote] of quotes) {
      const retention = quote.consumedByActionId ? 24 * 60 * 60_000 : 10 * 60_000;
      if (Date.parse(quote.expiresAt) + retention < now) quotes.delete(quoteId);
    }
    for (const [actionId, action] of actions) {
      if (!['CANCELLED', 'EXPIRED', 'COMPLETED'].includes(action.sandboxState) && action.paymentStatus !== PaymentStatus.REFUNDED) continue;
      if (Date.parse(action.updatedAt) + 24 * 60 * 60_000 >= now) continue;
      actions.delete(actionId);
      checkoutTokens.delete(actionId);
      for (const [alias, canonical] of actionAliases) if (canonical === actionId) actionAliases.delete(alias);
      for (const [key, canonical] of idempotency) if (canonical === actionId) idempotency.delete(key);
    }
  }

  const cleanupTimer = setInterval(expireHolds, 15_000);
  cleanupTimer.unref();

  async function deliverWebhook(raw: string, slug = SLUG): Promise<{ ok: boolean; status?: number }> {
    const signature = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
    const webhookSlug = slug || SLUG;
    try {
      const response = await fetch(`${zayunoApi}/api/v1/webhooks/${webhookSlug}`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-provider-signature': signature }, body: raw,
        signal: AbortSignal.timeout(5000), redirect: 'error'
      });
      return { ok: response.ok, status: response.status };
    } catch (error) {
      console.error('[Poyez Sandbox] webhook delivery failed:', error instanceof Error ? error.message : String(error));
      return { ok: false };
    }
  }

  let webhookRetryInProgress = false;
  const webhookRetryTimer = setInterval(async () => {
    if (webhookRetryInProgress) return;
    webhookRetryInProgress = true;
    try {
    const now = Date.now();
    for (const [eventId, pending] of pendingWebhooks) {
      if (pending.nextAttemptAt > now) continue;
      const delivery = await deliverWebhook(pending.raw, pending.slug);
      if (delivery.ok) {
        pendingWebhooks.delete(eventId);
        continue;
      }
      pending.attempts += 1;
      if (pending.attempts >= 10) {
        console.error(`[Poyez Sandbox] webhook ${eventId} exhausted 10 delivery attempts.`);
        pendingWebhooks.delete(eventId);
      } else {
        pending.nextAttemptAt = Date.now() + Math.min(60_000, 2 ** pending.attempts * 1000);
      }
    }
    } finally {
      webhookRetryInProgress = false;
    }
  }, 5_000);
  webhookRetryTimer.unref();

  function availableSeats(trip: RailTripTemplate, date: string, car: RailCarTemplate): number[] {
    expireHolds();
    const result: number[] = [];
    for (let number = 1; number <= car.seatCount; number++) {
      if (!seats.has(seatKey(trip.id, date, car.id, number))) result.push(number);
    }
    return result;
  }

  function findTrips(context: Record<string, any>, query = ''): Array<{ trip: RailTripTemplate; date: string }> {
    const date = requestedDate(context.departureDate || context.date);
    const originIds = stationIds(context.origin);
    const destinationIds = stationIds(context.destination);
    if (context.origin && originIds.length === 0) throw new Error(`Unknown origin station: ${String(context.origin)}`);
    if (context.destination && destinationIds.length === 0) throw new Error(`Unknown destination station: ${String(context.destination)}`);
    if (String(context.origin || '').trim().toLocaleLowerCase('uz') === String(context.destination || '').trim().toLocaleLowerCase('uz') && context.origin) {
      throw new Error('Origin and destination must be different stations.');
    }
    const cleanWords = query
      .toLocaleLowerCase('uz')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3);

    const scored = POYEZ_TRIPS.map(trip => {
      if (!trip.runsOnDays.includes(dayOfWeek(date))) return null;
      if (originIds.length && !originIds.includes(trip.originId)) return null;
      if (destinationIds.length && !destinationIds.includes(trip.destinationId)) return null;

      const period = String(context.preferences?.departurePeriod || '').toUpperCase();
      const hour = Number(trip.departureTime.slice(0, 2));
      if (period === 'MORNING' && hour >= 12) return null;
      if (period === 'AFTERNOON' && (hour < 12 || hour >= 18)) return null;
      if ((period === 'EVENING' || period === 'NIGHT') && hour < 18) return null;

      if (!originIds.length && !destinationIds.length && cleanWords.length > 0) {
        const haystack = `${trip.trainNumber} ${trip.serviceLabel} ${stationName(trip.originId)} ${stationName(trip.destinationId)}`.toLocaleLowerCase('uz');
        const score = cleanWords.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0);
        if (score === 0) return null;
        return { trip, date, score };
      }
      return { trip, date, score: 1 };
    }).filter((item): item is { trip: RailTripTemplate; date: string; score: number } => item !== null);

    if (!originIds.length && !destinationIds.length && cleanWords.length > 0 && scored.length > 0) {
      const maxScore = Math.max(...scored.map(item => item.score));
      return scored.filter(item => item.score === maxScore).map(item => ({ trip: item.trip, date: item.date }));
    }

    return scored.map(item => ({ trip: item.trip, date: item.date }));
  }

  function enrichedOffering(trip: RailTripTemplate, date: string) {
    const remaining = Object.fromEntries(trip.cars.map(car => [car.id, availableSeats(trip, date, car).length]));
    return tripOffering(trip, date, remaining);
  }

  function chooseCar(trip: RailTripTemplate, date: string, variantId: string | undefined, preferences: Record<string, any>): RailCarTemplate {
    const requestedClass = String(preferences.carClass || preferences.carType || '').toUpperCase();
    const car = trip.cars.find(value => value.id === variantId) || trip.cars.find(value => value.class === requestedClass) || trip.cars[0];
    if (!car || availableSeats(trip, date, car).length === 0) throw new Error('Requested car class is no longer available.');
    return car;
  }

  function pickSeats(trip: RailTripTemplate, date: string, car: RailCarTemplate, quantity: number, parameters: Record<string, any>): number[] {
    const free = availableSeats(trip, date, car);
    const explicitlySelected = Array.isArray(parameters.selectedSeatNumbers) ? parameters.selectedSeatNumbers.map(Number) : [];
    if (explicitlySelected.length) {
      if (explicitlySelected.length !== quantity || new Set(explicitlySelected).size !== quantity) throw new Error('Exactly one unique seat must be selected per ticket.');
      if (explicitlySelected.some(number => !Number.isInteger(number) || !free.includes(number))) throw new Error('One or more selected seats are no longer available.');
      return explicitlySelected;
    }
    const level = String(parameters.preferences?.seatLevel || '').toUpperCase();
    const preferred = level === 'LOWER' || level === 'UPPER' ? free.filter(number => seatLevel(number, car.class) === level) : free;
    const fallback = [...preferred, ...free.filter(number => !preferred.includes(number))];
    if (fallback.length < quantity) throw new Error(`Only ${fallback.length} seats remain in the selected car.`);
    return fallback.slice(0, quantity);
  }

  function passengerMix(parameters: Record<string, any>, quantity: number) {
    const adults = parameters.passengers?.adults ?? parameters.adults ?? quantity;
    const children = parameters.passengers?.children ?? parameters.children ?? 0;
    const infants = parameters.passengers?.infants ?? parameters.infants ?? 0;
    if (![adults, children, infants].every(value => Number.isInteger(value) && value >= 0)) throw new Error('Passenger counts must be non-negative integers.');
    if (adults + children !== quantity) throw new Error('Ticket quantity must equal adults plus children. Infants without a seat are tracked separately.');
    return { adults, children, infants };
  }

  function quoteLine(input: RequestQuoteInput['items'][number], parameters: Record<string, any>): { line: QuoteLine; context: Record<string, any>; discount: number } {
    const resolved = resolveTripOffering(input.offeringId);
    if (!resolved) throw new Error(`Trip offering not found: ${input.offeringId}`);
    const { trip, date } = resolved;
    const mix = passengerMix(parameters, input.quantity);
    const car = chooseCar(trip, date, input.variantId, parameters.preferences || {});
    const selectedSeats = pickSeats(trip, date, car, input.quantity, parameters);
    let optionsTotal = 0;
    for (const selected of input.selectedOptions || []) {
      if (selected.groupId === 'insurance' && selected.optionId === 'accident-insurance') optionsTotal += 10_000 * input.quantity * (selected.quantity || 1);
      else if (selected.groupId === 'green-ticket' && selected.optionId === 'green-support') optionsTotal += 0;
      else throw new Error(`Unsupported additional service: ${selected.groupId}/${selected.optionId}`);
    }
    const childDiscount = Math.round(car.price * mix.children * 0.5);
    return {
      line: {
        offeringId: `${trip.id}__${date}`, offeringTitle: `${stationName(trip.originId)} → ${stationName(trip.destinationId)} · ${trip.departureTime}`,
        variantId: car.id, variantTitle: `${car.title} — ${car.number}-vagon`, unitPrice: car.price, quantity: input.quantity,
        optionsTotal, lineTotal: car.price * input.quantity + optionsTotal, selectedOptions: input.selectedOptions || []
      },
      discount: childDiscount,
      context: {
        tripId: trip.id, date, trainNumber: trip.trainNumber, serviceLabel: trip.serviceLabel, originId: trip.originId,
        origin: stationName(trip.originId), destinationId: trip.destinationId, destination: stationName(trip.destinationId),
        departureTime: trip.departureTime, arrivalTime: trip.arrivalTime, durationMinutes: trip.durationMinutes,
        carId: car.id, carNumber: car.number, carClass: car.class, selectedSeatNumbers: selectedSeats,
        selectedSeats: selectedSeats.map(number => ({ carId: car.id, carNumber: car.number, seatNumber: number, level: seatLevel(number, car.class) })),
        passengers: mix, requiresSecurePassengerDetails: true, sandbox: true
      }
    };
  }

  async function sendWebhook(action: StoredAction, eventType: string): Promise<{ ok: boolean; status?: number }> {
    if (!webhookSecret) return { ok: false };
    const eventId = makeId('ps_evt');
    const slug = action.providerSlug || SLUG;
    const payload = {
      eventId, eventType, providerSlug: slug, externalActionId: action.externalActionId,
      newStatus: action.status, newPaymentStatus: action.paymentStatus, timestamp: new Date().toISOString(),
      payload: { sandboxState: action.sandboxState, holdExpiresAt: action.holdExpiresAt }
    };
    const raw = JSON.stringify(payload);
    const delivery = await deliverWebhook(raw, slug);
    if (!delivery.ok) pendingWebhooks.set(eventId, { eventId, raw, slug, attempts: 1, nextAttemptAt: Date.now() + 2_000 });
    return delivery;
  }

  app.get('/health', (_req, res) => res.json({
    status: pendingWebhooks.size ? 'DEGRADED' : 'HEALTHY', latencyMs: 1,
    message: pendingWebhooks.size ? `${DISCLAIMER} ${pendingWebhooks.size} webhook event(s) awaiting retry.` : DISCLAIMER,
    timestamp: new Date().toISOString()
  }));
  app.use(['/provider-info', '/locations', '/stations', '/catalog', '/offerings', '/search', '/availability', '/quote', '/actions', '/trips'], auth);

  app.get('/provider-info', (_req, res) => {
    const slug = process.env.PROVIDER_SLUG || SLUG;
    return res.json({
      id: slug, slug, name: PROVIDER_NAME, description: DISCLAIMER, status: ProviderStatus.SANDBOX,
      type: ProviderType.TICKETING, category: 'railway_tickets', geography: ['UZ'], adapterType: 'remote-http', authMethod: 'API_KEY',
      capabilities: Object.values(ProviderCapability), baseUrl: publicBase, isCertified: false, isPublished: false,
      metadata: { sandbox: true, dynamicInventory: true, inventoryKinds: ['TRIP', 'CAR', 'SEAT'], securePassengerHandoff: true, holdDurationSeconds: HOLD_TTL_MS / 1000 }
    });
  });
  app.get('/locations', (req, res) => res.json(req.query.activeOnly === 'false' ? POYEZ_STATIONS : POYEZ_STATIONS.filter(value => value.isActive)));
  app.get('/stations', (_req, res) => res.json(POYEZ_STATIONS));

  app.get('/catalog', (req, res) => {
    try {
      const context = parseObject(req.query.context);
      const date = requestedDate(context.departureDate || context.date);
      const category = String(req.query.category || '');
      const offerings = POYEZ_TRIPS.filter(trip => !category || (category === 'high-speed' ? trip.serviceLabel === 'TEZYURAR' : trip.serviceLabel !== 'TEZYURAR')).map(trip => enrichedOffering(trip, date));
      return res.json({ providerSlug: process.env.PROVIDER_SLUG || SLUG, locationId: req.query.locationId || undefined, categories: POYEZ_CATEGORIES, offerings, version: `sandbox-${date}`, updatedAt: new Date().toISOString() });
    } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : String(error) }); }
  });

  app.get('/offerings/:id', (req, res) => {
    try {
      const resolved = resolveTripOffering(req.params.id);
      if (!resolved) return res.status(404).json({ message: 'Trip offering not found.' });
      return res.json(enrichedOffering(resolved.trip, resolved.date));
    } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : String(error) }); }
  });

  app.get('/search', (req, res) => {
    try {
      const context = parseObject(req.query.context);
      const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
      return res.json(findTrips(context, String(req.query.q || '')).slice(0, limit).map(value => enrichedOffering(value.trip, value.date)));
    } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : String(error) }); }
  });

  app.get('/trips/:id/cars', (req, res) => {
    const trip = POYEZ_TRIPS.find(value => value.id === req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found.' });
    const date = normalizeDate(req.query.date);
    return res.json(trip.cars.map(car => ({ ...car, availableSeats: availableSeats(trip, date, car).length, date })));
  });

  app.get('/trips/:tripId/cars/:carId/seats', (req, res) => {
    const trip = POYEZ_TRIPS.find(value => value.id === req.params.tripId);
    const car = trip?.cars.find(value => value.id === req.params.carId);
    if (!trip || !car) return res.status(404).json({ message: 'Trip or car not found.' });
    const date = normalizeDate(req.query.date);
    const free = new Set(availableSeats(trip, date, car));
    return res.json({ tripId: trip.id, date, carId: car.id, carNumber: car.number, carClass: car.class, seats: Array.from({ length: car.seatCount }, (_, index) => ({ number: index + 1, level: seatLevel(index + 1, car.class), isAvailable: free.has(index + 1) })) });
  });

  app.post('/availability', (req, res) => {
    try {
      const input = req.body as CheckAvailabilityInput;
      if (!Array.isArray(input.items) || input.items.length === 0) return res.status(400).json({ message: 'At least one item is required.' });
      const parameters = parseObject(input.parameters);
      const result: AvailabilityResult = { isAvailable: true, unavailableItems: [], availableItems: [], checkedAt: new Date().toISOString(), validUntil: new Date(Date.now() + 30_000).toISOString(), parameters: { sandbox: true } };
      for (const item of input.items) {
        const resolved = resolveTripOffering(item.offeringId);
        if (!resolved) { result.isAvailable = false; result.unavailableItems.push({ offeringId: item.offeringId, reason: 'Trip not found.' }); continue; }
        try {
          const car = chooseCar(resolved.trip, resolved.date, item.variantId, parameters.preferences || {});
          const recommended = pickSeats(resolved.trip, resolved.date, car, item.quantity, parameters);
          result.availableItems?.push({ offeringId: item.offeringId, variantId: car.id, requestedQuantity: item.quantity, remainingCapacity: availableSeats(resolved.trip, resolved.date, car).length, unitPrice: car.price, currency: 'UZS', metadata: { carNumber: car.number, carClass: car.class, recommendedSeats: recommended.map(number => ({ number, level: seatLevel(number, car.class) })) } });
        } catch (error) { result.isAvailable = false; result.unavailableItems.push({ offeringId: item.offeringId, reason: error instanceof Error ? error.message : String(error) }); }
      }
      return res.json(result);
    } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : String(error) }); }
  });

  app.post('/quote', (req, res) => {
    try {
      const input = req.body as RequestQuoteInput;
      const targetSlug = input.providerSlug || process.env.PROVIDER_SLUG || SLUG;
      if (!Array.isArray(input.items) || input.items.length !== 1) return res.status(400).json({ message: 'Sandbox rail quotes support exactly one trip per booking.' });
      const parameters = parseObject(input.parameters);
      if (containsSensitiveIdentityData(parameters)) return res.status(400).json({ message: 'Identity-document and card data must only be entered on the secure provider checkout page.' });
      const priced = quoteLine(input.items[0], parameters);
      const subtotal = priced.line.lineTotal;
      const quote: StoredQuote = {
        id: makeId('ps_quote'), providerSlug: targetSlug, locationId: input.locationId, lines: [priced.line], subtotal,
        fees: [], totalFees: 0, discounts: priced.discount ? [{ description: 'Sandbox child fare discount', amount: priced.discount }] : [],
        totalDiscount: priced.discount, total: subtotal - priced.discount, currency: 'UZS',
        expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(), estimatedDurationMinutes: priced.context.durationMinutes,
        parameters: priced.context, createdAtMs: Date.now()
      };
      quotes.set(quote.id, quote);
      return res.json(quote);
    } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : String(error) }); }
  });

  app.post('/actions', (req, res) => {
    try {
      expireHolds();
      const input = req.body as CreateActionInput;
      const key = req.header('idempotency-key') || input.idempotencyKey;
      if (!key || key.length > 200 || input.userConfirmed !== true || !input.quoteId) return res.status(400).json({ message: 'A valid idempotency key, quoteId, and explicit user confirmation are required.' });
      const previousId = idempotency.get(key);
      if (previousId) return res.json(actions.get(previousId));
      const quote = quotes.get(input.quoteId);
      if (!quote || Date.parse(quote.expiresAt) <= Date.now()) return res.status(409).json({ message: 'Quote expired. Search availability and request a fresh quote.' });
      if (quote.consumedByActionId) return res.status(409).json({ message: 'Quote was already consumed by another action. Request a fresh quote.' });
      const targetSlug = input.providerSlug || quote.providerSlug || process.env.PROVIDER_SLUG || SLUG;
      if (containsSensitiveIdentityData(input.parameters)) return res.status(400).json({ message: 'Do not send passport or bank-card data through AI/MCP. Use the secure provider handoff.' });
      const context = quote.parameters || {};
      const resolved = POYEZ_TRIPS.find(value => value.id === context.tripId);
      const car = resolved?.cars.find(value => value.id === context.carId);
      if (!resolved || !car) return res.status(409).json({ message: 'Quoted trip inventory no longer exists.' });
      const seatNumbers = pickSeats(resolved, context.date, car, quote.lines[0].quantity, { ...context, selectedSeatNumbers: context.selectedSeatNumbers });
      const now = new Date().toISOString();
      const holdExpiresAt = new Date(Date.now() + HOLD_TTL_MS).toISOString();
      const id = makeId('ps_action');
      const externalActionId = makeId('PS');
      const selectedSeats = seatNumbers.map(number => ({ carId: car.id, carNumber: car.number, seatNumber: number, level: seatLevel(number, car.class) }));
      const keys = seatNumbers.map(number => seatKey(resolved.id, context.date, car.id, number));
      for (const seat of keys) seats.set(seat, { actionId: id, state: 'HELD', expiresAt: Date.parse(holdExpiresAt) });
      const checkoutUrl = `${publicBase}/pay/${encodeURIComponent(externalActionId)}`;
      const action: StoredAction = {
        id, publicId: `ZY-RAIL-${crypto.randomInt(10000, 99999)}`, providerSlug: targetSlug, providerName: PROVIDER_NAME,
        externalActionId, quoteId: quote.id, locationId: input.locationId, status: ActionStatus.CREATED,
        sandboxState: 'AWAITING_PASSENGER_DETAILS', holdExpiresAt, seatKeys: keys, selectedSeats,
        nextAction: { type: 'OPEN_URL', url: checkoutUrl, label: 'Yo‘lovchi ma’lumotlari va sandbox to‘lov', expiresAt: holdExpiresAt },
        lines: quote.lines, subtotal: quote.subtotal, fees: quote.totalFees, discount: quote.totalDiscount, total: quote.total, currency: quote.currency,
        customer: input.customer, destination: input.destination, fulfillmentType: 'DIGITAL_TICKET', paymentMethod: input.paymentMethod || 'provider_checkout',
        paymentStatus: PaymentStatus.PENDING, paymentUrl: checkoutUrl, idempotencyKey: key,
        parameters: { ...context, selectedSeatNumbers: seatNumbers }, metadata: { sandbox: true, noRealTicket: true, sensitiveDetailsCollectedByProviderOnly: true },
        timeline: [{ id: makeId('ps_timeline'), status: ActionStatus.CREATED, description: 'Sandbox seats held; secure passenger handoff required.', source: 'AI_AGENT', createdAt: now }],
        createdAt: now, updatedAt: now
      };
      actions.set(id, action);
      quote.consumedByActionId = id;
      actionAliases.set(externalActionId, id);
      actionAliases.set(action.publicId, id);
      idempotency.set(key, id);
      checkoutTokens.set(id, crypto.randomBytes(24).toString('base64url'));
      return res.status(201).json(action);
    } catch (error) { return res.status(409).json({ message: error instanceof Error ? error.message : String(error) }); }
  });

  app.get('/actions/:id', (req, res) => {
    expireHolds();
    const action = findAction(req.params.id);
    return action ? res.json(action) : res.status(404).json({ message: 'Action not found.' });
  });

  app.post('/actions/:id/cancel', async (req, res) => {
    expireHolds();
    const action = findAction(req.params.id);
    if (!action) return res.status(404).json({ message: 'Action not found.' });
    if (action.sandboxState === 'CANCELLED' || action.sandboxState === 'EXPIRED') return res.json({ success: true, actionId: action.publicId, previousStatus: action.status, newStatus: action.status, message: 'Action was already cancelled.', refundInitiated: false });
    if (action.sandboxState === 'COMPLETED') return res.status(409).json({ message: 'Completed ticket action cannot be cancelled.' });
    const previousStatus = action.status;
    const paid = action.paymentStatus === PaymentStatus.PAID;
      releaseSeats(action);
    action.status = ActionStatus.CANCELLED;
    action.sandboxState = 'CANCELLED';
    action.paymentStatus = paid ? PaymentStatus.REFUNDED : PaymentStatus.PENDING;
    action.updatedAt = new Date().toISOString();
    action.timeline?.push({ id: makeId('ps_timeline'), status: ActionStatus.CANCELLED, description: String(req.body?.reason || 'Sandbox booking cancelled.'), source: 'USER', createdAt: action.updatedAt });
    const delivery = await sendWebhook(action, paid ? 'payment.refunded' : 'action.cancelled');
    if (!delivery.ok && process.env.NODE_ENV === 'production') {
      return res.status(502).json({ message: `Action cancelled locally, but Zayuno webhook delivery failed${delivery.status ? ` with HTTP ${delivery.status}` : ''}.`, actionId: action.publicId });
    }
    return res.json({ success: true, actionId: action.publicId, previousStatus, newStatus: action.status, message: 'Sandbox booking cancelled.', refundInitiated: paid });
  });

  app.get('/actions/:id/payment-options', (req, res) => {
    expireHolds();
    const action = findAction(req.params.id);
    if (!action) return res.status(404).json({ message: 'Action not found.' });
    if (['CANCELLED', 'EXPIRED', 'COMPLETED'].includes(action.sandboxState)) return res.json([]);
    return res.json([{ id: 'poyez_sandbox_checkout', name: 'Poyez sandbox checkout', type: PaymentMethodType.EXTERNAL_PROVIDER, isOnline: true, checkoutUrl: action.paymentUrl, instructions: 'No real card details are collected.', supportedCurrencies: ['UZS'], metadata: { sandbox: true, expiresAt: action.holdExpiresAt } }]);
  });

  function checkoutPage(action: StoredAction): string {
    const remaining = Math.max(0, Math.ceil((Date.parse(action.holdExpiresAt) - Date.now()) / 1000));
    const seatsText = action.selectedSeats.map(value => `${value.carNumber}-vagon, ${value.seatNumber}-joy (${value.level === 'LOWER' ? 'pastki' : value.level === 'UPPER' ? 'yuqori' : 'o‘rindiq'})`).join(', ');
    const trip = POYEZ_TRIPS.find(value => value.id === action.parameters?.tripId);
    const car = trip?.cars.find(value => value.id === action.parameters?.carId);
    const selected = new Set(['CANCELLED', 'EXPIRED'].includes(action.sandboxState) ? [] : action.selectedSeats.map(value => value.seatNumber));
    const free = trip && car ? new Set(availableSeats(trip, action.parameters?.date, car)) : new Set<number>();
    const seatMap = car ? `<section><h2>${html(car.number)}-vagon · ${html(car.title)}</h2><div class="legend"><span><i class="seat free"></i>Bo‘sh</span><span><i class="seat selected"></i>Sizniki</span><span><i class="seat occupied"></i>Band</span></div><div class="seatmap">${Array.from({ length: car.seatCount }, (_, index) => {
      const number = index + 1;
      const state = selected.has(number) ? 'selected' : free.has(number) ? 'free' : 'occupied';
      return `<div class="seat ${state}" title="${number}-joy">${number}<small>${seatLevel(number, car.class) === 'LOWER' ? 'P' : seatLevel(number, car.class) === 'UPPER' ? 'Y' : ''}</small></div>`;
    }).join('')}</div></section>` : '';
    const csrf = html(checkoutTokens.get(action.id) || '');
    const detailsButton = action.sandboxState === 'AWAITING_PASSENGER_DETAILS' ? `<form method="post" action="/pay/${html(action.externalActionId)}/details"><input type="hidden" name="csrfToken" value="${csrf}"><button>Test yo‘lovchi ma’lumotlarini tasdiqlash</button></form>` : '';
    const payButton = action.sandboxState === 'AWAITING_PAYMENT' ? `<form method="post" action="/pay/${html(action.externalActionId)}/success"><input type="hidden" name="csrfToken" value="${csrf}"><button>Sandbox to‘lovni tasdiqlash</button></form>` : '';
    const cancelButton = ['AWAITING_PASSENGER_DETAILS', 'AWAITING_PAYMENT'].includes(action.sandboxState) ? `<form method="post" action="/pay/${html(action.externalActionId)}/cancel"><input type="hidden" name="csrfToken" value="${csrf}"><button class="danger">Bronni bekor qilish</button></form>` : '';
    return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Poyez Sandbox Checkout</title><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui;background:#06111f;color:#eaf7ff;padding:24px}.card{max-width:820px;margin:auto;background:#102238;border:1px solid #28506b;border-radius:22px;padding:28px}.badge{display:inline-block;background:#f59e0b;color:#111827;padding:7px 12px;border-radius:999px;font-weight:800}.warn{background:#3a2414;padding:14px;border-radius:12px;color:#ffd49a}.row{padding:12px 0;border-bottom:1px solid #29435a}.seatmap{display:grid;grid-template-columns:repeat(8,minmax(38px,1fr));gap:8px;padding:18px;background:#081827;border-radius:16px}.seat{min-height:44px;border-radius:9px;display:flex;align-items:center;justify-content:center;gap:2px;font-weight:800;border:1px solid #3b6079}.seat small{font-size:9px}.seat.free{background:#173149;color:#b9d7e9}.seat.selected{background:#22c55e;color:#052e16;border-color:#86efac}.seat.occupied{background:#27313b;color:#657383}.legend{display:flex;gap:16px;flex-wrap:wrap;margin:10px 0}.legend span{display:flex;align-items:center;gap:6px}.legend .seat{width:18px;min-height:18px;border-radius:5px}button{margin-top:14px;width:100%;padding:14px;border:0;border-radius:12px;background:#16c79a;color:#05251d;font-weight:800;cursor:pointer}.danger{background:#fb7185;color:#30050d}code{color:#9de7ff}@media(max-width:600px){body{padding:10px}.card{padding:18px}.seatmap{grid-template-columns:repeat(6,minmax(34px,1fr));gap:6px}}</style></head><body><main class="card"><span class="badge">SANDBOX DEMO</span><h1>Poyez Sandbox Checkout</h1><p class="warn">${html(DISCLAIMER)} Haqiqiy pasport yoki karta ma’lumotini kiritmang.</p><div class="row"><b>Action:</b> <code>${html(action.publicId)}</code></div><div class="row"><b>Yo‘nalish:</b> ${html(action.parameters?.origin)} → ${html(action.parameters?.destination)}</div><div class="row"><b>Reys:</b> ${html(action.parameters?.trainNumber)}, ${html(action.parameters?.date)} ${html(action.parameters?.departureTime)}</div><div class="row"><b>Joy:</b> ${html(seatsText)}</div><div class="row"><b>Jami:</b> ${action.total.toLocaleString('uz-UZ')} UZS</div><div class="row"><b>Holat:</b> ${html(action.sandboxState)} · <b>Bron:</b> ${remaining} soniya</div>${seatMap}${detailsButton}${payButton}${cancelButton}</main></body></html>`;
  }

  app.get('/pay/:id', (req, res) => {
    expireHolds();
    const action = findAction(req.params.id);
    return action ? res.type('html').send(checkoutPage(action)) : res.status(404).send('Sandbox booking not found.');
  });
  app.get('/pay/:id/details', (req, res) => {
    return res.redirect(303, `/pay/${encodeURIComponent(req.params.id)}`);
  });
  app.post('/pay/:id/details', async (req, res) => {
    expireHolds();
    const action = findAction(req.params.id);
    if (!action) return res.status(404).send('Sandbox booking not found.');
    if (!checkoutTokens.get(action.id) || req.body?.csrfToken !== checkoutTokens.get(action.id)) return res.status(403).send('Invalid checkout request token.');
    if (action.sandboxState !== 'AWAITING_PASSENGER_DETAILS') return res.status(409).send('Passenger handoff is already completed or booking is terminal.');
    action.sandboxState = 'AWAITING_PAYMENT';
    action.status = ActionStatus.AWAITING_PAYMENT;
    action.updatedAt = new Date().toISOString();
    action.timeline?.push({ id: makeId('ps_timeline'), status: ActionStatus.AWAITING_PAYMENT, description: 'Synthetic sandbox passenger details accepted. No identity data stored.', source: 'USER', createdAt: action.updatedAt });
    await sendWebhook(action, 'action.awaiting_payment');
    return res.redirect(303, `/pay/${encodeURIComponent(action.externalActionId || action.id)}`);
  });
  app.get('/pay/:id/success', (req, res) => {
    return res.redirect(303, `/pay/${encodeURIComponent(req.params.id)}`);
  });
  app.post('/pay/:id/success', async (req, res) => {
    expireHolds();
    const action = findAction(req.params.id);
    if (!action) return res.status(404).send('Sandbox booking not found.');
    if (!checkoutTokens.get(action.id) || req.body?.csrfToken !== checkoutTokens.get(action.id)) return res.status(403).send('Invalid checkout request token.');
    if (action.sandboxState !== 'AWAITING_PAYMENT') return res.status(409).send('Payment cannot be applied in the current state.');
    action.sandboxState = 'CONFIRMED';
    action.status = ActionStatus.CONFIRMED;
    action.paymentStatus = PaymentStatus.PAID;
    action.updatedAt = new Date().toISOString();
    for (const key of action.seatKeys) {
      const lock = seats.get(key);
      if (lock?.actionId === action.id) seats.set(key, { actionId: action.id, state: 'SOLD', expiresAt: Number.MAX_SAFE_INTEGER });
    }
    action.timeline?.push({ id: makeId('ps_timeline'), status: ActionStatus.CONFIRMED, description: 'Sandbox payment simulated and test ticket confirmed.', source: 'PROVIDER_WEBHOOK', createdAt: action.updatedAt });
    await sendWebhook(action, 'payment.received');
    return res.redirect(303, `/pay/${encodeURIComponent(action.externalActionId || action.id)}`);
  });
  app.get('/pay/:id/cancel', (req, res) => {
    return res.redirect(303, `/pay/${encodeURIComponent(req.params.id)}`);
  });
  app.post('/pay/:id/cancel', async (req, res) => {
    const action = findAction(req.params.id);
    if (!action) return res.status(404).send('Sandbox booking not found.');
    if (!checkoutTokens.get(action.id) || req.body?.csrfToken !== checkoutTokens.get(action.id)) return res.status(403).send('Invalid checkout request token.');
    if (!['AWAITING_PASSENGER_DETAILS', 'AWAITING_PAYMENT'].includes(action.sandboxState)) return res.status(409).send('Booking is already terminal.');
    releaseSeats(action);
    action.sandboxState = 'CANCELLED';
    action.status = ActionStatus.CANCELLED;
    action.updatedAt = new Date().toISOString();
    await sendWebhook(action, 'action.cancelled');
    return res.redirect(303, `/pay/${encodeURIComponent(action.externalActionId || action.id)}`);
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Poyez Sandbox] request failed:', error instanceof Error ? error.message : String(error));
    if (res.headersSent) return _next(error);
    return res.status(500).json({ message: 'Sandbox provider request failed safely.' });
  });
  return app;
}
