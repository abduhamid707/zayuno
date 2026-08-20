import assert from 'node:assert/strict';
import { redactForLogs, sanitizeHeaders, scrubSensitiveString } from '../packages/shared/src/redaction.ts';
import { OfferingSchema, MediaItemSchema } from '../packages/contracts/src/catalog.ts';
import { UnmetDemandService } from '../apps/api/src/modules/analytics/unmet-demand.service.ts';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import { AdminService } from '../apps/api/src/modules/admin/admin.service.ts';
import { UserRole } from '../packages/database/src/index.ts';

async function main() {
  console.log('🧪 Testing PROMPT 4: Safe Observability, Live Inspector, Unmet Demand & Catalog Media...');

  // =========================================================================
  // 1. REDACTION & SAFE LOG PERSISTENCE TESTS
  // =========================================================================
  console.log('  1. Testing data redaction and safe log sanitization...');

  const nestedSensitivePayload = {
    user: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+998901234567',
      password: 'SuperSecretPassword123!',
      apiKey: 'zy_live_abc123secret456',
      passport: 'AA1234567',
      pinfl: '12345678901234'
    },
    payment: {
      card: '8600 1234 5678 9012',
      cvv: '123',
      otp: '998811',
      token: 'tok_live_secret_token_789'
    },
    delivery: {
      address: '123 Main St, Tashkent',
      destination: 'Central Park',
      latitude: 41.311081,
      longitude: 69.240562
    },
    freeTextNote: 'Customer contact john.doe@example.com, call +998901234567 or use Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDN secretly with zy_sec_xyz890.',
    safeField: 'Standard Service Order',
    numericValue: 45000,
    booleanValue: true
  };

  const redacted = redactForLogs(nestedSensitivePayload);

  // Assert keys with sensitive names are replaced with [REDACTED]
  assert.equal((redacted as any).user.password, '[REDACTED]');
  assert.equal((redacted as any).user.email, '[REDACTED]');
  assert.equal((redacted as any).user.phone, '[REDACTED]');
  assert.equal((redacted as any).user.apiKey, '[REDACTED]');
  assert.equal((redacted as any).user.passport, '[REDACTED]');
  assert.equal((redacted as any).user.pinfl, '[REDACTED]');
  assert.equal((redacted as any).payment.card, '[REDACTED]');
  assert.equal((redacted as any).payment.cvv, '[REDACTED]');
  assert.equal((redacted as any).payment.otp, '[REDACTED]');
  assert.equal((redacted as any).payment.token, '[REDACTED]');
  assert.equal((redacted as any).delivery.address, '[REDACTED]');
  assert.equal((redacted as any).delivery.destination, '[REDACTED]');
  assert.equal((redacted as any).delivery.latitude, '[REDACTED]');
  assert.equal((redacted as any).delivery.longitude, '[REDACTED]');

  // Assert safe fields are preserved
  assert.equal((redacted as any).safeField, 'Standard Service Order');
  assert.equal((redacted as any).numericValue, 45000);
  assert.equal((redacted as any).booleanValue, true);

  // Assert free text regex scrubbers remove emails, phones, bearer tokens, JWTs, and Zayuno secrets
  const scrubbedText = (redacted as any).freeTextNote;
  assert.ok(!scrubbedText.includes('john.doe@example.com'), 'Email leaked in free text');
  assert.ok(!scrubbedText.includes('+998901234567'), 'Phone leaked in free text');
  assert.ok(!scrubbedText.includes('zy_sec_xyz890'), 'Secret key leaked in free text');
  assert.ok(!scrubbedText.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'JWT leaked in free text');
  assert.ok(scrubbedText.includes('[REDACTED_EMAIL]'));
  assert.ok(scrubbedText.includes('[REDACTED_PHONE]'));
  assert.ok(scrubbedText.includes('[REDACTED_CREDENTIAL]'));

  // Test Header Sanitization
  const sensitiveHeaders = {
    'Authorization': 'Bearer my_top_secret_jwt_token',
    'x-api-key': 'zy_live_production_key_123',
    'x-webhook-secret': 'zy_sb_sec_webhook_secret',
    'Cookie': 'session_id=123456; token=abcdef',
    'Content-Type': 'application/json',
    'User-Agent': 'Zayuno-SDK/1.0.0'
  };
  const sanitizedHeaders = sanitizeHeaders(sensitiveHeaders);
  assert.equal(sanitizedHeaders['Authorization'], '[REDACTED]');
  assert.equal(sanitizedHeaders['x-api-key'], '[REDACTED]');
  assert.equal(sanitizedHeaders['x-webhook-secret'], '[REDACTED]');
  assert.equal(sanitizedHeaders['Cookie'], '[REDACTED]');
  assert.equal(sanitizedHeaders['Content-Type'], 'application/json');
  assert.equal(sanitizedHeaders['User-Agent'], 'Zayuno-SDK/1.0.0');

  // Test deep object truncation and array slicing
  const deepObject: any = { a: { b: { c: { d: { e: { f: { g: { h: 'too deep' } } } } } } } };
  const truncatedDeep = redactForLogs(deepObject);
  assert.equal((truncatedDeep as any).a.b.c.d.e.f.g, '[TRUNCATED_DEPTH]');

  const largeArray = Array.from({ length: 60 }, (_, i) => ({ id: i, value: `item_${i}` }));
  const slicedArray: any = redactForLogs(largeArray);
  assert.equal(slicedArray.length, 51); // 50 items + 1 truncation marker
  assert.ok(slicedArray[50].includes('truncated'));

  console.log('    ✅ Data Redaction & Sanitization verified.');

  // =========================================================================
  // 2. UNMET DEMAND AGGREGATOR TESTS
  // =========================================================================
  console.log('  2. Testing Unmet Demand tracking, deduplication, and privacy guarantees...');

  const unmetService = new UnmetDemandService();
  const testCat1 = `rare_services_${Date.now()}`;
  const testCat2 = `express_delivery_${Date.now()}`;

  await unmetService.recordUnmetDemand({
    category: testCat1,
    geography: 'SAMARKAND',
    queryIntent: 'Looking for 24/7 plumber in Samarkand +998901112233',
    reasonCode: 'NO_PROVIDER_IN_CATEGORY',
    source: 'FIND_PROVIDERS'
  });

  // Duplicate within TTL should be grouped / deduplicated
  await unmetService.recordUnmetDemand({
    category: testCat1,
    geography: 'SAMARKAND',
    queryIntent: 'Looking for 24/7 plumber in Samarkand +998901112233',
    reasonCode: 'NO_PROVIDER_IN_CATEGORY',
    source: 'FIND_PROVIDERS'
  });

  // Different category
  await unmetService.recordUnmetDemand({
    category: testCat2,
    geography: 'BUKHARA',
    queryIntent: 'drone delivery to bukhara',
    reasonCode: 'NO_PROVIDER_IN_GEOGRAPHY',
    source: 'MCP'
  });

  const demandSummary = await unmetService.getAggregatedDemand({ category: testCat1 });
  assert.equal(demandSummary.totalEvents, 2);
  assert.equal(demandSummary.uniquePatterns, 1);
  assert.equal(demandSummary.topMissingCategories[0].category, testCat1);
  assert.equal(demandSummary.topMissingCategories[0].count, 2);

  // Privacy check: verify phone numbers were stripped from queryIntent
  const rareDemand = demandSummary.recentUnmetDemand.find(d => d.category === testCat1);
  assert.ok(rareDemand);
  assert.ok(!rareDemand.queryIntent?.includes('998901112233'), 'Phone number leaked in unmet demand record');
  assert.ok(!rareDemand.queryIntent?.includes('24/7'), 'Numbers should be sanitized from search intent');

  console.log('    ✅ Unmet Demand tracking and privacy verified.');

  // =========================================================================
  // 3. CATALOG MEDIA CONTRACT & BACKWARD COMPATIBILITY
  // =========================================================================
  console.log('  3. Testing Catalog Media Schema & backward compatibility...');

  // Valid media item
  const validMedia = MediaItemSchema.parse({
    url: 'https://images.zayuno.uz/catalog/lavash-double.jpg',
    altText: 'Double Beef Lavash',
    order: 1,
    thumbnailUrl: 'https://images.zayuno.uz/catalog/lavash-double-thumb.jpg',
    aspectRatio: '16:9'
  });
  assert.equal(validMedia.url, 'https://images.zayuno.uz/catalog/lavash-double.jpg');

  // Invalid non-HTTPS media URL rejection
  assert.throws(() => {
    MediaItemSchema.parse({
      url: 'ftp://insecure-server.com/image.png'
    });
  });

  // Offering with media array
  const offeringWithMedia = OfferingSchema.parse({
    id: 'off_lavash_1',
    providerId: 'prov_evos_1',
    offeringCode: 'LAVASH_DBL',
    title: 'Double Lavash',
    basePrice: 38000,
    media: [validMedia],
    imageUrl: 'https://images.zayuno.uz/catalog/lavash-double.jpg'
  });
  assert.equal(offeringWithMedia.media.length, 1);
  assert.equal(offeringWithMedia.imageUrl, 'https://images.zayuno.uz/catalog/lavash-double.jpg');

  // Offering without media (backward compatibility check)
  const legacyOffering = OfferingSchema.parse({
    id: 'off_legacy_1',
    providerId: 'prov_legacy_1',
    offeringCode: 'LEGACY_ITEM',
    title: 'Legacy Item No Media',
    basePrice: 15000
  });
  assert.equal(legacyOffering.media, undefined);
  assert.equal(legacyOffering.imageUrl, undefined);

  console.log('    ✅ Catalog Media contract and backward compatibility verified.');

  // =========================================================================
  // 4. TENANT ISOLATION & LIVE INSPECTOR ACCESS CHECKS
  // =========================================================================
  console.log('  4. Testing Tenant Isolation and Live Inspector authorization rules...');

  // Mock ProvidersService for tenant isolation test
  const mockRegistry = {} as any;
  const providersService = new ProvidersService(mockRegistry, unmetService);

  // Attempting to access Provider B's logs as Provider A owner must throw ForbiddenException
  const providerAUser = { id: 'usr_owner_A', role: UserRole.PROVIDER_OWNER, providerId: 'prov_A' };

  // Testing assertion logic:
  try {
    (providersService as any).assertProviderManager({ id: 'prov_B' }, providerAUser);
    assert.fail('Expected ForbiddenException when Provider A attempts to access Provider B');
  } catch (err: any) {
    assert.ok(err.message.includes('You can only manage the provider assigned to your account'));
  }

  // Admin access should succeed without throwing
  const adminUser = { id: 'usr_admin', role: UserRole.SUPER_ADMIN };
  (providersService as any).assertProviderManager({ id: 'prov_B' }, adminUser);

  console.log('    ✅ Tenant Isolation and Authorization verified.');

  console.log('🎉 ALL PROMPT 4 OBSERVABILITY, INSPECTOR, UNMET DEMAND & MEDIA TESTS PASSED!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
