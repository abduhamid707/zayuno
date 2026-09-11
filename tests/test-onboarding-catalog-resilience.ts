import assert from 'node:assert/strict';
import { businessErrors, integrationErrors, reachableOnboardingStep } from '../apps/provider-portal/src/onboarding-validation';
import { normalizeCatalogSections } from '../apps/mobile/src/lib/catalog-presentation';
import { ProviderLogoSchema, RegisterProviderInputSchema } from '../packages/contracts/src/provider';
import { ConsumerChatService } from '../apps/api/src/modules/consumer/chat/consumer-chat.service';

async function main() {
  const business = { businessName: 'Cafe', supportPhone: '', supportTelegram: '', supportEmail: 'help@example.com' };
  assert.deepEqual(businessErrors(business), {});
  assert.ok(businessErrors({ ...business, supportEmail: '' }).supportPhone);
  assert.ok(businessErrors({ ...business, supportPhone: 'hello' }).supportPhone);
  const fields = { slug: 'test-cafe', baseUrl: 'https://example.com/api', apiSecret: 'test-secret-12345', hasSavedSecret: false, sandbox: false, generatedSecret: '', confirmed: false };
  assert.deepEqual(integrationErrors(fields), {});
  assert.ok(integrationErrors({ ...fields, baseUrl: '' }).baseUrl);
  assert.ok(integrationErrors({ ...fields, baseUrl: 'https://user:pass@example.com' }).baseUrl);
  assert.ok(integrationErrors({ ...fields, apiSecret: '' }).apiSecret);
  assert.ok(integrationErrors({ ...fields, generatedSecret: 'new-key' }).apiSecret);
  assert.equal(reachableOnboardingStep(true, false, true, true), 3);
  assert.equal(reachableOnboardingStep(true, true, false, true), 4);
  assert.equal(reachableOnboardingStep(true, true, true, false), 5);
  assert.equal(reachableOnboardingStep(true, true, true, true), 6);
  assert.equal(ProviderLogoSchema.safeParse('data:image/svg+xml;base64,PHN2Zz4=').success, false);
  assert.equal(ProviderLogoSchema.safeParse('data:image/png;base64,SGVsbG8=').success, false);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=';
  assert.equal(ProviderLogoSchema.safeParse(png).success, true);
  const registration = { name: 'Cafe', slug: 'test-cafe', capabilities: ['HEALTH'], supportContact: { email: 'bad' } };
  assert.equal(RegisterProviderInputSchema.safeParse(registration).success, false);

  const item = { offeringId: '1', providerSlug: 'cafe', title: 'A'.repeat(400), price: 18000, currency: 'UZS' };
  const normalized = normalizeCatalogSections([null, { categorySlug: 'food', offerings: [null, {}, item, item, { ...item, offeringId: '2', price: null, currency: {}, imageUrl: {} }] }]);
  assert.equal(normalized[0].offerings.length, 2);
  assert.equal(normalized[0].offerings[0].price, 18000);
  assert.equal(normalized[0].offerings[1].priceKnown, false);
  assert.equal(normalized[0].offerings[1].imageUrl, undefined);
  assert.deepEqual(normalizeCatalogSections({}), []);

  const chat: any = Object.create(ConsumerChatService.prototype);
  const provider = { slug: 'bellissimo', name: 'Bellissimo Pizza', type: 'DELIVERY', metadata: { category: 'food_delivery' } };
  chat.providersService = { listProviders: async () => [provider] };
  chat.handlePendingOrder = async () => undefined;
  chat.handleActiveActionFollowUp = async () => undefined;
  const originalRequest = 'Menga pitsa kerak kattasidan bitta zakaz qil';
  assert.equal(chat.matchFastIntentAnswer(originalRequest, []), undefined, 'dish requests must reach the planner');
  chat.planWithAi = async (request: string) => {
    assert.equal(request, originalRequest, 'brand selection must carry original size/quantity');
    return { intent: 'food_selection', query: 'katta pitsa bitta', quantity: 1, itemRequests: [{ query: originalRequest, quantity: 1 }], limit: 6, excludedOfferingIds: [] };
  };
  chat.loadLiveContext = async (plan: any) => {
    assert.equal(plan.intent, 'food_browse', 'generic large pizza is not an exact menu item');
    assert.deepEqual(plan.providerSlugs, ['bellissimo']);
    assert.match(plan.query, /katta/);
    return [{ ...provider, offerings: [{ id: 'pizza-large', title: 'Katta pitsa', basePrice: 89000, currency: 'UZS', isAvailable: true }] }];
  };
  const result = await chat.prepareChat({ userId: 'test', prompt: 'Bellissimo Pizza', messages: [{ role: 'user', content: originalRequest }, { role: 'assistant', content: 'Restoranni tanlang' }] });
  assert.equal(result.interaction.sections[0].offerings[0].price, 89000);
  // UI presentation must use new live data, not an unrelated 24h Redis cache.
  chat.redisService = { get: async () => { throw new Error('Stale UI cache must not be read'); } };
  const catalog = await chat.getCachedOrCuratedCatalogInteraction({ needsCatalog: true, query: '' }, [{ ...provider, offerings: [{ id: 'x', title: 'No price' }, { id: 'free', title: 'Free', basePrice: 0, currency: 'UZS' }] }]);
  assert.equal(catalog.sections[0].offerings[0].priceKnown, false);
  assert.equal(catalog.sections[0].offerings[1].priceKnown, true);
  assert.equal(catalog.locationName, undefined);
  assert.equal(chat.safeInteractionImage(png), png);
  chat.loadLiveContext = async () => [{ ...provider, offerings: [] }];
  const empty = await chat.prepareChat({ userId: 'test', prompt: 'Bellissimo Pizza', messages: [] });
  assert.match(empty.directAnswer, /ko‘rsata olmadim/);
  assert.doesNotMatch(empty.directAnswer, /menyusidan tanlang/);
  console.log('Onboarding gates, logo/contact validation, malformed catalog, request continuation and fresh menu regressions PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
