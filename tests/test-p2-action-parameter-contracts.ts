import assert from 'node:assert/strict';
import { SELECTED_OPTION_QUANTITY_SEMANTICS } from '../packages/contracts/src/catalog.ts';
import { toPublicAction } from '../packages/shared/src/public-action.ts';
import { prisma } from '../packages/database/src/client.ts';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service.ts';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import { assertDeclaredDynamicParameters } from '../apps/api/src/common/dynamic-parameter-validation.ts';

const parameterSchema = {
  type: 'object' as const,
  properties: {
    serviceDate: { type: 'string' as const },
    guests: { type: 'integer' as const, minimum: 1 }
  },
  required: ['serviceDate'],
  additionalProperties: false
};

const publishedProvider = {
  id: 'provider-p2',
  slug: 'declared-provider',
  status: 'ACTIVE',
  metadata: { reviewStatus: 'APPROVED', isPublished: true, isCertified: true }
};

function declaredAdapter() {
  return {
    hasCapability: () => true,
    getCatalog: async () => ({
      providerSlug: 'declared-provider',
      categories: [],
      offerings: [{ id: 'declared-offering', offeringCode: 'declared-offering', parametersSchema: parameterSchema }],
      parametersSchema: parameterSchema
    })
  };
}

async function expectUnsupported(operation: () => Promise<unknown>) {
  await assert.rejects(operation, (error: any) => error?.code === 'UNSUPPORTED_PARAMETER');
}

