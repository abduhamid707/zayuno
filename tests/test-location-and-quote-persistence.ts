import assert from 'node:assert/strict';
import { prisma } from '../packages/database/src/client.ts';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service.ts';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';

const provider = {
  id: 'provider-internal-id',
  slug: 'mock-evos',
  status: 'ACTIVE' as any,
  metadata: {
    reviewStatus: 'APPROVED',
    isPublished: true,
    isCertified: true
  }
};
const internalLocationId = 'location-internal-id';
const quoteId = 'quote-persisted-id';
const providerLocationId = 'mock-evos-chilonzor';

async function main() {
  const original = {
    providerFindUnique: prisma.provider.findUnique,
    locationFindFirst: prisma.location.findFirst,
    quoteCreate: prisma.quote.create,
    quoteFindUnique: prisma.quote.findUnique,
    actionFindUnique: prisma.action.findUnique,
    actionCreate: prisma.action.create,
    actionEventCreate: prisma.actionEvent.create
  };
  const persistedQuotes: any[] = [];
  const persistedActions: any[] = [];

  try {
    (prisma.provider as any).findUnique = async () => provider;
    (prisma.location as any).findFirst = async () => ({ id: internalLocationId });
    (prisma.quote as any).create = async ({ data }: any) => { persistedQuotes.push(data); return data; };

    const quoteAdapter = {
      requestQuote: async () => ({
        id: quoteId, providerSlug: 'mock-evos', lines: [], subtotal: 10,
        totalFees: 2, totalDiscount: 0, total: 12, currency: 'UZS',
        expiresAt: new Date(Date.now() + 60_000).toISOString(), parameters: { sandbox: true }
      })
    };
    const quotes = new QuotesService({ assertAndGetCapability: async () => quoteAdapter } as any);
    await quotes.requestQuote({
      providerSlug: 'mock-evos', locationId: providerLocationId,
      items: [{ offeringId: 'mock_drink', quantity: 1 }]
    });
    assert.equal(persistedQuotes[0].locationId, internalLocationId);
    assert.equal(persistedQuotes[0].parameters.providerLocationId, providerLocationId);

    const dbQuote = {
      id: quoteId, providerId: provider.id, locationId: internalLocationId,
      expiresAt: new Date(Date.now() + 60_000)
    };
    (prisma.quote as any).findUnique = async () => dbQuote;
    (prisma.action as any).findUnique = async () => null;
    (prisma.action as any).create = async ({ data }: any) => {
      persistedActions.push(data);
      return {
        ...data, id: 'action-internal-id', createdAt: new Date(), updatedAt: new Date(),
        provider: { slug: 'mock-evos', name: 'Mock EVOS' }, location: null, timeline: []
      };
    };
    (prisma.actionEvent as any).create = async () => ({});

    const actionAdapter = {
      createAction: async () => ({
        id: 'provider-action', publicId: 'MOCK-EVOS-1', providerSlug: 'mock-evos',
        status: 'AWAITING_PAYMENT', nextAction: { type: 'OPEN_URL', url: 'https://evos-sandbox.shopla.uz/pay/test', label: 'Pay' },
        lines: [], subtotal: 10, fees: 2, discount: 0, total: 12, currency: 'UZS',
        customer: { name: 'Tester', phone: '+998900000000' }, fulfillmentType: 'STANDARD', paymentStatus: 'PENDING'
      })
    };
    const actions = new ActionsService(
      { assertAndGetCapability: async () => actionAdapter } as any,
      { publish: async () => undefined } as any,
      { acquireLock: async () => true, releaseLock: async () => undefined } as any
    );
    const normalizedAction = await actions.createAction({
      idempotencyKey: 'location-test-key', providerSlug: 'mock-evos', quoteId,
      locationId: providerLocationId, items: [{ offeringId: 'mock_drink', quantity: 1 }],
      customer: { name: 'Tester', phone: '+998900000000' }, userConfirmed: true
    });
    assert.equal(persistedActions[0].locationId, internalLocationId);
    assert.equal(persistedActions[0].metadata.providerLocationId, providerLocationId);
    assert.equal(normalizedAction.locationId, providerLocationId);

    (prisma.quote as any).findUnique = async () => ({ ...dbQuote, providerId: 'another-provider' });
    await assert.rejects(
      () => actions.createAction({
        idempotencyKey: 'wrong-provider-quote', providerSlug: 'mock-evos', quoteId,
        items: [{ offeringId: 'mock_drink', quantity: 1 }],
        customer: { name: 'Tester', phone: '+998900000000' }, userConfirmed: true
      }),
      /does not belong/
    );

    console.log('Location and quote persistence passed: external location IDs never enter relation fields, and quotes are provider-bound.');
  } finally {
    (prisma.provider as any).findUnique = original.providerFindUnique;
    (prisma.location as any).findFirst = original.locationFindFirst;
    (prisma.quote as any).create = original.quoteCreate;
    (prisma.quote as any).findUnique = original.quoteFindUnique;
    (prisma.action as any).findUnique = original.actionFindUnique;
    (prisma.action as any).create = original.actionCreate;
    (prisma.actionEvent as any).create = original.actionEventCreate;
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
