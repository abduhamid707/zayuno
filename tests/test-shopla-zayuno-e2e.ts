import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import {
  ProviderCapability,
  ProviderFulfillmentMode,
  ProviderStatus,
  ProviderType,
} from '../packages/contracts/src/provider';
import { RemoteHttpProviderAdapter } from '../packages/provider-sdk/src/remote-http-adapter';

// Ensure internal localhost calls are permitted
process.env.ALLOW_INTERNAL_PROVIDERS = 'true';

const SHOP_ID = '67b000000000000000000001';
const PRODUCT_ID = '67b000000000000000000002';
const VARIANT_ID = '67b000000000000000000003';
const OFFERING_ID = `${PRODUCT_ID}:${VARIANT_ID}`;
const PROVIDER_SLUG = 'shopla-zayuno-boutique';
const VALID_API_KEY = 'zk_live_e2e_secret_key_888';
const SHOPLA_BASE_URL = `http://127.0.0.1:8001/api/v1/zayuno/shops/${SHOP_ID}`;
const SEED_SCRIPT = 'D:/works/DEV/aa_startup_v1/brend-market/scripts/seed-e2e-shop.js';

console.log('========================================================================');
console.log('🧪 Starting REAL Shopla ↔ Zayuno Provider Protocol v1 E2E Integration Test');
console.log(`   Target Server: ${SHOPLA_BASE_URL}`);
console.log(`   Target Shop ID: ${SHOP_ID}`);
console.log('========================================================================\n');

function getMongoStock() {
  const output = execSync(`node "${SEED_SCRIPT}" check-stock`, { encoding: 'utf8' });
  const parsed = JSON.parse(output.trim());
  return {
    quantity: parsed.quantity,
    reserved: parsed.reserved,
    available: parsed.available,
  };
}

