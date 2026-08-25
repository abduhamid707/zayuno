import assert from 'node:assert/strict';
import http, { type Server } from 'node:http';
import { ZAYUNO_MCP_TOOLS, McpToolDefinition } from '../apps/mcp/src/tools.ts';
import { runHttpSseServer } from '../apps/mcp/src/server.ts';
import { formatCustomerError } from '../packages/shared/src/customer-presenter.ts';
import { getOpenAiAppsChallengeToken } from '../packages/shared/src/constants.ts';
import { stripSensitiveSecrets } from '../packages/shared/src/redaction.ts';
import { validateSubmissionManifest } from '../scripts/validate-submission-schema.ts';

const EXPECTED_TOOL_NAMES = [
  'get_welcome_message',
  'find_providers',
  'list_providers',
  'get_provider',
  'get_provider_capabilities',
  'get_locations',
  'get_catalog',
  'search_catalog',
  'get_offering',
  'check_availability',
  'request_quote',
  'create_action',
  'get_action',
  'cancel_action',
  'get_payment_options'
];

const EXPECTED_ANNOTATIONS: Record<string, { readOnlyHint: boolean; openWorldHint: boolean; destructiveHint: boolean }> = {
  get_welcome_message: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  find_providers: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  list_providers: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  get_provider: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  get_provider_capabilities: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  get_locations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  get_catalog: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  search_catalog: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  get_offering: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  check_availability: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  request_quote: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
  create_action: { readOnlyHint: false, openWorldHint: true, destructiveHint: false },
  get_action: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  cancel_action: { readOnlyHint: false, openWorldHint: true, destructiveHint: true },
  get_payment_options: { readOnlyHint: true, openWorldHint: false, destructiveHint: false }
};

const FORBIDDEN_SECRET_KEYS = [
  'encryptedSecret',
  'webhookSecret',
  'keyHash',
  'password',
  'bearerToken',
  'secretKey',
  'databaseUrl',
  'salt',
  'cookie',
  'sessionCookie',
  '_rawSecrets',
  'rawSecrets',
  'secretEmail',
  'secretPhone',
  'ssn',
  'cvv'
];

function assertNoSecretLeakage(obj: any, toolName: string, path = '') {
  if (!obj || typeof obj !== 'object') return;

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => assertNoSecretLeakage(item, toolName, `${path}[${idx}]`));
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    assert.ok(
      !FORBIDDEN_SECRET_KEYS.includes(key),
      `Security violation in ${toolName}: sensitive field "${currentPath}" found in public output!`
    );

    if (typeof value === 'string') {
      // Check for raw stack traces, internal environment dumps, secrets, and leaked sensitive PII
      assert.ok(!value.includes('at process.processTicksAndRejections'), `Stack trace leaked in ${toolName}.${currentPath}`);
      assert.ok(!value.includes('node:internal'), `Internal node runtime error leaked in ${toolName}.${currentPath}`);
      assert.ok(!value.includes('zy_live_super_secret'), `Secret token value leaked in ${toolName}.${currentPath}`);
      assert.ok(!value.includes('postgresql://admin:supersecret'), `Database URL leaked in ${toolName}.${currentPath}`);
      assert.ok(!value.includes('leak_victim_internal@sensitive-domain.uz'), `Sensitive PII email leaked in ${toolName}.${currentPath}`);
      assert.ok(!value.includes('+998998887766'), `Sensitive PII phone leaked in ${toolName}.${currentPath}`);
      assert.ok(!value.includes('000-12-3456'), `Sensitive SSN leaked in ${toolName}.${currentPath}`);
    }

    if (typeof value === 'object' && value !== null) {
      assertNoSecretLeakage(value, toolName, currentPath);
    }
  }
}

