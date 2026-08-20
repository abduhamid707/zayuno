import assert from 'node:assert/strict';
import { prisma } from '../packages/database/src/client.ts';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';

const provider = {
  id: 'provider-test-id',
  slug: 'coffee-time',
  name: 'Coffee Time',
  status: 'ACTIVE' as any,
  config: {
    supportContact: {
      type: 'telegram',
      value: '@coffeetime_support'
    }
  },
  metadata: {
    reviewStatus: 'APPROVED',
    isPublished: true,
    isCertified: true
  }
};

const internalLocationId = 'loc-test-123';
const quoteAId = 'quote-user-a-id';
const quoteAnonId = 'quote-anon-user-id';

async function main() {
  console.log('🧪 Running Action Quote Deduplication Tenant Isolation Tests...');

  const original = {
    providerFindUnique: prisma.provider.findUnique,
    locationFindFirst: prisma.location.findFirst,
    quoteFindUnique: prisma.quote.findUnique,
    actionFindUnique: prisma.action.findUnique,
    actionFindFirst: prisma.action.findFirst,
    actionCreate: prisma.action.create,
    actionEventCreate: prisma.actionEvent.create
  };

  const storedActions: any[] = [];

  try {
    (prisma.provider as any).findUnique = async () => provider;
    (prisma.location as any).findFirst = async () => ({ id: internalLocationId });
    (prisma.actionEvent as any).create = async () => ({});

    (prisma.quote as any).findUnique = async ({ where }: any) => {
      if (where.id === quoteAId || where.id === quoteAnonId) {
        return {
          id: where.id,
          providerId: provider.id,
          locationId: internalLocationId,
          expiresAt: new Date(Date.now() + 600_000)
        };
      }
      return null;
    };

    (prisma.action as any).findUnique = async ({ where }: any) => {
      if (where.idempotencyKey) {
        return storedActions.find(a => a.idempotencyKey === where.idempotencyKey) || null;
      }
      return null;
    };

    (prisma.action as any).findFirst = async ({ where }: any) => {
      if (where.quoteId) {
        return storedActions.find(a => a.quoteId === where.quoteId && a.provider.slug === where.provider?.slug) || null;
      }
      return null;
    };

    (prisma.action as any).create = async ({ data }: any) => {
      const created = {
        ...data,
        id: `act-db-${storedActions.length + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        provider: { id: provider.id, slug: provider.slug, name: provider.name },
        location: null,
        timeline: []
      };
      storedActions.push(created);
      return created;
    };

    const actionAdapter = {
      createAction: async (input: any) => ({
        id: 'external-action-id',
        publicId: `CT-ACT-${Math.floor(10000 + Math.random() * 90000)}`,
        providerSlug: 'coffee-time',
        status: 'AWAITING_PAYMENT',
        paymentUrl: 'https://coffee-time-sandbox.shopla.uz/pay/test-order',
        subtotal: 81000,
        fees: 10000,
        total: 91000,
        currency: 'UZS',
        lines: [{ offeringId: 'ct_cappuccino', quantity: 3, lineTotal: 81000 }]
      })
    };

    const registry = {
      assertAndGetCapability: async () => actionAdapter
    } as any;

    const redisService = {
      acquireLock: async () => true,
      releaseLock: async () => {}
    } as any;

    const natsService = {
      publish: async () => {}
    } as any;

    const actionsService = new ActionsService(registry, natsService, redisService);

    // =========================================================================
    // 1. User A creates action with Quote A
    // =========================================================================
    console.log('  1. User A creates action with Quote A...');
    const userAInput = {
      providerSlug: 'coffee-time',
      quoteId: quoteAId,
      customer: { name: 'User A', phone: '+998901111111' },
      items: [{ offeringId: 'ct_cappuccino', quantity: 3, selectedOptions: [] }],
      userConfirmed: true as const
    };

    const userAAction1 = await actionsService.createAction(userAInput, 'usr_user_a');
    assert.ok(userAAction1.id, 'User A action must be created');
    assert.equal(userAAction1.customer.name, 'User A');
    assert.equal(storedActions.length, 1);
    console.log(`    ✅ User A action created (${userAAction1.publicId}).`);

    // =========================================================================
    // 2. User A retries with Quote A -> Exact same action returned
    // =========================================================================
    console.log('  2. User A retries with Quote A...');
    const userAActionRetry = await actionsService.createAction(userAInput, 'usr_user_a');
    assert.equal(userAActionRetry.id, userAAction1.id, 'Retry must return the same action for User A');
    assert.equal(userAActionRetry.publicId, userAAction1.publicId);
    assert.equal(storedActions.length, 1, 'No duplicate action created');
    console.log('    ✅ User A retry returned identical action without duplicate.');

    // =========================================================================
    // 3. User B attempts to use Quote A -> Blocked with ForbiddenException
    // =========================================================================
    console.log('  3. User B attempts to use User A Quote A...');
    const userBInput = {
      providerSlug: 'coffee-time',
      quoteId: quoteAId,
      customer: { name: 'User B (Attacker)', phone: '+998902222222' },
      items: [{ offeringId: 'ct_cappuccino', quantity: 3, selectedOptions: [] }],
      userConfirmed: true as const
    };

    let userBError: any;
    try {
      await actionsService.createAction(userBInput, 'usr_user_b');
    } catch (err) {
      userBError = err;
    }

    assert.ok(userBError && (userBError.status === 403 || userBError.name === 'ForbiddenException'), 'User B must be rejected with ForbiddenException');
    assert.match(userBError.message, /This quote has already been utilized by another account/);
    assert.doesNotMatch(userBError.message, /usr_user_a/, 'User A ID must not be leaked');
    assert.doesNotMatch(userBError.message, new RegExp(userAAction1.publicId), 'User A publicId must not be leaked');
    assert.doesNotMatch(userBError.message, /https:\/\/coffee-time-sandbox\.shopla\.uz/, 'User A paymentUrl must not be leaked');
    assert.equal(storedActions.length, 1, 'No action created for User B');
    console.log('    ✅ User B blocked from accessing User A quote with zero data leakage.');

    // =========================================================================
    // 4. Anonymous caller attempts to use User A Quote A -> Blocked
    // =========================================================================
    console.log('  4. Anonymous caller attempts to use User A Quote A...');
    let anonToUserAError: any;
    try {
      await actionsService.createAction(userAInput, undefined);
    } catch (err) {
      anonToUserAError = err;
    }
    assert.ok(anonToUserAError && (anonToUserAError.status === 403 || anonToUserAError.name === 'ForbiddenException'), 'Anonymous caller must be rejected from user quote');
    assert.equal(storedActions.length, 1);
    console.log('    ✅ Anonymous caller blocked from accessing authenticated user quote.');

    // =========================================================================
    // 5. Anonymous User 1 creates action with Quote Anon + Secret Key
    // =========================================================================
    console.log('  5. Anonymous Customer 1 creates action with Quote Anon and secret key...');
    const anon1Input = {
      idempotencyKey: 'anon-secret-key-1',
      providerSlug: 'coffee-time',
      quoteId: quoteAnonId,
      customer: { name: 'Anon Customer 1', phone: '+998903333333' },
      items: [{ offeringId: 'ct_cappuccino', quantity: 3, selectedOptions: [] }],
      userConfirmed: true as const
    };

    const anon1Action = await actionsService.createAction(anon1Input, undefined);
    assert.ok(anon1Action.id);
    assert.equal(storedActions.length, 2);
    console.log(`    ✅ Anonymous Customer 1 action created (${anon1Action.publicId}).`);

    // =========================================================================
    // 6. Anonymous Customer 1 retries with Quote Anon + SAME Secret Key -> Action returned
    // =========================================================================
    console.log('  6. Anonymous Customer 1 retries with Quote Anon and valid secret key...');
    const anon1Retry = await actionsService.createAction(anon1Input, undefined);
    assert.equal(anon1Retry.id, anon1Action.id, 'Same anonymous customer with valid key must get their action');
    assert.equal(storedActions.length, 2, 'No duplicate action created');
    console.log('    ✅ Anonymous Customer 1 retry succeeded with secret key credential.');

    // =========================================================================
    // 7. Same Quote + Same Phone, but WITHOUT valid idempotency key -> Blocked
    // =========================================================================
    console.log('  7. Anonymous request with same quote and same phone, but missing secret key...');
    const anonSamePhoneNoKeyInput = {
      providerSlug: 'coffee-time',
      quoteId: quoteAnonId,
      customer: { name: 'Anon Customer 1', phone: '+998903333333' },
      items: [{ offeringId: 'ct_cappuccino', quantity: 3, selectedOptions: [] }],
      userConfirmed: true as const
    };

    let anonSamePhoneError: any;
    try {
      await actionsService.createAction(anonSamePhoneNoKeyInput, undefined);
    } catch (err) {
      anonSamePhoneError = err;
    }

    assert.ok(anonSamePhoneError && (anonSamePhoneError.status === 409 || anonSamePhoneError.name === 'ConflictException'), 'Request without key must be rejected with 409 Conflict');
    assert.match(anonSamePhoneError.message, /This quote has already been utilized/);
    assert.doesNotMatch(anonSamePhoneError.message, new RegExp(anon1Action.publicId), 'Must not leak action ID');
    assert.equal(storedActions.length, 2, 'No new action created');
    console.log('    ✅ Phone number is not trusted for authorization; missing key rejected safely.');

    // =========================================================================
    // 8. Imposter with different key/phone -> Blocked with 409 Conflict
    // =========================================================================
    console.log('  8. Anonymous Imposter with different key/phone...');
    const anonImposterInput = {
      idempotencyKey: 'imposter-fake-key',
      providerSlug: 'coffee-time',
      quoteId: quoteAnonId,
      customer: { name: 'Anon Imposter', phone: '+998904444444' },
      items: [{ offeringId: 'ct_cappuccino', quantity: 3, selectedOptions: [] }],
      userConfirmed: true as const
    };

    let anonImposterError: any;
    try {
      await actionsService.createAction(anonImposterInput, undefined);
    } catch (err) {
      anonImposterError = err;
    }
    assert.ok(anonImposterError && (anonImposterError.status === 409 || anonImposterError.name === 'ConflictException'), 'Imposter must be rejected with 409 Conflict');
    assert.equal(storedActions.length, 2, 'No new action created');
    console.log('    ✅ Imposter with wrong key rejected with zero data leakage.');

    console.log('🎉 ALL ACTION QUOTE DEDUPLICATION TENANT ISOLATION TESTS PASSED!\n');
  } finally {
    prisma.provider.findUnique = original.providerFindUnique;
    prisma.location.findFirst = original.locationFindFirst;
    prisma.quote.findUnique = original.quoteFindUnique;
    prisma.action.findUnique = original.actionFindUnique;
    prisma.action.findFirst = original.actionFindFirst;
    prisma.action.create = original.actionCreate;
    prisma.actionEvent.create = original.actionEventCreate;
  }
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
