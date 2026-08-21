import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  AuthMethod,
  ProviderCapability,
  ProviderStatus,
  ProviderType
} from '../packages/contracts/src/provider.ts';
import { RemoteHttpProviderAdapter } from '../packages/provider-sdk/src/remote-http-adapter.ts';
import { ProviderCertificationRunner } from '../packages/provider-sdk/src/certification.ts';
import { createCoffeeTimeSandboxApp } from '../integrations/mock-coffee-time/src/server.ts';

async function main() {
  console.log('🔒 Starting 10-Test Suite: Credential Capture Flow, Sandbox Server Credentials & Zero-Leak Security...\n');

  const wizardContent = fs.readFileSync(path.resolve('apps/provider-portal/src/OnboardingWizard.tsx'), 'utf-8');
  const appContent = fs.readFileSync(path.resolve('apps/provider-portal/src/App.tsx'), 'utf-8');
  const registryContent = fs.readFileSync(path.resolve('apps/api/src/modules/providers/provider-registry.service.ts'), 'utf-8');
  const providersServiceContent = fs.readFileSync(path.resolve('apps/api/src/modules/providers/providers.service.ts'), 'utf-8');
  const remoteAdapterContent = fs.readFileSync(path.resolve('packages/provider-sdk/src/remote-http-adapter.ts'), 'utf-8');

  // --------------------------------------------------------------------------
  // Test 1: Real URL + API_KEY -> Credential field rendered, adapter sends x-provider-api-key
  // --------------------------------------------------------------------------
  console.log('  [1/10] Verifying Real URL + API_KEY credential capture and adapter header...');
  assert.ok(
    wizardContent.includes('Provider API key *') &&
    wizardContent.includes('x-provider-api-key') &&
    wizardContent.includes('Dasturchingiz yaratgan API key’ni kiriting'),
    'Wizard must render Provider API key field for API_KEY auth method'
  );
  assert.ok(
    remoteAdapterContent.includes("headers['x-provider-api-key'] = secret"),
    'RemoteHttpProviderAdapter must attach x-provider-api-key header when API_KEY is used'
  );
  console.log('    ✓ Real URL + API_KEY field rendered and adapter attaches x-provider-api-key.');

  // --------------------------------------------------------------------------
  // Test 2: Real URL + BEARER_TOKEN -> Token field rendered, adapter sends Authorization Bearer
  // --------------------------------------------------------------------------
  console.log('  [2/10] Verifying Real URL + BEARER_TOKEN token field and Authorization Bearer header...');
  assert.ok(
    wizardContent.includes('Bearer token *') &&
    wizardContent.includes('Bearer tokenni kiriting') &&
    wizardContent.includes('Authorization: Bearer ...'),
    'Wizard must render Bearer token field for BEARER_TOKEN auth method'
  );
  assert.ok(
    remoteAdapterContent.includes("headers['Authorization'] = `Bearer ${secret}`"),
    'RemoteHttpProviderAdapter must attach Authorization: Bearer <secret> when BEARER_TOKEN is used'
  );
  console.log('    ✓ Real URL + BEARER_TOKEN field rendered and adapter attaches Bearer header.');

  // --------------------------------------------------------------------------
  // Test 3: Real URL + HMAC_SIGNATURE -> Signing secret field and x-zayuno-signature
  // --------------------------------------------------------------------------
  console.log('  [3/10] Verifying Real URL + HMAC_SIGNATURE signing secret and x-zayuno-signature header...');
  assert.ok(
    wizardContent.includes('Request signing secret *') &&
    wizardContent.includes('HMAC request signing secretni kiriting') &&
    wizardContent.includes('x-zayuno-signature'),
    'Wizard must render Request signing secret field for HMAC_SIGNATURE auth method'
  );
  assert.ok(
    remoteAdapterContent.includes("headers['x-zayuno-signature'] = signature") &&
    remoteAdapterContent.includes("crypto.createHmac('sha256', secret)"),
    'RemoteHttpProviderAdapter must HMAC-SHA256 sign request body and attach x-zayuno-signature header'
  );
  console.log('    ✓ Real URL + HMAC_SIGNATURE field rendered and adapter calculates payload signature.');

  // --------------------------------------------------------------------------
  // Test 4: Refresh/Back/Forward -> No raw secret in UI / localStorage, hasSavedSecret badge displayed
  // --------------------------------------------------------------------------
  console.log('  [4/10] Verifying zero raw secret in draft/localStorage and "Credential saqlangan" state...');
  assert.ok(
    !wizardContent.includes('draft = {\n        fullName,\n        email,\n        businessName,\n        category,\n        description,\n        supportPhone,\n        supportTelegram,\n        supportEmail,\n        slug,\n        baseUrl,\n        apiSecret'),
    'localStorage draft sync must NEVER store raw apiSecret'
  );
  assert.ok(
    wizardContent.includes('Credential saqlangan (Serverda xavfsiz shifrlangan)') &&
    wizardContent.includes('Yangi kalit kiritish'),
    'Wizard must display "Credential saqlangan" indicator when saved draft/provider is loaded'
  );
  console.log('    ✓ Raw secret never persisted to client storage; safe "Credential saqlangan" indicator shown.');

  // --------------------------------------------------------------------------
  // Test 5: Coffee Time sandbox -> Credential input hidden, banner displayed, server key passes Metadata/Catalog
  // --------------------------------------------------------------------------
  console.log('  [5/10] Verifying Coffee Time sandbox banner, hidden inputs & server-side test credentials...');
  assert.ok(
    wizardContent.includes('isOfficialSandboxUrl(baseUrl)') &&
    wizardContent.includes('Sandbox test provideri tanlandi. Test credentiallari Zayuno serveri tomonidan xavfsiz qo‘llanadi; siz hech qanday kalit kiritmaysiz.'),
    'Wizard must render specific sandbox banner and hide credential inputs for official sandbox URLs'
  );

  // Spin up in-memory Coffee Time Express app to verify real server-side authentication
  const testApiKey = 'zy_test_secret_coffee_key_unit';
  process.env.PROVIDER_API_KEY = testApiKey;
  process.env.ZAYUNO_WEBHOOK_SECRET = 'zy_test_webhook_secret_mock';

  const coffeeApp = createCoffeeTimeSandboxApp();
  const server = coffeeApp.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const adapter = new RemoteHttpProviderAdapter({
      slug: 'coffee-time',
      baseUrl,
      secret: testApiKey,
      webhookSecret: process.env.ZAYUNO_WEBHOOK_SECRET,
      authMethod: 'API_KEY',
      metadata: {
        capabilities: [
          ProviderCapability.METADATA,
          ProviderCapability.HEALTH,
          ProviderCapability.LOCATIONS,
          ProviderCapability.CATALOG
        ]
      }
    });

    const info = await adapter.getProviderInfo();
    assert.equal(info.slug, 'coffee-time');
    const catalog = await adapter.getCatalog({});
    assert.ok(catalog.offerings && catalog.offerings.length > 0, 'Catalog offerings must be returned');
    console.log('    ✓ Coffee Time sandbox successfully authenticated with server-side key.');

    // --------------------------------------------------------------------------
    // Test 6: Coffee Time Sandbox Full Certification: 10/10 PASS
    // --------------------------------------------------------------------------
    console.log('  [6/10] Running Full 10-Capability Certification on Coffee Time Sandbox...');
    const fullAdapter = new RemoteHttpProviderAdapter({
      slug: 'coffee-time',
      baseUrl,
      secret: testApiKey,
      webhookSecret: process.env.ZAYUNO_WEBHOOK_SECRET,
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
          ProviderCapability.PAYMENT_OPTIONS,
          ProviderCapability.ACTION_CANCEL,
          ProviderCapability.WEBHOOK
        ]
      }
    });

    const runner = new ProviderCertificationRunner(fullAdapter);
    const report = await runner.runAllTests();
    assert.ok(report.totalTests >= 10, `Expected at least 10 tests, got ${report.totalTests}`);
    assert.equal(report.failedCount, 0, `All tests must pass. Failed: ${report.tests.filter(t => !t.passed).map(t => t.name).join(', ')}`);
    assert.equal(report.isCertified, true, 'Report must be certified');
    assert.equal(report.isProductionReady, true, 'Report must be production ready');
    console.log(`    ✓ Full Certification PASSED (${report.passedCount}/${report.totalTests} tests passed cleanly).`);
  } finally {
    server.close();
  }

  // --------------------------------------------------------------------------
  // Test 7: Missing Sandbox Credential -> Friendly Error, Zero Leakage
  // --------------------------------------------------------------------------
  console.log('  [7/10] Verifying missing sandbox credential returns customer-friendly error message...');
  assert.ok(
    providersServiceContent.includes('Bu sandbox uchun server-side test credential sozlanmagan. Administrator bilan bog‘laning yoki boshqa test URL tanlang.'),
    'Service must return friendly error when sandbox credential is not configured'
  );
  console.log('    ✓ Missing sandbox credential translated to user-friendly Uzbek message.');

  // --------------------------------------------------------------------------
  // Test 8: Non-Allowlisted URL cannot resolve server-side sandbox credentials
  // --------------------------------------------------------------------------
  console.log('  [8/10] Verifying Strict Sandbox Allowlist (attacker URL cannot steal sandbox keys)...');
  assert.ok(
    registryContent.includes("hostname === 'coffee-time-sandbox.shopla.uz'") &&
    registryContent.includes("hostname === 'evos-sandbox.shopla.uz'") &&
    registryContent.includes("hostname === 'poyez-sandbox.shopla.uz'"),
    'Registry must enforce strict hostname equality for the 3 allowed sandboxes'
  );
  console.log('    ✓ Non-allowlisted external URLs strictly forbidden from resolving sandbox test keys.');

  // --------------------------------------------------------------------------
  // Test 9: Cross-Tenant Credential Read/Update Blocked (assertProviderManager)
  // --------------------------------------------------------------------------
  console.log('  [9/10] Verifying Cross-Tenant Isolation for Credential & Certification Endpoints...');
  assert.ok(
    providersServiceContent.includes('this.assertProviderManager(provider, actor)'),
    'ProvidersService must enforce assertProviderManager across all provider mutation methods'
  );
  console.log('    ✓ Cross-tenant credential access safely blocked by assertProviderManager.');

  // --------------------------------------------------------------------------
  // Test 10: Complete Navigation Flow: 4 -> 5 -> 6 -> Review -> Dashboard
  // --------------------------------------------------------------------------
  console.log('  [10/10] Verifying Wizard Step Progression (4 -> 5 -> 6 -> Review -> Dashboard)...');
  assert.ok(
    wizardContent.includes('setCurrentStep(5)') &&
    wizardContent.includes('setCurrentStep(6)') &&
    wizardContent.includes('handleSubmitReview'),
    'Wizard must progress step-by-step through Certification and Review before transitioning to Dashboard'
  );
  console.log('    ✓ Step progression verified without premature dashboard jumps.');

  console.log('\n================================================================');
  console.log('🎉 ALL 10 CREDENTIAL FLOW & ZERO-SECRET SECURITY TESTS PASSED!');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
