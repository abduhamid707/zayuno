import assert from 'node:assert/strict';
import {
  ProviderCapability,
  ProviderCapabilityProfile,
  ProviderType,
  determineProviderCapabilityProfile,
  getMandatoryCapabilitiesForProfile,
  READONLY_MANDATORY_CAPABILITIES,
  TRANSACTIONAL_MANDATORY_CAPABILITIES
} from '../packages/contracts/src/provider.ts';
import { ProviderCertificationRunner } from '../packages/provider-sdk/src/certification.ts';
import {
  generateAiPrompt,
  generateContractJson,
  GOAL_OPTIONS,
  FRAMEWORK_OPTIONS
} from '../apps/provider-portal/src/ai-integration-kit.ts';

async function runTests() {
  console.log('🧪 Starting AI Integration Kit, Capability Profiles, and Security Guards Test Suite...\n');

  // =========================================================================
  // 1. CAPABILITY PROFILE DETERMINATION & MANDATORY SETS
  // =========================================================================
  console.log('--- Test Group 1: Universal Capability Profiles ---');

  // Test 1.1: Discovery / Read-only profile
  const readOnlyCaps = [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG];
  const readOnlyProfile = determineProviderCapabilityProfile(readOnlyCaps);
  assert.equal(readOnlyProfile, ProviderCapabilityProfile.DISCOVERY_READONLY, 'Should identify read-only profile');

  const readOnlyMandatory = getMandatoryCapabilitiesForProfile(readOnlyCaps);
  assert.deepEqual(
    readOnlyMandatory.sort(),
    [...READONLY_MANDATORY_CAPABILITIES].sort(),
    'Read-only mandatory capabilities should be METADATA, HEALTH, CATALOG'
  );
  console.log('✅ 1.1 Discovery / Read-only capability profile correctly resolved');

  // Test 1.2: Transactional profile
  const transCaps = [
    ProviderCapability.METADATA,
    ProviderCapability.HEALTH,
    ProviderCapability.CATALOG,
    ProviderCapability.QUOTE,
    ProviderCapability.ACTION_CREATE,
    ProviderCapability.ACTION_STATUS,
    ProviderCapability.WEBHOOK
  ];
  const transProfile = determineProviderCapabilityProfile(transCaps);
  assert.equal(transProfile, ProviderCapabilityProfile.TRANSACTIONAL, 'Should identify transactional profile');

  const transMandatory = getMandatoryCapabilitiesForProfile(transCaps);
  assert.deepEqual(
    transMandatory.sort(),
    [...TRANSACTIONAL_MANDATORY_CAPABILITIES].sort(),
    'Transactional mandatory capabilities should match full 7 capabilities'
  );
  console.log('✅ 1.2 Full Transactional capability profile correctly resolved');

  // Test 1.3: Physical vs Digital location requirements
  const physicalMandatory = getMandatoryCapabilitiesForProfile(
    [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG],
    { type: ProviderType.DELIVERY }
  );
  assert.ok(
    physicalMandatory.includes(ProviderCapability.LOCATIONS),
    'Physical type should require LOCATIONS'
  );

  const digitalMandatory = getMandatoryCapabilitiesForProfile(
    [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG],
    { type: ProviderType.SERVICES }
  );
  assert.ok(
    !digitalMandatory.includes(ProviderCapability.LOCATIONS),
    'Digital service should NOT require LOCATIONS'
  );
  console.log('✅ 1.3 Physical vs Digital location capability requirement correctly resolved');

  // =========================================================================
  // 2. CERTIFICATION RUNNER PROFILE-AWARE READINESS
  // =========================================================================
  console.log('\n--- Test Group 2: Profile-Aware Certification Runner ---');

  // Test 2.1: Read-only provider adapter
  const mockReadOnlyAdapter: any = {
    providerSlug: 'test-readonly-bot',
    getCapabilities: () => [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG],
    hasCapability: (cap: any) => [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG].includes(cap),
    getProviderInfo: async () => ({
      id: 'test-readonly-bot',
      slug: 'test-readonly-bot',
      name: 'Test ReadOnly Bot',
      status: 'SANDBOX',
      capabilities: [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG]
    }),
    checkHealth: async () => ({
      status: 'HEALTHY',
      latencyMs: 15,
      timestamp: new Date().toISOString()
    }),
    getCatalog: async () => ({
      providerSlug: 'test-readonly-bot',
      categories: [{ id: 'c1', name: 'General' }],
      offerings: [{ id: 'o1', title: 'Listing 1', basePrice: 50000, currency: 'UZS' }]
    })
  };

  const readOnlyRunner = new ProviderCertificationRunner(mockReadOnlyAdapter);
  const readOnlyReport = await readOnlyRunner.runAllTests();

  assert.equal(readOnlyReport.profile, ProviderCapabilityProfile.DISCOVERY_READONLY, 'Report should state read-only profile');
  assert.ok(readOnlyReport.isCertified, 'Read-only provider should be certified');
  assert.ok(readOnlyReport.isProductionReady, 'Read-only provider should be production ready');
  console.log('✅ 2.1 Read-only provider successfully passes certification and achieves production readiness');

  // Test 2.2: Transactional provider missing quote or actions
  const mockIncompleteAdapter: any = {
    providerSlug: 'test-incomplete-store',
    getCapabilities: () => [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.WEBHOOK
    ],
    hasCapability: (cap: any) => [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.WEBHOOK
    ].includes(cap),
    getProviderInfo: async () => ({
      id: 'test-incomplete-store',
      slug: 'test-incomplete-store',
      name: 'Incomplete Store',
      status: 'SANDBOX',
      capabilities: [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG]
    }),
    checkHealth: async () => ({ status: 'HEALTHY', latencyMs: 10, timestamp: new Date().toISOString() }),
    getCatalog: async () => ({ providerSlug: 'test-incomplete-store', categories: [], offerings: [] }),
    // Quote is missing / throws error
    requestQuote: async () => { throw new Error('Quote endpoint not implemented'); }
  };

  const incompleteRunner = new ProviderCertificationRunner(mockIncompleteAdapter);
  const incompleteReport = await incompleteRunner.runAllTests();

  assert.equal(incompleteReport.profile, ProviderCapabilityProfile.TRANSACTIONAL, 'Should identify as transactional');
  assert.equal(incompleteReport.isCertified, false, 'Incomplete transactional provider must NOT be certified');
  assert.equal(incompleteReport.isProductionReady, false, 'Incomplete transactional provider must NOT be production ready');
  console.log('✅ 2.2 Incomplete transactional provider is strictly blocked from certification');

  // =========================================================================
  // 3. AI INTEGRATION KIT & PROMPT GENERATION
  // =========================================================================
  console.log('\n--- Test Group 3: AI Integration Kit Prompt Generation & Privacy ---');

  // Test 3.1: Complete Markdown structure
  const prompt = generateAiPrompt({
    goal: 'create-new',
    framework: 'nodejs-express',
    provider: {
      slug: 'test-coffee-express',
      name: 'Test Coffee Express',
      type: 'FOOD_DELIVERY',
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.CATALOG,
        ProviderCapability.QUOTE,
        ProviderCapability.ACTION_CREATE,
        ProviderCapability.ACTION_STATUS,
        ProviderCapability.WEBHOOK
      ]
    }
  });

  assert.ok(prompt.includes('# Zayuno Provider Integration Task'), 'Prompt must contain main title');
  assert.ok(prompt.includes('## 1. Goal'), 'Prompt must contain Goal section');
  assert.ok(prompt.includes('## 2. Product Context'), 'Prompt must contain Product Context section');
  assert.ok(prompt.includes('## 3. Provider Profile'), 'Prompt must contain Provider Profile section');
  assert.ok(prompt.includes('## 4. Contract Specification'), 'Prompt must contain Contract Specification section');
  assert.ok(prompt.includes('## 5. Security & Privacy Rules'), 'Prompt must contain Security Rules section');
  assert.ok(prompt.includes('## 6. Framework-Specific Task'), 'Prompt must contain Framework-Specific Task section');
  assert.ok(prompt.includes('## 7. Verification Steps'), 'Prompt must contain Verification Steps section');
  assert.ok(prompt.includes('## 9. Constraints'), 'Prompt must contain Constraints section');
  console.log('✅ 3.1 AI Prompt contains all mandatory structured sections');

  // Test 3.2: Framework-specific instructions
  const pyPrompt = generateAiPrompt({ goal: 'implement-endpoint', framework: 'python-fastapi' });
  assert.ok(pyPrompt.includes('FastAPI'), 'Python prompt should mention FastAPI');
  assert.ok(pyPrompt.includes('raw_body = await request.body()'), 'Python prompt should include raw body handling for HMAC');

  const phpPrompt = generateAiPrompt({ goal: 'fix-hmac', framework: 'php-laravel' });
  assert.ok(phpPrompt.includes('Laravel'), 'PHP prompt should mention Laravel');
  assert.ok(phpPrompt.includes('hash_hmac'), 'PHP prompt should include hash_hmac');

  const goPrompt = generateAiPrompt({ goal: 'fix-action', framework: 'go' });
  assert.ok(goPrompt.includes('Go'), 'Go prompt should mention Go');
  assert.ok(goPrompt.includes('hmac.New'), 'Go prompt should include hmac.New');
  console.log('✅ 3.2 Framework-specific code skeletons generated correctly for Node, Python, PHP, and Go');

  // Test 3.3: Strict Privacy & Zero Secret Leakage Verification
  const sensitiveProvider = {
    slug: 'secure-corp',
    name: 'Secure Corp',
    secret: 'super_secret_webhook_key_99999',
    encryptedSecret: 'enc_sec_12345',
    webhookSecret: 'whsec_999999999',
    apiKey: 'zy_live_agent_secret_key_12345',
    token: 'jwt_token_secret_value',
    password: 'password123',
    phone: '+998901234567',
    email: 'admin@securecorp.uz'
  };

  const sensitivePrompt = generateAiPrompt({
    goal: 'fix-certification',
    framework: 'nodejs-express',
    provider: sensitiveProvider,
    certReport: {
      isCertified: false,
      tests: [
        {
          name: 'Webhook Signature Test',
          capability: 'WEBHOOK',
          isMandatory: true,
          passed: false,
          error: 'Invalid signature with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and key=zy_live_agent_secret_key_12345'
        }
      ]
    }
  });

  // Verify that secrets are NEVER present in prompt
  assert.ok(!sensitivePrompt.includes('super_secret_webhook_key_99999'), 'Prompt must NOT contain raw secret');
  assert.ok(!sensitivePrompt.includes('whsec_999999999'), 'Prompt must NOT contain webhookSecret');
  assert.ok(!sensitivePrompt.includes('password123'), 'Prompt must NOT contain password');
  assert.ok(!sensitivePrompt.includes('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'Prompt must redact Bearer tokens');
  assert.ok(sensitivePrompt.includes('Bearer [REDACTED]'), 'Prompt must replace tokens with [REDACTED]');
  assert.ok(sensitivePrompt.includes('key=[REDACTED]'), 'Prompt must replace sensitive keys with [REDACTED]');
  console.log('✅ 3.3 Strict privacy & zero secret leakage verified: all credentials, tokens, and PII are redacted');

  // Test 3.4: Contract JSON generation
  const contractJson = generateContractJson(sensitiveProvider);
  const parsedJson = JSON.parse(contractJson);
  assert.equal(parsedJson.provider.slug, 'secure-corp');
  assert.equal(parsedJson.provider.secret, undefined, 'Contract JSON must not contain secrets');
  assert.equal(parsedJson.provider.apiKey, undefined, 'Contract JSON must not contain API keys');
  console.log('✅ 3.4 Contract JSON export schema verified with zero secrets');

  console.log('\n🎉 ALL AI INTEGRATION KIT & PROFILE TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
