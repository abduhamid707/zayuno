import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ProviderCapability,
  ProviderCapabilityProfile,
  ProviderType,
  determineProviderCapabilityProfile,
  getMandatoryCapabilitiesForProfile
} from '../packages/contracts/src/provider.ts';
import {
  generateAiPrompt,
  generateContractJson,
  sanitizeContext
} from '../apps/provider-portal/src/ai-integration-kit.ts';
import { scrubSensitiveString, redactForLogs } from '../packages/shared/src/redaction.ts';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service.ts';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import { DeveloperSandboxService } from '../apps/api/src/modules/developer-sandbox/developer-sandbox.service.ts';
import { ProviderRegistryService } from '../apps/api/src/modules/providers/provider-registry.service.ts';
import { prisma } from '../packages/database/src/client.ts';
import { RedisService } from '../apps/api/src/common/services/redis.service.ts';
import { NatsService } from '../apps/api/src/common/services/nats.service.ts';

async function runSecuritySuite() {
  console.log('🧪 Starting Security, Sandbox Session & AI Contract Accuracy Test Suite...\n');

  // =========================================================================
  // TEST 1: ZERO SECRETS / API KEYS IN FRONTEND SOURCE & BUNDLE
  // =========================================================================
  console.log('--- Test 1: Frontend Source & Bundle Hygiene ---');

  const appTsxContent = fs.readFileSync(
    path.resolve(process.cwd(), 'apps/provider-portal/src/App.tsx'),
    'utf-8'
  );
  assert.ok(!appTsxContent.includes('SANDBOX_DEMO_API_KEY'), 'App.tsx must not declare SANDBOX_DEMO_API_KEY');
  assert.ok(!appTsxContent.includes('zy_live_'), 'App.tsx must not contain any zy_live_ keys');
  assert.ok(!appTsxContent.includes("'x-api-key'"), 'App.tsx must not send x-api-key from browser');
  console.log('✅ 1.1 App.tsx source verified free of hardcoded API keys and credentials');

  // Check dist bundle if present
  const distDir = path.resolve(process.cwd(), 'apps/provider-portal/dist/assets');
  if (fs.existsSync(distDir)) {
    const files = fs.readdirSync(distDir);
    for (const f of files) {
      if (f.endsWith('.js')) {
        const bundleContent = fs.readFileSync(path.join(distDir, f), 'utf-8');
        assert.ok(!bundleContent.includes('zy_live_agent_secret_key'), `Bundle ${f} must not contain live secret keys`);
        assert.ok(!bundleContent.includes('zy_live_prov_secret'), `Bundle ${f} must not contain provider secret keys`);
      }
    }
    console.log('✅ 1.2 Provider portal production JS bundle verified clean of live API keys');
  }

  // =========================================================================
  // TEST 2: PUBLIC ENDPOINTS CANNOT BE BYPASSED BY CLIENT HEADERS
  // =========================================================================
  console.log('\n--- Test 2: Public Publishing Gate Isolation against Client Headers ---');

  const registry = new ProviderRegistryService();
  registry.onModuleInit();
  const redisService = new RedisService();
  redisService.onModuleInit();
  const natsService = new NatsService();
  const quotesService = new QuotesService(registry);
  const actionsService = new ActionsService(registry, natsService, redisService);

  // Attempt to quote an unpublished provider (or sandbox-provider without server-controlled simulator session)
  const unpublishedSlug = 'test-draft-provider';
  await prisma.provider.upsert({
    where: { slug: unpublishedSlug },
    update: {
      status: 'DRAFT' as any,
      metadata: { reviewStatus: 'DRAFT', isPublished: false, isCertified: false }
    },
    create: {
      id: 'prov_test_draft',
      slug: unpublishedSlug,
      name: 'Test Draft Provider',
      type: 'SERVICES' as any,
      status: 'DRAFT' as any,
      metadata: { reviewStatus: 'DRAFT', isPublished: false, isCertified: false },
      adapterType: 'remote-http',
      encryptedSecret: 'enc_sec_test_val',
      webhookSecret: 'whsec_test_val',
      capabilities: ['METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE']
    }
  });

  // Public quote without server simulator authorization MUST fail
  await assert.rejects(
    async () => {
      await quotesService.requestQuote({
        providerSlug: unpublishedSlug,
        items: [{ offeringId: 'off_1', quantity: 1 }]
      });
    },
    /Provider is not published for public quotes/i,
    'Unpublished provider must be rejected by public quotesService'
  );

  // Even if allowSandboxSimulator is passed for a non-sandbox-provider slug, it MUST fail
  await assert.rejects(
    async () => {
      await quotesService.requestQuote(
        {
          providerSlug: unpublishedSlug,
          items: [{ offeringId: 'off_1', quantity: 1 }]
        },
        { allowSandboxSimulator: true }
      );
    },
    /Provider is not published for public quotes/i,
    'Non-sandbox provider must never receive simulator bypass even if flag is passed'
  );
  console.log('✅ 2.1 Public publishing gate strictly blocks unpublished providers and rejects forged simulator flags');

  // =========================================================================
  // TEST 3 & 4: DEVELOPER SANDBOX SIMULATOR SESSION SCOPING & RESTRICTIONS
  // =========================================================================
  console.log('\n--- Test 3 & 4: Cryptographically Signed Simulator Session Scoping ---');

  const sandboxService = new DeveloperSandboxService(quotesService, actionsService);

  // 3.1 Create valid simulator session
  const session = await sandboxService.createSession();
  assert.ok(session.sessionToken, 'Must generate a session token');
  assert.equal(session.providerSlug, 'sandbox-provider');
  assert.equal(session.expiresInSeconds, 900);

  // 3.2 Verify session token structure
  const verified = await sandboxService.verifySessionToken(session.sessionToken);
  assert.equal(verified.payload.providerSlug, 'sandbox-provider');
  assert.ok(verified.payload.expiresAt > Date.now());

  // 3.3 Forged signature must be rejected
  const [payloadBase64] = session.sessionToken.split('.');
  const forgedToken = `${payloadBase64}.invalid_signature_bytes`;
  await assert.rejects(
    async () => {
      await sandboxService.verifySessionToken(forgedToken);
    },
    /Invalid simulator session token signature/i,
    'Forged simulator token signature must be rejected'
  );

  // 4.1 Simulator session cannot quote another unpublished provider
  await assert.rejects(
    async () => {
      await sandboxService.requestQuote(
        { providerSlug: unpublishedSlug, items: [{ offeringId: 'off_1', quantity: 1 }] },
        session.sessionToken
      );
    },
    /Only "sandbox-provider" is allowed/i,
    'Simulator session must not permit quoting non-sandbox providers'
  );

  // 4.2 Simulator session cannot create action for another provider
  await assert.rejects(
    async () => {
      await sandboxService.createAction(
        {
          idempotencyKey: 'test_key_1',
          providerSlug: unpublishedSlug,
          quoteId: 'quote_123',
          customer: { name: 'Test', phone: '+998901234567' },
          items: [{ offeringId: 'off_1', quantity: 1 }],
          userConfirmed: true
        },
        session.sessionToken
      );
    },
    /Only "sandbox-provider" is allowed/i,
    'Simulator session must not permit action creation for non-sandbox providers'
  );
  console.log('✅ 3.1 & 4.1 Simulator session token is cryptographically verified and strictly restricted to sandbox-provider');

  // =========================================================================
  // TEST 5: PROFILE-AWARE CONTRACT JSON GENERATION
  // =========================================================================
  console.log('\n--- Test 5: Profile-Aware Contract JSON Generation ---');

  // 5.1 Discovery / Read-Only Profile Contract JSON
  const readOnlyProvider = {
    slug: 'read-only-news',
    name: 'Read Only News',
    capabilities: [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG, ProviderCapability.SEARCH]
  };

  const readOnlyJsonStr = generateContractJson(readOnlyProvider);
  const readOnlyJson = JSON.parse(readOnlyJsonStr);

  assert.equal(readOnlyJson.profile, ProviderCapabilityProfile.DISCOVERY_READONLY);
  assert.ok(readOnlyJson.endpoints.health, 'Read-only contract must include health endpoint');
  assert.ok(readOnlyJson.endpoints.providerInfo, 'Read-only contract must include providerInfo endpoint');
  assert.ok(readOnlyJson.endpoints.catalog, 'Read-only contract must include catalog endpoint');
  assert.ok(readOnlyJson.endpoints.search, 'Read-only contract must include search when declared');
  assert.equal(readOnlyJson.endpoints.quote, undefined, 'Read-only contract must NOT include quote endpoint');
  assert.equal(readOnlyJson.endpoints.actions, undefined, 'Read-only contract must NOT include actions endpoint');
  assert.equal(readOnlyJson.endpoints.actionStatus, undefined, 'Read-only contract must NOT include actionStatus endpoint');
  assert.equal(readOnlyJson.endpoints.webhook, undefined, 'Read-only contract must NOT include webhook endpoint');
  console.log('✅ 5.1 Read-Only Contract JSON strictly omits quote, action, and webhook endpoints');

  // 5.2 Transactional Profile Contract JSON
  const transProvider = {
    slug: 'coffee-express',
    name: 'Coffee Express',
    capabilities: [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.WEBHOOK,
      ProviderCapability.PAYMENT_OPTIONS,
      ProviderCapability.ACTION_CANCEL
    ]
  };

  const transJsonStr = generateContractJson(transProvider);
  const transJson = JSON.parse(transJsonStr);

  assert.equal(transJson.profile, ProviderCapabilityProfile.TRANSACTIONAL);
  assert.ok(transJson.endpoints.health);
  assert.ok(transJson.endpoints.catalog);
  assert.ok(transJson.endpoints.quote);
  assert.ok(transJson.endpoints.actions);
  assert.ok(transJson.endpoints.actionStatus);
  assert.ok(transJson.endpoints.webhook);
  assert.ok(transJson.endpoints.paymentOptions);
  assert.ok(transJson.endpoints.actionCancel);
  console.log('✅ 5.2 Transactional Contract JSON includes all declared transaction & cancellation endpoints');

  // =========================================================================
  // TEST 6: COMPREHENSIVE SENSITIVE DATA REDACTION IN PROMPTS & EXPORTS
  // =========================================================================
  console.log('\n--- Test 6: Central Redaction for Prompt, Preview, and JSON Export ---');

  const sensitivePayload = {
    slug: 'secure-provider',
    name: 'Secure Provider',
    apiKey: 'zy_live_sensitive_key_99999',
    webhookSecret: 'whsec_secret_value_123',
    password: 'super_secret_password',
    token: 'jwt_token_123456',
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do_not_leak',
    cookie: 'session_id=abc123xyz; Secure; HttpOnly',
    customer: {
      phone: '+998901234567',
      email: 'customer@business.uz',
      address: 'Amir Temur 108, Tashkent'
    },
    nested: {
      deepSecret: 'secret_nested_data',
      apiKey: 'zy_sec_nested_key_777'
    }
  };

  // 6.1 sanitizeContext check
  const sanitized = sanitizeContext(sensitivePayload);
  assert.equal(sanitized.apiKey, undefined, 'apiKey must be stripped');
  assert.equal(sanitized.webhookSecret, undefined, 'webhookSecret must be stripped');
  assert.equal(sanitized.password, undefined, 'password must be stripped');
  assert.equal(sanitized.token, undefined, 'token must be stripped');
  assert.equal(sanitized.authorization, undefined, 'authorization must be stripped');
  assert.equal(sanitized.cookie, undefined, 'cookie must be stripped');

  // 6.2 generateAiPrompt scrub check
  const prompt = generateAiPrompt({
    goal: 'fix-certification',
    framework: 'nodejs-express',
    provider: sensitivePayload,
    certReport: {
      isCertified: false,
      tests: [
        {
          name: 'Webhook Failure',
          capability: 'WEBHOOK',
          passed: false,
          error: 'Failed with Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do_not_leak and zy_live_standalone_key_12345 and x-api-key: secret_abc and cookie: session=123 and phone +998901234567 email test@user.uz'
        }
      ]
    }
  });

  assert.ok(!prompt.includes('zy_live_sensitive_key_99999'), 'Prompt must NOT contain raw API key');
  assert.ok(!prompt.includes('whsec_secret_value_123'), 'Prompt must NOT contain webhookSecret');
  assert.ok(!prompt.includes('super_secret_password'), 'Prompt must NOT contain password');
  assert.ok(!prompt.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'Prompt must NOT contain raw JWT token');
  assert.ok(!prompt.includes('+998901234567'), 'Prompt must NOT contain raw phone number');
  assert.ok(!prompt.includes('test@user.uz'), 'Prompt must NOT contain raw email address');
  assert.ok(prompt.includes('Bearer [REDACTED]'), 'Prompt must redact Bearer token');
  assert.ok(prompt.includes('[REDACTED_CREDENTIAL]'), 'Prompt must redact Zayuno credentials');
  assert.ok(prompt.includes('[REDACTED_PHONE]'), 'Prompt must redact phone number');
  assert.ok(prompt.includes('[REDACTED_EMAIL]'), 'Prompt must redact email');
  console.log('✅ 6.1 Central redaction guarantees zero leakage of credentials, tokens, cookies, and PII in prompts');

  // =========================================================================
  // TEST 7: END-TO-END SIMULATOR HTTP LIFECYCLE
  // =========================================================================
  console.log('\n--- Test 7: End-to-End Sandbox Simulator Lifecycle ---');

  // 7.1 Create session
  const simSession = await sandboxService.createSession();

  // 7.2 Request quote via simulator
  const quoteResult = await sandboxService.requestQuote(
    {
      providerSlug: 'sandbox-provider',
      items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }]
    },
    simSession.sessionToken
  );
  assert.ok(quoteResult.id, 'Simulator quote must return a valid quote ID');
  assert.equal(quoteResult.providerSlug, 'sandbox-provider');
  assert.ok(quoteResult.total > 0, 'Quote must compute valid total');

  // 7.3 Create action via simulator
  const actionResult = await sandboxService.createAction(
    {
      idempotencyKey: `sb_test_${Date.now()}`,
      providerSlug: 'sandbox-provider',
      quoteId: quoteResult.id,
      customer: { name: 'Demo Simulator Customer', phone: '+998901234567' },
      items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
      userConfirmed: true
    },
    simSession.sessionToken
  );
  assert.ok(actionResult.id, 'Simulator action must return a valid action ID');
  assert.equal(actionResult.providerSlug, 'sandbox-provider');

  // 7.4 Get action status via simulator
  const fetchedAction = await sandboxService.getAction(actionResult.id, simSession.sessionToken);
  assert.equal(fetchedAction.id, actionResult.id);
  console.log('✅ 7.1 Complete E2E Simulator lifecycle (Session → Quote → Confirmed Action → Status) verified');

  redisService.onModuleDestroy();
  console.log('\n🎉 ALL SECURITY, SANDBOX SESSION & AI CONTRACT TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runSecuritySuite().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
