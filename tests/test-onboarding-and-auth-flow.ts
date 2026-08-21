import assert from 'node:assert/strict';
import { AuthService } from '../apps/api/src/modules/auth/auth.service.ts';
import { EmailVerificationService } from '../apps/api/src/modules/auth/email-verification.service.ts';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import { ProviderRegistryService } from '../apps/api/src/modules/providers/provider-registry.service.ts';
import { prisma } from '../packages/database/src/client.ts';
import { UserRole } from '../packages/database/dist/index.js';
import { ProviderType, ProviderCapability } from '../packages/contracts/src/provider.ts';

async function main() {
  console.log('🧪 Starting Test Suite: Provider Onboarding UX & Auth Flow...');
  process.env.ENABLE_DEV_TOKEN_HELPER = 'true';

  const emailVerificationService = new EmailVerificationService();
  const mockJwtService: any = {
    sign: (payload: any) => `jwt_token_${payload.sub}_${payload.role}`
  };

  const authService = new AuthService(mockJwtService, emailVerificationService);

  // --------------------------------------------------------------------------
  // 1. Password Strength Validation (min 12 chars)
  // --------------------------------------------------------------------------
  console.log('  [1/6] Testing Owner Registration password & email validation...');
  await assert.rejects(
    () =>
      authService.registerProviderOwner({
        email: 'owner@business.uz',
        name: 'Valid Name',
        password: 'short' // < 12 chars
      }),
    /kamida 12 belgidan/i,
    'Registration must reject passwords shorter than 12 characters'
  );

  await assert.rejects(
    () =>
      authService.registerProviderOwner({
        email: 'invalid-email',
        name: 'Valid Name',
        password: 'strong_password_12345'
      }),
    /email manzilini kiriting/i,
    'Registration must reject invalid email formats'
  );

  // --------------------------------------------------------------------------
  // 2. Email Verification Token Security (Hashing, TTL, Single-use)
  // --------------------------------------------------------------------------
  console.log('  [2/6] Testing Email verification token generation, hashing & single-use...');
  const testEmail = `partner_${Date.now()}@zayunobusiness.uz`;
  await emailVerificationService.generateAndSendVerificationToken(testEmail);

  const rawToken = emailVerificationService.getLastDevToken(testEmail);
  assert.ok(rawToken, 'Dev verification token must be recorded');
  assert.equal(rawToken.length, 64, 'Token must be 32 bytes (64 hex characters)');

  // Verify valid token
  const verifyResult = await emailVerificationService.verifyToken(rawToken);
  assert.equal(verifyResult.email, testEmail);

  // Reusing the same token must fail
  await assert.rejects(
    () => emailVerificationService.verifyToken(rawToken),
    /allaqachon ishlatilgan|noto‘g‘ri/i,
    'Reused verification token must be rejected'
  );

  // --------------------------------------------------------------------------
  // 3. Resend Verification Cooldown (60s rate limit)
  // --------------------------------------------------------------------------
  console.log('  [3/6] Testing Resend verification rate limiting cooldown...');
  const cooldownEmail = `cooldown_${Date.now()}@zayunobusiness.uz`;
  await emailVerificationService.generateAndSendVerificationToken(cooldownEmail);

  await assert.rejects(
    () => emailVerificationService.generateAndSendVerificationToken(cooldownEmail),
    /1 daqiqa kuting/i,
    'Resending within 60 seconds must trigger rate-limit cooldown'
  );

  // --------------------------------------------------------------------------
  // 4. Inactive Account Cannot Login Before Verification
  // --------------------------------------------------------------------------
  console.log('  [4/6] Testing unverified account login lock & activation...');
  let mockDatabaseUser: any = null;
  const flowEmail = `flow_owner_${Date.now()}@testbusiness.uz`;
  const securePassword = 'MySecurePassword2026!';
  const originalFindUnique = prisma.user.findUnique;
  const originalCreate = prisma.user.create;
  const originalUpdate = prisma.user.update;
  const originalProviderCreate = prisma.provider.create;
  const originalProviderFindUnique = prisma.provider.findUnique;
  const originalApiKeyCreate = prisma.apiKey.create;

  try {
    (prisma.user as any).findUnique = async ({ where }: any) => {
      if (where.email === flowEmail && mockDatabaseUser) {
        return mockDatabaseUser;
      }
      return null;
    };

    (prisma.user as any).create = async ({ data }: any) => {
      mockDatabaseUser = {
        id: `usr_${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return mockDatabaseUser;
    };

    (prisma.user as any).update = async ({ where, data }: any) => {
      if (mockDatabaseUser && mockDatabaseUser.id === where.id) {
        mockDatabaseUser = { ...mockDatabaseUser, ...data };
        return mockDatabaseUser;
      }
      return null;
    };

    // Step A: Register Owner -> user is created with isActive: false
    const registerResponse = await authService.registerProviderOwner({
      email: flowEmail,
      name: 'Alisher Usmonov',
      password: securePassword
    });
    assert.equal(registerResponse.success, true);
    assert.equal(mockDatabaseUser.isActive, false, 'New owner must be inactive until email verification');

    // Step B: Attempt login while inactive -> MUST fail with 401 Unauthorized
    await assert.rejects(
      () => authService.login(flowEmail, securePassword),
      /Noto‘g‘ri login yoki parol/i,
      'Unverified user must not be able to log in'
    );

    // Step C: Verify Email
    const flowToken = emailVerificationService.getLastDevToken(flowEmail);
    assert.ok(flowToken, 'Verification token must exist');
    const verifyEmailResponse = await authService.verifyEmail(flowToken);
    assert.equal(verifyEmailResponse.success, true);
    assert.equal(mockDatabaseUser.isActive, true, 'User must be activated upon verification');

    // Step D: Login after verification -> MUST succeed and return JWT
    const loginResponse = await authService.login(flowEmail, securePassword);
    assert.ok(loginResponse.accessToken, 'Access token must be returned');
    assert.equal(loginResponse.user.email, flowEmail);
    assert.equal(loginResponse.user.role, UserRole.PROVIDER_OWNER);
    console.log('    ✓ Owner successfully registered, verified and authenticated.');

    // --------------------------------------------------------------------------
    // 5. Provider Application Registration by Authenticated Owner
    // --------------------------------------------------------------------------
    console.log('  [5/6] Testing Provider Application Registration & Slug Validation...');
    const mockRegistryService: any = {
      isSlugAvailable: (slug: string) => slug !== 'existing-provider',
      isReservedBrand: (name: string, slug: string) => slug === 'evos' || slug === 'uzum'
    };

    let mockProviderRecord: any = null;

    (prisma.provider as any).findUnique = async ({ where }: any) => {
      if (where.slug === mockProviderRecord?.slug) return mockProviderRecord;
      return null;
    };

    (prisma.provider as any).create = async ({ data }: any) => {
      mockProviderRecord = {
        id: `pvd_${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return mockProviderRecord;
    };

    (prisma.apiKey as any).create = async ({ data }: any) => {
      return { id: `key_${Date.now()}`, ...data };
    };

    const providersService = new ProvidersService(mockRegistryService);
    (providersService as any).getEncryptionKey = () => '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // Slug with invalid characters should fail
    await assert.rejects(
      () =>
        providersService.registerProvider(
          {
            name: 'My Store',
            slug: 'invalid slug with spaces!',
            type: ProviderType.SERVICES,
            category: 'general_services',
            geography: ['UZ'],
            capabilities: [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG],
            authMethod: 'API_KEY'
          },
          { id: mockDatabaseUser.id, role: UserRole.PROVIDER_OWNER }
        ),
      /slug/i,
      'Invalid slug format must be rejected'
    );

    // Reserved brand slug should fail
    await assert.rejects(
      () =>
        providersService.registerProvider(
          {
            name: 'EVOS Express',
            slug: 'evos',
            type: ProviderType.SERVICES,
            category: 'general_services',
            geography: ['UZ'],
            capabilities: [ProviderCapability.METADATA, ProviderCapability.HEALTH, ProviderCapability.CATALOG],
            authMethod: 'API_KEY'
          },
          { id: mockDatabaseUser.id, role: UserRole.PROVIDER_OWNER }
        ),
      /brand|himoyalangan/i,
      'Reserved brand names must be blocked during self-service registration'
    );

    // Valid provider registration
    const validProviderResult = await providersService.registerProvider(
      {
        name: 'Express Logistics MCHJ',
        slug: 'express-logistics',
        description: 'Toshkent shahrida tezkor kuryerlik xizmati',
        type: ProviderType.SERVICES,
        category: 'logistics',
        geography: ['UZ'],
        baseUrl: 'https://api.expresslogistics.uz/zayuno',
        authMethod: 'API_KEY',
        capabilities: [
          ProviderCapability.METADATA,
          ProviderCapability.HEALTH,
          ProviderCapability.CATALOG,
          ProviderCapability.QUOTE,
          ProviderCapability.ACTION_CREATE,
          ProviderCapability.ACTION_STATUS,
          ProviderCapability.WEBHOOK
        ],
        supportContact: {
          phone: '+998712000000',
          telegram: '@express_support',
          email: 'support@expresslogistics.uz'
        }
      },
      { id: mockDatabaseUser.id, role: UserRole.PROVIDER_OWNER }
    );

    assert.ok(validProviderResult.provider, 'Provider object must be returned');
    assert.equal(validProviderResult.provider.slug, 'express-logistics');
    assert.ok(validProviderResult.credentials.sandboxApiKey, 'Sandbox API Key must be generated');
    assert.ok(validProviderResult.credentials.sandboxWebhookSecret, 'Sandbox Webhook Secret must be generated');
    console.log('    ✓ Provider registered and sandbox credentials generated safely.');

    // --------------------------------------------------------------------------
    // 6. Verification of Public vs Protected Gates
    // --------------------------------------------------------------------------
    console.log('  [6/6] Testing Public vs Protected Gate Rules...');
    assert.equal(typeof providersService.listProviders, 'function', 'Public listProviders must be available');
    assert.equal(typeof providersService.findProviders, 'function', 'Public findProviders must be available');
    assert.equal(typeof providersService.getWelcomeInfo, 'function', 'Public getWelcomeInfo must be available');

    // Clean up prisma mocks
    prisma.provider.create = originalProviderCreate;
    prisma.provider.findUnique = originalProviderFindUnique;
  } finally {
    prisma.user.findUnique = originalFindUnique;
    prisma.user.create = originalCreate;
    prisma.user.update = originalUpdate;
    prisma.apiKey.create = originalApiKeyCreate;
  }

  console.log('\n✅ All Provider Onboarding UX & Auth Flow Tests Passed Successfully!');
}

main().catch(err => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
