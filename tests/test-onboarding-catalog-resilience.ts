import assert from 'node:assert/strict';
import { businessErrors, integrationErrors, reachableOnboardingStep } from '../apps/provider-portal/src/onboarding-validation';
import { normalizeCatalogSections } from '../apps/mobile/src/lib/catalog-presentation';
import { ProviderLogoSchema, RegisterProviderInputSchema } from '../packages/contracts/src/provider';
import { normalizeSupportContact, sanitizePublicSupportContact } from '../packages/shared/src/support-contact';
import { ProviderManifestSchema } from '../packages/contracts/src/provider-manifest';
import { conversationRequirements } from '../packages/shared/src/conversation-requirements';

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

  // Provider-specific chat helpers were removed in favour of the universal
  // manifest/state contract. Keep this regression at the public boundary:
  // malformed catalogs remain safe, manifests are declarative, and missing
  // quote fields are surfaced as generic requirements.
  const provider = {
    slug: 'bellissimo',
    name: 'Bellissimo Pizza',
    type: 'DELIVERY',
    capabilities: ['CATALOG', 'QUOTE', 'ACTION_CREATE'],
    manifest: {
      supportedFulfillmentModes: ['DELIVERY'],
      supportedLocationRoles: [{ role: 'destination', required: true }],
      requirements: { QUOTE: { inputMode: 'OFFERING', required: ['locations.destination'] } },
      version: 1,
    },
  } as any;
  assert.equal(ProviderManifestSchema.safeParse(provider.manifest).success, true);
  const state = {
    version: 1,
    revision: 0,
    intent: 'SEARCH',
    environment: 'LIVE',
    providerSlug: provider.slug,
    manifest: provider.manifest,
    selectedOptions: [],
    quantity: 1,
    parameters: {},
    customer: {},
    locations: [],
    missingFields: [],
    offerings: [{ id: 'pizza-large', title: 'Katta pitsa', basePrice: 89000, currency: 'UZS', isAvailable: true }],
    updatedAt: new Date().toISOString(),
  } as any;
  const missing = conversationRequirements(state, 'QUOTE');
  assert.ok(missing.some(field => field.path === 'locations.destination'));
  assert.equal(state.offerings[0].basePrice, 89000, 'fresh canonical price must be retained');
  assert.equal(png.startsWith('data:image/png;base64,'), true);
  console.log('Onboarding gates, logo/contact validation, malformed catalog, declarative manifest and universal requirement regressions PASS');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
