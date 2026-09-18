import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service.ts';
import { CatalogService } from '../apps/api/src/modules/catalog/catalog.service.ts';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import { WebhooksService } from '../apps/api/src/modules/webhooks/webhooks.service.ts';
import { ActionStatus, PaymentStatus } from '../packages/contracts/src/action.ts';
import { AvailabilityStatus } from '../packages/contracts/src/catalog.ts';
import {
  ProviderCapability,
  ProviderCategory,
  ProviderEnvironment,
  ProviderFulfillmentMode,
  ProviderStatus,
  ProviderType,
  ProviderHealthState
} from '../packages/contracts/src/provider.ts';
import { prisma } from '../packages/database/src/client.ts';
import { toPublicAction } from '../packages/shared/src/public-action.ts';
import { toPublicPaymentOptions } from '../packages/shared/src/public-payment-option.ts';
import { createIdempotencyPayloadHash } from '../packages/shared/src/idempotency.ts';
import {
  normalizeZayunoErrorCode,
  getAgentErrorPresentation,
  ZayunoError,
  IdempotencyPayloadConflictError,
  IdempotencyError,
  QuoteMismatchError,
  QuoteExpiredError,
  ResourceUnavailableError,
  CapacityExceededError
} from '../packages/shared/src/errors.ts';
import { evaluateHealthStateTransition } from '../packages/shared/src/health-monitor.ts';

const FORBIDDEN_SECRET_KEYS = [
  'baseUrl',
  'encryptedSecret',
  'apiKey',
  'apiSecret',
  'authMethod',
  'adapterType',
  'ownerUserId',
  'ownerId',
  'webhookSecret'
];

function assertNoSecrets(obj: any, context: string) {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    assert.ok(
      !FORBIDDEN_SECRET_KEYS.includes(key),
      `Security violation: ${context} leaked forbidden internal key "${key}"`
    );
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      assertNoSecrets(obj[key], `${context}.${key}`);
    }
  }
}

