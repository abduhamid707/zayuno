import assert from 'node:assert/strict';
import { prisma } from '../packages/database/src/client.ts';
import { EmailVerificationService, DevEmailTransport } from '../apps/api/src/modules/auth/email-verification.service.ts';
import {
  SafePublicHttpsUrlSchema,
  isSafePublicHttpsUrl,
  MediaItemSchema,
  OfferingSchema,
  LegacyOfferingSchema,
  sortOfferingMedia
} from '../packages/contracts/src/catalog.ts';
import { UnmetDemandService } from '../apps/api/src/modules/analytics/unmet-demand.service.ts';

async function testRepairPromptA() {
  console.log('🧪 Testing REPAIR PROMPT A: Email Verification & Credential Protection...');

  const originalEnv = process.env.NODE_ENV;
  const originalHelperFlag = process.env.ENABLE_DEV_TOKEN_HELPER;

  try {
    // 1. Never expose raw verification token or full verification URL in logs
    console.log('  1. Testing DevEmailTransport log privacy and masking...');
    const capturedLogs: string[] = [];
    const originalLog = console.log;
    // Intercept stdout / logger output
    const devTransport = new DevEmailTransport();
    (devTransport as any).logger = {
      log: (msg: string) => capturedLogs.push(msg),
      error: (msg: string) => capturedLogs.push(msg)
    };

    const testEmail = 'provider.owner@example.uz';
    const fakeRawToken = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const fakeUrl = `http://localhost:3000?verifyToken=${fakeRawToken}&email=${encodeURIComponent(testEmail)}`;

    await devTransport.sendVerificationEmail(testEmail, fakeRawToken, fakeUrl);

    assert.equal(capturedLogs.length, 1);
    const logLine = capturedLogs[0];
    assert.ok(!logLine.includes(fakeRawToken), 'Raw token leaked in DevEmailTransport logs!');
    assert.ok(!logLine.includes('verifyToken='), 'Verification URL with token leaked in DevEmailTransport logs!');
    assert.ok(!logLine.includes('provider.owner@example.uz'), 'Raw email leaked without masking!');
    assert.ok(logLine.includes('Correlation:'), 'Correlation ID missing in logs');
    assert.ok(logLine.includes('ExpiresIn: 24h'), 'Expiry indicator missing in logs');
    console.log('    ✅ DevEmailTransport does not expose raw token or URL.');

    // 2. Production Fail-Closed Transport
    console.log('  2. Testing production fail-closed transport...');
    process.env.NODE_ENV = 'production';
    const prodService = new EmailVerificationService();
    const prodEmail = `prod_${Date.now()}@company.uz`;
    await assert.rejects(
      async () => prodService.generateAndSendVerificationToken(prodEmail),
      /Configured mail transport is not available/
    );
    console.log('    ✅ Production fails closed when no real mail transport is configured.');

    // 3. Dev Token Helper Feature Flag Guard
    console.log('  3. Testing dev token helper feature flag guard...');
    process.env.NODE_ENV = 'development';
    process.env.ENABLE_DEV_TOKEN_HELPER = 'false';
    const devServiceNoFlag = new EmailVerificationService();
    assert.equal(devServiceNoFlag.getLastDevToken(testEmail), undefined);

    process.env.ENABLE_DEV_TOKEN_HELPER = 'true';
    const devServiceWithFlag = new EmailVerificationService();
    // Custom silent test transport
    let dispatchedRawToken: string | null = null;
    devServiceWithFlag.setTransport({
      async sendVerificationEmail(_email, token) {
        dispatchedRawToken = token;
      }
    });

    // 4. Persistent Hashed DB Tokens
    console.log('  4. Testing persistent hashed DB tokens and single-use lifecycle...');
    const uniqueEmail = `owner_${Date.now()}@secure-business.uz`;
    const genResult = await devServiceWithFlag.generateAndSendVerificationToken(uniqueEmail);
    assert.ok(genResult.success);

    // Verify token was stored in DB as SHA-256 hash, NEVER raw token
    const dbRecord = await prisma.emailVerificationToken.findUnique({
      where: { email: uniqueEmail }
    });
    assert.ok(dbRecord, 'DB record not created for verification token');
    assert.equal(dbRecord.tokenHash.length, 64, 'Token hash must be 64-char SHA-256');
    assert.notEqual(dbRecord.tokenHash, dispatchedRawToken, 'Raw token must NEVER be stored in DB');
    assert.equal(dbRecord.used, false);

    // Verify token helper returns the token in dev
    const devToken = devServiceWithFlag.getLastDevToken(uniqueEmail);
    assert.equal(devToken, dispatchedRawToken);

    // Verify token
    const verifyResult = await devServiceWithFlag.verifyToken(dispatchedRawToken!);
    assert.equal(verifyResult.email, uniqueEmail);

    // Verify DB record is now used
    const updatedRecord = await prisma.emailVerificationToken.findUnique({
      where: { email: uniqueEmail }
    });
    assert.equal(updatedRecord?.used, true);

    // Replay attack / single-use check: verifying again must throw
    await assert.rejects(
      async () => devServiceWithFlag.verifyToken(dispatchedRawToken!),
      /allaqachon ishlatilgan/
    );

    // 5. Rate limit cooldown and window persistence across service restarts
    console.log('  5. Testing persistent cooldown across service restarts...');
    // Create a brand new service instance to simulate API restart
    const restartedService = new EmailVerificationService();
    restartedService.setTransport({
      async sendVerificationEmail() {}
    });

    // Immediate resend must hit 60s cooldown from DB
    await assert.rejects(
      async () => restartedService.generateAndSendVerificationToken(uniqueEmail),
      /1 daqiqa kuting/
    );
    console.log('    ✅ Cooldown and rate limits survive API restart via DB persistence.');

  } finally {
    process.env.NODE_ENV = originalEnv;
    process.env.ENABLE_DEV_TOKEN_HELPER = originalHelperFlag;
  }
  console.log('✅ ALL REPAIR PROMPT A TESTS PASSED!\n');
}

