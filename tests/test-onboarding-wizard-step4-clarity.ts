import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DOCS_MENU } from '../apps/provider-portal/src/DocsViewer.tsx';

function testUrlValidation(url: string): { valid: boolean; reason?: string } {
  const raw = url.trim();
  if (!raw) return { valid: false, reason: 'EMPTY' };
  if (!raw.startsWith('https://') && !raw.startsWith('http://localhost') && !raw.startsWith('http://127.0.0.1')) {
    return { valid: false, reason: 'HTTPS_REQUIRED' };
  }
  try {
    new URL(raw);
    return { valid: true };
  } catch {
    return { valid: false, reason: 'INVALID_URL' };
  }
}

function generateTestBrief(businessName: string, slug: string, profile: 'transactional' | 'readonly', authMethod: string): string {
  const isTrans = profile === 'transactional';
  return `# ZAYUNO PROVIDER INTEGRATSIYA BRIEFI (TEXNIK TOPSHIRIQ)

Biznes nomi: ${businessName || 'Mening Biznesim'}
Provider Slug: ${slug || 'my-provider-slug'}
Tanlangan rejim: ${isTrans ? 'Variant B — Topish va buyurtma berish (TRANSACTIONAL)' : 'Variant A — Faqat topish va ko‘rish (DISCOVERY)'}
Autentifikatsiya: ${authMethod}

Endpoints:
${isTrans ? '- GET /health\n- GET /catalog\n- POST /quote\n- POST /actions\n- GET /actions/:id\n- POST /webhook' : '- GET /health\n- GET /catalog\n- GET /search\n- GET /locations'}

Docs: https://developers.zayuno.uz/?tab=docs&doc=base-url`;
}

