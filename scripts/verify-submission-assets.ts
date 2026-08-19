import * as fs from 'fs';
import * as path from 'path';

async function verifySubmissionAssets() {
  console.log('========================================================================');
  console.log('🔍 ZAYUNO OPENAI PLUGIN / APPS SUBMISSION ASSETS VERIFICATION');
  console.log('========================================================================\n');

  const BASE_URL = 'https://zayuno.shopla.uz';

  // 1. Verify Public Legal & Product Pages
  console.log('👉 [1/4] Verifying Public Landing & Legal Pages over HTTPS...');
  const pages = [
    { url: `${BASE_URL}/`, name: 'Public Landing Page', expectedKeyword: 'Action Infrastructure' },
    { url: `${BASE_URL}/privacy`, name: 'Privacy Policy', expectedKeyword: 'Zero Card Storage Policy' },
    { url: `${BASE_URL}/terms`, name: 'Terms of Service', expectedKeyword: 'Explicit Confirmation Guardrail' },
    { url: `${BASE_URL}/support`, name: 'Customer Support', expectedKeyword: 'Customer Support & Help Desk' }
  ];

  for (const p of pages) {
    const res = await fetch(p.url);
    if (!res.ok) throw new Error(`Failed to load ${p.name} at ${p.url}: HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes(p.expectedKeyword)) {
      throw new Error(`Content mismatch on ${p.name}! Keyword '${p.expectedKeyword}' not found.`);
    }
    console.log(`   ✅ ${p.name.padEnd(24)} -> HTTP ${res.status} (Verified: ${text.length} bytes)`);
  }

  // 2. Verify Brand Assets & Icons
  console.log('\n👉 [2/4] Verifying Brand Assets & Icons over HTTPS...');
  const assets = [
    { url: `${BASE_URL}/assets/icon-512.png`, name: '512×512 Directory Icon', minSize: 10000 },
    { url: `${BASE_URL}/assets/icon-128.png`, name: '128×128 Composer Icon', minSize: 5000 },
    { url: `${BASE_URL}/assets/logo.svg`, name: 'SVG Vector Logo', minSize: 500 },
    { url: `${BASE_URL}/favicon.ico`, name: 'Favicon', minSize: 500 }
  ];

  for (const a of assets) {
    const res = await fetch(a.url);
    if (!res.ok) throw new Error(`Failed to fetch ${a.name} from ${a.url}: HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength < a.minSize) {
      throw new Error(`Asset ${a.name} size suspiciously small: ${buf.byteLength} bytes`);
    }
    console.log(`   ✅ ${a.name.padEnd(24)} -> HTTP ${res.status} (${buf.byteLength} bytes)`);
  }

  // 3. Verify chatgpt-app-submission.json Schema
  console.log('\n👉 [3/4] Validating chatgpt-app-submission.json against OpenAI Schema...');
  const submissionPath = path.join(process.cwd(), 'chatgpt-app-submission.json');
  if (!fs.existsSync(submissionPath)) throw new Error('chatgpt-app-submission.json not found!');
  const manifest = JSON.parse(fs.readFileSync(submissionPath, 'utf8'));

  const requiredFields = [
    'schema_version', 'name_for_human', 'name_for_model', 'subtitle',
    'description_for_human', 'description_for_model', 'api', 'legal_info_url',
    'privacy_policy_url', 'support_url', 'logo_url'
  ];

  for (const rf of requiredFields) {
    if (!manifest[rf]) throw new Error(`Missing required manifest field: ${rf}`);
  }
  console.log(`   ✅ Manifest Schema Valid (Name: ${manifest.name_for_human}, Subtitle: "${manifest.subtitle}")`);
  console.log(`   ✅ Target MCP Endpoint: ${manifest.api.url}`);

  // 4. Verify Live MCP Discovery
  console.log('\n👉 [4/4] Verifying Live MCP Tools from https://zayuno.shopla.uz/tools...');
  const toolsRes = await fetch(`${BASE_URL}/tools`);
  if (!toolsRes.ok) throw new Error(`Tools discovery failed: HTTP ${toolsRes.status}`);
  const toolsData = await toolsRes.json();
  console.log(`   ✅ Discovered ${toolsData.tools.length} Tools for ChatGPT App:`);
  for (const t of toolsData.tools) {
    console.log(`      - [${t.name.padEnd(20)}] : ${t.description.substring(0, 60)}...`);
  }

  console.log('\n========================================================================');
  console.log('🎉 ALL PUBLIC ASSETS, LEGAL POLICIES & METADATA VERIFIED 100% LIVE!');
  console.log('========================================================================\n');
}

verifySubmissionAssets().catch(err => {
  console.error('❌ Verification Failed:', err);
  process.exit(1);
});
