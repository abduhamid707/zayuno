import assert from 'node:assert/strict';
import { businessErrors, integrationErrors, reachableOnboardingStep } from '../apps/provider-portal/src/onboarding-validation';
import { normalizeCatalogSections } from '../apps/mobile/src/lib/catalog-presentation';
import { ProviderLogoSchema, RegisterProviderInputSchema } from '../packages/contracts/src/provider';
import { normalizeSupportContact, sanitizePublicSupportContact } from '../packages/shared/src/support-contact';
import { ConsumerChatService } from '../apps/api/src/modules/consumer/chat/consumer-chat.service';

async function main() {
  const business = { businessName: 'Cafe', supportPhone: '', supportTelegram: '', supportEmail: 'help@example.com', supportUrl: '', supportNote: '' };
  assert.deepEqual(businessErrors(business), {});
  assert.ok(businessErrors({ ...business, supportEmail: '' }).supportPhone);
  assert.ok(businessErrors({ ...business, supportPhone: 'hello' }).supportPhone);
  assert.deepEqual(businessErrors({ ...business, supportEmail: '', supportUrl: 'https://cafe.example/support' }), {});
  assert.ok(businessErrors({ ...business, supportUrl: 'http://cafe.example/support' }).supportUrl);
  assert.ok(businessErrors({ ...business, supportNote: 'a'.repeat(501) }).supportNote);
  const fields = { slug: 'test-cafe', baseUrl: 'https://example.com/api', apiSecret: 'test-secret-12345', hasSavedSecret: false, sandbox: false, generatedSecret: '', confirmed: false };
  assert.deepEqual(integrationErrors(fields), {});
  assert.ok(integrationErrors({ ...fields, baseUrl: '' }).baseUrl);
  assert.ok(integrationErrors({ ...fields, baseUrl: 'https://user:pass@example.com' }).baseUrl);
  assert.ok(integrationErrors({ ...fields, apiSecret: '' }).apiSecret);
  assert.ok(integrationErrors({ ...fields, generatedSecret: 'new-key' }).apiSecret);
  assert.equal(reachableOnboardingStep(false, false, false), 1);
  assert.equal(reachableOnboardingStep(true, false, false), 2);
  assert.equal(reachableOnboardingStep(true, true, false), 3);
  assert.equal(reachableOnboardingStep(true, true, true), 4);
  assert.equal(ProviderLogoSchema.safeParse('data:image/svg+xml;base64,PHN2Zz4=').success, false);
  assert.equal(ProviderLogoSchema.safeParse('data:image/png;base64,SGVsbG8=').success, false);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=';
  assert.equal(ProviderLogoSchema.safeParse(png).success, true);
  const registration = { name: 'Cafe', slug: 'test-cafe', capabilities: ['HEALTH'], supportContact: { email: 'bad' } };
  assert.equal(RegisterProviderInputSchema.safeParse(registration).success, false);
  assert.equal(RegisterProviderInputSchema.safeParse({ ...registration, supportContact: { supportUrl: 'https://cafe.example/support', supportNote: 'Order questions are answered here.' } }).success, true);
  assert.equal(RegisterProviderInputSchema.safeParse({ ...registration, supportContact: { supportUrl: 'http://cafe.example/support' } }).success, false);
  assert.deepEqual(
    sanitizePublicSupportContact(normalizeSupportContact({ supportUrl: 'https://cafe.example/support', supportNote: 'Order questions are answered here.', internalNote: 'never expose' })),
    { supportUrl: 'https://cafe.example/support', supportNote: 'Order questions are answered here.' },
  );

  const item = { offeringId: '1', providerSlug: 'cafe', title: 'A'.repeat(400), price: 18000, currency: 'UZS' };
  const normalized = normalizeCatalogSections([null, { categorySlug: 'food', offerings: [null, {}, item, item, { ...item, offeringId: '2', price: null, currency: {}, imageUrl: {} }] }]);
  assert.equal(normalized[0].offerings.length, 2);
  assert.equal(normalized[0].offerings[0].price, 18000);
  assert.equal(normalized[0].offerings[1].priceKnown, false);
  assert.equal(normalized[0].offerings[1].imageUrl, undefined);
  assert.deepEqual(normalizeCatalogSections({}), []);

  const provider = { slug: 'bellissimo', name: 'Bellissimo Pizza', type: 'DELIVERY', capabilities: ['CATALOG'], metadata: { category: 'food_delivery' } };
  const chat: any = new ConsumerChatService(
    { listProviders: async () => [provider] } as any,
    {} as any,
    {} as any,
    {} as any,
    { get: async () => null, set: async () => undefined, del: async () => undefined } as any,
  );
  chat.handlePendingOrder = async () => undefined;
  chat.handleActiveActionFollowUp = async () => undefined;
  const originalRequest = 'Menga pitsa kerak kattasidan bitta zakaz qil';
  assert.equal(chat.matchFastIntentAnswer(originalRequest, []), undefined, 'dish requests must reach the planner');
  chat.planWithAi = async (request: string, history: Array<{ role: string; content: string }>) => {
    assert.equal(request, 'Bellissimo Pizza', 'the latest provider selection must be the planner input');
    assert.ok(history.some(message => message.content === originalRequest), 'brand selection must retain the original size/quantity in conversation context');
    return {
      intent: 'food_browse',
      query: 'katta pitsa bitta',
      quantity: 1,
      itemRequests: [{ query: originalRequest, quantity: 1 }],
      providerSlugs: ['bellissimo'],
      needsCatalog: true,
      limit: 6,
      excludedOfferingIds: [],
    };
  };
  chat.loadLiveContext = async (plan: any) => {
    assert.equal(plan.intent, 'food_browse', 'generic large pizza is not an exact menu item');
    assert.deepEqual(plan.providerSlugs, ['bellissimo']);
    assert.match(plan.query, /katta/);
    return [{ ...provider, offerings: [{ id: 'pizza-large', title: 'Katta pitsa', basePrice: 89000, currency: 'UZS', isAvailable: true }] }];
  };
  chat.recommendFood = async (_input: any, _history: any, _plan: any, liveContext: any[]) => ({
    interaction: { sections: [{ offerings: [{ price: liveContext[0].offerings[0].basePrice }] }] },
  });
  const result = await chat.prepareChat({ userId: 'test', prompt: 'Bellissimo Pizza', messages: [{ role: 'user', content: originalRequest }, { role: 'assistant', content: 'Restoranni tanlang' }] });
  assert.equal(result.interaction.sections[0].offerings[0].price, 89000);
  // UI presentation must use new live data, not an unrelated 24h Redis cache.
  chat.redisService = {
    get: async () => { throw new Error('Stale UI cache must not be read'); },
    set: async () => undefined,
    del: async () => undefined,
  };
  const catalog = await chat.getCachedOrCuratedCatalogInteraction({ needsCatalog: true, query: '' }, [{ ...provider, offerings: [{ id: 'x', title: 'No price' }, { id: 'free', title: 'Free', basePrice: 0, currency: 'UZS' }] }]);
  assert.equal(catalog.sections[0].offerings[0].priceKnown, false);
  assert.equal(catalog.sections[0].offerings[1].priceKnown, true);
  assert.equal(catalog.locationName, undefined);
  assert.equal(chat.safeInteractionImage(png), png);
  assert.match(
    chat.formatActionSupportHint('uz', { supportUrl: 'https://cafe.example/support', supportNote: 'Yordam xizmati 24/7 ishlaydi.' }),
    /Yordam xizmati 24\/7 ishlaydi/,
  );
  chat.loadLiveContext = async () => [{ ...provider, offerings: [] }];
  chat.planWithAi = async () => ({ intent: 'food_browse', query: 'pitsa', providerSlugs: ['bellissimo'], needsCatalog: true, limit: 6, excludedOfferingIds: [] });
  chat.recommendFood = async () => ({ directAnswer: 'Hozir bu menyuni ko‘rsata olmadim.' });
  const empty = await chat.prepareChat({ userId: 'test', prompt: 'Bellissimo Pizza', messages: [] });
  assert.match(empty.directAnswer, /ko‘rsata olmadim/);
  assert.doesNotMatch(empty.directAnswer, /menyusidan tanlang/);
  console.log('Onboarding gates, logo/contact validation, malformed catalog, request continuation and fresh menu regressions PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
