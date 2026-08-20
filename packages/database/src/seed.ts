import { PrismaClient, ProviderStatus, ProviderType, ProviderCapability, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { encryptSecret, hashApiKey } from '@zayuno/shared';

dotenv.config();

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const WEBHOOK_SECRET = process.env.ZAYUNO_WEBHOOK_SECRET || 'zy_webhook_secret_sandbox_key_123';
const SANDBOX_BASE_URL = process.env.SANDBOX_PROVIDER_BASE_URL || 'http://localhost:4001';

async function main() {
  console.log('🌱 Seeding Zayuno Universal Infrastructure Database...');

  // 1. Super Admin User
  const adminPasswordHash = await bcrypt.hash('admin12345', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@zayuno.io' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'admin@zayuno.io',
      name: 'Zayuno Platform Admin',
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true
    }
  });
  console.log(`✅ Admin user: ${adminUser.email} (role: ${adminUser.role})`);

  // 2. Fictional Domain-Neutral Sandbox Provider
  const encryptedSandboxSecret = encryptSecret('sandbox_secret_token_live_xyz_987654', ENCRYPTION_KEY);

  const sandboxProvider = await prisma.provider.upsert({
    where: { slug: 'sandbox-provider' },
    update: {
      name: 'Sandbox Capability Provider',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      adapterType: 'sandbox',
      baseUrl: SANDBOX_BASE_URL,
      encryptedSecret: encryptedSandboxSecret,
      webhookSecret: WEBHOOK_SECRET,
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.LOCATIONS,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH,
        ProviderCapability.QUOTE,
        ProviderCapability.ACTION_CREATE,
        ProviderCapability.ACTION_STATUS,
        ProviderCapability.ACTION_CANCEL,
        ProviderCapability.PAYMENT_OPTIONS,
        ProviderCapability.WEBHOOK
      ],
      config: {
        authMethod: 'API_KEY',
        supportContact: {
          phone: '+998900000000',
          telegram: '@sandbox_support',
          email: 'support@sandbox.zayuno.uz',
          workingHours: '09:00 - 18:00 (Mon-Fri)',
          supportUrl: 'https://zayuno.uz/support'
        }
      },
      metadata: {
        description: 'Fictional domain-neutral sandbox provider for end-to-end testing of capability discovery, quotes, and actions.',
        tier: 'STANDARD',
        environment: 'SANDBOX',
        category: 'general',
        geography: ['UZ', 'Tashkent'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        catalogSummary: { totalCount: 2, availableCount: 2 },
        activeLocationsCount: 3,
        supportContact: {
          phone: '+998900000000',
          telegram: '@sandbox_support',
          email: 'support@sandbox.zayuno.uz',
          workingHours: '09:00 - 18:00 (Mon-Fri)',
          supportUrl: 'https://zayuno.uz/support'
        }
      }
    },
    create: {
      slug: 'sandbox-provider',
      name: 'Sandbox Capability Provider',
      logoUrl: 'https://zayuno.uz/assets/sandbox-logo.png',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      adapterType: 'sandbox',
      baseUrl: SANDBOX_BASE_URL,
      encryptedSecret: encryptedSandboxSecret,
      webhookSecret: WEBHOOK_SECRET,
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.LOCATIONS,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH,
        ProviderCapability.QUOTE,
        ProviderCapability.ACTION_CREATE,
        ProviderCapability.ACTION_STATUS,
        ProviderCapability.ACTION_CANCEL,
        ProviderCapability.PAYMENT_OPTIONS,
        ProviderCapability.WEBHOOK
      ],
      config: {
        authMethod: 'API_KEY',
        supportContact: {
          phone: '+998900000000',
          telegram: '@sandbox_support',
          email: 'support@sandbox.zayuno.uz',
          workingHours: '09:00 - 18:00 (Mon-Fri)',
          supportUrl: 'https://zayuno.uz/support'
        }
      },
      metadata: {
        description: 'Fictional domain-neutral sandbox provider for end-to-end testing of capability discovery, quotes, and actions.',
        tier: 'STANDARD',
        environment: 'SANDBOX',
        category: 'general',
        geography: ['UZ', 'Tashkent'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        catalogSummary: { totalCount: 2, availableCount: 2 },
        activeLocationsCount: 3,
        supportContact: {
          phone: '+998900000000',
          telegram: '@sandbox_support',
          email: 'support@sandbox.zayuno.uz',
          workingHours: '09:00 - 18:00 (Mon-Fri)',
          supportUrl: 'https://zayuno.uz/support'
        }
      }
    }
  });
  console.log(`✅ Sandbox Provider: ${sandboxProvider.name} (slug: ${sandboxProvider.slug})`);

  // 2b. Telegram Recruitment Provider (UstozShogird)
  const recruitmentProvider = await prisma.provider.upsert({
    where: { slug: 'ustoz-shogird' },
    update: {
      name: 'UstozShogird Recruitment Feed',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      adapterType: 'http',
      baseUrl: process.env.TELEGRAM_RECRUITMENT_BASE_URL || 'http://telegram-recruitment:4007',
      encryptedSecret: encryptedSandboxSecret,
      webhookSecret: WEBHOOK_SECRET,
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH
      ],
      config: {
        authMethod: 'NONE',
        channel: '@UstozShogird',
        supportContact: {
          telegram: '@UstozShogird',
          supportUrl: 'https://t.me/UstozShogird'
        }
      },
      metadata: {
        description: 'Real-time IT candidates and job vacancies indexed from public Telegram recruitment channels.',
        tier: 'STANDARD',
        environment: 'LIVE',
        category: 'recruitment',
        geography: ['UZ'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        supportContact: {
          telegram: '@UstozShogird',
          supportUrl: 'https://t.me/UstozShogird'
        }
      }
    },
    create: {
      slug: 'ustoz-shogird',
      name: 'UstozShogird Recruitment Feed',
      logoUrl: 'https://zayuno.uz/assets/ustoz-shogird-logo.png',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      adapterType: 'http',
      baseUrl: process.env.TELEGRAM_RECRUITMENT_BASE_URL || 'http://telegram-recruitment:4007',
      encryptedSecret: encryptedSandboxSecret,
      webhookSecret: WEBHOOK_SECRET,
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH
      ],
      config: {
        authMethod: 'NONE',
        channel: '@UstozShogird',
        supportContact: {
          telegram: '@UstozShogird',
          supportUrl: 'https://t.me/UstozShogird'
        }
      },
      metadata: {
        description: 'Real-time IT candidates and job vacancies indexed from public Telegram recruitment channels.',
        tier: 'STANDARD',
        environment: 'LIVE',
        category: 'recruitment',
        geography: ['UZ'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        supportContact: {
          telegram: '@UstozShogird',
          supportUrl: 'https://t.me/UstozShogird'
        }
      }
    }
  });
  console.log(`✅ Recruitment Provider: ${recruitmentProvider.name} (slug: ${recruitmentProvider.slug})`);

  // 3. Provider Owner User
  const ownerPasswordHash = await bcrypt.hash('sandbox12345', 10);
  const ownerUser = await prisma.user.upsert({
    where: { email: 'sandbox.owner@zayuno.io' },
    update: {
      passwordHash: ownerPasswordHash,
      providerId: sandboxProvider.id
    },
    create: {
      email: 'sandbox.owner@zayuno.io',
      name: 'Sandbox Provider Operator',
      passwordHash: ownerPasswordHash,
      role: UserRole.PROVIDER_OWNER,
      providerId: sandboxProvider.id,
      isActive: true
    }
  });
  console.log(`✅ Provider User: ${ownerUser.email} (role: ${ownerUser.role})`);

  // 4. API Key for AI Agent / MCP Server
  const agentApiKey = 'zy_live_agent_secret_key_12345';
  const agentKeyHash = hashApiKey(agentApiKey);
  await prisma.apiKey.upsert({
    where: { keyHash: agentKeyHash },
    update: { isActive: true },
    create: {
      name: 'ChatGPT / Claude Primary Agent Key',
      keyHash: agentKeyHash,
      keyPrefix: 'zy_live_agent_sec...',
      role: UserRole.API_CONSUMER,
      userId: adminUser.id,
      isActive: true
    }
  });
  console.log(`✅ Default AI Agent API Key: ${agentApiKey}`);

  // 5. Locations for Sandbox Provider
  const locations = [
    {
      providerLocationId: 'loc_central_01',
      name: 'Sandbox Central Hub',
      address: 'Central District, Zone A, Facility 101',
      latitude: 41.3111,
      longitude: 69.2797,
      operatingHours: { open: '08:00', close: '22:00', days: [1, 2, 3, 4, 5, 6, 7] },
      serviceRadiusKm: 15.0
    },
    {
      providerLocationId: 'loc_north_02',
      name: 'Sandbox North Facility',
      address: 'North District, Sector 4, Suite 22',
      latitude: 41.3500,
      longitude: 69.2900,
      operatingHours: { open: '09:00', close: '20:00', days: [1, 2, 3, 4, 5, 6] },
      serviceRadiusKm: 10.0
    },
    {
      providerLocationId: 'loc_west_03',
      name: 'Sandbox West Fulfillment Point',
      address: 'West Industrial Park, Building 8',
      latitude: 41.2800,
      longitude: 69.2200,
      operatingHours: { open: '00:00', close: '23:59', days: [1, 2, 3, 4, 5, 6, 7] },
      serviceRadiusKm: 20.0
    }
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: {
        providerId_providerLocationId: {
          providerId: sandboxProvider.id,
          providerLocationId: loc.providerLocationId
        }
      },
      update: {
        name: loc.name,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        operatingHours: loc.operatingHours,
        serviceRadiusKm: loc.serviceRadiusKm,
        isActive: true
      },
      create: {
        providerId: sandboxProvider.id,
        providerLocationId: loc.providerLocationId,
        name: loc.name,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        operatingHours: loc.operatingHours,
        serviceRadiusKm: loc.serviceRadiusKm,
        isActive: true
      }
    });
  }
  console.log(`✅ Seeded ${locations.length} domain-neutral sandbox locations.`);

  console.log('✨ Zayuno Database Seeding Completed Successfully!\n');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