async function main() {
  console.log('================================================================');
  console.log('🤖 OPENAI PLUGIN / MCP CONTRACT COMPLIANCE & REGRESSION SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Tool Count and Backward Compatible Naming
  // ---------------------------------------------------------------------------
  console.log('  [1/10] Verifying MCP Tool Names & Set Completeness...');
  assert.equal(ZAYUNO_MCP_TOOLS.length, EXPECTED_TOOL_NAMES.length, `Expected ${EXPECTED_TOOL_NAMES.length} tools, got ${ZAYUNO_MCP_TOOLS.length}`);
  const toolNames = ZAYUNO_MCP_TOOLS.map(t => t.name);
  for (const name of EXPECTED_TOOL_NAMES) {
    assert.ok(toolNames.includes(name), `Missing expected MCP tool: ${name}`);
  }
  console.log(`    ✓ All ${EXPECTED_TOOL_NAMES.length} generic MCP v1 tools present and named consistently.`);

  // ---------------------------------------------------------------------------
  // 2. Standardized Annotation Property Names (Zero Legacy Field Leakage)
  // ---------------------------------------------------------------------------
  console.log('  [2/10] Verifying Standardized Annotation Property Names...');
  for (const tool of ZAYUNO_MCP_TOOLS) {
    const ann = (tool.annotations || {}) as any;
    // Check old names do NOT exist
    assert.equal(ann.readOnly, undefined, `Tool ${tool.name} still contains legacy "readOnly" annotation!`);
    assert.equal(ann.openWorld, undefined, `Tool ${tool.name} still contains legacy "openWorld" annotation!`);
    assert.equal(ann.destructive, undefined, `Tool ${tool.name} still contains legacy "destructive" annotation!`);

    // Check standard hint names exist and are boolean
    assert.equal(typeof ann.readOnlyHint, 'boolean', `Tool ${tool.name} missing boolean "readOnlyHint"`);
    assert.equal(typeof ann.openWorldHint, 'boolean', `Tool ${tool.name} missing boolean "openWorldHint"`);
    assert.equal(typeof ann.destructiveHint, 'boolean', `Tool ${tool.name} missing boolean "destructiveHint"`);
  }
  console.log('    ✓ Zero legacy annotation fields found. All tools use readOnlyHint/openWorldHint/destructiveHint.');

  // ---------------------------------------------------------------------------
  // 3. Exact Semantic Mapping Verification
  // ---------------------------------------------------------------------------
  console.log('  [3/10] Verifying Semantic Annotation Values for Every Tool...');
  for (const tool of ZAYUNO_MCP_TOOLS) {
    const expected = EXPECTED_ANNOTATIONS[tool.name];
    assert.ok(expected, `No expected annotations defined for ${tool.name}`);
    const actual = tool.annotations!;

    assert.equal(actual.readOnlyHint, expected.readOnlyHint, `${tool.name} readOnlyHint mismatch: expected ${expected.readOnlyHint}, got ${actual.readOnlyHint}`);
    assert.equal(actual.openWorldHint, expected.openWorldHint, `${tool.name} openWorldHint mismatch: expected ${expected.openWorldHint}, got ${actual.openWorldHint}`);
    assert.equal(actual.destructiveHint, expected.destructiveHint, `${tool.name} destructiveHint mismatch: expected ${expected.destructiveHint}, got ${actual.destructiveHint}`);
  }
  console.log('    ✓ All 15 tools have mathematically verified semantic annotation values.');

  // ---------------------------------------------------------------------------
  // 4. Action Creation & Cancellation Semantics
  // ---------------------------------------------------------------------------
  console.log('  [4/10] Verifying create_action & cancel_action Safety Annotations...');
  const createTool = ZAYUNO_MCP_TOOLS.find(t => t.name === 'create_action')!;
  assert.equal(createTool.annotations?.readOnlyHint, false);
  assert.equal(createTool.annotations?.openWorldHint, true);
  assert.equal(createTool.annotations?.destructiveHint, false);

  const cancelTool = ZAYUNO_MCP_TOOLS.find(t => t.name === 'cancel_action')!;
  assert.equal(cancelTool.annotations?.readOnlyHint, false);
  assert.equal(cancelTool.annotations?.openWorldHint, true);
  assert.equal(cancelTool.annotations?.destructiveHint, true);
  console.log('    ✓ create_action is write/open-world; cancel_action is write/open-world/destructive.');

  // ---------------------------------------------------------------------------
  // 5. Quote Persistence & Non-OpenWorld Calculation Classification
  // ---------------------------------------------------------------------------
  console.log('  [5/10] Verifying request_quote Persistence & Non-OpenWorld Classification...');
  const quoteTool = ZAYUNO_MCP_TOOLS.find(t => t.name === 'request_quote')!;
  assert.equal(quoteTool.annotations?.readOnlyHint, false, 'request_quote must be readOnlyHint: false because it creates Quote DB records with TTL');
  assert.equal(quoteTool.annotations?.openWorldHint, false, 'request_quote must be openWorldHint: false because calculation queries do not mutate external third-party state');
  assert.equal(quoteTool.annotations?.destructiveHint, false, 'request_quote must be destructiveHint: false because it does not delete or cancel commitments');
  console.log('    ✓ request_quote classified as readOnlyHint: false, openWorldHint: false, destructiveHint: false.');

  // ---------------------------------------------------------------------------
  // 6. Discovery & Read-Only Tool Non-Destructive Guardrail
  // ---------------------------------------------------------------------------
  console.log('  [6/10] Verifying Discovery & Inspection Tools are Strictly Read-Only...');
  const readOnlyTools = [
    'get_welcome_message',
    'find_providers',
    'list_providers',
    'get_provider',
    'get_provider_capabilities',
    'get_locations',
    'get_catalog',
    'search_catalog',
    'get_offering',
    'check_availability',
    'get_action',
    'get_payment_options'
  ];
  for (const name of readOnlyTools) {
    const tool = ZAYUNO_MCP_TOOLS.find(t => t.name === name)!;
    assert.equal(tool.annotations?.readOnlyHint, true, `${name} must be readOnlyHint: true`);
    assert.equal(tool.annotations?.openWorldHint, false, `${name} must be openWorldHint: false`);
    assert.equal(tool.annotations?.destructiveHint, false, `${name} must be destructiveHint: false`);
  }
  console.log(`    ✓ All ${readOnlyTools.length} discovery/inspection tools verified as non-mutating, closed-world, and non-destructive.`);

  // ---------------------------------------------------------------------------
  // 7. Live Real HTTP Server Introspection, JSON-RPC tools/list & Challenge Endpoint
  // ---------------------------------------------------------------------------
  console.log('  [7/10] Verifying Live MCP HTTP Server /tools, tools/list & openai-apps-challenge...');
  const mcpApp = runHttpSseServer(0);
  const mcpServer: Server = await new Promise((res) => {
    const s = mcpApp.listen(0, '127.0.0.1', () => res(s));
  });
  const port = (mcpServer.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // A. Domain Verification Challenge: GET /.well-known/openai-apps-challenge
    const chRes = await fetch(`${baseUrl}/.well-known/openai-apps-challenge`);
    assert.equal(chRes.status, 200, 'openai-apps-challenge must return HTTP 200');
    assert.ok(
      chRes.headers.get('content-type')?.includes('text/plain'),
      `Content-type must be text/plain, got: ${chRes.headers.get('content-type')}`
    );
    const challengeBody = await chRes.text();
    const authoritativeToken = getOpenAiAppsChallengeToken();
    assert.equal(challengeBody, authoritativeToken, `Challenge body must exactly match authoritative token`);
    assert.ok(!challengeBody.startsWith('{'), 'Challenge body MUST NOT be a JSON object');
    assert.ok(!challengeBody.includes('<html'), 'Challenge body MUST NOT contain HTML');
    console.log(`    ✓ Domain challenge verified: exact plain-text token match (${challengeBody.slice(0, 8)}...).`);

    // B. GET /tools
    const toolsRes = await fetch(`${baseUrl}/tools`);
    assert.equal(toolsRes.status, 200);
    const toolsBody = await toolsRes.json();
    assert.equal(toolsBody.tools.length, EXPECTED_TOOL_NAMES.length);

    for (const t of toolsBody.tools) {
      assert.ok(t.annotations, `Missing annotations on GET /tools for ${t.name}`);
      assert.equal((t.annotations as any).readOnly, undefined);
      assert.equal((t.annotations as any).openWorld, undefined);
      assert.equal((t.annotations as any).destructive, undefined);
      assert.equal(typeof t.annotations.readOnlyHint, 'boolean');
      assert.equal(typeof t.annotations.openWorldHint, 'boolean');
      assert.equal(typeof t.annotations.destructiveHint, 'boolean');
    }
    console.log('    ✓ Real GET /tools response verified: standard hints returned, zero legacy fields.');

    // C. POST /mcp tools/list JSON-RPC
    const rpcRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-tools-list',
        method: 'tools/list'
      })
    });
    assert.equal(rpcRes.status, 200);
    const rpcBody = await rpcRes.json();
    assert.equal(rpcBody.jsonrpc, '2.0');
    assert.equal(rpcBody.id, 'test-tools-list');
    assert.ok(Array.isArray(rpcBody.result?.tools));
    assert.equal(rpcBody.result.tools.length, EXPECTED_TOOL_NAMES.length);

    for (const t of rpcBody.result.tools) {
      assert.ok(t.annotations, `Missing annotations on JSON-RPC tools/list for ${t.name}`);
      assert.equal((t.annotations as any).readOnly, undefined);
      assert.equal((t.annotations as any).openWorld, undefined);
      assert.equal((t.annotations as any).destructive, undefined);
      assert.equal(typeof t.annotations.readOnlyHint, 'boolean');
      assert.equal(typeof t.annotations.openWorldHint, 'boolean');
      assert.equal(typeof t.annotations.destructiveHint, 'boolean');
    }
    console.log('    ✓ Real JSON-RPC POST /mcp tools/list response verified with intact hint annotations.');

    // D. Real JSON-RPC Error Handling & Sanitization: POST /mcp tools/call with invalid tool
    const errRpcRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-err-call',
        method: 'tools/call',
        params: { name: 'non_existent_tool_123', arguments: {} }
      })
    });
    assert.equal(errRpcRes.status, 200);
    const errRpcBody = await errRpcRes.json();
    assert.equal(errRpcBody.jsonrpc, '2.0');
    assert.ok(errRpcBody.error?.message.includes('Tool not found'));
    assert.ok(!errRpcBody.error?.message.includes('postgresql://'));
    assert.ok(!errRpcBody.error?.message.includes('stack'));
    console.log('    ✓ Real JSON-RPC error handling verified: sanitized and zero stack trace leakage.');
  } finally {
    await new Promise((res) => mcpServer.close(res));
  }

  // ---------------------------------------------------------------------------
  // 8. Input Schema Stability & Required Arguments Guardrails
  // ---------------------------------------------------------------------------
  console.log('  [8/10] Verifying Input Schema Stability & Required Arguments...');
  const schemaSnapshot: Record<string, string[]> = {
    get_welcome_message: [],
    find_providers: [],
    list_providers: [],
    get_provider: ['providerSlug'],
    get_provider_capabilities: ['providerSlug'],
    get_locations: ['providerSlug'],
    get_catalog: ['providerSlug'],
    search_catalog: ['providerSlug'],
    get_offering: ['providerSlug', 'offeringId'],
    check_availability: ['providerSlug', 'items'],
    request_quote: ['providerSlug', 'items'],
    create_action: ['providerSlug', 'quoteId', 'items', 'customer', 'userConfirmed'],
    get_action: ['actionId'],
    cancel_action: ['actionId'],
    get_payment_options: ['actionId']
  };

  for (const [name, requiredFields] of Object.entries(schemaSnapshot)) {
    const tool = ZAYUNO_MCP_TOOLS.find(t => t.name === name)!;
    const actualRequired = tool.inputSchema.required || [];
    assert.deepEqual(actualRequired.sort(), requiredFields.sort(), `Tool ${name} required fields drifted: expected ${requiredFields.join(',')}, got ${actualRequired.join(',')}`);
  }
  console.log('    ✓ Input schema required properties match canonical backward-compatible snapshot.');

  // ---------------------------------------------------------------------------
  // 9. Full HTTP Wire Protocol Execution across ALL 15 Tools (Success & Error Modes)
  //    With Explicit Injected Secrets, DB URLs, Passwords, and Dirty PII Payloads
  // ---------------------------------------------------------------------------
  console.log('  [9/10] Executing Real POST /mcp tools/call on ALL 15 Tools (Strict Success & Error Wire Tests)...');

  const dirtySecretsInjection = {
    _rawSecrets: {
      apiKey: 'zy_live_super_secret_key_999999',
      bearerToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz',
      databaseUrl: 'postgresql://admin:supersecret@127.0.0.1:5432/zayuno'
    },
    encryptedSecret: 'aes256_super_secret_cipher_blob',
    webhookSecret: 'whsec_secret_salt_999',
    sessionCookie: 'connect.sid=s%3A_secret_cookie_token_123',
    keyHash: 'sha256_internal_hash_secret',
    password: 'internal_db_password_xyz',
    secretEmail: 'leak_victim_internal@sensitive-domain.uz',
    secretPhone: '+998998887766',
    ssn: '000-12-3456',
    cvv: '999'
  };

  let mockErrorMode = false;

  // Spin up a mock backend HTTP API server
  const mockApiServer = http.createServer((req, res) => {
    if (mockErrorMode) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        statusCode: 500,
        message: 'Internal server error with raw db connection: postgresql://admin:supersecret@127.0.0.1:5432/zayuno (apiKey=zy_live_super_secret_key_999999)',
        error: 'ECONNREFUSED'
      }));
      return;
    }

    const url = req.url || '';
    res.writeHead(200, { 'Content-Type': 'application/json' });

    if (url.includes('/welcome')) {
      res.end(JSON.stringify({ customerMessage: 'Xush kelibsiz! Zayuno orqali xizmatlardan foydalanishingiz mumkin.', availableServiceCount: 12, dynamicServiceMessage: '12 ta xizmat mavjud.', ...dirtySecretsInjection }));
    } else if (url.includes('/providers/search') || url.includes('/providers/find') || url.includes('/find')) {
      res.end(JSON.stringify({ providers: [{ slug: 'mock-evos', name: 'EVOS Fast Food', type: 'FOOD', ...dirtySecretsInjection }], total: 1, ...dirtySecretsInjection }));
    } else if (url.includes('/capabilities')) {
      res.end(JSON.stringify({ capabilities: ['CATALOG', 'QUOTE', 'ACTION_CREATE'], ...dirtySecretsInjection }));
    } else if (url.includes('/locations')) {
      res.end(JSON.stringify([{ id: 'loc_1', name: 'Amir Temur Branch', address: 'Amir Temur 107', isActive: true, ...dirtySecretsInjection }]));
    } else if (url.includes('/catalog/search')) {
      res.end(JSON.stringify({ offerings: [{ id: 'lavash_beef', name: 'Beef Lavash', price: 34000, ...dirtySecretsInjection }], total: 1, ...dirtySecretsInjection }));
    } else if (url.includes('/catalog')) {
      res.end(JSON.stringify({ categories: [{ id: 'cat_1', name: 'Lavash', ...dirtySecretsInjection }], offerings: [{ id: 'lavash_beef', name: 'Beef Lavash', price: 34000, ...dirtySecretsInjection }], ...dirtySecretsInjection }));
    } else if (url.includes('/offerings/')) {
      res.end(JSON.stringify({ id: 'lavash_beef', name: 'Beef Lavash', price: 34000, optionGroups: [{ id: 'cheese', name: 'Add Cheese', options: [{ id: 'extra_cheese', name: 'Extra Cheese', price: 4000, ...dirtySecretsInjection }] }], ...dirtySecretsInjection }));
    } else if (url.includes('/availability')) {
      res.end(JSON.stringify({ isAvailable: true, availableItems: [{ offeringId: 'lavash_beef', requestedQuantity: 2, ...dirtySecretsInjection }], unavailableItems: [], ...dirtySecretsInjection }));
    } else if (url.includes('/quotes')) {
      res.end(JSON.stringify({ id: 'qt_test_123', providerSlug: 'mock-evos', lines: [{ offeringId: 'lavash_beef', name: 'Beef Lavash', quantity: 2, unitPrice: 34000, totalPrice: 68000, ...dirtySecretsInjection }], subtotal: 68000, totalFees: 12000, totalDiscount: 0, total: 80000, currency: 'UZS', expiresAt: new Date(Date.now() + 900000).toISOString(), ...dirtySecretsInjection }));
    } else if (url.includes('/actions/') && req.method === 'POST' && url.includes('/cancel')) {
      res.end(JSON.stringify({ id: 'act_test_123', publicId: 'ZY-EVOS-98421', status: 'CANCELLED', cancellationReason: 'Customer requested', ...dirtySecretsInjection }));
    } else if (url.includes('/actions/') && url.includes('/payment-options')) {
      res.end(JSON.stringify({ paymentOptions: [{ id: 'payme', name: 'Payme', checkoutUrl: 'https://checkout.evos.uz/pay/payme', ...dirtySecretsInjection }], ...dirtySecretsInjection }));
    } else if (url.includes('/actions/') && req.method === 'GET') {
      res.end(JSON.stringify({ id: 'act_test_123', publicId: 'ZY-EVOS-98421', status: 'CONFIRMED', fulfillmentStatus: 'IN_PREPARATION', customerMessage: 'Buyurtmangiz tayyorlanmoqda.', ...dirtySecretsInjection }));
    } else if (url.includes('/actions') && req.method === 'POST') {
      res.end(JSON.stringify({ id: 'act_test_123', publicId: 'ZY-EVOS-98421', providerSlug: 'mock-evos', status: 'AWAITING_PAYMENT', total: 80000, currency: 'UZS', paymentHandoffUrl: 'https://checkout.evos.uz/pay/98421', ...dirtySecretsInjection }));
    } else if (url.includes('/providers/mock-evos')) {
      res.end(JSON.stringify({ slug: 'mock-evos', name: 'EVOS Fast Food', type: 'FOOD', status: 'ACTIVE', capabilities: ['CATALOG', 'QUOTE', 'ACTION_CREATE'], ...dirtySecretsInjection }));
    } else if (url.includes('/providers')) {
      res.end(JSON.stringify([{ slug: 'mock-evos', name: 'EVOS Fast Food', type: 'FOOD', ...dirtySecretsInjection }]));
    } else {
      res.end(JSON.stringify({ status: 'ok', ...dirtySecretsInjection }));
    }
  });

  const apiPort: number = await new Promise(resolve => {
    mockApiServer.listen(0, '127.0.0.1', () => {
      resolve((mockApiServer.address() as any).port);
    });
  });

  // Set environment variables for MCP server to talk to our mock backend API
  process.env.API_BASE_URL = `http://127.0.0.1:${apiPort}`;
  process.env.ZAYUNO_API_KEY = 'zy_live_agent_secret_key_12345';

  const liveMcpApp = runHttpSseServer(0);
  const liveMcpServer: Server = await new Promise(resolve => {
    const s = liveMcpApp.listen(0, '127.0.0.1', () => resolve(s));
  });
  const liveMcpPort = (liveMcpServer.address() as any).port;
  const liveMcpUrl = `http://127.0.0.1:${liveMcpPort}`;

  const sampleToolInputs: Record<string, Record<string, any>> = {
    get_welcome_message: {},
    find_providers: { category: 'food' },
    list_providers: { status: 'ACTIVE' },
    get_provider: { providerSlug: 'mock-evos' },
    get_provider_capabilities: { providerSlug: 'mock-evos' },
    get_locations: { providerSlug: 'mock-evos', activeOnly: true },
    get_catalog: { providerSlug: 'mock-evos' },
    search_catalog: { providerSlug: 'mock-evos', query: 'lavash' },
    get_offering: { providerSlug: 'mock-evos', offeringId: 'lavash_beef' },
    check_availability: { providerSlug: 'mock-evos', items: [{ offeringId: 'lavash_beef', quantity: 2 }] },
    request_quote: { providerSlug: 'mock-evos', items: [{ offeringId: 'lavash_beef', quantity: 2 }] },
    create_action: {
      providerSlug: 'mock-evos',
      quoteId: 'qt_test_123',
      items: [{ offeringId: 'lavash_beef', quantity: 2 }],
      customer: { name: 'Alisher', phone: '+998901234567', email: 'alisher@example.com' },
      userConfirmed: true
    },
    get_action: { actionId: 'ZY-EVOS-98421' },
    cancel_action: { actionId: 'ZY-EVOS-98421', reason: 'Change of plan', reasonCode: 'CUSTOMER_CANCELLED' },
    get_payment_options: { actionId: 'ZY-EVOS-98421' }
  };

  try {
    // 9A. Test all 15 tools in SUCCESS MODE over real HTTP JSON-RPC
    console.log('    -> Testing all 15 tools over real HTTP POST /mcp (Success Mode with Dirty Payloads & PII)...');
    for (const tool of ZAYUNO_MCP_TOOLS) {
      const input = sampleToolInputs[tool.name] || {};
      const httpRes = await fetch(`${liveMcpUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `test-call-${tool.name}`,
          method: 'tools/call',
          params: { name: tool.name, arguments: input }
        })
      });

      assert.equal(httpRes.status, 200, `Tool ${tool.name} failed over HTTP: status ${httpRes.status}`);
      const httpBody = await httpRes.json();
      assert.equal(httpBody.jsonrpc, '2.0');
      assert.equal(httpBody.id, `test-call-${tool.name}`);
      assert.ok(httpBody.result?.content?.[0]?.text, `Tool ${tool.name} missing content text in JSON-RPC result`);

      const parsedPayload = JSON.parse(httpBody.result.content[0].text);
      assert.equal(typeof parsedPayload.customerMessage, 'string', `Tool ${tool.name} missing customerMessage in HTTP payload`);
      assert.ok(parsedPayload.customerMessage.length > 0);

      // Verify recursive zero secret and zero PII leakage over real HTTP response
      assertNoSecretLeakage(parsedPayload, tool.name);
    }
    console.log(`    ✓ All ${ZAYUNO_MCP_TOOLS.length} tools executed over HTTP POST /mcp with verified zero secret/PII leakage.`);

    // 9B. Test all 15 tools in ERROR MODE over real HTTP JSON-RPC (Strict Assertion on isError: true)
    console.log('    -> Testing all 15 tools over real HTTP POST /mcp (Strict Error Mode with Raw DB Error Payloads)...');
    mockErrorMode = true;

    for (const tool of ZAYUNO_MCP_TOOLS) {
      const input = sampleToolInputs[tool.name] || {};
      const httpErrRes = await fetch(`${liveMcpUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `test-err-${tool.name}`,
          method: 'tools/call',
          params: { name: tool.name, arguments: input }
        })
      });

      assert.equal(httpErrRes.status, 200, `Tool ${tool.name} error response must be HTTP 200 JSON-RPC envelope`);
      const httpErrBody = await httpErrRes.json();
      assert.equal(httpErrBody.jsonrpc, '2.0', `Tool ${tool.name} response must follow JSON-RPC 2.0`);

      if (tool.name === 'get_welcome_message') {
        // get_welcome_message intentionally features graceful fallback to always welcome customer
        const welcomeContent = JSON.parse(httpErrBody.result.content[0].text);
        assert.equal(typeof welcomeContent.customerMessage, 'string');
        assert.ok(welcomeContent.customerMessage.length > 0);
        assertNoSecretLeakage(welcomeContent, tool.name);
      } else {
        // STRICT CHECK: All other 14 tools MUST return isError: true on backend failure
        assert.equal(
          httpErrBody.result?.isError,
          true,
          `Tool ${tool.name} failed to set result.isError = true on backend failure! Got: ${JSON.stringify(httpErrBody)}`
        );

        const errorContent = JSON.parse(httpErrBody.result.content[0].text);
        assert.equal(errorContent.isError, true, `Tool ${tool.name} payload content must have isError: true`);
        assert.equal(typeof errorContent.customerMessage, 'string', `Tool ${tool.name} error must provide customerMessage string`);
        assert.ok(errorContent.customerMessage.length > 0, `Tool ${tool.name} error customerMessage cannot be empty`);

        // Must be customer friendly, zero DB URLs, zero passwords, zero leaked tokens
        assert.ok(!errorContent.customerMessage.includes('5432'), `DB port leaked in ${tool.name} error: "${errorContent.customerMessage}"`);
        assert.ok(!errorContent.customerMessage.includes('postgresql://'), `DB URL leaked in ${tool.name} error: "${errorContent.customerMessage}"`);
        assert.ok(!errorContent.customerMessage.includes('supersecret'), `DB password leaked in ${tool.name} error: "${errorContent.customerMessage}"`);
        assert.ok(!errorContent.customerMessage.includes('zy_live_super_secret'), `Secret token leaked in ${tool.name} error: "${errorContent.customerMessage}"`);
        assert.ok(!errorContent.customerMessage.includes('ECONNREFUSED'), `Raw network error code leaked in ${tool.name} error: "${errorContent.customerMessage}"`);
      }
    }
    console.log(`    ✓ All ${ZAYUNO_MCP_TOOLS.length} tools verified under HTTP exception conditions: get_welcome_message graceful fallback verified, 14 tools strictly verified with isError=true and zero raw DB errors or secret leaks.`);
  } finally {
    await new Promise(resolve => liveMcpServer.close(resolve));
    await new Promise(resolve => mockApiServer.close(resolve));
  }

  // ---------------------------------------------------------------------------
  // 10. Strict JSON Schema Validation of chatgpt-app-submission.json (Ajv Draft 2020-12)
  // ---------------------------------------------------------------------------
  console.log('  [10/10] Validating chatgpt-app-submission.json with Official Ajv Draft 2020-12 Schema Engine...');
  const validatedSubmission = await validateSubmissionManifest();
  assert.equal(validatedSubmission.app_info.category, 'SHOPPING');
  assert.equal(validatedSubmission.schema_version, 1);
  assert.ok(validatedSubmission.test_cases.length >= 5);
  assert.ok(validatedSubmission.negative_test_cases.length >= 3);

  console.log(`    ✓ chatgpt-app-submission.json passed official OpenAI Draft 2020-12 specification.`);

  console.log('\n================================================================');
  console.log('🎉 ALL 10 OPENAI PLUGIN & MCP CONTRACT TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ MCP Contract Test Suite Failed:', err);
  process.exit(1);
});
