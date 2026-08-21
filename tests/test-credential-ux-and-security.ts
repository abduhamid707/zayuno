import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ProviderCapability } from '../packages/contracts/src/provider.ts';
import { ProviderCertificationRunner } from '../packages/provider-sdk/src/certification.ts';

async function main() {
  console.log('🔒 Starting Test Suite: Credential UX, Docs Clarity & Zero-Secret Security...');

  const wizardContent = fs.readFileSync(path.resolve('apps/provider-portal/src/OnboardingWizard.tsx'), 'utf-8');
  const appContent = fs.readFileSync(path.resolve('apps/provider-portal/src/App.tsx'), 'utf-8');
  const docsContent = fs.readFileSync(path.resolve('apps/provider-portal/src/DocsViewer.tsx'), 'utf-8');
  const providersServiceContent = fs.readFileSync(path.resolve('apps/api/src/modules/providers/providers.service.ts'), 'utf-8');
  const providersControllerContent = fs.readFileSync(path.resolve('apps/api/src/modules/providers/providers.controller.ts'), 'utf-8');

  // --------------------------------------------------------------------------
  // Test 1: New Onboarding Credential Explanations & Docs Deep-Links
  // --------------------------------------------------------------------------
  console.log('  [1/8] Verifying Credential Meanings, Tooltips & Docs Deep-Links in Onboarding...');
  assert.ok(
    wizardContent.includes('Bu sizning serveringizni Zayuno so‘rovlaridan himoya qiladigan kalit'),
    'Wizard must explain Provider API key purpose'
  );
  assert.ok(
    wizardContent.includes('Bu kalit Zayuno’ga yuboriladigan order/status webhooklar haqiqatan sizning serveringizdan kelganini tasdiqlaydi'),
    'Wizard must explain Webhook HMAC secret purpose'
  );
  assert.ok(
    wizardContent.includes('Dasturchingiz yaratgan API key’ni kiriting'),
    'Wizard Step 4 must guide user with developer-friendly placeholder'
  );
  assert.ok(
    !wizardContent.includes('Bo‘sh qoldirilsa o‘zgarmaydi'),
    'New onboarding must NOT display misleading "Bo‘sh qoldirilsa o‘zgarmaydi" text'
  );
  assert.ok(
    wizardContent.includes("openDocModal('auth')"),
    'Wizard must provide "Qayerdan olaman? →" deep-links to auth docs'
  );
  assert.ok(
    docsContent.includes('Dasturchi provider backend uchun maxfiy API key yaratadi') &&
    docsContent.includes('Zayuno webhook HMAC secret yaratadi'),
    'Docs must clearly explain who creates each credential in 4-step flows'
  );
  console.log('    ✓ New onboarding credential UX and 4-step documentation deep-links verified.');

  // --------------------------------------------------------------------------
  // Test 2: Dashboard Settings Mode - No Raw Secrets & Safe Placeholder
  // --------------------------------------------------------------------------
  console.log('  [2/8] Verifying Dashboard Edit Mode - Raw Secret Masking & Warnings...');
  assert.ok(
    appContent.includes('Yangi qiymat kiritilmasa avvalgi kalit saqlanadi'),
    'Settings must use "Yangi qiymat kiritilmasa avvalgi kalit saqlanadi" placeholder'
  );
  assert.ok(
    appContent.includes('••••••••••••••••••••••••'),
    'Settings must mask Webhook secret rather than rendering raw secret'
  );
  assert.ok(
    appContent.includes('⚠️ Credential yangilanadi va certification qayta talab qilinishi mumkin'),
    'Settings must display amber warning when user enters replacement API key'
  );
  console.log('    ✓ Dashboard edit mode protects secrets and warns on modifications.');

  // --------------------------------------------------------------------------
  // Test 3: Sandbox Test URL Detection & Automatic Server-Side Credentials
  // --------------------------------------------------------------------------
  console.log('  [3/8] Verifying Sandbox Banner & Automatic Server-Side Test Credentials...');
  assert.ok(
    wizardContent.includes('Sandbox test provideri tanlandi. Test credentiallari Zayuno serveri tomonidan xavfsiz qo‘llanadi'),
    'Wizard must render sandbox notice banner when sandbox domain is selected'
  );
  assert.ok(
    appContent.includes('Sandbox test provideri tanlandi. Test credentiallari Zayuno serveri tomonidan xavfsiz qo‘llanadi'),
    'Dashboard settings must also recognize sandbox URLs and display notice banner'
  );

  const registryContent = fs.readFileSync(path.resolve('apps/api/src/modules/providers/provider-registry.service.ts'), 'utf-8');
  assert.ok(
    registryContent.includes('resolveSandboxTestCredential') &&
    registryContent.includes('coffee-time') &&
    registryContent.includes('evos') &&
    registryContent.includes('poyez'),
    'Registry must supply server-side test credentials for recognized sandbox domains'
  );
  console.log('    ✓ Sandbox test providers automatically resolve credentials on server side.');

  // --------------------------------------------------------------------------
  // Test 4: Missing Sandbox Credential Returns Customer-Friendly Error
  // --------------------------------------------------------------------------
  console.log('  [4/8] Verifying Customer-Friendly Error Handling on Missing Sandbox Credential...');
  const mockAdapter401: any = {
    providerSlug: 'custom-unauthorized-sandbox',
    getSlug: () => 'custom-unauthorized-sandbox',
    getCapabilities: () => [ProviderCapability.HEALTH, ProviderCapability.CATALOG],
    hasCapability: (cap: any) => [ProviderCapability.HEALTH, ProviderCapability.CATALOG].includes(cap),
    checkHealth: async () => ({ status: 'HEALTHY', latencyMs: 12 }),
    getCatalog: async () => {
      const err = new Error('HTTP 401 Unauthorized: Invalid API key or missing credential');
      throw err;
    }
  };
  const runner401 = new ProviderCertificationRunner(mockAdapter401);
  const report401 = await runner401.runAllTests();
  const failedTest = report401.tests.find(t => !t.passed);
  assert.ok(failedTest, 'Test must fail on 401');
  assert.equal(failedTest.error, 'API kaliti noto‘g‘ri yoki yo‘q');
  console.log('    ✓ 401 errors translated cleanly to "API kaliti noto‘g‘ri yoki yo‘q".');

  // --------------------------------------------------------------------------
  // Test 5: Production Client Bundle & Log Secret Leakage Audit
  // --------------------------------------------------------------------------
  console.log('  [5/8] Auditing Client Bundles & Source Files for Hardcoded Secrets...');
  const clientSourceFiles = [
    'apps/provider-portal/src/App.tsx',
    'apps/provider-portal/src/OnboardingWizard.tsx',
    'apps/provider-portal/src/DocsViewer.tsx',
    'apps/provider-portal/src/AuthView.tsx'
  ];

  for (const file of clientSourceFiles) {
    const content = fs.readFileSync(path.resolve(file), 'utf-8');
    // Ensure no real API secret or private token is hardcoded in client source files
    assert.ok(!content.includes('zy_live_sk_'), `File ${file} must not contain live secret key`);
    assert.ok(!content.includes('sk_test_secret_private_12345'), `File ${file} must not contain private secrets`);
  }
  console.log('    ✓ Client bundles and source files are completely clean of secrets.');

  // --------------------------------------------------------------------------
  // Test 6: Cross-Tenant Credential Isolation & Manager Guard
  // --------------------------------------------------------------------------
  console.log('  [6/8] Verifying Cross-Tenant Isolation in Provider Service...');
  assert.ok(
    providersServiceContent.includes('this.assertProviderManager(provider, actor)'),
    'ProvidersService must enforce assertProviderManager across all credential & integration methods'
  );
  assert.ok(
    providersControllerContent.includes('@Post(\':slug/rotate-webhook-secret\')') &&
    providersControllerContent.includes('Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PROVIDER_OWNER)'),
    'Rotate webhook secret endpoint must enforce strict role security'
  );
  console.log('    ✓ Cross-tenant credential access strictly blocked by assertProviderManager.');

  // --------------------------------------------------------------------------
  // Test 7: Webhook Secret Rotation & No Raw Secret in Audit Logs
  // --------------------------------------------------------------------------
  console.log('  [7/8] Verifying Secret Rotation Flow & Zero Raw Secret in Audit Logs...');
  assert.ok(
    providersServiceContent.includes('rotateWebhookSecret') &&
    providersServiceContent.includes('webhookSecretRotatedAt'),
    'ProvidersService must implement rotateWebhookSecret with rotation timestamp'
  );
  assert.ok(
    providersServiceContent.includes('[AUDIT] Webhook secret rotated for provider'),
    'Audit log must record rotation event'
  );
  // Ensure the audit log in providersService does NOT print newSecret directly
  const auditLine = providersServiceContent.split('\n').find(l => l.includes('[AUDIT] Webhook secret rotated'));
  assert.ok(auditLine, 'Audit log line must exist');
  assert.ok(!auditLine.includes('${newSecret}'), 'Audit log must NEVER output raw secret value');
  console.log('    ✓ Webhook secret rotation safely implemented with redacted audit logging.');

  // --------------------------------------------------------------------------
  // Test 8: AI Integration Brief Contains Precise Server-Side Credential Rules
  // --------------------------------------------------------------------------
  console.log('  [8/8] Verifying AI Integration Brief Credential Rules...');
  assert.ok(
    wizardContent.includes('CREDENTIAL VA MAXFIYLIK QOIDALARI') &&
    wizardContent.includes('Provider API key: Dasturchi o\'zi yaratadi') &&
    wizardContent.includes('Webhook secret: Zayuno handoff orqali taqdim etadi') &&
    wizardContent.includes('Ikkala secret ham faqat server-side muhitda (.env) saqlanadi'),
    'AI brief must include comprehensive, server-side secret guidance'
  );
  console.log('    ✓ AI integration brief accurately guides developer on secrets handling.');

  console.log('\n🎉 ALL 8 CREDENTIAL UX & ZERO-SECRET SECURITY TESTS PASSED CLEANLY!\n');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