async function main() {
  const publicAction = toPublicAction({
    id: 'db-action-id',
    publicId: 'ZY-ACT-P2-001',
    externalActionId: 'provider-private-id',
    quoteId: 'quote-private-id',
    idempotencyKey: 'idempotency-secret',
    providerSlug: 'declared-provider',
    providerName: 'Declared Provider',
    status: 'AWAITING_PAYMENT',
    paymentStatus: 'PENDING',
    total: 54000,
    currency: 'UZS',
    fulfillmentType: 'DELIVERY',
    paymentUrl: 'https://provider.example/checkout',
    customer: { name: 'Private Customer', phone: '+998900000000' },
    parameters: { internal: true },
    metadata: { internal: true },
    timeline: [{ id: 'private-event' }],
    createdAt: '2026-09-18T10:00:00.000Z',
    updatedAt: '2026-09-18T10:00:00.000Z'
  });
  assert.deepEqual(Object.keys(publicAction).sort(), [
    'actionId', 'checkoutUrl', 'createdAt', 'currency', 'fulfillmentType',
    'nextAction', 'paymentStatus', 'providerName', 'providerSlug', 'status',
    'supportContact', 'total', 'updatedAt'
  ].sort());
  assert.equal(publicAction.actionId, 'ZY-ACT-P2-001');
  assert.equal(publicAction.checkoutUrl, 'https://provider.example/checkout');
  assert.doesNotMatch(JSON.stringify(publicAction), /db-action-id|provider-private-id|quote-private-id|idempotency-secret|Private Customer/);

  assert.equal(
    SELECTED_OPTION_QUANTITY_SEMANTICS,
    'PER_ITEM: option charge = priceDelta × selectedOption.quantity × item.quantity'
  );
  assert.equal(3000 * 1 * 2, 6000, 'One 3,000 UZS option on two items costs 6,000 UZS.');

  const adapter = declaredAdapter() as any;
  await assertDeclaredDynamicParameters(adapter, 'declared-provider', { serviceDate: '2026-10-01', guests: 2 }, { offeringIds: ['declared-offering'] });
  await expectUnsupported(() => assertDeclaredDynamicParameters(adapter, 'declared-provider', {}, { offeringIds: ['declared-offering'] }));
  await expectUnsupported(() => assertDeclaredDynamicParameters(adapter, 'declared-provider', { serviceDate: '2026-10-01', ignored: true }, { offeringIds: ['declared-offering'] }));

  const staticAdapter = { hasCapability: () => false } as any;
  await expectUnsupported(() => assertDeclaredDynamicParameters(staticAdapter, 'static-provider', ['unexpected'] as any));
  await expectUnsupported(() => assertDeclaredDynamicParameters(staticAdapter, 'static-provider', 'unexpected' as any));

  const original = {
    providerFindUnique: prisma.provider.findUnique,
    quoteFindUnique: prisma.quote.findUnique,
    actionFindUnique: prisma.action.findUnique,
    actionFindFirst: prisma.action.findFirst,
    actionUpdate: prisma.action.update,
    actionEventCreate: prisma.actionEvent.create
  };

  try {
    let quoteAdapterCalls = 0;
    const quoteAdapter = {
      ...declaredAdapter(),
      requestQuote: async () => {
        quoteAdapterCalls += 1;
        throw new Error('requestQuote must not receive invalid parameters');
      }
    };
    (prisma.provider as any).findUnique = async () => publishedProvider;
    const quotes = new QuotesService({ assertAndGetCapability: async () => quoteAdapter } as any);
    await expectUnsupported(() => quotes.requestQuote({
      providerSlug: 'declared-provider',
      items: [{ offeringId: 'declared-offering', quantity: 1 }],
      parameters: { serviceDate: '2026-10-01', ignored: true }
    } as any));
    assert.equal(quoteAdapterCalls, 0, 'Quote adapter must not receive undeclared parameters.');

    let actionAdapterCalls = 0;
    const actionAdapter = {
      ...declaredAdapter(),
      createAction: async () => {
        actionAdapterCalls += 1;
        throw new Error('createAction must not receive invalid parameters');
      }
    };
    (prisma.quote as any).findUnique = async () => ({
      id: 'quote-p2', providerId: publishedProvider.id, expiresAt: new Date(Date.now() + 60_000)
    });
    (prisma.action as any).findUnique = async () => null;
    (prisma.action as any).findFirst = async () => null;
    const actions = new ActionsService(
      { assertAndGetCapability: async () => actionAdapter } as any,
      { publish: async () => undefined } as any,
      { acquireLock: async () => true, releaseLock: async () => undefined } as any
    );
    await expectUnsupported(() => actions.createAction({
      idempotencyKey: 'p2-invalid-parameters',
      providerSlug: 'declared-provider',
      quoteId: 'quote-p2',
      customer: { name: 'Tester', phone: '+998900000000' },
      items: [{ offeringId: 'declared-offering', quantity: 1 }],
      parameters: { serviceDate: '2026-10-01', ignored: true },
      userConfirmed: true
    } as any));
    assert.equal(actionAdapterCalls, 0, 'Action adapter must not receive undeclared parameters.');

    const storedAction: any = {
      id: 'db-action-p2', publicId: 'ZY-ACT-P2-002', externalActionId: 'provider-action-p2',
      status: 'AWAITING_PAYMENT', provider: { slug: 'declared-provider' }
    };
    let cancelAdapterCalls = 0;
    (prisma.action as any).findFirst = async () => storedAction;
    (prisma.action as any).update = async () => {
      storedAction.status = 'CANCELLED';
      return storedAction;
    };
    (prisma.actionEvent as any).create = async () => ({});
    const cancellingActions = new ActionsService(
      { assertAndGetCapability: async () => ({
        cancelAction: async () => {
          cancelAdapterCalls += 1;
          return {
            success: true, actionId: 'provider-rewritten-id', externalActionId: 'provider-action-p2',
            previousStatus: 'AWAITING_PAYMENT', newStatus: 'CANCELLED', message: 'Cancelled', refundInitiated: false
          };
        }
      }) } as any,
      { publish: async () => undefined } as any,
      {} as any
    );
    const firstCancel = await cancellingActions.cancelAction({ actionId: 'ZY-ACT-P2-002' });
    const repeatedCancel = await cancellingActions.cancelAction({ actionId: 'ZY-ACT-P2-002' });
    assert.equal(firstCancel.actionId, 'ZY-ACT-P2-002');
    assert.equal(firstCancel.externalActionId, 'provider-action-p2');
    assert.equal(repeatedCancel.actionId, 'ZY-ACT-P2-002');
    assert.equal(repeatedCancel.externalActionId, 'provider-action-p2');
    assert.equal(cancelAdapterCalls, 1, 'Already-cancelled actions must not call the provider again.');
  } finally {
    (prisma.provider as any).findUnique = original.providerFindUnique;
    (prisma.quote as any).findUnique = original.quoteFindUnique;
    (prisma.action as any).findUnique = original.actionFindUnique;
    (prisma.action as any).findFirst = original.actionFindFirst;
    (prisma.action as any).update = original.actionUpdate;
    (prisma.actionEvent as any).create = original.actionEventCreate;
  }

  console.log('P2 action and dynamic-parameter contracts passed.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
