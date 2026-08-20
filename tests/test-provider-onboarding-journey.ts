import assert from 'node:assert/strict';
import { ProvidersService } from '../apps/api/src/modules/providers/providers.service.ts';
import { ProviderRegistryService } from '../apps/api/src/modules/providers/provider-registry.service.ts';
import { prisma } from '../packages/database/src/client.ts';
import { UserRole, ProviderStatus } from '../packages/database/src/index.ts';
import { isProviderPublished, isProviderDiscoveryReady } from '../packages/shared/src/publishing.ts';


async function main() {
  console.log('🧪 Testing Provider Onboarding Journey E2E...');

  const mockRegistry = new ProviderRegistryService();
  const providersService = new ProvidersService(mockRegistry);
  (providersService as any).getEncryptionKey = () => '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  let dbProviders = new Map<string, any>();
  let dbUsers = new Map<string, any>();
  let dbApiKeys = new Map<string, any>();

  const originalFindUniqueProvider = prisma.provider.findUnique;
  const originalCreateProvider = prisma.provider.create;
  const originalUpdateProvider = prisma.provider.update;
  const originalFindManyProvider = prisma.provider.findMany;
  const originalFindUniqueUser = prisma.user.findUnique;
  const originalUpdateUser = prisma.user.update;
  const originalCreateApiKey = prisma.apiKey.create;

  try {
    (prisma.provider as any).findUnique = async ({ where }: any) => {
      if (where.slug) return dbProviders.get(where.slug) || null;
      if (where.id) {
        for (const p of dbProviders.values()) {
          if (p.id === where.id) return p;
        }
      }
      return null;
    };

    (prisma.provider as any).create = async ({ data }: any) => {
      const record = {
        id: `prov_${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      dbProviders.set(data.slug, record);
      return record;
    };

    (prisma.provider as any).update = async ({ where, data }: any) => {
      const p = dbProviders.get(where.slug);
      if (p) {
        const updated = { ...p, ...data, metadata: { ...(p.metadata || {}), ...(data.metadata || {}) } };
        dbProviders.set(where.slug, updated);
        return updated;
      }
      return null;
    };

    (prisma.provider as any).findMany = async () => Array.from(dbProviders.values());

    (prisma.user as any).findUnique = async ({ where }: any) => dbUsers.get(where.id) || null;
    (prisma.user as any).update = async ({ where, data }: any) => {
      const u = dbUsers.get(where.id);
      if (u) {
        const updated = { ...u, ...data };
        dbUsers.set(where.id, updated);
        return updated;
      }
      return null;
    };
    (prisma.apiKey as any).create = async ({ data }: any) => {
      dbApiKeys.set(data.keyHash, data);
      return data;
    };

    const ownerUser = {
      id: 'usr_verified_owner',
      email: 'owner@fastdeliveries.uz',
      name: 'Fast Deliveries LLC',
      role: UserRole.PROVIDER_OWNER,
      isActive: true
    };
    dbUsers.set(ownerUser.id, ownerUser);

    // 1. Wizard Step 2: Attempting to register a reserved brand -> MUST BE REJECTED
    console.log('  1. Testing reserved brand rejection in public wizard...');
    await assert.rejects(
      () =>
        providersService.registerProvider(
          {
            name: 'EVOS Uzbekistan',
            slug: 'evos-uzbekistan',
            capabilities: ['METADATA' as any, 'HEALTH' as any, 'CATALOG' as any, 'QUOTE' as any, 'ACTION_CREATE' as any, 'ACTION_STATUS' as any, 'WEBHOOK' as any],
            supportContact: { phone: '+998712000000', email: 'fake@evos.uz' }
          },
          { id: ownerUser.id, role: UserRole.PROVIDER_OWNER }
        ),
      (err: any) => {
        const res = err.getResponse ? err.getResponse() : err;
        assert.equal(res.code, 'RESERVED_BRAND_PROTECTED');
        return true;
      },
      'Reserved brand registration must fail'
    );

    // 2. Register valid new provider application
    console.log('  2. Testing valid provider registration...');
    const regResult = await providersService.registerProvider(
      {
        name: 'Fast Deliveries',
        slug: 'fast-deliveries',
        type: 'DELIVERY' as any,
        category: 'logistics',
        description: 'Express parcel and courier service across Tashkent',
        baseUrl: 'https://api.fastdeliveries.uz',
        authMethod: 'API_KEY',
        supportContact: {
          phone: '+998712009999',
          telegram: '@fast_support',
          email: 'support@fastdeliveries.uz',
          workingHours: '08:00 - 23:00',
          supportUrl: 'https://fastdeliveries.uz/help'
        },
        capabilities: ['METADATA' as any, 'HEALTH' as any, 'CATALOG' as any, 'QUOTE' as any, 'ACTION_CREATE' as any, 'ACTION_STATUS' as any, 'WEBHOOK' as any]
      },
      { id: ownerUser.id, role: UserRole.PROVIDER_OWNER }
    );

    assert.ok(regResult.credentials.sandboxApiKey.startsWith('zy_test_'));
    assert.ok(regResult.credentials.sandboxWebhookSecret.startsWith('zy_sb_sec_'));
    assert.equal(regResult.provider.slug, 'fast-deliveries');
    assert.equal(regResult.provider.status, ProviderStatus.DRAFT);
    assert.equal(regResult.provider.isCertified, false);
    assert.equal(regResult.provider.isPublished, false);

    // 3. Discovery Check: DRAFT provider MUST NOT appear in find/list
    console.log('  3. Verifying uncertified DRAFT provider is invisible to AI discovery...');
    const activeProviders = await providersService.listProviders();
    const found = activeProviders.find(p => p.slug === 'fast-deliveries');
    assert.equal(found, undefined, 'DRAFT provider must be invisible in discovery');

    // 4. Submit for review without certification -> should be prevented or flagged
    console.log('  4. Verifying review submission requirements...');
    const saved = dbProviders.get('fast-deliveries');
    assert.equal(isProviderPublished(saved), false);

    // Simulate certification pass
    saved.metadata.isCertified = true;
    saved.metadata.reviewStatus = 'PENDING_APPROVAL';
    dbProviders.set('fast-deliveries', saved);

    // Still not published because reviewStatus is PENDING_APPROVAL and status is DRAFT
    assert.equal(isProviderPublished(saved), false);

    // Simulate Admin approval
    saved.status = ProviderStatus.ACTIVE;
    saved.metadata.reviewStatus = 'APPROVED';
    saved.metadata.isPublished = true;
    saved.metadata.catalogSummary = { totalCount: 10, availableCount: 10 };
    saved.locations = [{ id: 'loc_01', isActive: true }];
    dbProviders.set('fast-deliveries', saved);

    // Now canonical publishing gate must pass!
    assert.equal(isProviderPublished(saved), true);
    assert.equal(isProviderDiscoveryReady(saved).isReady, true);

    const afterApprovalList = await providersService.listProviders();
    const approvedProvider = afterApprovalList.find(p => p.slug === 'fast-deliveries');
    assert.ok(approvedProvider, 'Approved & certified provider must now appear in discovery');
    assert.equal(approvedProvider.supportContact?.telegram, '@fast_support');
    assert.equal(approvedProvider.supportContact?.phone, '+998712009999');

  } finally {
    prisma.provider.findUnique = originalFindUniqueProvider;
    prisma.provider.create = originalCreateProvider;
    prisma.provider.update = originalUpdateProvider;
    prisma.provider.findMany = originalFindManyProvider;
    prisma.user.findUnique = originalFindUniqueUser;
    prisma.user.update = originalUpdateUser;
    prisma.apiKey.create = originalCreateApiKey;
  }

  console.log('✅ Provider Onboarding Journey E2E Tests Passed!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