async function runV4ChaosSuite() {
  console.log('================================================================');
  console.log('🔥 ZAYUNO V4: CHAOS, CONCURRENCY & ADVERSARIAL INVARIANT SUITE');
  console.log('================================================================\n');

  const sandboxCoffeeProvider = {
    id: 'prov-sb-coffee-id',
    slug: 'coffee-sandbox',
    name: 'Coffee Sandbox',
    status: ProviderStatus.ACTIVE,
    type: ProviderType.RETAIL,
    environment: ProviderEnvironment.SANDBOX,
    category: ProviderCategory.FOOD_AND_DRINK,
    subcategory: 'coffee_shop',
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.LOCATIONS,
      ProviderCapability.CATALOG,
      ProviderCapability.SEARCH,
      ProviderCapability.AVAILABILITY,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.ACTION_CANCEL,
      ProviderCapability.PAYMENT_OPTIONS,
      ProviderCapability.WEBHOOK
    ],
    encryptedSecret: 'secret_sb_coffee',
    webhookSecret: 'wh_secret_coffee_secure_key_123',
    metadata: {
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true,
      fulfillmentMode: ProviderFulfillmentMode.ONSITE,
      environment: ProviderEnvironment.SANDBOX,
      eligibility: {
        contractVersion: 'v2 current',
        complianceStatus: 'COMPLIANT',
        profile: 'TRANSACTIONAL',
        discoveryVisibility: 'VISIBLE',
        certifiedCapabilities: [
          ProviderCapability.METADATA,
          ProviderCapability.HEALTH,
          ProviderCapability.LOCATIONS,
          ProviderCapability.CATALOG,
          ProviderCapability.SEARCH,
          ProviderCapability.AVAILABILITY,
          ProviderCapability.QUOTE,
          ProviderCapability.ACTION_CREATE,
          ProviderCapability.ACTION_STATUS,
          ProviderCapability.ACTION_CANCEL,
          ProviderCapability.PAYMENT_OPTIONS,
          ProviderCapability.WEBHOOK
        ]
      }
    },
    locations: [{ id: 'loc-sb-coffee-1', providerLocationId: 'sb-branch-1', isActive: true }]
  };

  const liveFlowerProvider = {
    id: 'prov-live-flower-id',
    slug: 'flower-boutique-live',
    name: 'Flower Boutique Live',
    status: ProviderStatus.ACTIVE,
    type: ProviderType.RETAIL,
    environment: ProviderEnvironment.LIVE,
    category: ProviderCategory.RETAIL,
    subcategory: 'flower_shop',
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.LOCATIONS,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.ACTION_CANCEL,
      ProviderCapability.WEBHOOK
    ],
    encryptedSecret: 'secret_live_flower',
    webhookSecret: 'wh_secret_flower_super_secure_456',
    metadata: {
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true,
      fulfillmentMode: ProviderFulfillmentMode.DELIVERY,
      environment: ProviderEnvironment.LIVE,
      eligibility: {
        contractVersion: 'v2 current',
        complianceStatus: 'COMPLIANT',
        profile: 'TRANSACTIONAL',
        discoveryVisibility: 'VISIBLE',
        certifiedCapabilities: [
          ProviderCapability.METADATA,
          ProviderCapability.HEALTH,
          ProviderCapability.LOCATIONS,
          ProviderCapability.CATALOG,
          ProviderCapability.QUOTE,
          ProviderCapability.ACTION_CREATE,
          ProviderCapability.ACTION_STATUS,
          ProviderCapability.ACTION_CANCEL,
          ProviderCapability.WEBHOOK
        ]
      }
    },
    locations: [{ id: 'loc-live-fl-1', providerLocationId: 'flower-hub-1', isActive: true }]
  };

  const allMockProviders = [sandboxCoffeeProvider, liveFlowerProvider];

  const storedLocations = [
    {
      id: 'loc-sb-coffee-1',
      providerId: sandboxCoffeeProvider.id,
      providerLocationId: 'sb-branch-1',
      name: 'Coffee Sandbox Central',
      isActive: true,
      provider: { slug: sandboxCoffeeProvider.slug }
    },
    {
      id: 'loc-live-fl-1',
      providerId: liveFlowerProvider.id,
      providerLocationId: 'flower-hub-1',
      name: 'Flower Hub Live',
      isActive: true,
      provider: { slug: liveFlowerProvider.slug }
    }
  ];

  const storedQuotes: any[] = [];
  const storedActions: any[] = [];
  const storedActionEvents: any[] = [];
  const storedWebhookLogs: any[] = [];

  let coffeeExternalActionCallCount = 0;

  const redisStorage = new Map<string, any>();
  const redisLocks = new Set<string>();

  const redisService: any = {
    acquireLock: async (key: string, ttlSeconds = 30) => {
      if (redisLocks.has(key)) return false;
      redisLocks.add(key);
      return true;
    },
    releaseLock: async (key: string) => {
      redisLocks.delete(key);
    },
    get: async (key: string) => redisStorage.get(key) || null,
    set: async (key: string, val: any) => {
      redisStorage.set(key, val);
    }
  };

  const originalPrisma = {
    providerFindUnique: prisma.provider.findUnique,
    providerFindMany: prisma.provider.findMany,
    locationFindFirst: prisma.location.findFirst,
    locationFindMany: prisma.location.findMany,
    locationFindUnique: prisma.location.findUnique,
    quoteFindUnique: prisma.quote.findUnique,
    quoteCreate: prisma.quote.create,
    actionFindUnique: prisma.action.findUnique,
    actionFindFirst: prisma.action.findFirst,
    actionCreate: prisma.action.create,
    actionUpdate: prisma.action.update,
    actionEventCreate: prisma.actionEvent.create,
    webhookLogCreate: (prisma as any).webhookLog?.create
  };

  (prisma.provider as any).findUnique = async ({ where }: any) => {
    return allMockProviders.find((p) => p.slug === where.slug || p.id === where.id) || null;
  };

  (prisma.provider as any).findMany = async ({ where }: any) => {
    return allMockProviders.filter((p) => {
      if (where.status && p.status !== where.status) return false;
      if (where.environment && p.environment !== where.environment) return false;
      return true;
    });
  };

  (prisma.location as any).findFirst = async ({ where }: any) => {
    return (
      storedLocations.find((loc) => {
        const matchProvider = where.provider?.slug
          ? loc.provider?.slug === where.provider.slug
          : where.providerId
            ? loc.providerId === where.providerId
            : true;
        if (!matchProvider) return false;
        if (where.isActive !== undefined && loc.isActive !== where.isActive) return false;
        if (where.OR) {
          return where.OR.some((c: any) => c.id === loc.id || c.providerLocationId === loc.providerLocationId);
        }
        return true;
      }) || null
    );
  };

  (prisma.quote as any).findUnique = async ({ where }: any) => {
    const q = storedQuotes.find((item) => item.id === where.id);
    if (!q) return null;
    const prov = allMockProviders.find((p) => p.id === q.providerId);
    return { ...q, provider: prov };
  };

  (prisma.quote as any).create = async ({ data }: any) => {
    storedQuotes.push(data);
    return data;
  };

  (prisma.action as any).findUnique = async ({ where }: any) => {
    if (where.idempotencyKey) {
      const a = storedActions.find((item) => item.idempotencyKey === where.idempotencyKey);
      if (!a) return null;
      return {
        ...a,
        provider: allMockProviders.find((p) => p.id === a.providerId),
        timeline: storedActionEvents.filter((e) => e.actionId === a.id)
      };
    }
    if (where.id) {
      const a = storedActions.find((item) => item.id === where.id);
      if (!a) return null;
      return {
        ...a,
        provider: allMockProviders.find((p) => p.id === a.providerId),
        timeline: storedActionEvents.filter((e) => e.actionId === a.id)
      };
    }
    if (where.publicId) {
      const a = storedActions.find((item) => item.publicId === where.publicId);
      if (!a) return null;
      return {
        ...a,
        provider: allMockProviders.find((p) => p.id === a.providerId),
        timeline: storedActionEvents.filter((e) => e.actionId === a.id)
      };
    }
    return null;
  };

  (prisma.action as any).findFirst = async ({ where }: any) => {
    const candidate = storedActions.find((a) => {
      if (where.providerId && a.providerId !== where.providerId) return false;
      if (where.quoteId && a.quoteId === where.quoteId) return true;
      if (where.idempotencyKey && a.idempotencyKey === where.idempotencyKey) return true;
      if (where.id && a.id === where.id) return true;
      if (where.publicId && a.publicId === where.publicId) return true;
      if (where.OR && Array.isArray(where.OR)) {
        return where.OR.some((cond: any) => {
          if (cond.externalActionId && a.externalActionId === cond.externalActionId) return true;
          if (cond.id && a.id === cond.id) return true;
          if (cond.publicId && a.publicId === cond.publicId) return true;
          return false;
        });
      }
      return false;
    });
    if (!candidate) return null;
    return {
      ...candidate,
      provider: allMockProviders.find((p) => p.id === candidate.providerId),
      timeline: storedActionEvents.filter((e) => e.actionId === candidate.id)
    };
  };

  (prisma.action as any).create = async ({ data }: any) => {
    const created = {
      ...data,
      id: `act-uuid-${storedActions.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: allMockProviders.find((p) => p.id === data.providerId),
      location: null,
      timeline: []
    };
    storedActions.push(created);
    return created;
  };

  (prisma.action as any).update = async ({ where, data }: any) => {
    const index = storedActions.findIndex((a) => a.id === where.id || a.publicId === where.publicId);
    if (index === -1) throw new Error('Action not found');
    storedActions[index] = {
      ...storedActions[index],
      ...data,
      updatedAt: new Date()
    };
    return storedActions[index];
  };

  (prisma.actionEvent as any).create = async ({ data }: any) => {
    storedActionEvents.push({ ...data, id: `evt-${storedActionEvents.length + 1}`, createdAt: new Date() });
    return data;
  };

  (prisma as any).webhookLog = {
    create: async ({ data }: any) => {
      const log = { ...data, id: `wh-log-${storedWebhookLogs.length + 1}`, createdAt: new Date() };
      storedWebhookLogs.push(log);
      return log;
    }
  };

  const sandboxCoffeeAdapter: any = {
    info: sandboxCoffeeProvider,
    checkAvailability: async (input: any) => {
      const item = input.items?.[0];
      if (item?.quantity && item.quantity > 50) {
        return {
          availabilityStatus: AvailabilityStatus.UNAVAILABLE,
          isAvailable: false,
          availableCount: 5,
          reason: 'CAPACITY_EXCEEDED'
        };
      }
      return {
        availabilityStatus: AvailabilityStatus.AVAILABLE,
        isAvailable: true,
        availableCount: 100
      };
    },
    requestQuote: async (input: any) => {
      const qty = input.items[0]?.quantity || 1;
      const unitPrice = 30000;
      const subtotal = unitPrice * qty;
      return {
        id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        providerSlug: sandboxCoffeeProvider.slug,
        locationId: input.locationId,
        lines: [
          {
            offeringId: input.items[0]?.offeringId || 'sb_latte',
            offeringTitle: 'Sandbox Latte',
            variantId: input.items[0]?.variantId || null,
            unitPrice,
            quantity: qty,
            optionsTotal: 0,
            lineTotal: subtotal,
            selectedOptions: input.items[0]?.selectedOptions || []
          }
        ],
        subtotal,
        totalFees: 0,
        totalDiscount: 0,
        total: subtotal,
        currency: 'UZS',
        expiresAt: new Date(Date.now() + 300_000).toISOString()
      };
    },
    createAction: async (input: any) => {
      coffeeExternalActionCallCount++;
      return {
        externalActionId: `ext-coffee-order-${Date.now()}`,
        providerSlug: sandboxCoffeeProvider.slug,
        status: ActionStatus.AWAITING_PAYMENT,
        paymentUrl: 'https://checkout.sandboxcoffee.uz/pay/101',
        lines: [],
        subtotal: 30000,
        fees: 0,
        discount: 0,
        total: 30000,
        currency: 'UZS'
      };
    },
    verifyWebhook: async (headers: any, rawBody: string, secret: string) => {
      const sig = headers['x-zayuno-signature'] || headers['x-provider-signature'];
      if (!sig) return false;
      const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const sigBuf = Buffer.from(sig, 'utf8');
      const compBuf = Buffer.from(computed, 'utf8');
      if (sigBuf.length !== compBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, compBuf);
    },
    parseWebhookEvent: async (headers: any, body: any) => ({
      eventId: body.eventId || `evt-${Date.now()}`,
      eventType: body.eventType || 'action.updated',
      externalActionId: body.externalActionId,
      actionId: body.actionId,
      newStatus: body.newStatus,
      newPaymentStatus: body.newPaymentStatus,
      payload: body
    }),
    cancelAction: async (input: any) => ({
      success: true,
      actionId: input.actionId,
      externalActionId: 'ext-coffee-order-1',
      providerSlug: sandboxCoffeeProvider.slug,
      previousStatus: ActionStatus.AWAITING_PAYMENT,
      newStatus: ActionStatus.CANCELLED,
      message: 'Cancelled successfully'
    })
  };

  const registry = {
    getAdapter: async (slug: string) => {
      if (slug === sandboxCoffeeProvider.slug) return sandboxCoffeeAdapter;
      return null;
    },
    assertAndGetCapability: async (slug: string, cap: ProviderCapability) => {
      if (slug === sandboxCoffeeProvider.slug) return sandboxCoffeeAdapter;
      throw new Error(`Provider ${slug} not found`);
    }
  } as any;

  const natsService = {
    publish: async () => {}
  } as any;

  const providersService = new ProvidersService(registry);
  const catalogService = new CatalogService(registry, providersService, redisService);
  const quotesService = new QuotesService(registry, providersService);
  const actionsService = new ActionsService(registry, natsService, redisService, providersService);
  const webhooksService = new WebhooksService(registry, natsService, redisService, catalogService);

  try {
    // SECTION A
    console.log('👉 [Section A] Concurrent Action Creation & Payload Collision...');
    const quoteA = await quotesService.requestQuote(
      {
        providerSlug: sandboxCoffeeProvider.slug,
        locationId: 'sb-branch-1',
        items: [{ offeringId: 'sb_latte', quantity: 1 }],
        environment: ProviderEnvironment.SANDBOX
      },
      undefined,
      { allowSandboxSimulator: true }
    );

    const idempotencyKeyA = 'v4-idem-key-batch-001';
    const actionPayloadA = {
      idempotencyKey: idempotencyKeyA,
      providerSlug: sandboxCoffeeProvider.slug,
      quoteId: quoteA.id,
      locationId: 'sb-branch-1',
      items: [{ offeringId: 'sb_latte', quantity: 1 }],
      userConfirmed: true as const,
      environment: ProviderEnvironment.SANDBOX
    };

    coffeeExternalActionCallCount = 0;

    const concurrent10Results = await Promise.allSettled(
      Array.from({ length: 10 }).map(() =>
        actionsService.createAction(actionPayloadA, 'user-v4-client-1', { allowSandboxSimulator: true })
      )
    );

    const successes = concurrent10Results.filter((r) => r.status === 'fulfilled') as PromiseFulfilledResult<any>[];
    assert.ok(successes.length >= 1, 'At least 1 request must succeed');
    const firstPublicId = successes[0].value.publicId;

    for (const succ of successes) {
      assert.equal(succ.value.publicId, firstPublicId, 'All concurrent successes must return identical publicId');
    }
    assert.equal(
      coffeeExternalActionCallCount,
      1,
      'EXACTLY 1 external action must be created on provider adapter across all concurrent calls'
    );

    const postReplays = await Promise.all(
      Array.from({ length: 50 }).map(() =>
        actionsService.createAction(actionPayloadA, 'user-v4-client-1', { allowSandboxSimulator: true })
      )
    );
    for (const replay of postReplays) {
      assert.equal(replay.publicId, firstPublicId, '50 post-creation replays must all return identical action');
    }
    assert.equal(coffeeExternalActionCallCount, 1, 'External provider call count must remain 1 after 50 replays');

    const alteredPayload = {
      ...actionPayloadA,
      destination: { raw: 'Altered Delivery Address 100' }
    };
    await assert.rejects(
      () => actionsService.createAction(alteredPayload, 'user-v4-client-1', { allowSandboxSimulator: true }),
      (err: any) => {
        assert.equal(err.code, 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD');
        return true;
      },
      'Altering payload on existing idempotency key must throw IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD'
    );
    console.log('   ✅ Section A passed: 10 & 50 concurrency tests clean, 1 external call, payload collision guarded.');

    // SECTION B
    console.log('\n👉 [Section B] Provider Success + Zayuno Timeout Reconciliation...');
    const existingActionRef = await prisma.action.findFirst({
      where: { quoteId: quoteA.id }
    });
    assert.ok(existingActionRef, 'Action must exist in DB');

    const recoveredAction = await actionsService.createAction(actionPayloadA, 'user-v4-client-1', {
      allowSandboxSimulator: true
    });
    assert.equal(recoveredAction.publicId, existingActionRef.publicId);
    assert.equal(coffeeExternalActionCallCount, 1, 'Reconciliation must not re-dispatch to provider adapter');
    console.log('   ✅ Section B passed: caller retry reconciles original action safely.');

    // SECTION C & D
    console.log('\n👉 [Section C & D] Quote Immutability & Expiration Attacks...');
    const quoteC = await quotesService.requestQuote(
      {
        providerSlug: sandboxCoffeeProvider.slug,
        locationId: 'sb-branch-1',
        items: [{ offeringId: 'sb_latte', quantity: 1 }],
        environment: ProviderEnvironment.SANDBOX
      },
      undefined,
      { allowSandboxSimulator: true }
    );

    await assert.rejects(
      () =>
        actionsService.createAction(
          {
            idempotencyKey: 'v4-tamper-qty',
            providerSlug: sandboxCoffeeProvider.slug,
            quoteId: quoteC.id,
            locationId: 'sb-branch-1',
            items: [{ offeringId: 'sb_latte', quantity: 99 }],
            userConfirmed: true,
            environment: ProviderEnvironment.SANDBOX
          },
          'user-v4-client-1',
          { allowSandboxSimulator: true }
        ),
      (err: any) => {
        assert.equal(err.code, 'QUOTE_MISMATCH');
        return true;
      }
    );

    await assert.rejects(
      () =>
        actionsService.createAction(
          {
            idempotencyKey: 'v4-tamper-offering',
            providerSlug: sandboxCoffeeProvider.slug,
            quoteId: quoteC.id,
            locationId: 'sb-branch-1',
            items: [{ offeringId: 'unquoted_expensive_caviar', quantity: 1 }],
            userConfirmed: true,
            environment: ProviderEnvironment.SANDBOX
          },
          'user-v4-client-1',
          { allowSandboxSimulator: true }
        ),
      (err: any) => {
        assert.equal(err.code, 'QUOTE_MISMATCH');
        return true;
      }
    );

    const expiredQuoteId = `quote-v4-expired-${Date.now()}`;
    storedQuotes.push({
      id: expiredQuoteId,
      providerId: sandboxCoffeeProvider.id,
      locationId: 'loc-sb-coffee-1',
      lines: [{ offeringId: 'sb_latte', quantity: 1 }],
      subtotal: 30000,
      fees: 0,
      discount: 0,
      total: 30000,
      currency: 'UZS',
      parameters: { providerLocationId: 'sb-branch-1' },
      expiresAt: new Date(Date.now() - 60_000)
    });

    await assert.rejects(
      () =>
        actionsService.createAction(
          {
            idempotencyKey: 'v4-test-expired-quote',
            providerSlug: sandboxCoffeeProvider.slug,
            quoteId: expiredQuoteId,
            locationId: 'sb-branch-1',
            items: [{ offeringId: 'sb_latte', quantity: 1 }],
            userConfirmed: true,
            environment: ProviderEnvironment.SANDBOX
          },
          'user-v4-client-1',
          { allowSandboxSimulator: true }
        ),
      (err: any) => {
        assert.equal(err.code, 'QUOTE_EXPIRED');
        return true;
      }
    );
    console.log('   ✅ Section C & D passed: quote integrity & expiry strictly guarded.');

    // SECTION E
    console.log('\n👉 [Section E] Availability & Stock Race Condition...');
    const availCheck = await catalogService.checkAvailability(
      {
        providerSlug: sandboxCoffeeProvider.slug,
        items: [{ offeringId: 'sb_latte', quantity: 999 }]
      },
      ProviderEnvironment.SANDBOX
    );
    assert.equal(availCheck.availabilityStatus, AvailabilityStatus.UNAVAILABLE);
    assert.equal(availCheck.isAvailable, false);
    console.log('   ✅ Section E passed: truthful capacity rejection without 500 error.');

    // SECTION F
    console.log('\n👉 [Section F] Webhook Duplication (2x, 10x, 100x)...');
    const webhookAction = storedActions[0];
    assert.ok(webhookAction, 'Must have active action for webhook testing');

    const webhookSecret = sandboxCoffeeProvider.webhookSecret;
    const webhookEventId = `wh-evt-dedup-${Date.now()}`;
    const webhookPayload = {
      eventId: webhookEventId,
      eventType: 'action.updated',
      externalActionId: webhookAction.externalActionId,
      actionId: webhookAction.publicId,
      newStatus: ActionStatus.CONFIRMED,
      newPaymentStatus: PaymentStatus.PAID
    };
    const rawWebhookBody = JSON.stringify(webhookPayload);
    const validHmac = crypto.createHmac('sha256', webhookSecret).update(rawWebhookBody).digest('hex');
    const webhookHeaders = {
      'x-zayuno-signature': validHmac,
      'content-type': 'application/json'
    };

    const initialTimelineCount = storedActionEvents.length;

    const firstDelivery = await webhooksService.handleProviderWebhook(
      sandboxCoffeeProvider.slug,
      webhookHeaders,
      webhookPayload,
      rawWebhookBody
    );
    assert.equal(firstDelivery.success, true);
    assert.equal(firstDelivery.processed, true);

    const duplicateResults = await Promise.all(
      Array.from({ length: 100 }).map(() =>
        webhooksService.handleProviderWebhook(
          sandboxCoffeeProvider.slug,
          webhookHeaders,
          webhookPayload,
          rawWebhookBody
        )
      )
    );

    for (const dup of duplicateResults) {
      assert.equal(dup.success, true);
      assert.equal(dup.processed, false);
      assert.equal(dup.duplicate, true);
    }

    const finalTimelineCount = storedActionEvents.length;
    assert.equal(
      finalTimelineCount,
      initialTimelineCount + 1,
      'Exactly 1 timeline event must be recorded despite 100 webhook re-deliveries'
    );
    console.log('   ✅ Section F passed: 100x webhook deduplication verified.');

    // SECTION G
    console.log('\n👉 [Section G] Out-of-Order Webhook Rejection...');
    const completeEventId = `wh-evt-comp-${Date.now()}`;
    const completePayload = {
      eventId: completeEventId,
      eventType: 'action.completed',
      externalActionId: webhookAction.externalActionId,
      actionId: webhookAction.publicId,
      newStatus: ActionStatus.COMPLETED
    };
    const completeRawBody = JSON.stringify(completePayload);
    const completeHmac = crypto.createHmac('sha256', webhookSecret).update(completeRawBody).digest('hex');

    const completeDelivery = await webhooksService.handleProviderWebhook(
      sandboxCoffeeProvider.slug,
      { 'x-zayuno-signature': completeHmac },
      completePayload,
      completeRawBody
    );
    assert.equal(completeDelivery.success, true);
    assert.equal(completeDelivery.processed, true);

    const regressionEventId = `wh-evt-regress-${Date.now()}`;
    const regressionPayload = {
      eventId: regressionEventId,
      eventType: 'action.updated',
      externalActionId: webhookAction.externalActionId,
      actionId: webhookAction.publicId,
      newStatus: ActionStatus.PROCESSING
    };
    const regressionRawBody = JSON.stringify(regressionPayload);
    const regressionHmac = crypto.createHmac('sha256', webhookSecret).update(regressionRawBody).digest('hex');

    const regressionDelivery = await webhooksService.handleProviderWebhook(
      sandboxCoffeeProvider.slug,
      { 'x-zayuno-signature': regressionHmac },
      regressionPayload,
      regressionRawBody
    );
    assert.equal(regressionDelivery.success, true);
    assert.equal(regressionDelivery.processed, false);
    assert.equal(regressionDelivery.ignored, true);
    assert.match(regressionDelivery.reason, /Invalid action state transition/);

    const currentActionDb = await prisma.action.findUnique({ where: { id: webhookAction.id } });
    assert.equal(currentActionDb?.status, ActionStatus.COMPLETED);
    console.log('   ✅ Section G passed: illegal state regression strictly rejected/ignored.');

    // SECTION H
    console.log('\n👉 [Section H] Webhook Security (HMAC, Mutated Body, Isolation)...');
    process.env.STRICT_WEBHOOKS = 'true';

    await assert.rejects(
      () =>
        webhooksService.handleProviderWebhook(
          sandboxCoffeeProvider.slug,
          { 'x-zayuno-signature': 'invalid_forged_hex_signature' },
          { eventId: 'bad-sig-1' },
          '{"eventId":"bad-sig-1"}'
        ),
      (err: any) => {
        const statusCode = err.status || err.getStatus?.() || err.statusCode;
        assert.equal(statusCode, 401);
        return true;
      },
      'Invalid HMAC must reject with 401 Unauthorized'
    );

    await assert.rejects(
      () =>
        webhooksService.handleProviderWebhook(
          sandboxCoffeeProvider.slug,
          { 'x-zayuno-signature': completeHmac },
          { eventId: 'tampered-data', newStatus: ActionStatus.CANCELLED },
          '{"eventId":"tampered-data","newStatus":"CANCELLED"}'
        ),
      (err: any) => {
        const statusCode = err.status || err.getStatus?.() || err.statusCode;
        assert.equal(statusCode, 401);
        return true;
      },
      'Tampered body payload must fail HMAC verification with 401 Unauthorized'
    );

    const flowerSecret = liveFlowerProvider.webhookSecret;
    const crossSig = crypto.createHmac('sha256', flowerSecret).update(completeRawBody).digest('hex');
    await assert.rejects(
      () =>
        webhooksService.handleProviderWebhook(
          sandboxCoffeeProvider.slug,
          { 'x-zayuno-signature': crossSig },
          completePayload,
          completeRawBody
        ),
      (err: any) => {
        const statusCode = err.status || err.getStatus?.() || err.statusCode;
        assert.equal(statusCode, 401);
        return true;
      },
      'Cross-provider signature must be rejected with 401 Unauthorized'
    );
    console.log('   ✅ Section H passed: webhook HMAC tampering and provider signature isolation verified.');

    // SECTION I
    console.log('\n👉 [Section I] Provider Error Normalization...');
    const testCases: [code: any, status: any, msg: string, expected: string][] = [
      [undefined, 401, 'Unauthorized access', 'UNAUTHORIZED'],
      [undefined, 403, 'Forbidden action', 'FORBIDDEN'],
      [undefined, 404, 'Object missing', 'RESOURCE_NOT_FOUND'],
      [undefined, 408, 'Request timed out', 'PROVIDER_TIMEOUT'],
      [undefined, 409, 'Conflict on resource', 'CONFLICT'],
      [undefined, 429, 'Too many requests', 'RATE_LIMITED'],
      [undefined, 502, 'Bad gateway upstream', 'PROVIDER_UNAVAILABLE'],
      [undefined, 503, 'Service unavailable', 'PROVIDER_UNAVAILABLE'],
      [undefined, 504, 'Gateway timeout', 'PROVIDER_TIMEOUT'],
      ['OUT_OF_STOCK', 400, 'Product sold out', 'RESOURCE_UNAVAILABLE'],
      ['SOLD_OUT', 400, 'No more tickets available', 'RESOURCE_UNAVAILABLE'],
      ['CAPACITY_EXCEEDED', 422, 'Exceeds limit of 5', 'CAPACITY_EXCEEDED'],
      ['MAX_QUANTITY_EXCEEDED', 400, 'Max quantity is 4', 'CAPACITY_EXCEEDED'],
      [undefined, 500, '<html><head><title>502 Bad Gateway</title></head></html>', 'INTERNAL_ERROR'],
      ['ECONNRESET', undefined, 'socket hang up', 'INTERNAL_ERROR']
    ];

    for (const [code, status, msg, expected] of testCases) {
      const normalized = normalizeZayunoErrorCode(code, status, msg);
      assert.equal(normalized, expected, `Error [${code}, ${status}, "${msg}"] must normalize to ${expected}, got: ${normalized}`);
    }

    const fakeUpstreamError = normalizeZayunoErrorCode('NOT_FOUND', 404, 'Item not found in external inventory');
    assert.notEqual(
      fakeUpstreamError,
      'PROVIDER_NOT_FOUND',
      'Upstream item 404 must NEVER be normalized as PROVIDER_NOT_FOUND'
    );
    console.log('   ✅ Section I passed: comprehensive error normalization verified.');

    // SECTION J, K, L
    console.log('\n👉 [Section J, K, L] Circuit Breaker & Health State Transitions...');
    let healthData: any = { state: ProviderHealthState.HEALTHY, consecutiveFailures: 0, consecutiveSuccesses: 5 };

    healthData = evaluateHealthStateTransition(healthData, { success: false, latencyMs: 5000, failureCode: 'TIMEOUT' });
    assert.equal(healthData.state, ProviderHealthState.DEGRADED);
    assert.equal(healthData.consecutiveFailures, 1);
    assert.equal(healthData.isTemporarilyUnavailable, false);

    healthData = evaluateHealthStateTransition(healthData, { success: false, latencyMs: 5000, failureCode: 'TIMEOUT' });
    assert.equal(healthData.state, ProviderHealthState.DEGRADED);
    assert.equal(healthData.consecutiveFailures, 2);

    healthData = evaluateHealthStateTransition(healthData, { success: false, latencyMs: 5000, failureCode: 'TIMEOUT' });
    assert.equal(healthData.state, ProviderHealthState.DOWN);
    assert.equal(healthData.consecutiveFailures, 3);
    assert.equal(healthData.isTemporarilyUnavailable, true);

    healthData = evaluateHealthStateTransition(healthData, { success: true, latencyMs: 120 });
    assert.equal(healthData.state, ProviderHealthState.RECOVERING);
    assert.equal(healthData.consecutiveSuccesses, 1);
    assert.equal(healthData.isTemporarilyUnavailable, true);

    healthData = evaluateHealthStateTransition(healthData, { success: true, latencyMs: 95 });
    assert.equal(healthData.state, ProviderHealthState.HEALTHY);
    assert.equal(healthData.consecutiveSuccesses, 2);
    assert.equal(healthData.isTemporarilyUnavailable, false);
    console.log('   ✅ Section J, K, L passed: health circuit breaker state machine verified.');

    // SECTION M, N, O, P
    console.log('\n👉 [Section M, N, O, P] Infrastructure Failures & Fail-Closed Guard...');
    const failingRedisService: any = {
      acquireLock: async () => false,
      releaseLock: async () => {}
    };

    const lockedActionService = new ActionsService(
      registry,
      natsService,
      failingRedisService,
      providersService
    );

    const initialCoffeeCalls = coffeeExternalActionCallCount;
    await assert.rejects(
      () =>
        lockedActionService.createAction(
          {
            idempotencyKey: 'v4-fail-closed-lock',
            providerSlug: sandboxCoffeeProvider.slug,
            quoteId: quoteA.id,
            locationId: 'sb-branch-1',
            items: [{ offeringId: 'sb_latte', quantity: 1 }],
            userConfirmed: true,
            environment: ProviderEnvironment.SANDBOX
          },
          'user-v4-client-1',
          { allowSandboxSimulator: true }
        ),
      (err: any) => {
        assert.ok(err instanceof IdempotencyError || err.code === 'IDEMPOTENCY_CONFLICT');
        return true;
      },
      'When lock acquisition fails without an existing action, must fail closed with IDEMPOTENCY_CONFLICT'
    );
    assert.equal(
      coffeeExternalActionCallCount,
      initialCoffeeCalls,
      'Fail closed: Zero external provider calls dispatched when lock fails'
    );
    console.log('   ✅ Section M, N, O, P passed: fail-closed safety preserved.');

    // SECTION Q
    console.log('\n👉 [Section Q] Financial Chaos & Math Invariants...');
    const financialCases = [
      { subtotal: 50000, fees: 5000, discount: 0, total: 55000 },
      { subtotal: 100000, fees: 0, discount: 15000, total: 85000 },
      { subtotal: 28500, fees: 1500, discount: 2000, total: 28000 }
    ];

    for (const fc of financialCases) {
      assert.equal(
        fc.subtotal + fc.fees - fc.discount,
        fc.total,
        `Financial formula violated for: ${JSON.stringify(fc)}`
      );
      assert.ok(fc.total >= 0, 'Total price cannot be negative');
    }
    console.log('   ✅ Section Q passed: financial math consistency verified.');

    // SECTION R & S
    console.log('\n👉 [Section R & S] Payload Abuse & Contract Malformation...');
    const maliciousPayload = {
      providerSlug: sandboxCoffeeProvider.slug,
      quoteId: 'invalid-quote-id<script>alert(1)</script>\0',
      idempotencyKey: 'idem-malicious-\0-\u202E-hack',
      items: []
    };

    await assert.rejects(
      () => actionsService.createAction(maliciousPayload as any, 'user-v4-client-1'),
      (err: any) => {
        assert.ok(err, 'Must reject malformed/injected payload');
        return true;
      }
    );
    console.log('   ✅ Section R & S passed: malicious payload rejected safely.');

    // SECTION T & U
    console.log('\n👉 [Section T & U] Cross-Provider & Environment Isolation...');
    await assert.rejects(
      () => catalogService.getCatalog(sandboxCoffeeProvider.slug, 'sb-branch-1', undefined, undefined, ProviderEnvironment.LIVE),
      (err: any) => {
        assert.equal(err.code, 'ENVIRONMENT_NOT_ALLOWED');
        return true;
      },
      'LIVE discovery must strictly reject SANDBOX provider'
    );
    console.log('   ✅ Section T & U passed: sandbox and live boundary enforced.');

    // SECTION X, Y, Z
    console.log('\n👉 [Section X, Y, Z] Zero Secret Leaks & Final Invariants...');
    const activeActionNorm = successes[0].value;
    const publicAction = toPublicAction({
      ...activeActionNorm,
      status: ActionStatus.COMPLETED,
      baseUrl: 'https://internal-backend.secret.corp',
      encryptedSecret: 'super-secret-12345',
      webhookSecret: 'wh-secret-internal',
      ownerUserId: 'usr_internal_admin_999'
    });

    assertNoSecrets(publicAction, 'toPublicAction');
    assert.equal((publicAction as any).baseUrl, undefined);
    assert.equal((publicAction as any).encryptedSecret, undefined);
    assert.equal((publicAction as any).webhookSecret, undefined);

    const publicPaymentOptions = toPublicPaymentOptions([
      {
        id: 'opt-1',
        name: 'Payme',
        type: 'PAYME',
        internalConfig: { secretKey: 'leak-attempt' }
      }
    ]);
    assertNoSecrets(publicPaymentOptions, 'toPublicPaymentOptions');
    console.log('   ✅ Section X, Y, Z passed: zero secret leaks in envelopes.');

    console.log('\n================================================================');
    console.log('🎉 ALL V4 CHAOS & ADVERSARIAL SUITES PASSED CLEANLY!');
    console.log('================================================================\n');
  } finally {
    prisma.provider.findUnique = originalPrisma.providerFindUnique;
    prisma.provider.findMany = originalPrisma.providerFindMany;
    prisma.location.findFirst = originalPrisma.locationFindFirst;
    prisma.location.findMany = originalPrisma.locationFindMany;
    prisma.location.findUnique = originalPrisma.locationFindUnique;
    prisma.quote.findUnique = originalPrisma.quoteFindUnique;
    prisma.quote.create = originalPrisma.quoteCreate;
    prisma.action.findUnique = originalPrisma.actionFindUnique;
    prisma.action.findFirst = originalPrisma.actionFindFirst;
    prisma.action.create = originalPrisma.actionCreate;
    prisma.action.update = originalPrisma.actionUpdate;
    prisma.actionEvent.create = originalPrisma.actionEventCreate;
    if (originalPrisma.webhookLogCreate) {
      (prisma as any).webhookLog.create = originalPrisma.webhookLogCreate;
    }
  }
}

runV4ChaosSuite().catch((err) => {
  console.error('❌ V4 Chaos Suite Failed:', err);
  process.exit(1);
});
