import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), 'utf8');
}

function main() {
  console.log('🧪 Testing review dashboard UX boundaries...');
  const app = read('apps/provider-portal/src/App.tsx');
  const wizard = read('apps/provider-portal/src/OnboardingWizard.tsx');
  const workspaceModel = read('apps/provider-portal/src/workspace-model.ts');

  assert.ok(app.includes("const isPendingReview = providerReviewStatus === 'PENDING_APPROVAL'"), 'Portal must recognize the backend review state.');
  assert.ok(app.includes('Arizangiz ko‘rib chiqilmoqda'), 'Pending review needs a clear human-facing state.');
  assert.ok(app.includes('API sinovi muvaffaqiyatli o‘tdi'), 'Pending review must explain the completed API check.');
  assert.ok(app.includes('AI mijozlarga ochish'), 'Pending review must explain what approval unlocks.');
  assert.ok(workspaceModel.includes("label: 'Ariza holatini ko‘rish'"), 'Pending review must have a dedicated status action.');
  assert.ok(workspaceModel.includes("tab: 'apps' as WorkspaceTab, step: 4, status: 'Ko‘rib chiqilmoqda'"), 'Pending review must open the business status page and never expose the raw backend code.');
  assert.ok(workspaceModel.includes("label: 'Reviewga yuborish'"), 'A provider that has not yet submitted must retain the distinct submit action.');
  assert.ok(app.includes("if (activeTab === 'onboarding' && isPendingReview) setActiveTab('apps');"), 'A stale onboarding step-four URL must redirect pending providers to their review state.');

  assert.ok(app.includes('enabled: !!token && !!providerData?.slug && isProviderActive'), 'Order data must load only for an active provider.');
  assert.ok(app.includes('{isProviderActive && (\n                  <>\n                {/* Modern KPI Cards */}'), 'Order metrics must stay hidden while review is pending.');
  assert.ok(app.includes('{isProviderActive && <section hidden={dashboardSection !== \'orders\'} aria-label="Buyurtmalar">'), 'Order table must stay hidden while review is pending.');

  assert.ok(app.includes('API va kalitlarni boshqarish'), 'Pending review needs one explicit settings escape hatch.');
  assert.ok(app.includes('Review jarayoni to‘xtatiladi'), 'Editing during review must clearly explain its consequence.');
  assert.ok(app.includes('Zayuno developer API key'), 'Developer key management belongs in API settings.');
  assert.ok(app.includes('Bu qiymat faqat bir marta ko‘rsatiladi'), 'New developer keys must retain one-time reveal guidance.');

  assert.ok(!wizard.includes('Yangi Zayuno API key yaratish'), 'Onboarding completion must not contain key-recovery actions.');
  assert.ok(!wizard.includes('Yangi webhook imzo kaliti'), 'Onboarding completion must not contain webhook-recovery actions.');
  assert.ok(wizard.includes('Biznesim → API sozlamalari va credentiallar'), 'Onboarding must direct recovery to the API settings area.');

  assert.ok(app.includes('Dasturchi sozlamalari'), 'Technical settings need one clearly labeled, collapsible entry point.');
  assert.ok(app.includes('aria-expanded={advancedDeveloperSettingsOpen}'), 'Developer-only controls must stay collapsed by default.');
  assert.ok(app.includes('Mijozlar uchun xizmat'), 'Businesses must see customer-facing behavior in plain language.');
  assert.ok(!app.includes('Capabilities & Profile'), 'Businesses must not be asked to manage capability checkboxes.');
  assert.ok(!app.includes('Discovery / Read-only') && !app.includes('>Transactional<'), 'Protocol profiles must not be exposed as business choices.');
  assert.ok(!app.includes('Provider account'), 'The redundant provider account card must not consume the settings screen.');

  console.log('✅ Review dashboard UX boundaries passed.');
}

main();
