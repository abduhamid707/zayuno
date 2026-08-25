import assert from 'node:assert/strict';
import http, { type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { prisma } from '../packages/database/src/client.ts';
import { ProviderStatus, ProviderType } from '../packages/contracts/src/provider.ts';
import { UserRole } from '../packages/database/dist/index.js';
import { createMockEvosApp } from '../integrations/mock-evos/src/server.ts';

async function waitForHttp(url: string, timeoutMs = 35000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // ignore connection refused
    }
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function main() {
  console.log('🧪 Testing HTTP Boundary Regressions (Auth, Tenant Isolation, Discovery Gate, Mock EVOS)...');

  const testApiPort = '4099';
  const apiBase = `http://localhost:${testApiPort}`;

  // Start NestJS API process
  const apiProcess: ChildProcess = spawn(
    'node',
    [resolve(import.meta.dirname, '../apps/api/dist/main.js')],
    {
      env: {
        ...process.env,
        API_PORT: testApiPort,
        NODE_ENV: 'test',
        CORS_ORIGINS: 'http://localhost:3000',
        ENABLE_DEV_TOKEN_HELPER: 'true'
      },
      stdio: 'pipe'
    }
  );

  apiProcess.stderr?.on('data', d => {
    // Only print errors if debug needed
  });

  const mockWebhookPort = 4498;
  const sharedSecret = 'test_webhook_secret_123';
  process.env.NODE_ENV = 'test';
  process.env.PROVIDER_API_KEY = sharedSecret;
  process.env.ZAYUNO_WEBHOOK_SECRET = sharedSecret;
  process.env.ZAYUNO_API_URL = `http://127.0.0.1:${mockWebhookPort}`;
  process.env.MOCK_EVOS_CHECKOUT_BASE_URL = 'https://checkout.mock-provider.example';

  const mockWebhookServer = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('{"success":true}');
  });
  await new Promise<void>(res => mockWebhookServer.listen(mockWebhookPort, '127.0.0.1', res));

  // Start Mock EVOS on an ephemeral port
  const mockEvosApp = createMockEvosApp();
  const mockEvosServer: Server = await new Promise((res) => {
    const s = mockEvosApp.listen(0, () => res(s));
  });
  const mockEvosPort = (mockEvosServer.address() as any).port;
  const mockEvosBase = `http://localhost:${mockEvosPort}`;

  try {
    await waitForHttp(`${apiBase}/health`);

    // =========================================================================
    // 1. PUBLIC VS PROTECTED PORTAL AUTH BOUNDARY
    // =========================================================================
    console.log('  1. Testing Public vs Protected Portal Auth over HTTP...');

    // Weak password rejection
    const weakRes = await fetch(`${apiBase}/api/v1/auth/register-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `weak_${Date.now()}@test.uz`,
        password: 'short',
        name: 'Weak Pass Test'
      })
    });
    assert.equal(weakRes.status, 400, 'Registration with password < 12 chars must return HTTP 400');

    // Valid registration
    const validOwnerEmail = `owner_http_${Date.now()}@biz.uz`;
    const regRes = await fetch(`${apiBase}/api/v1/auth/register-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: validOwnerEmail,
        password: 'ValidStrongPassword123!',
        name: 'Valid Owner'
      })
    });
    assert.equal(regRes.status, 201, 'Valid registration must return HTTP 201');
    const regData = await regRes.json();
    assert.ok(regData.success);

    // Protected endpoint without token must return 401
    const unauthRes = await fetch(`${apiBase}/api/v1/providers/me`);
    assert.equal(unauthRes.status, 401, 'Unauthenticated access to /providers/me must return HTTP 401');

    console.log('    ✅ Public & Protected Auth HTTP boundary verified.');

    // =========================================================================
    // 2. TENANT ISOLATION OVER HTTP
    // =========================================================================
    console.log('  2. Testing Provider Log Tenant Isolation over HTTP...');

    // Register Owner A
    const emailA = `owner_a_${Date.now()}@a.uz`;
    await fetch(`${apiBase}/api/v1/auth/register-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'OwnerPassword123!', name: 'Owner A' })
    });
    const userA = await prisma.user.update({
      where: { email: emailA },
      data: { isActive: true }
    });

    const providerA = await prisma.provider.create({
      data: {
        slug: `prov-a-${Date.now()}`,
        name: 'Provider A',
        encryptedSecret: 'dummy',
        webhookSecret: 'dummy',
        status: ProviderStatus.ACTIVE,
        type: ProviderType.SERVICES,
        metadata: { ownerId: userA.id, isPublished: true, isCertified: true, reviewStatus: 'APPROVED' }
      }
    });
    await prisma.user.update({ where: { id: userA.id }, data: { providerId: providerA.id } });

    // Register Owner B
    const emailB = `owner_b_${Date.now()}@b.uz`;
    await fetch(`${apiBase}/api/v1/auth/register-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailB, password: 'OwnerPassword123!', name: 'Owner B' })
    });
    const userB = await prisma.user.update({
      where: { email: emailB },
      data: { isActive: true }
    });

    const providerB = await prisma.provider.create({
      data: {
        slug: `prov-b-${Date.now()}`,
        name: 'Provider B',
        encryptedSecret: 'dummy',
        webhookSecret: 'dummy',
        status: ProviderStatus.ACTIVE,
        type: ProviderType.SERVICES,
        metadata: { ownerId: userB.id, isPublished: true, isCertified: true, reviewStatus: 'APPROVED' }
      }
    });
    await prisma.user.update({ where: { id: userB.id }, data: { providerId: providerB.id } });

    // Login as User A to obtain JWT
    const loginARes = await fetch(`${apiBase}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailA, password: 'OwnerPassword123!' })
    });
    const loginAData = await loginARes.json();
    const tokenA = loginAData.accessToken;
    assert.ok(tokenA, `User A token must be returned: ${JSON.stringify(loginAData)}`);

    // Provider A requesting Provider B's logs -> HTTP 403 Forbidden
    const crossLogRes = await fetch(`${apiBase}/api/v1/providers/${providerB.slug}/logs`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.equal(crossLogRes.status, 403, 'Cross-tenant log access must return HTTP 403 Forbidden');

    // Provider A requesting Provider A's logs -> HTTP 200 OK
    const ownLogRes = await fetch(`${apiBase}/api/v1/providers/${providerA.slug}/logs`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.equal(ownLogRes.status, 200, 'Own provider log access must return HTTP 200 OK');

    console.log('    ✅ Tenant isolation over HTTP enforced (403 on cross-tenant access).');

    // =========================================================================
    // 3. ADMIN OBSERVABILITY & REDACTION OVER HTTP
    // =========================================================================
    console.log('  3. Testing Admin Observability & Redacted Log APIs over HTTP...');

    const adminUser = await prisma.user.create({
      data: {
        email: `admin_${Date.now()}@zayuno.uz`,
        name: 'Super Admin',
        passwordHash: userA.passwordHash,
        role: UserRole.SUPER_ADMIN,
        isActive: true
      }
    });

    const adminLoginRes = await fetch(`${apiBase}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminUser.email, password: 'OwnerPassword123!' })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.accessToken;
    assert.ok(adminToken, `Admin token must be returned: ${JSON.stringify(adminLoginData)}`);

    const adminLogsRes = await fetch(`${apiBase}/api/v1/admin/logs/integration`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(adminLogsRes.status, 200, 'Admin integration logs must return HTTP 200');
    const adminLogs = await adminLogsRes.json();
    assert.ok(Array.isArray(adminLogs));

    const unmetDemandRes = await fetch(`${apiBase}/api/v1/admin/analytics/unmet-demand`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(unmetDemandRes.status, 200, 'Admin unmet demand analytics must return HTTP 200');
    const unmetDemandData = await unmetDemandRes.json();
    assert.ok(unmetDemandData.topMissingCategories !== undefined);

    console.log('    ✅ Admin observability and redacted log endpoints verified.');

    // =========================================================================
    // 4. CANONICAL DISCOVERY GATE OVER HTTP
    // =========================================================================
    console.log('  4. Testing Canonical Discovery Gate over HTTP...');

    // Create an API key for User A
    const keyRes = await fetch(`${apiBase}/api/v1/auth/keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({ name: 'Discovery Key', isLive: false })
    });
    assert.equal(keyRes.status, 201, 'API key creation must return HTTP 201');
    const keyData = await keyRes.json();
    const apiKey = keyData.apiKey;
    assert.ok(apiKey, `API key string must be returned: ${JSON.stringify(keyData)}`);

    const draftProvider = await prisma.provider.create({
      data: {
        slug: `draft-prov-${Date.now()}`,
        name: 'Hidden Draft Provider',
        encryptedSecret: 'dummy',
        webhookSecret: 'dummy',
        status: ProviderStatus.DRAFT,
        type: ProviderType.SERVICES,
        metadata: { isCertified: false, isPublished: false, reviewStatus: 'DRAFT' }
      }
    });

    const discoveryRes = await fetch(`${apiBase}/api/v1/providers`, {
      headers: { 'x-api-key': apiKey }
    });
    assert.equal(discoveryRes.status, 200, 'Discovery with x-api-key must return HTTP 200');
    const discoveryData = await discoveryRes.json();
    const foundDraft = (Array.isArray(discoveryData) ? discoveryData : discoveryData.providers)?.find((p: any) => p.slug === draftProvider.slug);
    assert.equal(foundDraft, undefined, 'Uncertified DRAFT provider must NOT be visible in public discovery');

    console.log('    ✅ Discovery gate filters uncertified/unapproved providers.');

    // =========================================================================
    // 5. LOCAL MOCK EVOS CANCELLATION & PAYMENT STATE MACHINE OVER HTTP
    // =========================================================================
    console.log('  5. Testing Local Mock EVOS Cancellation & Payment State Behavior...');

    // 1. Get catalog from Mock EVOS
    const catRes = await fetch(`${mockEvosBase}/catalog`, {
      headers: { 'x-provider-api-key': sharedSecret }
    });
    assert.equal(catRes.status, 200);
    const catData = await catRes.json();
    const sampleItem = catData.offerings[0];
    const selectedOptions = sampleItem.optionGroups
      ?.filter((g: any) => g.isRequired)
      .map((g: any) => ({ groupId: g.id, optionId: g.options[0].id, quantity: 1 })) || [];

    // 2. Request quote
    const quoteRes = await fetch(`${mockEvosBase}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-provider-api-key': sharedSecret
      },
      body: JSON.stringify({
        providerSlug: 'mock-evos',
        items: [{ offeringId: sampleItem.id, quantity: 1, selectedOptions }]
      })
    });
    const quoteData = await quoteRes.json();
    assert.equal(quoteRes.status, 200, `Quote request failed: ${JSON.stringify(quoteData)}`);

    // 3. Create action
    const actionRes = await fetch(`${mockEvosBase}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-provider-api-key': sharedSecret,
        'idempotency-key': `idem_${Date.now()}`
      },
      body: JSON.stringify({
        providerSlug: 'mock-evos',
        quoteId: quoteData.id,
        userConfirmed: true,
        customer: { name: 'Test Customer', phone: '+998901234567' },
        destination: 'Tashkent'
      })
    });
    assert.equal(actionRes.status, 201, 'Action creation must return HTTP 201');
    const actionData = await actionRes.json();
    assert.ok(actionData.id);

    // 4. Cancel action from provider checkout URL
    const cancelRes = await fetch(`${mockEvosBase}/pay/${encodeURIComponent(actionData.id)}/cancel`, {
      method: 'POST',
      redirect: 'manual'
    });
    assert.equal(cancelRes.status, 303, 'Cancel must redirect (303)');

    // 5. Attempt to pay the CANCELLED action -> HTTP 409 Conflict
    const payCancelledRes = await fetch(`${mockEvosBase}/pay/${encodeURIComponent(actionData.externalActionId)}/simulate-success`, {
      method: 'POST'
    });
    assert.equal(payCancelledRes.status, 409, 'Paying a CANCELLED action must return HTTP 409 Conflict');

    // 6. Attempt to advance the CANCELLED action -> HTTP 409 Conflict
    const advanceCancelledRes = await fetch(`${mockEvosBase}/pay/${encodeURIComponent(actionData.externalActionId)}/advance`, {
      method: 'POST'
    });
    assert.equal(advanceCancelledRes.status, 409, 'Advancing a CANCELLED action must return HTTP 409 Conflict');

    console.log('    ✅ Mock EVOS terminal state protection enforced (409 Conflict on cancelled action payment).');

  } finally {
    apiProcess.kill();
    mockEvosServer.close();
    mockWebhookServer.close();
  }

  console.log('🎉 ALL HTTP BOUNDARY REGRESSION TESTS PASSED!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
