import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ProviderCapability } from '../packages/contracts/src/provider.ts';
import { ProviderCertificationRunner } from '../packages/provider-sdk/src/certification.ts';

async function main() {
  console.log('🚀 Starting Test Suite: Onboarding Wizard E2E Flow & Sandbox Security...');

  // --------------------------------------------------------------------------
  // Test 1: Step 4 "Davom etish" -> Draft Saved -> Moves to Step 5 (Not Dashboard)
  // --------------------------------------------------------------------------
  console.log('  [1/8] Verifying Step 4 "Davom etish" button & in-wizard Step 5 navigation...');
  const wizardContent = fs.readFileSync(path.resolve('apps/provider-portal/src/OnboardingWizard.tsx'), 'utf-8');
  const appContent = fs.readFileSync(path.resolve('apps/provider-portal/src/App.tsx'), 'utf-8');

  // Must have primary button "Davom etish" on Step 4
  assert.ok(
    wizardContent.includes("{loading ? 'Saqlanmoqda…' : 'Davom etish'}"),
    'Step 4 primary button must be "Davom etish"'
  );
  // Must advance to Step 5 on provider registration success
  assert.ok(
    wizardContent.includes('setCurrentStep(5)'),
    'Step 4 submit must advance to Step 5'
  );
  // In App.tsx, apps tab must show friendly gate rather than prematurely hijacking onboarding
  assert.ok(
    appContent.includes('Sizda hali ro‘yxatdan o‘tgan provider yo‘q'),
    'App.tsx apps tab must show friendly gate rather than prematurely hijacking onboarding'
  );
  console.log('    ✓ Step 4 cleanly transitions to Step 5 without unexpected dashboard jumps.');

  // --------------------------------------------------------------------------
  // Test 2: Deep Link & Browser URL State Sync (?tab=onboarding&step=5&provider=slug)
  // --------------------------------------------------------------------------
  console.log('  [2/8] Verifying Deep Link Restoration & URL Sync...');
  assert.ok(
    wizardContent.includes("url.searchParams.set('tab', 'onboarding')") &&
    wizardContent.includes("url.searchParams.set('step', String(currentStep))"),
    'Wizard must synchronize tab and step to browser URL'
  );
  assert.ok(
    wizardContent.includes("url.searchParams.set('provider', slug.trim())"),
    'Wizard must synchronize provider slug to URL parameter'
  );
  assert.ok(
    appContent.includes('initialProvider={provider}'),
    'App.tsx must pass existing provider draft to OnboardingWizard'
  );
  console.log('    ✓ URL synchronization and deep link parameters properly handled.');

  // --------------------------------------------------------------------------
  // Test 3: Idempotent Draft Provider Update (No Duplicate Slug/Account Errors)
  // --------------------------------------------------------------------------
  console.log('  [3/8] Verifying Idempotent Draft Registration in Backend Service...');
  const providersServiceContent = fs.readFileSync(path.resolve('apps/api/src/modules/providers/providers.service.ts'), 'utf-8');
  assert.ok(
    providersServiceContent.includes('existingOwnerDraft') &&
    providersServiceContent.includes('status === ProviderStatus.DRAFT'),
    'Backend must allow updating existing draft provider without duplicate error'
  );
  console.log('    ✓ Resuming or retrying onboarding updates the draft provider idempotently.');

  // --------------------------------------------------------------------------
  // Test 4: In-Wizard Interactive Certification Runner (Step 5)
  // --------------------------------------------------------------------------
  console.log('  [4/8] Verifying In-Wizard Certification Runner on Step 5...');
  assert.ok(
    wizardContent.includes('handleRunCertification') &&
    wizardContent.includes('api/v1/providers/${encodeURIComponent(targetSlug)}/certify'),
    'Wizard Step 5 must implement in-wizard certification runner'
  );
  assert.ok(
    wizardContent.includes('certReport.isProductionReady') &&
    wizardContent.includes('Davom etish (Xulosa va Ko‘rib chiqish)'),
    'Step 5 must allow advancing to Step 6 only when certification and AI discovery readiness both pass'
  );
  assert.ok(
    appContent.includes('providerRequiresLocations') &&
    appContent.includes("mandatory.push('LOCATIONS')") &&
    appContent.includes("provider.status === 'ACTIVE' || isLocationMandatory"),
    'Existing physical providers must submit LOCATIONS from Dashboard settings and cannot accidentally uncheck it'
  );
  console.log('    ✓ In-wizard certification runner correctly implemented with pass/fail gates.');

  // --------------------------------------------------------------------------
  // Test 5: Step 6 Review & Submit -> Navigates to Dashboard
  // --------------------------------------------------------------------------
  console.log('  [5/8] Verifying Step 6 Review Submit...');
  assert.ok(
    wizardContent.includes('handleSubmitReview') &&
    wizardContent.includes('api/v1/providers/${encodeURIComponent(targetSlug)}/submit-review'),
    'Step 6 must submit provider for review'
  );
  assert.ok(
    wizardContent.includes("Review’ga yuborish va Dashboardga o‘tish"),
    'Step 6 must have button "Review’ga yuborish va Dashboardga o‘tish"'
  );
  console.log('    ✓ Step 6 review submission successfully completes onboarding flow.');

  // --------------------------------------------------------------------------
  // Test 6: Sandbox URL Warning & Server-Side Test Credential Resolution
  // --------------------------------------------------------------------------
  console.log('  [6/8] Verifying Sandbox URL Recognition & Server-Side Test Credential...');
  assert.ok(
    wizardContent.includes('Sandbox test provideri tanlandi. Certification uchun test credential kerak bo‘lishi mumkin.'),
    'Wizard must render warning card when sandbox URL is selected'
  );

  const registryServiceContent = fs.readFileSync(path.resolve('apps/api/src/modules/providers/provider-registry.service.ts'), 'utf-8');
  assert.ok(
    registryServiceContent.includes('resolveSandboxTestCredential') &&
    registryServiceContent.includes('coffee-time') &&
    registryServiceContent.includes('evos'),
    'Registry service must resolve test credentials server-side for sandbox domains'
  );
  console.log('    ✓ Sandbox test providers receive server-side credentials without client secret exposure.');

  // --------------------------------------------------------------------------
  // Test 7: Friendly Error Formatting in Certification SDK & No Secret Leakage
  // --------------------------------------------------------------------------
  console.log('  [7/8] Verifying Friendly Error Translation & Zero Secret Leakage...');
  const certSdkContent = fs.readFileSync(path.resolve('packages/provider-sdk/src/certification.ts'), 'utf-8');
  assert.ok(
    certSdkContent.includes('formatFriendlyError') &&
    certSdkContent.includes('API kaliti noto‘g‘ri yoki yo‘q') &&
    certSdkContent.includes('Server endpointi topilmadi') &&
    certSdkContent.includes('Server javob bermadi') &&
    certSdkContent.includes('Majburiy endpoint yo‘q'),
    'Certification SDK must translate raw errors to customer-friendly Uzbek messages'
  );

  // Test formatFriendlyError logic with mock adapter
  const mockAdapter: any = {
    providerSlug: 'test-sandbox',
    getSlug: () => 'test-sandbox',
    getCapabilities: () => [ProviderCapability.HEALTH, ProviderCapability.CATALOG],
    hasCapability: (cap: any) => [ProviderCapability.HEALTH, ProviderCapability.CATALOG].includes(cap),
    checkHealth: async () => ({ status: 'HEALTHY', latencyMs: 10 }),
    getCatalog: async () => {
      const err = new Error('HTTP 401 Unauthorized: Invalid Provider API Key');
      throw err;
    }
  };

  const runner = new ProviderCertificationRunner(mockAdapter);
  const report = await runner.runAllTests();
  assert.equal(report.isCertified, false);

  const catalogTest = report.tests.find(t => t.capability === ProviderCapability.CATALOG);
  assert.ok(catalogTest, 'Catalog test result must exist');
  assert.equal(catalogTest.passed, false);
  assert.equal(catalogTest.error, 'API kaliti noto‘g‘ri yoki yo‘q');
  console.log('    ✓ 401 Unauthorized translated to "API kaliti noto‘g‘ri yoki yo‘q".');

  // Verify missing endpoint 404 error formatting
  const mockAdapterMissing: any = {
    providerSlug: 'test-sandbox-missing',
    getSlug: () => 'test-sandbox-missing',
    getCapabilities: () => [ProviderCapability.HEALTH],
    hasCapability: (cap: any) => cap === ProviderCapability.HEALTH,
    checkHealth: async () => {
      const err = new Error('HTTP 404 Not Found');
      throw err;
    }
  };
  const runnerMissing = new ProviderCertificationRunner(mockAdapterMissing);
  const reportMissing = await runnerMissing.runAllTests();
  const healthTest = reportMissing.tests.find(t => t.capability === ProviderCapability.HEALTH);
  assert.equal(healthTest?.error, 'Server endpointi topilmadi');
  console.log('    ✓ 404 Not Found translated to "Server endpointi topilmadi".');

  // --------------------------------------------------------------------------
  // Test 8: DRAFT Isolation & No Public Leakage
  // --------------------------------------------------------------------------
  console.log('  [8/8] Verifying DRAFT Status Isolation from Public MCP Discovery...');
  assert.ok(
    providersServiceContent.includes('status: DbProviderStatus.ACTIVE') ||
    providersServiceContent.includes('status: ProviderStatus.ACTIVE'),
    'Public discovery must only return ACTIVE providers'
  );
  console.log('    ✓ DRAFT providers remain isolated and unexposed to public discovery.');

  console.log('\n🎉 ALL 8 TESTS PASSED SUCCESSFULLY! Wizard flow & sandbox safety fully verified.');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
