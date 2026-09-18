import assert from 'node:assert/strict';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service.ts';
import { CatalogService } from '../apps/api/src/modules/catalog/catalog.service.ts';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import { ActionStatus } from '../packages/contracts/src/action.ts';
import { AvailabilityStatus } from '../packages/contracts/src/catalog.ts';
import {
  ProviderCapability,
  ProviderCategory,
  ProviderEnvironment,
  ProviderFulfillmentMode,
  ProviderStatus,
  ProviderType
} from '../packages/contracts/src/provider.ts';
import { prisma } from '../packages/database/src/client.ts';
import { toPublicAction } from '../packages/shared/src/public-action.ts';
import { toPublicPaymentOptions } from '../packages/shared/src/public-payment-option.ts';
import { createIdempotencyPayloadHash } from '../packages/shared/src/idempotency.ts';
import { ZayunoError } from '../packages/shared/src/errors.ts';

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

async function runInvariantBreakerSuite() {
  console.log('================================================================');
  console.log('⚡ ZAYUNO ADVERSARIAL INVARIANT BREAKER SUITE');
  console.log('================================================================\n');

  // Provider fixtures
  const providerCoffee = {
    id: 'prov-coffee-id',
    slug: 'coffee-time',
    name: 'Coffee Time',
    status: ProviderStatus.ACTIVE,
    type: ProviderType.RETAIL,
    environment: ProviderEnvironment.LIVE,
    category: ProviderCategory.FOOD_AND_DRINK,
    subcategory: 'coffee_shop',
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.LOCATIONS,
      ProviderCapability.CATALOG,
      ProviderCapability.SEARCH,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.ACTION_CANCEL,
      ProviderCapability.PAYMENT_OPTIONS,
      ProviderCapability.WEBHOOK
    ],
    encryptedSecret: 'secret_coffee',
    webhookSecret: 'wh_secret_coffee',
    metadata: {
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true,
      fulfillmentMode: ProviderFulfillmentMode.ONSITE,
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
          ProviderCapability.SEARCH,
          ProviderCapability.QUOTE,
          ProviderCapability.ACTION_CREATE,
          ProviderCapability.ACTION_STATUS,
          ProviderCapability.ACTION_CANCEL,
          ProviderCapability.PAYMENT_OPTIONS,
          ProviderCapability.WEBHOOK
        ]
      }
    },
    locations: [{ id: 'loc-ct-internal', providerLocationId: 'ct-branch-1', isActive: true }]
  };

  const providerEvos = {
    id: 'prov-evos-id',
    slug: 'evos',
    name: 'EVOS Fast Food',
    status: ProviderStatus.ACTIVE,
    type: ProviderType.RETAIL,
    environment: ProviderEnvironment.LIVE,
    category: ProviderCategory.FOOD_AND_DRINK,
    subcategory: 'fast_food',
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.LOCATIONS,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.ACTION_CANCEL
    ],
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
          ProviderCapability.ACTION_CANCEL
        ]
      }
    },
    locations: [{ id: 'loc-evos-internal', providerLocationId: 'evos-branch-1', isActive: true }]
  };

  const storedLocations = [
    {
      id: 'loc-ct-internal',
      providerId: 'prov-coffee-id',
      providerLocationId: 'ct-branch-1',
      name: 'Coffee Time Amir Temur',
      isActive: true,
      provider: { slug: 'coffee-time' }
    },
    {
      id: 'loc-evos-internal',
      providerId: 'prov-evos-id',
      providerLocationId: 'evos-branch-1',
      name: 'EVOS Chilonzor',
      isActive: true,
      provider: { slug: 'evos' }
    }
  ];

  const storedQuotes: any[] = [];
  const storedActions: any[] = [];

  // Mock Prisma
  const originalPrisma = {
    providerFindUnique: prisma.provider.findUnique,
    providerFindMany: prisma.provider.findMany,
    locationFindFirst: prisma.location.findFirst,
    locationFindMany: prisma.location.findMany,
    quoteFindUnique: prisma.quote.findUnique,
    quoteCreate: prisma.quote.create,
    actionFindUnique: prisma.action.findUnique,
    actionFindFirst: prisma.action.findFirst,
    actionCreate: prisma.action.create,
    actionUpdate: prisma.action.update,
    actionEventCreate: prisma.actionEvent.create
  };

  (prisma.provider as any).findUnique = async ({ where }: any) => {
    if (where.slug === 'coffee-time') return providerCoffee;
    if (where.slug === 'evos') return providerEvos;
    return null;
  };

  (prisma.location as any).findFirst = async ({ where }: any) => {
    return storedLocations.find((loc) => {
      const matchProvider = where.provider?.slug
        ? loc.provider?.slug === where.provider.slug
        : where.providerId
          ? loc.providerId === where.providerId
          : true;
      if (!matchProvider) return false;
      if (where.isActive !== undefined && loc.isActive !== where.isActive) return false;
      if (where.OR) {
        return where.OR.some((cond: any) => cond.id === loc.id || cond.providerLocationId === loc.providerLocationId);
      }
      return true;
    }) || null;
  };

  (prisma.quote as any).findUnique = async ({ where }: any) => {
    return storedQuotes.find((q) => q.id === where.id) || null;
  };

  (prisma.quote as any).create = async ({ data }: any) => {
    storedQuotes.push(data);
    return data;
  };

  (prisma.action as any).findUnique = async ({ where }: any) => {
    if (where.idempotencyKey) {
      return storedActions.find((a) => a.idempotencyKey === where.idempotencyKey) || null;
    }
    if (where.id) {
      return storedActions.find((a) => a.id === where.id) || null;
    }
    if (where.publicId) {
      return storedActions.find((a) => a.publicId === where.publicId) || null;
    }
    return null;
  };

  (prisma.action as any).findFirst = async ({ where }: any) => {
    if (where.quoteId) {
      return storedActions.find((a) => a.quoteId === where.quoteId) || null;
    }
    if (where.OR && Array.isArray(where.OR)) {
      return (
        storedActions.find((a) => {
          return where.OR.some((cond: any) => {
            if (cond.id && a.id === cond.id) return true;
            if (cond.publicId && a.publicId === cond.publicId) return true;
            return false;
          });
        }) || null
      );
    }
    if (where.id) {
      return storedActions.find((a) => a.id === where.id) || null;
    }
    if (where.publicId) {
      return storedActions.find((a) => a.publicId === where.publicId) || null;
    }
    return null;
  };

  (prisma.action as any).create = async ({ data }: any) => {
    const created = {
      ...data,
      id: `act-db-${storedActions.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: data.providerId === providerCoffee.id ? providerCoffee : providerEvos,
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

  (prisma.actionEvent as any).create = async () => ({});

  // Mock adapters
  const coffeeAdapter: any = {
    info: providerCoffee,
    getCatalog: async () => ({
      providerSlug: 'coffee-time',
      categories: [{ slug: 'hot-coffee', title: 'Hot Coffee' }],
      offerings: [
        {
          id: 'ct_cappuccino',
          title: 'Cappuccino',
          basePrice: 28000,
          currency: 'UZS',
          variants: [
            { id: 'v_small', title: 'Small', price: 24000 },
            { id: 'v_large', title: 'Large', price: 32000 }
          ],
          optionGroups: [
            {
              id: 'milk',
              title: 'Milk Choice',
              options: [
                { id: 'oat', title: 'Oat Milk', priceModifier: 6000 },
                { id: 'soy', title: 'Soy Milk', priceModifier: 5000 }
              ]
            }
          ]
        }
      ]
    }),
    requestQuote: async (input: any) => {
      const isLarge = input.items[0]?.variantId === 'v_large';
      const unitPrice = isLarge ? 32000 : 28000;
      const optTotal = input.items[0]?.selectedOptions?.length ? 6000 : 0;
      const qty = input.items[0]?.quantity || 1;
      const subtotal = (unitPrice + optTotal) * qty;
      const total = subtotal;
      return {
        id: `quote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        providerSlug: 'coffee-time',
        locationId: input.locationId,
        lines: [
          {
            offeringId: 'ct_cappuccino',
            offeringTitle: 'Cappuccino',
            variantId: input.items[0]?.variantId || null,
            unitPrice,
            quantity: qty,
            optionsTotal: optTotal,
            lineTotal: subtotal,
            selectedOptions: input.items[0]?.selectedOptions || []
          }
        ],
        subtotal,
        totalFees: 0,
        totalDiscount: 0,
        total,
        currency: 'UZS',
        expiresAt: new Date(Date.now() + 300_000).toISOString()
      };
    },
    createAction: async (input: any) => ({
      id: `ext-coffee-${Date.now()}`,
      publicId: 'ZY-COFFEE-INV-1',
      providerSlug: 'coffee-time',
      status: ActionStatus.AWAITING_PAYMENT,
      paymentUrl: 'https://checkout.coffeetime.uz/pay/123',
      lines: [],
      subtotal: 38000,
      fees: 0,
      discount: 0,
      total: 38000,
      currency: 'UZS'
    }),
    cancelAction: async () => ({
      success: true,
      actionId: 'ext-coffee-123',
      externalActionId: 'ext-coffee-123',
      providerSlug: 'coffee-time',
      previousStatus: ActionStatus.AWAITING_PAYMENT,
      newStatus: ActionStatus.CANCELLED,
      message: 'Action cancelled successfully',
      refundInitiated: false
    })
  };

  const registry = {
    getAdapter: async (slug: string) => (slug === 'coffee-time' ? coffeeAdapter : null),
    assertAndGetCapability: async (slug: string, cap: ProviderCapability) => {
      if (slug === 'coffee-time') return coffeeAdapter;
      throw new Error(`Provider ${slug} not found`);
    }
  } as any;

  const redisService = {
    acquireLock: async () => true,
    releaseLock: async () => {},
    get: async () => null,
    set: async () => {}
  } as any;

  const natsService = {
    publish: async () => {}
  } as any;

  const providersService = new ProvidersService(registry);
  const catalogService = new CatalogService(registry, providersService, redisService);
  const quotesService = new QuotesService(registry, providersService);
  const actionsService = new ActionsService(registry, natsService, redisService, providersService);

  try {
    // --------------------------------------------------------------------------
    // INVARIANT 1: Availability Truthfulness
    // --------------------------------------------------------------------------
    console.log('👉 [Invariant 1] Availability Truthfulness & 404 Non-Optimism...');
    const availResult = await catalogService.checkAvailability({
      providerSlug: 'coffee-time',
      items: [{ offeringId: 'ct_cappuccino' }]
    });
    assert.equal(
      availResult.availabilityStatus,
      AvailabilityStatus.NOT_SUPPORTED,
      'Unimplemented checkAvailability must return NOT_SUPPORTED, not false optimism'
    );
    assert.equal(
      availResult.isAvailable,
      null,
      'isAvailable must strictly be null when provider does not support availability check'
    );
    console.log('   ✅ Truthful availability contract verified.');

    // --------------------------------------------------------------------------
    // INVARIANT 2: Idempotency Key Deduplication & Payload Collision Protection
    // --------------------------------------------------------------------------
    console.log('\n👉 [Invariant 2] Idempotency Hash Collision & Deduplication...');
    // Create Quote 1
    const quote1 = await quotesService.requestQuote({
      providerSlug: 'coffee-time',
      locationId: 'ct-branch-1',
      items: [
        {
          offeringId: 'ct_cappuccino',
          variantId: 'v_large',
          quantity: 1,
          selectedOptions: [{ groupId: 'milk', optionId: 'oat', quantity: 1 }]
        }
      ]
    });

    const idempotencyKey1 = 'idem-unique-key-001';
    const actionInputA = {
      idempotencyKey: idempotencyKey1,
      providerSlug: 'coffee-time',
      quoteId: quote1.id,
      locationId: 'ct-branch-1',
      items: [
        {
          offeringId: 'ct_cappuccino',
          variantId: 'v_large',
          quantity: 1,
          selectedOptions: [{ groupId: 'milk', optionId: 'oat', quantity: 1 }]
        }
      ],
      userConfirmed: true as const
    };

    const actionA1 = await actionsService.createAction(actionInputA, 'usr-test-1');
    assert.ok(actionA1.publicId, 'First creation must return public action');

    // Identical retry with same key and same payload
    const actionA2 = await actionsService.createAction(actionInputA, 'usr-test-1');
    assert.equal(actionA2.publicId, actionA1.publicId, 'Idempotent retry must return identical cached action');

    // Attack: Reuse same key with CHANGED payload
    const actionInputAChanged = {
      ...actionInputA,
      destination: { raw: 'Hacker St. 99' }
    };
    await assert.rejects(
      () => actionsService.createAction(actionInputAChanged, 'usr-test-1'),
      (err: any) => {
        assert.equal(err.name, 'IdempotencyPayloadConflictError');
        assert.equal(err.code, 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD');
        return true;
      },
      'Reusing idempotency key with modified payload must throw 409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD'
    );
    console.log('   ✅ Idempotency deduplication & hash collision protection verified.');

    // --------------------------------------------------------------------------
    // INVARIANT 3: Quote Immutability & Quote Integrity Attack
    // --------------------------------------------------------------------------
    console.log('\n👉 [Invariant 3] Quote Immutability & Integrity Guard...');
    // Attack 3a: Quantity manipulation attack (quoted 1, submitted 2)
    const quote2 = await quotesService.requestQuote({
      providerSlug: 'coffee-time',
      locationId: 'ct-branch-1',
      items: [{ offeringId: 'ct_cappuccino', variantId: 'v_large', quantity: 1 }]
    });

    await assert.rejects(
      () =>
        actionsService.createAction({
          idempotencyKey: 'idem-key-qty-attack',
          providerSlug: 'coffee-time',
          quoteId: quote2.id,
          locationId: 'ct-branch-1',
          items: [{ offeringId: 'ct_cappuccino', variantId: 'v_large', quantity: 2 }],
          userConfirmed: true
        }),
      (err: any) => {
        assert.equal(err.code, 'QUOTE_MISMATCH');
        assert.match(err.message, /Quantity mismatch/);
        return true;
      },
      'Quantity mutation between quote and action must be rejected with QUOTE_MISMATCH'
    );

    // Attack 3b: Additional item insertion attack
    await assert.rejects(
      () =>
        actionsService.createAction({
          idempotencyKey: 'idem-key-item-injection',
          providerSlug: 'coffee-time',
          quoteId: quote2.id,
          locationId: 'ct-branch-1',
          items: [
            { offeringId: 'ct_cappuccino', variantId: 'v_large', quantity: 1 },
            { offeringId: 'ct_expensive_caviar', quantity: 1 }
          ],
          userConfirmed: true
        }),
      (err: any) => {
        assert.equal(err.code, 'QUOTE_MISMATCH');
        assert.match(err.message, /Item count mismatch/);
        return true;
      },
      'Injecting extra items not in verified quote must be rejected with QUOTE_MISMATCH'
    );

    // Attack 3c: Variant swap attack
    await assert.rejects(
      () =>
        actionsService.createAction({
          idempotencyKey: 'idem-key-variant-swap',
          providerSlug: 'coffee-time',
          quoteId: quote2.id,
          locationId: 'ct-branch-1',
          items: [{ offeringId: 'ct_cappuccino', variantId: 'v_small', quantity: 1 }],
          userConfirmed: true
        }),
      (err: any) => {
        assert.equal(err.code, 'QUOTE_MISMATCH');
        assert.match(err.message, /was not in quote/);
        return true;
      },
      'Swapping variant not matched in quote must be rejected with QUOTE_MISMATCH'
    );
    console.log('   ✅ Quote integrity guard successfully blocked all tampering attacks.');

    // --------------------------------------------------------------------------
    // INVARIANT 4: Expired Quote Rejection
    // --------------------------------------------------------------------------
    console.log('\n👉 [Invariant 4] Expired Quote Attack Rejection...');
    const expiredQuoteId = 'quote-expired-test-id';
    storedQuotes.push({
      id: expiredQuoteId,
      providerId: providerCoffee.id,
      locationId: 'loc-ct-internal',
      lines: [{ offeringId: 'ct_cappuccino', quantity: 1 }],
      subtotal: 28000,
      fees: 0,
      discount: 0,
      total: 28000,
      currency: 'UZS',
      parameters: { providerLocationId: 'ct-branch-1' },
      expiresAt: new Date(Date.now() - 10_000) // Expired 10s ago
    });

    await assert.rejects(
      () =>
        actionsService.createAction({
          idempotencyKey: 'idem-key-expired-quote',
          providerSlug: 'coffee-time',
          quoteId: expiredQuoteId,
          locationId: 'ct-branch-1',
          items: [{ offeringId: 'ct_cappuccino', quantity: 1 }],
          userConfirmed: true
        }),
      (err: any) => {
        assert.equal(err.code, 'QUOTE_EXPIRED');
        return true;
      },
      'Expired quote must throw 400 QUOTE_EXPIRED'
    );
    console.log('   ✅ Expired quote strictly rejected.');

    // --------------------------------------------------------------------------
    // INVARIANT 5: Location Isolation & Cross-Provider Guard
    // --------------------------------------------------------------------------
    console.log('\n👉 [Invariant 5] Location Isolation & Cross-Provider Guard...');
    // Attack 5a: Nonexistent location
    await assert.rejects(
      () => catalogService.getCatalog('coffee-time', 'nonexistent-branch-404'),
      (err: any) => {
        assert.equal(err.code, 'LOCATION_NOT_FOUND');
        return true;
      },
      'Nonexistent location must throw LOCATION_NOT_FOUND (404)'
    );

    // Attack 5b: Cross-provider location attack (supplying EVOS branch to Coffee Time)
    await assert.rejects(
      () => catalogService.getCatalog('coffee-time', 'evos-branch-1'),
      (err: any) => {
        assert.equal(err.code, 'LOCATION_NOT_FOUND');
        return true;
      },
      'Cross-provider location must be rejected with LOCATION_NOT_FOUND (404)'
    );

    // Attack 5c: Cross-provider location on quote request
    await assert.rejects(
      () =>
        quotesService.requestQuote({
          providerSlug: 'coffee-time',
          locationId: 'evos-branch-1',
          items: [{ offeringId: 'ct_cappuccino', quantity: 1 }]
        }),
      (err: any) => {
        assert.equal(err.code, 'LOCATION_NOT_FOUND');
        return true;
      },
      'Cross-provider location on requestQuote must be rejected with LOCATION_NOT_FOUND (404)'
    );

    // Legitimate location request
    const legitimateCatalog = await catalogService.getCatalog('coffee-time', 'ct-branch-1');
    assert.ok(legitimateCatalog.offerings.length > 0, 'Legitimate location must successfully return catalog');
    console.log('   ✅ Location isolation and cross-provider security verified.');

    // --------------------------------------------------------------------------
    // INVARIANT 6: State Machine Directionality & Safe Idempotent Cancellation
    // --------------------------------------------------------------------------
    console.log('\n👉 [Invariant 6] State Machine Directionality & Safe Idempotent Cancellation...');
    // Legitimate Action creation
    const honestQuote = await quotesService.requestQuote({
      providerSlug: 'coffee-time',
      locationId: 'ct-branch-1',
      items: [{ offeringId: 'ct_cappuccino', quantity: 1 }]
    });

    const activeAction = await actionsService.createAction({
      idempotencyKey: 'idem-key-cancellation-test',
      providerSlug: 'coffee-time',
      quoteId: honestQuote.id,
      locationId: 'ct-branch-1',
      items: [{ offeringId: 'ct_cappuccino', quantity: 1 }],
      userConfirmed: true
    });

    // Cancel action
    const cancel1 = await actionsService.cancelAction({
      actionId: activeAction.publicId,
      reason: 'Customer changed mind'
    });
    assert.equal(cancel1.success, true);
    assert.equal(cancel1.newStatus, ActionStatus.CANCELLED);
    assert.equal(cancel1.actionId, activeAction.publicId, 'Cancel return must preserve canonical publicId');

    // Repeat cancel (must be idempotent and safe)
    const cancel2 = await actionsService.cancelAction({
      actionId: activeAction.publicId,
      reason: 'Customer changed mind retry'
    });
    assert.equal(cancel2.success, true);
    assert.equal(cancel2.newStatus, ActionStatus.CANCELLED);
    assert.equal(cancel2.actionId, activeAction.publicId);
    console.log('   ✅ State machine cancellation idempotency and terminal stability verified.');

    // --------------------------------------------------------------------------
    // INVARIANT 7: Strict Public DTO Boundary & Zero Secret Leakage
    // --------------------------------------------------------------------------
    console.log('\n👉 [Invariant 7] Strict Public DTO Boundaries & Zero Secret Leaks...');
    const publicActionDto = toPublicAction({
      ...activeAction,
      status: ActionStatus.CANCELLED,
      baseUrl: 'https://internal-backend.secret.corp',
      adapterType: 'remote-http',
      encryptedSecret: 'super-secret-key-12345',
      authMethod: 'API_KEY',
      ownerUserId: 'usr_internal_admin_999'
    });

    assertNoSecrets(publicActionDto, 'publicActionDto');
    assert.equal((publicActionDto as any).baseUrl, undefined);
    assert.equal((publicActionDto as any).adapterType, undefined);
    assert.equal((publicActionDto as any).encryptedSecret, undefined);
    assert.equal((publicActionDto as any).ownerUserId, undefined);

    const publicPaymentOptionsDto = toPublicPaymentOptions([
      {
        id: 'pay-1',
        name: 'Payme',
        type: 'PAYME',
        internalConfig: { secret: 'secret_leak' }
      }
    ]);
    assertNoSecrets(publicPaymentOptionsDto, 'publicPaymentOptionsDto');
    console.log('   ✅ Public DTO boundaries verified: 0 secret leaks.');

    // --------------------------------------------------------------------------
    // INVARIANT 8: Financial Math Invariant
    // --------------------------------------------------------------------------
    console.log('\n👉 [Invariant 8] Financial Math & Currency Uniformity...');
    const mathQuote = await quotesService.requestQuote({
      providerSlug: 'coffee-time',
      locationId: 'ct-branch-1',
      items: [{ offeringId: 'ct_cappuccino', variantId: 'v_large', quantity: 2 }]
    });

    assert.equal(
      mathQuote.subtotal + mathQuote.totalFees - mathQuote.totalDiscount,
      mathQuote.total,
      'Quote financial math invariant violated: subtotal + fees - discount != total'
    );
    assert.ok(mathQuote.total >= 0, 'Quote total must be non-negative');
    assert.equal(mathQuote.currency, 'UZS', 'Currency must be uniform');

    for (const line of mathQuote.lines) {
      assert.equal(
        (line.unitPrice + line.optionsTotal) * line.quantity,
        line.lineTotal,
        'Line total invariant violated: (unitPrice + optionsTotal) * qty != lineTotal'
      );
    }
    console.log('   ✅ Financial math consistency verified.');

    console.log('\n================================================================');
    console.log('🎉 ALL 8 PLATFORM INVARIANTS PASSED UNDER ADVERSARIAL STRESS!');
    console.log('================================================================\n');
  } finally {
    // Restore prisma
    prisma.provider.findUnique = originalPrisma.providerFindUnique;
    prisma.provider.findMany = originalPrisma.providerFindMany;
    prisma.location.findFirst = originalPrisma.locationFindFirst;
    prisma.location.findMany = originalPrisma.locationFindMany;
    prisma.quote.findUnique = originalPrisma.quoteFindUnique;
    prisma.quote.create = originalPrisma.quoteCreate;
    prisma.action.findUnique = originalPrisma.actionFindUnique;
    prisma.action.findFirst = originalPrisma.actionFindFirst;
    prisma.action.create = originalPrisma.actionCreate;
    prisma.action.update = originalPrisma.actionUpdate;
    prisma.actionEvent.create = originalPrisma.actionEventCreate;
  }
}

runInvariantBreakerSuite().catch((err) => {
  console.error('❌ Invariant Breaker Suite Failed:', err);
  process.exitCode = 1;
});
