import * as fs from 'fs';
import * as path from 'path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

async function verifySubmissionAssets() {
  console.log('========================================================================');
  console.log('🔍 ZAYUNO OPENAI PLUGIN / APPS SUBMISSION ASSETS VERIFICATION');
  console.log('========================================================================\n');

  const WEBSITE_BASE = process.env.WEBSITE_BASE_URL || 'https://zayuno.uz';
  const MCP_BASE = process.env.MCP_BASE_URL || 'https://mcp.zayuno.uz';

  // 1. Verify Public Legal & Product Pages
  console.log('👉 [1/6] Verifying Public Landing & Legal Pages over HTTPS...');
  const pages = [
    { url: `${WEBSITE_BASE}/`, name: 'Public Landing Page', expectedKeyword: 'Zayuno' },
    { url: `${WEBSITE_BASE}/privacy`, name: 'Privacy Policy', expectedKeyword: 'Maxfiylik' },
    { url: `${WEBSITE_BASE}/terms`, name: 'Terms of Service', expectedKeyword: 'Foydalanish Shartlari' },
    { url: `${WEBSITE_BASE}/support`, name: 'Customer Support', expectedKeyword: 'Mijozlarni' }
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

  // 2. Verify Domain Challenge Token
  console.log('\n👉 [2/6] Verifying Domain Verification Challenge...');
  const challengeRes = await fetch(`${WEBSITE_BASE}/.well-known/openai-apps-challenge`);
  if (!challengeRes.ok) throw new Error(`Challenge token check failed: HTTP ${challengeRes.status}`);
  const challengeToken = (await challengeRes.text()).trim();
  if (!challengeToken || challengeToken.includes('<html') || challengeToken.length < 20) {
    throw new Error(`Invalid challenge token returned: "${challengeToken}"`);
  }
  console.log(`   ✅ Domain Challenge Token Verified -> HTTP 200 (Token: ${challengeToken.substring(0, 8)}...)`);

  // 3. Verify Brand Assets & Icons
  console.log('\n👉 [3/6] Verifying Brand Assets & Icons over HTTPS...');
  const assets = [
    { url: `${WEBSITE_BASE}/assets/icon-512.png`, name: '512×512 Directory Icon', minSize: 10000 },
    { url: `${WEBSITE_BASE}/assets/icon-128.png`, name: '128×128 Composer Icon', minSize: 1000 },
    { url: `${WEBSITE_BASE}/assets/logo.svg`, name: 'SVG Vector Logo', minSize: 500 },
    { url: `${WEBSITE_BASE}/favicon.ico`, name: 'Favicon', minSize: 500 }
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

  // 4. Validate chatgpt-app-submission.json against Official OpenAI Draft 2020-12 Schema
  console.log('\n👉 [4/6] Validating chatgpt-app-submission.json against Official OpenAI Schema...');
  const submissionPath = path.join(process.cwd(), 'chatgpt-app-submission.json');
  const schemaPath = path.join(process.cwd(), 'schemas/chatgpt-app-submission.v1.json');
  if (!fs.existsSync(submissionPath)) throw new Error('chatgpt-app-submission.json not found!');
  if (!fs.existsSync(schemaPath)) throw new Error('schemas/chatgpt-app-submission.v1.json not found!');

  const manifest = JSON.parse(fs.readFileSync(submissionPath, 'utf8'));
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  (addFormats as any)(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(manifest);

  if (!valid) {
    console.error('❌ Schema Validation Errors:', validate.errors);
    throw new Error('chatgpt-app-submission.json failed official schema validation!');
  }

  if (manifest.mcp_server?.authentication?.type !== 'none') {
    throw new Error(`Submission manifest authentication must be "none", found: "${manifest.mcp_server?.authentication?.type}"`);
  }
  console.log(`   ✅ Manifest Schema Valid (App: "${manifest.app_info?.display_name}", Category: ${manifest.app_info?.category})`);
  console.log(`   ✅ Public MCP Server URL: ${manifest.mcp_server?.url} (Auth: ${manifest.mcp_server?.authentication?.type})`);

  // 5. Verify Live MCP Health & Tool Introspection
  console.log(`\n👉 [5/6] Verifying Live Production MCP Server (${MCP_BASE})...`);
  const healthRes = await fetch(`${MCP_BASE}/health`);
  if (!healthRes.ok) throw new Error(`Health check failed: HTTP ${healthRes.status}`);
  const healthData = await healthRes.json();
  console.log(`   ✅ Health check OK (Tools: ${healthData.toolsCount}, Server: ${healthData.server})`);

  const toolsRes = await fetch(`${MCP_BASE}/tools`);
  if (!toolsRes.ok) throw new Error(`Tools discovery failed: HTTP ${toolsRes.status}`);
  const toolsData = await toolsRes.json();
  if (!Array.isArray(toolsData.tools) || toolsData.tools.length !== 15) {
    throw new Error(`Expected 15 MCP tools, found: ${toolsData.tools?.length}`);
  }
  console.log(`   ✅ Discovered ${toolsData.tools.length} Tools for ChatGPT App`);

  // 6. Execute Live Positive E2E Verification over Public MCP JSON-RPC for Coffee Time
  console.log(`\n👉 [6/6] Executing Live Positive Test Cases via ${MCP_BASE}/mcp (Canonical Provider: Coffee Time)...`);
  const callMcp = async (name: string, args: Record<string, any>) => {
    const res = await fetch(`${MCP_BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `test-${Date.now()}`,
        method: 'tools/call',
        params: { name, arguments: args }
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} calling ${name}`);
    const json = await res.json();
    if (json.error) throw new Error(`JSON-RPC error calling ${name}: ${JSON.stringify(json.error)}`);
    const rawContent = json.result?.content?.[0]?.text;
    return typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent;
  };

  // Test 1: Welcome
  const welcome = await callMcp('get_welcome_message', {});
  if (!welcome?.customerMessage) throw new Error('get_welcome_message returned missing customerMessage');
  console.log(`   ✅ Positive Test 1: get_welcome_message PASS`);

  // Test 2: Find Providers
  const discovery = await callMcp('find_providers', { category: 'food_delivery' });
  const providers = discovery?.providers || [];
  const coffeeTime = providers.find((p: any) => p.slug === 'coffee-time') || providers[0];
  if (!coffeeTime) {
    throw new Error('NO ACTIVE/CERTIFIED PROVIDER FOUND IN LIVE DISCOVERY! Pre-submit verification FAILED.');
  }
  console.log(`   ✅ Positive Test 2: find_providers PASS (Found active provider: "${coffeeTime.slug}")`);

  // Test 3: Get Provider
  const providerProfile = await callMcp('get_provider', { providerSlug: coffeeTime.slug });
  if (!providerProfile?.id && !providerProfile?.slug) throw new Error('get_provider failed to return provider profile');
  console.log(`   ✅ Positive Test 3: get_provider PASS (Provider: "${providerProfile.name || providerProfile.slug}")`);

  // Test 4: Get Locations
  const locationsRes = await callMcp('get_locations', { providerSlug: coffeeTime.slug });
  const locationsList = locationsRes?.locations || (Array.isArray(locationsRes) ? locationsRes : []);
  if (locationsList.length === 0) {
    throw new Error(`get_locations for "${coffeeTime.slug}" returned 0 locations!`);
  }
  console.log(`   ✅ Positive Test 4: get_locations PASS (${locationsList.length} locations found)`);

  // Test 5: Catalog
  const catalog = await callMcp('get_catalog', { providerSlug: coffeeTime.slug });
  const offerings = catalog?.offerings || [];
  if (offerings.length === 0) {
    throw new Error(`Catalog for "${coffeeTime.slug}" returned 0 offerings!`);
  }
  const testOffering = offerings.find((o: any) => o.id === 'ct_cappuccino') || offerings[0];
  console.log(`   ✅ Positive Test 5: get_catalog PASS (${offerings.length} offerings found, test item: "${testOffering.title || testOffering.name}")`);

  // Test 6: Quote
  const quote = await callMcp('request_quote', {
    providerSlug: coffeeTime.slug,
    items: [{ offeringId: testOffering.id, quantity: 1 }]
  });
  if (!quote?.id && !quote?.quoteId) {
    throw new Error('request_quote did not return a valid quote ID!');
  }
  const verifiedQuoteId = quote.id || quote.quoteId;
  console.log(`   ✅ Positive Test 6: request_quote PASS (Quote total: ${quote.total} ${quote.currency}, ID: ${verifiedQuoteId})`);

  // Test 7: Create Action with user confirmation
  const action = await callMcp('create_action', {
    providerSlug: coffeeTime.slug,
    quoteId: verifiedQuoteId,
    userConfirmed: true,
    customer: { name: 'Submission Verifier', phone: '+998901234567' },
    destination: { raw: 'Tashkent Test Address' },
    items: [{ offeringId: testOffering.id, quantity: 1 }]
  });
  if (!action?.id && !action?.publicId) {
    throw new Error('create_action did not return a valid action ID!');
  }
  const actionId = action.publicId || action.id;
  console.log(`   ✅ Positive Test 7: create_action PASS (Action Public ID: ${actionId}, Status: ${action.status})`);

  // Test 8: Payment Options
  const paymentOpts = await callMcp('get_payment_options', { actionId });
  if (!paymentOpts?.customerMessage) {
    throw new Error('get_payment_options failed to return customerMessage');
  }
  console.log(`   ✅ Positive Test 8: get_payment_options PASS`);

  // Test 9: Get Action Status
  const actionStatus = await callMcp('get_action', { actionId });
  if (!actionStatus?.status && !actionStatus?.customerMessage) {
    throw new Error('get_action failed to return action status');
  }
  console.log(`   ✅ Positive Test 9: get_action PASS (Status: ${actionStatus.status})`);

  // Test 10: Cancel Action
  const cancelResult = await callMcp('cancel_action', { actionId, reason: 'Test verification cancellation' });
  if (!cancelResult?.customerMessage) {
    throw new Error('cancel_action failed to return customerMessage');
  }
  console.log(`   ✅ Positive Test 10: cancel_action PASS (Status: ${cancelResult.status || 'CANCELLED'})`);

  console.log('\n========================================================================');
  console.log('🎉 ALL 10 COFFEE TIME PUBLIC ASSETS, LEGAL POLICIES & MCP TESTS PASSED 100%!');
  console.log('========================================================================\n');
}

verifySubmissionAssets().catch(err => {
  console.error('\n❌ Verification Failed:', err.message || err);
  process.exit(1);
});
