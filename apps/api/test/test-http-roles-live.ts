import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { prisma, UserRole } from '@zayuno/database';

async function main() {
  const jwtSecret = process.env.JWT_SECRET || 'super-secret-jwt-key-for-zayuno-auth-change-in-production';
  const consumerId = randomUUID();
  const adminId = randomUUID();

  console.log('🧪 Starting Live HTTP Auth & Role Guard verification on port 4000...\n');

  try {
    // 1. Create temporary users in DB
    await prisma.user.create({
      data: {
        id: consumerId,
        email: `test-consumer-${consumerId}@example.invalid`,
        name: 'Test Consumer',
        passwordHash: 'test_hash',
        role: UserRole.API_CONSUMER,
        isActive: true,
      },
    });

    await prisma.user.create({
      data: {
        id: adminId,
        email: `test-admin-${adminId}@example.invalid`,
        name: 'Test Admin',
        passwordHash: 'test_hash',
        role: UserRole.ADMIN,
        isActive: true,
      },
    });

    const consumerToken = jwt.sign(
      { sub: consumerId, email: `test-consumer-${consumerId}@example.invalid`, role: UserRole.API_CONSUMER, type: 'access' },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const adminToken = jwt.sign(
      { sub: adminId, email: `test-admin-${adminId}@example.invalid`, role: UserRole.ADMIN, type: 'access' },
      jwtSecret,
      { expiresIn: '15m' }
    );

    const targetUrl = 'http://localhost:4000/api/v1/admin/analytics/consumer-demand';

    // 2. Test Anonymous -> 401
    const anonRes = await fetch(targetUrl);
    console.log(`1. Anonymous request status: ${anonRes.status} (expected 401)`);
    assert.equal(anonRes.status, 401, 'Anonymous request must return 401 Unauthorized');

    // 3. Test Consumer Token -> 403 Forbidden
    const consumerRes = await fetch(targetUrl, {
      headers: { Authorization: `Bearer ${consumerToken}` },
    });
    console.log(`2. Consumer JWT request status: ${consumerRes.status} (expected 403)`);
    assert.equal(consumerRes.status, 403, 'Consumer token must return 403 Forbidden');

    // 4. Test Admin Token -> 200 OK
    const adminRes = await fetch(targetUrl, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`3. Admin JWT request status: ${adminRes.status} (expected 200)`);
    assert.equal(adminRes.status, 200, 'Admin token must return 200 OK');
    const data = await adminRes.json();
    assert.ok(data.title, 'Response must contain report title');
    assert.ok(Array.isArray(data.categories), 'Response must contain categories');

    console.log('\n✅ All HTTP Role Guard checks passed: 401 (Anon), 403 (Consumer), 200 (Admin).');
  } finally {
    // Clean up temporary users
    await prisma.user.deleteMany({
      where: { id: { in: [consumerId, adminId] } },
    });
    console.log('🧹 Cleaned up temporary test users.');
  }

  // 5. Verify no test data in real demand database
  const countTable: any[] = await prisma.$queryRaw`SELECT to_regclass('public."ConsumerDemandEvent"')::text AS name`;
  if (countTable[0].name) {
    const demandCount = await prisma.consumerDemandEvent.count();
    console.log(`📊 Current ConsumerDemandEvent count in DB: ${demandCount}`);
    assert.equal(demandCount, 0, 'No test data must remain in real demand table');
  } else {
    console.log('ℹ️ ConsumerDemandEvent table does not exist in local persistent DB (all tests ran inside transaction rollback).');
  }

  await prisma.$disconnect();
  console.log('\n🎉 Real HTTP test suite and DB cleanliness check complete!');
}

main().catch(err => {
  console.error('❌ Error during HTTP Role Guard test:', err);
  process.exit(1);
});
