import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ProviderRegistryService } from '../apps/api/src/modules/providers/provider-registry.service.ts';
import { RedisService } from '../apps/api/src/common/services/redis.service.ts';
import { NatsService } from '../apps/api/src/common/services/nats.service.ts';
import { QuotesService } from '../apps/api/src/modules/quotes/quotes.service.ts';
import { ActionsService } from '../apps/api/src/modules/actions/actions.service.ts';
import { DeveloperSandboxService } from '../apps/api/src/modules/developer-sandbox/developer-sandbox.service.ts';
import { extractClientIp } from '../apps/api/src/modules/developer-sandbox/client-ip.util.ts';
import { prisma } from '../packages/database/src/client.ts';

async function runSecurityHardeningSuite() {
  console.log('🧪 Starting Sandbox Session State & Trusted Proxy Hardening Test Suite (REPAIR 3)...\n');

  const registry = new ProviderRegistryService();
  registry.onModuleInit();
  const redisService = new RedisService();
  redisService.onModuleInit();
  // Allow Redis connection handshake to complete
  await new Promise(r => setTimeout(r, 250));

  const natsService = new NatsService();
  const quotesService = new QuotesService(registry);
  const actionsService = new ActionsService(registry, natsService, redisService);

  // =========================================================================
  // TEST 1: PRODUCTION FAIL-CLOSED SECRET & REDIS REQUIREMENT
  // =========================================================================
  console.log('--- Test 1: Production Fail-Closed Secret & Redis Validation ---');

  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.SIMULATOR_SESSION_SECRET;

  try {
    process.env.NODE_ENV = 'production';
    delete process.env.SIMULATOR_SESSION_SECRET;

    const prodSandboxService = new DeveloperSandboxService(quotesService, actionsService, redisService);

    // 1.1 Session creation must fail-closed in production when secret is absent
    await assert.rejects(
      async () => {
        await prodSandboxService.createSession();
      },
      /SIMULATOR_SESSION_SECRET is not configured in production/i,
      'createSession must fail closed in production without SIMULATOR_SESSION_SECRET'
    );

    // 1.2 Session verification must fail-closed in production when secret is absent
    await assert.rejects(
      async () => {
        await prodSandboxService.verifySessionToken('dummy.token');
      },
      /SIMULATOR_SESSION_SECRET is not configured in production/i,
      'verifySessionToken must fail closed in production without SIMULATOR_SESSION_SECRET'
    );

    // 1.3 In production, if Redis is absent or disconnected, must fail closed
    process.env.SIMULATOR_SESSION_SECRET = 'test_prod_secret_32_characters_long_val';
    const disconnectedRedis = new RedisService(); // not initialized
    const prodNoRedisService = new DeveloperSandboxService(quotesService, actionsService, disconnectedRedis);

    await assert.rejects(
      async () => {
        await prodNoRedisService.createSession();
      },
      /Redis is required for Developer Sandbox in production/i,
      'createSession must fail closed in production when Redis is not ready'
    );
    console.log('✅ 1.1 Production fail-closed verified: missing secret or unready Redis strictly blocks sandbox operations');
  } finally {
    process.env.NODE_ENV = originalEnv || 'test';
    if (originalSecret) {
      process.env.SIMULATOR_SESSION_SECRET = originalSecret;
    } else {
      process.env.SIMULATOR_SESSION_SECRET = 'test_simulator_secret_for_hardening_suite_32chars';
    }
  }

  // =========================================================================
  // TEST 2: TRUSTED PROXY & X-FORWARDED-FOR SPOOFING MITIGATION
  // =========================================================================
  console.log('\n--- Test 2: Trusted Proxy & X-Forwarded-For Anti-Spoofing ---');

  // 2.1 Untrusted direct connection with forged X-Forwarded-For must use socket remoteAddress
  const untrustedDirectReq = {
    ip: undefined,
    socket: { remoteAddress: '198.51.100.25' },
    headers: { 'x-forwarded-for': '1.1.1.1, 8.8.8.8' }
  };
  const extractedDirectIp = extractClientIp(untrustedDirectReq);
  assert.equal(extractedDirectIp, '198.51.100.25', 'Direct untrusted connection must ignore spoofed X-Forwarded-For');

  // 2.2 Trusted reverse proxy connection (e.g. 127.0.0.1) parses proxy-appended client IP
  const trustedProxyReq = {
    ip: undefined,
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'x-forwarded-for': 'spoofed_client_ip, 203.0.113.88' }
  };
  const extractedProxyIp = extractClientIp(trustedProxyReq);
  assert.equal(extractedProxyIp, '203.0.113.88', 'Trusted proxy connection must extract the authentic client IP');

  // 2.3 Express trust-proxy pre-resolved ip is respected
  const expressResolvedReq = {
    ip: '203.0.113.99',
    socket: { remoteAddress: '127.0.0.1' }
  };
  assert.equal(extractClientIp(expressResolvedReq), '203.0.113.99');
  console.log('✅ 2.1 X-Forwarded-For anti-spoofing verified across direct and reverse proxy configurations');

  // =========================================================================
  // TEST 3: NO IN-MEMORY STATE REHYDRATION (API RESTART / EVICTION INVALIDATION)
  // =========================================================================
  console.log('\n--- Test 3: Rehydration Prevention & Server State Expiry Invalidation ---');

  const sandboxService = new DeveloperSandboxService(quotesService, actionsService, redisService);

  // 3.1 Create a valid session
  const session1 = await sandboxService.createSession('192.168.1.50');
  assert.ok(session1.sessionToken);

  // 3.2 Verify valid token succeeds with state
  const verified1 = await sandboxService.verifySessionToken(session1.sessionToken);
  assert.equal(verified1.payload.providerSlug, 'sandbox-provider');
  assert.equal(verified1.state.sessionId, verified1.payload.sessionId);

  // 3.3 Delete session state from Redis (simulating server restart without persistence or TTL eviction)
  if (redisService.isReady()) {
    await redisService.del(`dev_sandbox:session:${verified1.payload.sessionId}`);
  }

  // Create fresh service instance with empty in-memory store
  const freshRestartedService = new DeveloperSandboxService(quotesService, actionsService, undefined);

  // 3.4 Valid HMAC token without server-side state MUST BE REJECTED with 401
  await assert.rejects(
    async () => {
      await freshRestartedService.verifySessionToken(session1.sessionToken);
    },
    /Simulator session not found or expired/i,
    'Valid HMAC signature alone without server state must be rejected with 401'
  );
  console.log('✅ 3.1 In-memory blank rehydration completely removed; stateless tokens fail closed with 401');

  // =========================================================================
  // TEST 4: REDIS STATE OWNERSHIP ISOLATION (SESSION A vs SESSION B)
  // =========================================================================
  console.log('\n--- Test 4: Redis-Backed Session Ownership Isolation ---');

  // 4.1 Create Session A and Session B with Redis active
  const sessionA = await sandboxService.createSession('10.0.0.10');
  const sessionB = await sandboxService.createSession('10.0.0.20');

  // 4.2 Session A creates a quote
  const quoteA = await sandboxService.requestQuote(
    {
      providerSlug: 'sandbox-provider',
      items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }]
    },
    sessionA.sessionToken
  );
  assert.ok(quoteA.id);

  // 4.3 Session B attempts to use Session A quote -> 403 Forbidden
  await assert.rejects(
    async () => {
      await sandboxService.createAction(
        {
          idempotencyKey: `replay_test_${Date.now()}`,
          providerSlug: 'sandbox-provider',
          quoteId: quoteA.id,
          customer: { name: 'Imposter', phone: '+998901234567' },
          items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
          userConfirmed: true
        },
        sessionB.sessionToken
      );
    },
    /different simulator session or has expired/i,
    'Session B must not create action with Session A quote'
  );
  console.log('✅ 4.1 Redis-backed quote ownership verified: cross-session quote reuse is strictly blocked');

  // 4.4 Session A creates action
  const actionA = await sandboxService.createAction(
    {
      idempotencyKey: `action_test_${Date.now()}`,
      providerSlug: 'sandbox-provider',
      quoteId: quoteA.id,
      customer: { name: 'Customer A', phone: '+998901234567' },
      items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
      userConfirmed: true
    },
    sessionA.sessionToken
  );
  assert.ok(actionA.id);

  // 4.5 Session B attempts to read Session A action -> 404 Not Found
  await assert.rejects(
    async () => {
      await sandboxService.getAction(actionA.id, sessionB.sessionToken);
    },
    /not found for this simulator session/i,
    'Session B must receive 404 when reading Session A action'
  );
  console.log('✅ 4.2 Redis-backed action status isolation verified: Session B receives 404 for Session A action');

  // 4.6 Session A reads own action -> 200 OK
  const fetchedA = await sandboxService.getAction(actionA.id, sessionA.sessionToken);
  assert.equal(fetchedA.id, actionA.id);
  console.log('✅ 4.3 Session A successfully retrieves its own action status');

  // =========================================================================
  // TEST 5: REDIS TTL EXPIRY
  // =========================================================================
  console.log('\n--- Test 5: Redis TTL Expiry Enforcement ---');

  // 5.1 Delete state in Redis to simulate TTL expiration
  const { payload } = await sandboxService.verifySessionToken(sessionA.sessionToken);
  if (redisService.isReady()) {
    await redisService.del(`dev_sandbox:session:${payload.sessionId}`);
  }

  // 5.2 Attempting quote after TTL expiry fails with 401
  await assert.rejects(
    async () => {
      await sandboxService.requestQuote(
        { providerSlug: 'sandbox-provider', items: [{ offeringId: 'offering_standard_pkg', quantity: 1 }] },
        sessionA.sessionToken
      );
    },
    /Simulator session not found or expired/i,
    'Expired Redis TTL must fail closed on requestQuote'
  );
  console.log('✅ 5.1 Redis TTL expiration cleanly invalidates session token across all endpoints');

  // =========================================================================
  // TEST 6: ABUSE RATE LIMITING IN REDIS / MEMORY
  // =========================================================================
  console.log('\n--- Test 6: IP Rate Limiting and Concurrent Session Cap ---');

  const ipToCap = '172.16.50.99';
  for (let i = 0; i < 5; i++) {
    await sandboxService.createSession(ipToCap);
  }

  // 6th session creation for same IP must be rejected (429)
  await assert.rejects(
    async () => {
      await sandboxService.createSession(ipToCap);
    },
    /Maximum concurrent simulator sessions \(5\) reached/i,
    'Active session cap per IP must be enforced'
  );
  console.log('✅ 6.1 Abuse protection: Max 5 concurrent sessions per IP strictly enforced');

  redisService.onModuleDestroy();
  console.log('\n🎉 ALL REPAIR 3 HARDENING TESTS PASSED CLEANLY!\n');
  process.exit(0);
}

runSecurityHardeningSuite().catch(err => {
  console.error('❌ Hardening Test Suite failed:', err);
  process.exit(1);
});
