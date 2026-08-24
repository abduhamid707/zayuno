import assert from 'node:assert/strict';
import {
  checkReservedBrand,
  normalizeForBrandComparison,
  extractBrandRoot,
  RESERVED_BRANDS
} from '../packages/shared/src/reserved-brands.ts';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import { UserRole } from '../packages/database/src/index.ts';


async function main() {
  console.log('🧪 Testing Reserved Brand Registry & Normalization...');

  // 1. Exact Canonical Brand Matches
  const evosCheck = checkReservedBrand('evos');
  assert.equal(evosCheck.isReserved, true, 'EVOS must be reserved');
  assert.equal(evosCheck.canonicalBrand, 'EVOS');

  const uzumCheck = checkReservedBrand('uzum');
  assert.equal(uzumCheck.isReserved, true, 'UZUM must be reserved');
  assert.equal(uzumCheck.canonicalBrand, 'UZUM');

  const yandexCheck = checkReservedBrand('yandex');
  assert.equal(yandexCheck.isReserved, true, 'YANDEX must be reserved');

  const paymeCheck = checkReservedBrand('payme');
  assert.equal(paymeCheck.isReserved, true, 'PAYME must be reserved');

  const clickCheck = checkReservedBrand('click');
  assert.equal(clickCheck.isReserved, true, 'CLICK must be reserved');

  const korzinkaCheck = checkReservedBrand('korzinka');
  assert.equal(korzinkaCheck.isReserved, true, 'KORZINKA must be reserved');

  const zayunoCheck = checkReservedBrand('zayuno');
  assert.equal(zayunoCheck.isReserved, true, 'ZAYUNO must be reserved');

  // 2. Aliases, Affixes, and Patterns
  assert.equal(checkReservedBrand('e-vos').isReserved, true, 'e-vos must be reserved');
  assert.equal(checkReservedBrand('ev0s').isReserved, true, 'ev0s (lookalike 0->o) must be reserved');
  assert.equal(checkReservedBrand('official-evos').isReserved, true, 'official-evos must be reserved');
  assert.equal(checkReservedBrand('evos-uzbekistan').isReserved, true, 'evos-uzbekistan must be reserved');
  assert.equal(checkReservedBrand('evos-delivery').isReserved, true, 'evos-delivery must be reserved');
  assert.equal(checkReservedBrand('uzum-tezkor').isReserved, true, 'uzum-tezkor must be reserved');
  assert.equal(checkReservedBrand('uzum-market').isReserved, true, 'uzum-market must be reserved');
  assert.equal(checkReservedBrand('yandex-go').isReserved, true, 'yandex-go must be reserved');
  assert.equal(checkReservedBrand('payme-business').isReserved, true, 'payme-business must be reserved');

  // 3. Cyrillic Transliterations & Homoglyphs
  assert.equal(checkReservedBrand('эвос').isReserved, true, 'эвос (Cyrillic) must be reserved');
  assert.equal(checkReservedBrand('узум').isReserved, true, 'узум (Cyrillic) must be reserved');
  assert.equal(checkReservedBrand('яндекс').isReserved, true, 'яндекс (Cyrillic) must be reserved');
  assert.equal(checkReservedBrand('корзинка').isReserved, true, 'корзинка (Cyrillic) must be reserved');
  assert.equal(checkReservedBrand('клик').isReserved, true, 'клик (Cyrillic) must be reserved');

  // 4. False-Positive Safety: Legitimate Similar Names MUST NOT Be Blocked
  const nonReservedCases = [
    'evolution-software',
    'revolution-fitness',
    'clever-pos',
    'tashkent-cafe',
    'samarkand-travel',
    'pay-point-service',
    'my-clicker-game',
    'custom-logistics-uz'
  ];

  for (const name of nonReservedCases) {
    const result = checkReservedBrand(name);
    assert.equal(
      result.isReserved,
      false,
      `False positive detected! "${name}" was wrongly marked as reserved brand "${result.canonicalBrand}".`
    );
  }

  // 5. ProvidersService Public Self-Service Registration Rejection Test
  console.log('🧪 Testing Public Self-Service vs Operations Registration Guard...');

  const mockPrisma: any = {
    user: { findUnique: async () => null },
    provider: { findUnique: async () => null, create: async ({ data }: any) => data },
    apiKey: { create: async () => ({}) }
  };

  const providersService = new ProvidersService({} as any);
  (providersService as any).getEncryptionKey = () => '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  // Public self-service provider owner trying to register "evos"
  await assert.rejects(
    () =>
      providersService.registerProvider(
        {
          name: 'EVOS Fast Food',
          slug: 'official-evos',
          description: 'Fake EVOS',
          capabilities: ['METADATA' as any, 'HEALTH' as any, 'CATALOG' as any],
          supportContact: { email: 'support@fake-evos.uz' }
        },
        { id: 'user_123', role: UserRole.PROVIDER_OWNER }
      ),
    (err: any) => {
      const response = err.getResponse ? err.getResponse() : err;
      assert.equal(response.code, 'RESERVED_BRAND_PROTECTED');
      assert.match(response.message, /reserved for verified enterprise onboarding/i);
      return true;
    },
    'Public registration of reserved brand must throw RESERVED_BRAND_PROTECTED'
  );

  console.log('✅ All Reserved Brand & Protection Tests Passed!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