async function runLiveE2ETest() {
  // 0. Verify initial MongoDB Stock
  const initialStock = getMongoStock();
  console.log(`📦 Initial Mongo Stock: Quantity=${initialStock.quantity}, Reserved=${initialStock.reserved}, Available=${initialStock.available}`);
  assert.equal(initialStock.quantity, 10, 'Initial quantity must be 10');
  assert.equal(initialStock.reserved, 0, 'Initial reserved must be 0');

  const adapter = new RemoteHttpProviderAdapter({
    slug: PROVIDER_SLUG,
    baseUrl: SHOPLA_BASE_URL,
    secret: VALID_API_KEY,
    authMethod: 'API_KEY',
    metadata: {
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
      ],
      fulfillmentMode: ProviderFulfillmentMode.DELIVERY,
    },
  });

  // 1. Health Check
  console.log('1. [GET /health] Testing adapter.checkHealth()...');
  const health = await adapter.checkHealth();
  assert.equal(health.status, 'HEALTHY');
  assert.ok(health.latencyMs >= 0);
  assert.ok(health.timestamp);
  console.log('   ✅ Health check PASS! Status:', health.status, `(${health.latencyMs}ms)`);

  // 2. Provider Info
  console.log('2. [GET /provider-info] Testing adapter.getProviderInfo()...');
  const info = await adapter.getProviderInfo();
  assert.equal(info.slug, PROVIDER_SLUG);
  assert.equal(info.name, 'Zayuno Flower Boutique');
  assert.equal(info.status, ProviderStatus.ACTIVE);
  assert.equal(info.type, ProviderType.RETAIL);
  assert.equal(info.fulfillmentMode, ProviderFulfillmentMode.DELIVERY);
  assert.ok(info.capabilities.includes(ProviderCapability.ACTION_CREATE));
  console.log('   ✅ Provider Info PASS! Name:', info.name, 'Fulfillment:', info.fulfillmentMode);

  // 3. Locations
  console.log('3. [GET /locations] Testing adapter.getLocations()...');
  const locations = await adapter.getLocations();
  assert.ok(locations.length >= 1, 'Should have at least 1 branch');
  assert.equal(locations[0].coordinates?.latitude, 41.311081);
  assert.equal(locations[0].coordinates?.longitude, 69.240562);
  assert.equal(locations[0].providerId, PROVIDER_SLUG);
  console.log('   ✅ Locations PASS! Address:', locations[0].address);

  // 4. Catalog
  console.log('4. [GET /catalog] Testing adapter.getCatalog()...');
  const catalog = await adapter.getCatalog({ providerSlug: PROVIDER_SLUG });
  assert.equal(catalog.providerSlug, PROVIDER_SLUG);
  assert.ok(catalog.offerings.length >= 1);
  const mainOffering = catalog.offerings.find((o) => o.id === OFFERING_ID);
  assert.ok(mainOffering, `Offering ${OFFERING_ID} must be present in catalog`);
  assert.equal(mainOffering.basePrice, 180000);
  assert.equal(mainOffering.currency, 'UZS');
  assert.equal(mainOffering.isAvailable, true);
  assert.equal(mainOffering.providerId, PROVIDER_SLUG);
  assert.equal(mainOffering.variants?.[0]?.basePrice, 180000);
  console.log('   ✅ Catalog PASS! Offering count:', catalog.offerings.length, 'Item:', mainOffering.title);

  // 5. Search
  console.log('5. [GET /search] Testing adapter.searchOfferings()...');
  const searchResults = await adapter.searchOfferings({ providerSlug: PROVIDER_SLUG, query: 'atirgul' });
  assert.ok(searchResults.length >= 1, 'Search for "atirgul" should return results');
  assert.ok(searchResults[0].title.toLowerCase().includes('atirgul'));
  console.log('   ✅ Catalog Search PASS! Matched:', searchResults[0].title);

  // 6. Offering by ID
  console.log('6. [GET /offerings/:id] Testing adapter.getOffering()...');
  const offering = await adapter.getOffering({ providerSlug: PROVIDER_SLUG, offeringId: OFFERING_ID });
  assert.equal(offering.id, OFFERING_ID);
  assert.equal(offering.title, 'Qizil Atirgul Premium');
  assert.equal(offering.basePrice, 180000);
  console.log('   ✅ Single Offering PASS! Title:', offering.title, 'Price:', offering.basePrice, offering.currency);

  // 7. Security: Variant Fallback Bug Check
  console.log('7. [GET /offerings/:id] Testing security: Non-existent variant must return 404 (no silent fallback)...');
  let variant404Caught = false;
  try {
    await adapter.getOffering({
      providerSlug: PROVIDER_SLUG,
      offeringId: `${PRODUCT_ID}:nonexistent_variant_999`,
    });
  } catch (err: any) {
    if (err.message.includes('404') || err.message.includes('Variant topilmadi')) {
      variant404Caught = true;
    }
  }
  assert.ok(variant404Caught, 'Non-existent variant must throw 404 Not Found');
  console.log('   ✅ Variant Fallback Security PASS! Prevented incorrect product fulfillment.');

  // 8. Stock Availability Check (Sufficient vs Insufficient)
  console.log('8. [POST /availability] Testing adapter.checkAvailability()...');
  const availSufficient = await adapter.checkAvailability({
    providerSlug: PROVIDER_SLUG,
    items: [{ offeringId: OFFERING_ID, quantity: 2 }],
  });
  assert.equal(availSufficient.isAvailable, true, 'Quantity 2 should be available');

  const availInsufficient = await adapter.checkAvailability({
    providerSlug: PROVIDER_SLUG,
    items: [{ offeringId: OFFERING_ID, quantity: 50 }],
  });
  assert.equal(availInsufficient.isAvailable, false, 'Quantity 50 should exceed stock');
  assert.ok(availInsufficient.unavailableItems.length > 0);
  console.log('   ✅ Availability PASS! Quantity 2: available; Quantity 50: rejected as out-of-stock.');

  // 9. Request Quote with Dynamic Delivery Settings
  console.log('9. [POST /quote] Testing adapter.requestQuote()...');
  const quote = await adapter.requestQuote({
    providerSlug: PROVIDER_SLUG,
    items: [{ offeringId: OFFERING_ID, quantity: 1 }],
    destination: { raw: "Toshkent shahri, Navoiy ko'chasi 21", city: 'Toshkent' },
  });
  assert.ok(quote.id.startsWith('qt_'));
  assert.equal(quote.subtotal, 180000);
  assert.equal(quote.totalFees, 25000, 'Tashkent city delivery price must be 25,000 UZS');
  assert.equal(quote.total, 205000, '180,000 + 25,000 = 205,000 UZS');
  assert.equal(quote.currency, 'UZS');
  assert.ok(new Date(quote.expiresAt).getTime() > Date.now(), 'Quote TTL must be in future');
  console.log('   ✅ Quote PASS! ID:', quote.id, 'Subtotal:', quote.subtotal, 'Delivery:', quote.totalFees, 'Total:', quote.total);

  // 10. Security Gate: Create Action without API Key
  console.log('10. [POST /actions] Testing security: Unauthenticated action creation must return 401...');
  const unauthAdapter = new RemoteHttpProviderAdapter({
    slug: PROVIDER_SLUG,
    baseUrl: SHOPLA_BASE_URL,
    secret: 'invalid_or_missing_secret',
    authMethod: 'API_KEY',
  });
  let unauthCaught = false;
  try {
    await unauthAdapter.createAction({
      providerSlug: PROVIDER_SLUG,
      quoteId: quote.id,
      items: [{ offeringId: OFFERING_ID, quantity: 1 }],
      userConfirmed: true,
      idempotencyKey: 'idemp_unauth_test',
      destination: { raw: "Toshkent shahri, Navoiy ko'chasi 21" },
      customer: { name: 'Alisher Qodirov', phone: '+998901234567' },
    });
  } catch (err: any) {
    if (err.message.includes('401') || err.message.includes('API kalit')) {
      unauthCaught = true;
    }
  }
  assert.ok(unauthCaught, 'Unauthenticated createAction must throw 401 Unauthorized');
  console.log('   ✅ API Key Authentication Gate PASS! Unauthorized access rejected.');

  // 11. Authenticated Direct Order Creation & Stock Reservation
  console.log('11. [POST /actions] Testing adapter.createAction() with real order & stock reservation...');
  const testIdempotencyKey = `idemp_live_test_${Date.now()}`;
  const action = await adapter.createAction({
    providerSlug: PROVIDER_SLUG,
    quoteId: quote.id,
    items: [{ offeringId: OFFERING_ID, quantity: 1 }],
    userConfirmed: true,
    idempotencyKey: testIdempotencyKey,
    destination: { raw: "Toshkent shahri, Navoiy ko'chasi 21" },
    customer: { name: 'Alisher Qodirov', phone: '+998901234567' },
  });

  assert.ok(action.id, 'Order ID must exist');
  assert.ok(action.publicId.startsWith('ZY-'));
  assert.equal(action.status, 'AWAITING_PAYMENT');
  assert.equal(action.total, 205000);
  assert.equal(action.currency, 'UZS');
  assert.equal(action.nextAction?.type, 'OPEN_URL');
  assert.ok(action.nextAction?.url.startsWith('https://checkout.payme.uz/'));

  // Verify Payme Base64 URL Parameters
  const b64 = action.nextAction.url.split('/').pop()!;
  const decodedPaymeParams = Buffer.from(b64, 'base64').toString('utf8');
  assert.ok(decodedPaymeParams.includes('m=6a57648cb5022b89126e063e'), 'Must contain actual Payme Merchant ID');
  assert.ok(decodedPaymeParams.includes(`ac.order_id=${action.id}`), 'Must contain accurate Order ID');
  assert.ok(decodedPaymeParams.includes('a=20500000'), 'Must contain 205,000 UZS in tiyin (205,000 * 100 = 20,500,000)');
  console.log('   ✅ Direct Order & Payme Checkout PASS! Public ID:', action.publicId);
  console.log('      Payme URL params verified:', decodedPaymeParams);

  // 12. Verify Stock Reserved in Real MongoDB
  console.log('12. [MongoDB Verification] Checking atomic stock reservation...');
  const stockAfterOrder = getMongoStock();
  assert.equal(stockAfterOrder.quantity, 10, 'Total quantity remains 10');
  assert.equal(stockAfterOrder.reserved, 1, 'Reserved must be incremented to 1');
  assert.equal(stockAfterOrder.available, 9, 'Available must be decremented to 9');
  console.log(`   ✅ Atomic Warehouse Reservation PASS! Reserved=${stockAfterOrder.reserved}, Available=${stockAfterOrder.available}`);

  // 13. Idempotency Test: Exact Same Key & Payload
  console.log('13. [POST /actions] Testing Idempotency Replay (Same key, same payload)...');
  const replayedAction = await adapter.createAction({
    providerSlug: PROVIDER_SLUG,
    quoteId: quote.id,
    items: [{ offeringId: OFFERING_ID, quantity: 1 }],
    userConfirmed: true,
    idempotencyKey: testIdempotencyKey,
    destination: { raw: "Toshkent shahri, Navoiy ko'chasi 21" },
    customer: { name: 'Alisher Qodirov', phone: '+998901234567' },
  });
  assert.equal(replayedAction.id, action.id, 'Idempotent replay must return the identical order ID');
  const stockAfterReplay = getMongoStock();
  assert.equal(stockAfterReplay.reserved, 1, 'Stock must NOT be double-reserved on replay');
  console.log('   ✅ Idempotency Replay PASS! Returned identical order without double-booking.');

  // 14. Idempotency Tamper Test: Same Key with Modified Payload
  console.log('14. [POST /actions] Testing Idempotency Tamper Protection (Same key, altered payload)...');
  let tamperCaught = false;
  try {
    await adapter.createAction({
      providerSlug: PROVIDER_SLUG,
      quoteId: quote.id,
      items: [{ offeringId: OFFERING_ID, quantity: 2 }], // Altered quantity!
      userConfirmed: true,
      idempotencyKey: testIdempotencyKey,
      destination: { raw: "Toshkent shahri, Navoiy ko'chasi 21" },
      customer: { name: 'Alisher Qodirov', phone: '+998901234567' },
    });
  } catch (err: any) {
    if (err.message.includes('409') || err.message.includes('Idempotency kaliti boshqa buyurtmaga biriktirilgan')) {
      tamperCaught = true;
    }
  }
  assert.ok(tamperCaught, 'Tampered idempotency payload must be rejected with 409 Conflict');
  console.log('   ✅ Idempotency Tamper Protection PASS! Prevented payload forgery.');

  // 15. Action Status
  console.log('15. [GET /actions/:id] Testing adapter.getAction()...');
  const fetchedAction = await adapter.getAction({ providerSlug: PROVIDER_SLUG, actionId: action.id });
  assert.equal(fetchedAction.id, action.id);
  assert.equal(fetchedAction.status, 'AWAITING_PAYMENT');
  assert.equal(fetchedAction.total, 205000);
  console.log('   ✅ Action Status Query PASS! Status:', fetchedAction.status);

  // 16. Payment Options
  console.log('16. [GET /actions/:id/payment-options] Testing adapter.getPaymentOptions()...');
  const paymentOptions = await adapter.getPaymentOptions({ providerSlug: PROVIDER_SLUG, actionId: action.id });
  assert.ok(paymentOptions.length >= 1);
  assert.equal(paymentOptions[0].id, 'payme');
  assert.equal(paymentOptions[0].type, 'PAYME');
  assert.ok(paymentOptions[0].checkoutUrl?.startsWith('https://checkout.payme.uz/'));
  console.log('   ✅ Payment Options PASS! Provider:', paymentOptions[0].name, 'Type:', paymentOptions[0].type);

  // 17. Action Cancellation & Stock Release
  console.log('17. [POST /actions/:id/cancel] Testing adapter.cancelAction()...');
  const cancelResult = await adapter.cancelAction({
    providerSlug: PROVIDER_SLUG,
    actionId: action.id,
    reason: 'Foydalanuvchi sinov maqsadida bekor qildi',
  });
  assert.equal(cancelResult.success, true);
  assert.equal(cancelResult.newStatus, 'CANCELLED');
  console.log('   ✅ Action Cancellation PASS! New Status:', cancelResult.newStatus);

  // 18. Verify Stock Released in Real MongoDB
  console.log('18. [MongoDB Verification] Checking stock release after cancellation...');
  const stockAfterCancel = getMongoStock();
  assert.equal(stockAfterCancel.quantity, 10);
  assert.equal(stockAfterCancel.reserved, 0, 'Reserved stock must be reset to 0');
  assert.equal(stockAfterCancel.available, 10, 'Available stock must be fully restored to 10');
  console.log(`   ✅ Warehouse Stock Release PASS! Reserved=${stockAfterCancel.reserved}, Available=${stockAfterCancel.available}`);

  console.log('\n========================================================================');
  console.log('🎉 ALL 18 REAL E2E INTEGRATION TESTS PASSED 100% CLEANLY!');
  console.log('   - No mock servers used.');
  console.log('   - Real Shopla NestJS Backend + Real MongoDB + Zayuno Provider SDK.');
  console.log('   - Full Protocol v1 Contract Validation Verified.');
  console.log('========================================================================\n');
}

runLiveE2ETest().catch((err) => {
  console.error('\n❌ E2E Integration Test FAILED with error:');
  console.error(err);
  process.exit(1);
});