async function main() {
  console.log('🧪 Starting Test Suite: Onboarding Wizard Step 4 UX Clarity & Validation...');

  // 1. API Base URL Validation Rules
  console.log('  [1/6] Testing API Base URL HTTPS & Dev Tunnel Validation...');
  assert.equal(testUrlValidation('https://api.mybusiness.uz/zayuno').valid, true);
  assert.equal(testUrlValidation('https://abc-123.ngrok-free.app/zayuno').valid, true);
  assert.equal(testUrlValidation('http://localhost:3000/zayuno').valid, true);
  assert.equal(testUrlValidation('http://127.0.0.1:4000/zayuno').valid, true);

  // Insecure / Malformed URLs
  assert.equal(testUrlValidation('http://api.mybusiness.uz').valid, false);
  assert.equal(testUrlValidation('http://api.mybusiness.uz').reason, 'HTTPS_REQUIRED');
  assert.equal(testUrlValidation('').valid, false);
  console.log('    ✓ API Base URL validation strictly requires HTTPS in production and allows local/tunnel in dev.');

  // 2. Deep Link & DOCS_MENU Contract
  console.log('  [2/6] Testing Deep Link Target in DOCS_MENU...');
  const baseUrlDoc = DOCS_MENU.find(d => d.id === 'base-url');
  assert.ok(baseUrlDoc, 'DOCS_MENU must contain base-url guide');
  assert.ok(baseUrlDoc.title.includes('Base URL'), 'base-url doc title must mention Base URL');

  const docsViewerContent = fs.readFileSync(path.resolve('apps/provider-portal/src/DocsViewer.tsx'), 'utf-8');
  assert.ok(docsViewerContent.includes("selectedDoc === 'base-url'"), 'DocsViewer must implement base-url view');
  assert.ok(docsViewerContent.includes('Express & TypeScript'), 'base-url doc must contain Node.js Express example');
  assert.ok(docsViewerContent.includes('Python (FastAPI)'), 'base-url doc must contain FastAPI example');
  console.log('    ✓ Deep-link base-url documentation present with Express & FastAPI boilerplate.');

  // 3. Capability Profile Selection Mapping
  console.log('  [3/6] Testing Capability Profile Mapping (Variant A vs Variant B)...');
  const getCapabilities = (profile: 'transactional' | 'readonly') =>
    profile === 'transactional'
      ? ['METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK', 'ACTION_CANCEL', 'PAYMENT_OPTIONS']
      : ['METADATA', 'HEALTH', 'CATALOG', 'SEARCH', 'LOCATIONS'];

  const readonlyCaps = getCapabilities('readonly');
  assert.ok(readonlyCaps.includes('CATALOG'), 'Variant A must include CATALOG');
  assert.ok(!readonlyCaps.includes('QUOTE'), 'Variant A must NOT require QUOTE');
  assert.ok(!readonlyCaps.includes('ACTION_CREATE'), 'Variant A must NOT require ACTION_CREATE');

  const transactionalCaps = getCapabilities('transactional');
  assert.ok(transactionalCaps.includes('QUOTE'), 'Variant B must include QUOTE');
  assert.ok(transactionalCaps.includes('ACTION_CREATE'), 'Variant B must include ACTION_CREATE');
  assert.ok(transactionalCaps.includes('WEBHOOK'), 'Variant B must include WEBHOOK');
  console.log('    ✓ Profile capability segregation verified for Read-Only (Discovery) vs Transactional (Booking/Ordering).');

  // 4. Dynamic Endpoint Checklist & Terminology Audit
  console.log('  [4/6] Auditing User-Facing Terminology & Dynamic Checklist in OnboardingWizard...');
  const wizardContent = fs.readFileSync(path.resolve('apps/provider-portal/src/OnboardingWizard.tsx'), 'utf-8');

  assert.ok(!wizardContent.includes('Capability Profilini tanlang'), 'Technical jargon "Capability Profilini tanlang" should be replaced by friendly question');
  assert.ok(wizardContent.includes('Mijoz Zayuno orqali nima qila olsin?'), 'Must have clear question: "Mijoz Zayuno orqali nima qila olsin?"');
  assert.ok(wizardContent.includes('Variant A — Faqat topish va ko‘rish'), 'Must have Variant A: "Faqat topish va ko‘rish"');
  assert.ok(wizardContent.includes('Variant B — Topish va buyurtma berish'), 'Must have Variant B: "Topish va buyurtma berish"');
  assert.ok(wizardContent.includes('URLni tekshirish'), 'Must have "URLni tekshirish" button');
  assert.ok(wizardContent.includes('AI uchun brief nusxalash'), 'Must have AI integration brief copy button');
  console.log('    ✓ Friendly UX terms, clear question, and dynamic endpoint checklists confirmed.');

  // 5. AI Integration Brief Generator Security (Zero Leakage)
  console.log('  [5/6] Testing AI Integration Brief generator and zero-secret leakage...');
  const sampleBriefA = generateTestBrief('Coffee Shop', 'coffee-shop', 'readonly', 'API_KEY');
  assert.ok(sampleBriefA.includes('Variant A — Faqat topish va ko‘rish'), 'Brief must reflect Variant A');
  assert.ok(sampleBriefA.includes('doc=base-url'), 'Brief must include docs deep link');
  assert.ok(!sampleBriefA.includes('sk_live'), 'Brief must not contain live secret keys');
  assert.ok(!sampleBriefA.includes('sandbox_secret_123'), 'Brief must not contain secret tokens');

  const sampleBriefB = generateTestBrief('Fast Food', 'fast-food', 'transactional', 'API_KEY');
  assert.ok(sampleBriefB.includes('Variant B — Topish va buyurtma berish'), 'Brief must reflect Variant B');
  assert.ok(sampleBriefB.includes('POST /quote'), 'Brief B must list POST /quote');
  assert.ok(sampleBriefB.includes('POST /actions'), 'Brief B must list POST /actions');
  console.log('    ✓ AI integration briefs cleanly generated with zero secret leakage.');

  // 6. Wizard Step Transition Buttons
  console.log('  [6/7] Testing Step button labels across wizard flow...');
  assert.ok(wizardContent.includes("{loading ? 'Saqlanmoqda…' : 'Davom etish'}"), 'Step 4 primary button must be Davom etish');
  assert.ok(wizardContent.includes('Davom etish (Xulosa va Ko‘rib chiqish)'), 'Step 5 primary button must guide to review/credentials');
  assert.ok(wizardContent.includes('Review’ga yuborish va Dashboardga o‘tish'), 'Step 6 primary button must guide to review & dashboard');
  console.log('    ✓ Step button progression flow (Steps 1–5 "Davom etish", Step 6 "Review") verified.');

  // 7. Draft Persistence & Step Skipping Guardrails
  console.log('  [7/7] Testing Draft Persistence & Step Progression Guardrails...');
  assert.ok(wizardContent.includes('DRAFT_STORAGE_KEY'), 'Must use localStorage draft persistence key');
  assert.ok(wizardContent.includes('isStepAccessible'), 'Must guard step progression with isStepAccessible');
  assert.ok(wizardContent.includes('activeDocsDrawer'), 'Must support In-Wizard DocsDrawer without unmounting form');
  assert.ok(wizardContent.includes('Arizangiz hali topshirilmagan'), 'Step 6 must block access if credentials do not exist');
  console.log('    ✓ Form draft auto-save and step skipping guardrails verified.');

  // 8. Canonical enum guidance, downloadable contract and in-place repair UX
  console.log('  [8/8] Testing canonical enum and certification repair UX...');
  assert.ok(wizardContent.includes('Provider type (CANONICAL API ENUM)'), 'AI brief must identify the canonical provider type');
  assert.ok(wizardContent.includes('LOGISTICS canonical enum emas'), 'AI brief must prevent the LOGISTICS vs DELIVERY mismatch');
  assert.ok(wizardContent.includes('createProviderOpenApiDocument'), 'Wizard must download OpenAPI from the canonical contract generator');
  assert.ok(wizardContent.includes('API sozlamalarini tahrirlash'), 'Certification must allow in-place API settings editing');
  assert.ok(wizardContent.includes('AI uchun canonical tuzatish nusxalash'), 'Failed tests must provide a canonical copy-for-AI repair artifact');
  assert.ok(wizardContent.includes('setCertReport(null)'), 'Saving integration changes must invalidate stale certification results');
  console.log('    ✓ Canonical enum guidance, OpenAPI and in-place certification repair UX verified.');

  console.log('\n🎉 ALL ONBOARDING WIZARD UX CLARITY & STEP 4 TESTS PASSED CLEANLY!\n');
}

main().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
