import assert from 'node:assert/strict';
import { AuthService } from '../apps/api/src/modules/auth/auth.service.ts';
import { EmailVerificationService } from '../apps/api/src/modules/auth/email-verification.service.ts';
import { prisma } from '../packages/database/src/client.ts';
import { UserRole } from '../packages/database/dist/index.js';

async function main() {
  console.log('🧪 Testing Provider Owner Auth & Email Verification Flow...');
  process.env.ENABLE_DEV_TOKEN_HELPER = 'true';

  const emailVerificationService = new EmailVerificationService();
  const mockJwtService: any = {
    sign: (payload: any) => `mock_jwt_token_${payload.sub}`
  };

  const authService = new AuthService(mockJwtService, emailVerificationService);

  // 1. Password Strength Validation
  console.log('  Testing password validation...');
  await assert.rejects(
    () =>
      authService.registerProviderOwner({
        email: 'testowner@example.uz',
        name: 'Test Owner',
        password: 'short' // < 12 chars
      }),
    /Parol kamida 12 belgidan/i,
    'Password shorter than 12 chars must be rejected'
  );

  // 2. Email Verification Token Lifecycle & Hashing
  console.log('  Testing verification token generation & single-use...');
  const testEmail = `provider_${Date.now()}@partner.uz`;
  await emailVerificationService.generateAndSendVerificationToken(testEmail);

  const rawToken = emailVerificationService.getLastDevToken(testEmail);
  assert.ok(rawToken, 'Dev verification token must be recorded');
  assert.equal(rawToken.length, 64, 'Token must be 32 bytes (64 hex characters)');

  // Verify valid token
  const verifyResult = await emailVerificationService.verifyToken(rawToken);
  assert.equal(verifyResult.email, testEmail);

  // Single-use check: Reusing token MUST fail
  await assert.rejects(
    () => emailVerificationService.verifyToken(rawToken),
    /allaqachon ishlatilgan|noto‘g‘ri/i,
    'Reused verification token must be rejected'
  );

  // 3. Rate Limiting on Resends (60s cooldown)
  console.log('  Testing resend rate limiting...');
  const cooldownEmail = `cooldown_${Date.now()}@partner.uz`;
  await emailVerificationService.generateAndSendVerificationToken(cooldownEmail);

  await assert.rejects(
    () => emailVerificationService.generateAndSendVerificationToken(cooldownEmail),
    /1 daqiqa kuting/i,
    'Resending within 60s must trigger cooldown rate-limit'
  );

  // 4. Registration, Activation & Login Flow with Mock DB
  console.log('  Testing full signup -> verify -> login flow...');
  let mockUser: any = null;
  const flowEmail = `owner_flow_${Date.now()}@business.uz`;

  const originalFindUnique = prisma.user.findUnique;
  const originalCreate = prisma.user.create;
  const originalUpdate = prisma.user.update;

  try {
    (prisma.user as any).findUnique = async ({ where }: any) => {
      if (where.email === flowEmail && mockUser) {
        return mockUser;
      }
      return null;
    };

    (prisma.user as any).create = async ({ data }: any) => {
      mockUser = {
        id: 'usr_mock_123',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return mockUser;
    };

    (prisma.user as any).update = async ({ where, data }: any) => {
      if (mockUser && mockUser.id === where.id) {
        mockUser = { ...mockUser, ...data };
        return mockUser;
      }
      return null;
    };

    // A. Register unverified owner
    const regResult = await authService.registerProviderOwner({
      email: flowEmail,
      name: 'Business Owner',
      password: 'StrongPassword123!'
    });
    assert.ok(regResult.success);
    assert.equal(mockUser.isActive, false, 'New registrant must be inactive until email verification');

    // B. Attempt login before verification -> MUST FAIL
    await assert.rejects(
      () => authService.login(flowEmail, 'StrongPassword123!'),
      /Noto‘g‘ri login yoki parol/i,
      'Login must be refused before email verification'
    );

    // C. Verify Email using issued token
    const token = emailVerificationService.getLastDevToken(flowEmail);
    assert.ok(token);

    const verifySuccess = await authService.verifyEmail(token);
    assert.ok(verifySuccess.success);
    assert.ok(verifySuccess.accessToken, 'verifyEmail must return accessToken for auto-login');
    assert.ok(verifySuccess.user, 'verifyEmail must return user object');
    assert.equal(verifySuccess.user.email, flowEmail);
    assert.equal(mockUser.isActive, true, 'User must be activated after verification');

    // D. Attempt login after verification -> MUST SUCCEED
    const loginResult = await authService.login(flowEmail, 'StrongPassword123!');
    assert.ok(loginResult.accessToken);
    assert.equal(loginResult.user.email, flowEmail);
    assert.equal(loginResult.user.role, UserRole.PROVIDER_OWNER);
  } finally {
    prisma.user.findUnique = originalFindUnique;
    prisma.user.create = originalCreate;
    prisma.user.update = originalUpdate;
  }

  console.log('✅ Provider Owner Auth & Email Verification Tests Passed!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
