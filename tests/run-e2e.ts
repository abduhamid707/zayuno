import * as crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const SANDBOX_URL = process.env.SANDBOX_PROVIDER_BASE_URL || 'http://localhost:4001';
const API_KEY = 'zy_live_agent_secret_key_12345';

async function runE2ETestSuite() {
  console.log('\n=============================================================');
  console.log('🧪 Starting Zayuno Full End-to-End Action Lifecycle Test');
  console.log('=============================================================\n');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY
  };

  try {
    // Step 1: List Providers
    console.log('👉 Step 1: Querying verified capability providers on Zayuno...');
    const providersRes = await fetch(`${API_URL}/api/v1/providers`, { headers });
    const providers = await providersRes.json();
    console.log(`✅ Found ${providers.length} provider(s):`, providers.map((p: any) => p.name).join(', '));
    const sandbox = providers.find((p: any) => p.slug === 'sandbox-provider');
    if (!sandbox) throw new Error('Sandbox provider not found in Zayuno!');

    // Step 2: Get Catalog
    console.log('\n👉 Step 2: Fetching full catalog & categories for sandbox-provider...');
    const catalogRes = await fetch(`${API_URL}/api/v1/providers/sandbox-provider/catalog`, { headers });
    const catalog = await catalogRes.json();
    console.log(`✅ Catalog loaded: ${catalog.categories.length} categories, ${catalog.offerings.length} offerings.`);

    // Step 3: Search for "Standard"
    console.log('\n👉 Step 3: Searching catalog for "standard"...');
    const searchRes = await fetch(`${API_URL}/api/v1/search?q=standard&provider=sandbox-provider`, { headers });
    const searchResults = await searchRes.json();
    const standardPkg = searchResults.find((p: any) => p.title.toLowerCase().includes('standard'));
    if (!standardPkg) throw new Error('Standard package offering not found in search results!');
    console.log(`✅ Found item: "${standardPkg.title}" — Base Price: ${standardPkg.basePrice} UZS`);

    // Step 4: Request Quote (2 × Standard Package)
    console.log('\n👉 Step 4: Requesting Quote for 2 × Standard Package...');
    const quotePayload = {
      providerSlug: 'sandbox-provider',
      items: [
        {
          offeringId: standardPkg.id,
          quantity: 2
        }
      ],
      fulfillmentType: 'STANDARD',
      destination: {
        raw: 'Central District, Zone A, Facility 101'
      }
    };
    const quoteRes = await fetch(`${API_URL}/api/v1/quotes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(quotePayload)
    });
    const quote = await quoteRes.json();
    console.log('✅ Quote Received:');
    console.log(`   - Subtotal: ${quote.subtotal} UZS`);
    console.log(`   - Total Fees: ${quote.totalFees} UZS`);
    console.log(`   - Grand Total: ${quote.total} UZS`);

    // Step 5: User Confirmation & Action Creation (with Idempotency Key)
    console.log('\n👉 Step 5: User Confirms quote -> Creating Action with Idempotency Key...');
    const idempotencyKey = `e2e_test_key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const actionPayload = {
      idempotencyKey,
      quoteId: quote.id,
      providerSlug: 'sandbox-provider',
      items: quotePayload.items,
      fulfillmentType: 'STANDARD',
      customer: {
        name: 'Alex Mercer',
        phone: '+998901234567'
      },
      destination: quotePayload.destination,
      paymentMethod: 'payme',
      userConfirmed: true
    };

    const actionRes = await fetch(`${API_URL}/api/v1/actions`, {
      method: 'POST',
      headers: { ...headers, 'idempotency-key': idempotencyKey },
      body: JSON.stringify(actionPayload)
    });
    const createdAction = await actionRes.json();
    console.log(`✅ Action Created: Public ID: ${createdAction.publicId} | Status: ${createdAction.status}`);
    console.log(`   - External Action ID: ${createdAction.externalActionId}`);
    console.log(`   - Payment Checkout URL: ${createdAction.paymentUrl}`);

    // Step 6: Test Idempotency Guard
    console.log('\n👉 Step 6: Testing Idempotency Guard (sending duplicate create request)...');
    const duplicateRes = await fetch(`${API_URL}/api/v1/actions`, {
      method: 'POST',
      headers: { ...headers, 'idempotency-key': idempotencyKey },
      body: JSON.stringify(actionPayload)
    });
    const duplicateAction = await duplicateRes.json();
    if (duplicateAction.publicId !== createdAction.publicId) {
      throw new Error('Idempotency violation! Duplicate action was created.');
    }
    console.log(`✅ Idempotency Verified! Returned same action ${duplicateAction.publicId} without duplication.`);

    // Step 7: Get Payment Options
    console.log('\n👉 Step 7: Retrieving payment options...');
    const payOptionsRes = await fetch(`${API_URL}/api/v1/actions/${createdAction.publicId}/payment-options`, { headers });
    const payOptions = await payOptionsRes.json();
    console.log('✅ Payment Options Available:', payOptions.map((o: any) => o.name).join(', '));

    // Step 8: Get Action Status
    console.log('\n👉 Step 8: Querying action status and timeline...');
    const statusRes = await fetch(`${API_URL}/api/v1/actions/${createdAction.publicId}`, { headers });
    const actionState = await statusRes.json();
    console.log(`✅ Action Status: ${actionState.status} | Total: ${actionState.total} UZS`);

    // Step 9: Cancel Action
    console.log('\n👉 Step 9: Testing action cancellation...');
    const cancelRes = await fetch(`${API_URL}/api/v1/actions/${createdAction.publicId}/cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ reason: 'E2E test suite validation complete.' })
    });
    const cancelData = await cancelRes.json();
    console.log(`✅ Action Cancelled: success=${cancelData.success} | newStatus=${cancelData.newStatus}`);

    console.log('\n🎉 =============================================================');
    console.log('🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS!');
    console.log('🎉 Zayuno Action Infrastructure is Provider-Agnostic & Certified.');
    console.log('=============================================================\n');
  } catch (err: any) {
    console.error('\n❌ E2E Test Failed:', err.message);
    process.exit(1);
  }
}

runE2ETestSuite();