async function testRepairPromptB() {
  console.log('🧪 Testing REPAIR PROMPT B: Safe Catalog Media & Durable Unmet Demand...');

  // 1. SafePublicHttpsUrlSchema validation
  console.log('  1. Testing SafePublicHttpsUrlSchema security rules...');

  // Valid HTTPS URLs
  assert.ok(isSafePublicHttpsUrl('https://images.zayuno.uz/catalog/item1.jpg'));
  assert.ok(isSafePublicHttpsUrl('https://cdn.example.com/photos/food.png?w=800&h=600'));
  assert.ok(isSafePublicHttpsUrl('https://sub.domain.co.uk/image.webp'));

  // Rejected URL variants
  const invalidUrls = [
    'http://images.zayuno.uz/item.jpg', // Plain HTTP
    'https://user:password@example.com/item.jpg', // Embedded credentials
    'ftp://files.example.com/item.jpg', // FTP protocol
    'javascript:alert(1)', // JavaScript URI
    'data:image/png;base64,iVBORw0KGgo...', // Data URI
    'https://localhost/item.jpg', // Localhost
    'https://127.0.0.1/item.jpg', // Loopback IP
    'https://10.0.0.1/item.jpg', // Private 10.x IP
    'https://192.168.1.100/item.jpg', // Private 192.168.x IP
    'https://172.16.5.1/item.jpg', // Private 172.16.x IP
    'https://0.0.0.0/item.jpg', // 0.0.0.0
    'https://[::1]/item.jpg', // IPv6 loopback
    'https://server.local/item.jpg', // .local domain
    'https://example.com/image with spaces.jpg', // Whitespace
    'https://..example.com/item.jpg', // Malformed hostname
    'https://' + 'a'.repeat(2050) + '.com/item.jpg' // Exceeds 2048 max length
  ];

  for (const badUrl of invalidUrls) {
    assert.equal(isSafePublicHttpsUrl(badUrl), false, `Should have rejected: ${badUrl}`);
    assert.throws(
      () => SafePublicHttpsUrlSchema.parse(badUrl),
      `SafePublicHttpsUrlSchema should throw on: ${badUrl}`
    );
  }
  console.log('    ✅ All unsafe/malformed URL variants correctly rejected.');

  // 2. MediaItemSchema limits and aspect ratio validation
  console.log('  2. Testing MediaItemSchema field limits and aspect ratio format...');
  const validMedia = MediaItemSchema.parse({
    url: 'https://images.zayuno.uz/catalog/platter.jpg',
    altText: 'Festive Platter',
    order: 2,
    thumbnailUrl: 'https://images.zayuno.uz/catalog/platter-thumb.jpg',
    aspectRatio: '16:9'
  });
  assert.equal(validMedia.order, 2);

  // Invalid aspect ratio format
  assert.throws(() => {
    MediaItemSchema.parse({
      url: 'https://images.zayuno.uz/catalog/platter.jpg',
      aspectRatio: 'widescreen' // Invalid format (must be W:H)
    });
  });

  // AltText length limit (> 255 chars)
  assert.throws(() => {
    MediaItemSchema.parse({
      url: 'https://images.zayuno.uz/catalog/platter.jpg',
      altText: 'x'.repeat(256)
    });
  });

  // OfferingSchema media limit (> 10 items)
  assert.throws(() => {
    OfferingSchema.parse({
      id: 'off_1',
      providerId: 'prov_1',
      offeringCode: 'CODE_1',
      title: 'Platter',
      basePrice: 50000,
      media: Array.from({ length: 11 }, (_, i) => ({
        url: `https://images.zayuno.uz/img_${i}.jpg`
      }))
    });
  });
  console.log('    ✅ MediaItemSchema field limits and aspect ratio validated.');

  // 3. Deterministic Media Ordering
  console.log('  3. Testing deterministic media ordering...');
  const unorderedMedia = [
    { url: 'https://images.zayuno.uz/b_item.jpg', order: 2 },
    { url: 'https://images.zayuno.uz/a_item.jpg', order: 2 },
    { url: 'https://images.zayuno.uz/first.jpg', order: 1 },
    { url: 'https://images.zayuno.uz/c_item.jpg', order: 3 }
  ];
  const sorted = sortOfferingMedia(unorderedMedia);
  assert.equal(sorted[0].url, 'https://images.zayuno.uz/first.jpg');
  assert.equal(sorted[1].url, 'https://images.zayuno.uz/a_item.jpg'); // tie-breaker by url
  assert.equal(sorted[2].url, 'https://images.zayuno.uz/b_item.jpg');
  assert.equal(sorted[3].url, 'https://images.zayuno.uz/c_item.jpg');
  console.log('    ✅ Deterministic media ordering with stable tie-breaker verified.');

  // 4. Legacy Migration Boundary
  console.log('  4. Testing legacy migration boundary...');
  const legacyOffering = LegacyOfferingSchema.parse({
    id: 'off_legacy',
    providerId: 'prov_legacy',
    offeringCode: 'LEGACY_1',
    title: 'Legacy Dish',
    basePrice: 20000,
    imageUrl: 'http://legacy-cdn.uz/dish.jpg' // HTTP permitted in legacy schema
  });
  assert.equal(legacyOffering.imageUrl, 'http://legacy-cdn.uz/dish.jpg');

  // New OfferingSchema rejects HTTP
  assert.throws(() => {
    OfferingSchema.parse({
      id: 'off_new',
      providerId: 'prov_new',
      offeringCode: 'NEW_1',
      title: 'New Dish',
      basePrice: 20000,
      imageUrl: 'http://insecure-cdn.uz/dish.jpg'
    });
  });
  console.log('    ✅ Legacy migration boundary enforces HTTPS on new offerings.');

  // 5. Durable Unmet Demand Analytics in Prisma
  console.log('  5. Testing Prisma-backed durable Unmet Demand Aggregator...');
  const unmetService = new UnmetDemandService();

  const testCategory = `cat_${Date.now()}`;
  const testGeography = 'FERGANA';
  const rawIntentWithPii = 'Looking for express courier to Fergana +998901234567 call 12:00';

  // Record initial event
  await unmetService.recordUnmetDemand({
    category: testCategory,
    geography: testGeography,
    queryIntent: rawIntentWithPii,
    reasonCode: 'NO_PROVIDER_IN_CATEGORY',
    source: 'AI_AGENT'
  });

  // Duplicate within 10-minute bucket (atomic increment)
  await unmetService.recordUnmetDemand({
    category: testCategory,
    geography: testGeography,
    queryIntent: rawIntentWithPii,
    reasonCode: 'NO_PROVIDER_IN_CATEGORY',
    source: 'AI_AGENT'
  });

  // Direct DB check
  const dbRecords = await prisma.unmetDemandRecord.findMany({
    where: { category: testCategory }
  });
  assert.equal(dbRecords.length, 1, 'Duplicate within 10-minute bucket must update single record');
  assert.equal(dbRecords[0].count, 2, 'Atomic count should increment to 2');
  assert.ok(!dbRecords[0].queryIntent?.includes('998901234567'), 'Phone number leaked into database!');
  assert.ok(!dbRecords[0].queryIntent?.includes('12:00'), 'Time/numbers should be scrubbed');

  // Aggregated analytics check
  const analytics = await unmetService.getAggregatedDemand({ category: testCategory });
  assert.equal(analytics.totalEvents, 2);
  assert.equal(analytics.uniquePatterns, 1);
  assert.equal(analytics.topMissingCategories[0].category, testCategory);
  assert.equal(analytics.topMissingCategories[0].count, 2);

  // Retention cleanup check
  const cleaned = await unmetService.cleanupOldRecords(30);
  assert.equal(typeof cleaned, 'number');

  console.log('    ✅ Durable Unmet Demand analytics, deduplication, and privacy verified.');
  console.log('✅ ALL REPAIR PROMPT B TESTS PASSED!\n');
}

async function main() {
  await testRepairPromptA();
  await testRepairPromptB();
  console.log('🎉 ALL REPAIR PROMPTS A & B TESTS PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
