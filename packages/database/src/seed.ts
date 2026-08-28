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

  // 2. Canonical Review Provider: Coffee Time Sandbox Demo
  const encryptedSandboxSecret = encryptSecret('sandbox_secret_token_live_xyz_987654', ENCRYPTION_KEY);
  const COFFEE_TIME_BASE_URL = process.env.COFFEE_TIME_PROVIDER_BASE_URL || 'https://coffee-time-sandbox.shopla.uz';

  const coffeeTimeProvider = await prisma.provider.upsert({
    where: { slug: 'coffee-time' },
    update: {
      name: 'Coffee Time Sandbox Demo',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.DELIVERY,
      adapterType: 'remote-http',
      baseUrl: COFFEE_TIME_BASE_URL,
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
          phone: '+998712000000',
          telegram: '@coffeetime_support',
          email: 'support@coffee-time.example',
          workingHours: '08:00 - 22:00 (Har kuni)',
          supportUrl: 'https://zayuno.uz/support'
        }
      },
      metadata: {
        description: 'Coffee Time sandbox demo. Bu Coffee Time sandbox demo xizmati. Haqiqiy buyurtma yoki to‘lov amalga oshirilmaydi.',
        tier: 'STANDARD',
        environment: 'SANDBOX',
        category: 'food_delivery',
        geography: ['UZ', 'Tashkent'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        isTemporarilyUnavailable: false,
        fulfillmentMode: 'DELIVERY',
        catalogSummary: { totalCount: 4, availableCount: 4 },
        activeLocationsCount: 2,
        supportContact: {
          phone: '+998712000000',
          telegram: '@coffeetime_support',
          email: 'support@coffee-time.example',
          workingHours: '08:00 - 22:00 (Har kuni)',
          supportUrl: 'https://zayuno.uz/support'
        }
      }
    },
    create: {
      slug: 'coffee-time',
      name: 'Coffee Time Sandbox Demo',
      logoUrl: 'https://zayuno.uz/assets/coffee-time-logo.png',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.DELIVERY,
      adapterType: 'remote-http',
      baseUrl: COFFEE_TIME_BASE_URL,
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
          phone: '+998712000000',
          telegram: '@coffeetime_support',
          email: 'support@coffee-time.example',
          workingHours: '08:00 - 22:00 (Har kuni)',
          supportUrl: 'https://zayuno.uz/support'
        }
      },
      metadata: {
        description: 'Coffee Time sandbox demo. Bu Coffee Time sandbox demo xizmati. Haqiqiy buyurtma yoki to‘lov amalga oshirilmaydi.',
        tier: 'STANDARD',
        environment: 'SANDBOX',
        category: 'food_delivery',
        geography: ['UZ', 'Tashkent'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        isTemporarilyUnavailable: false,
        fulfillmentMode: 'DELIVERY',
        catalogSummary: { totalCount: 4, availableCount: 4 },
        activeLocationsCount: 2,
        supportContact: {
          phone: '+998712000000',
          telegram: '@coffeetime_support',
          email: 'support@coffee-time.example',
          workingHours: '08:00 - 22:00 (Har kuni)',
          supportUrl: 'https://zayuno.uz/support'
        }
      }
    }
  });
  console.log(`✅ Canonical Review Provider: ${coffeeTimeProvider.name} (slug: ${coffeeTimeProvider.slug})`);

  // Seed Coffee Time Locations
  const coffeeLocations = [
    {
      providerLocationId: 'coffee-time-chilonzor',
      name: 'Coffee Time — Chilonzor Test Branch',
      address: 'Toshkent, Chilonzor tumani',
      latitude: 41.285,
      longitude: 69.204,
      operatingHours: { open: '08:00', close: '22:00', days: [1, 2, 3, 4, 5, 6, 7] },
      serviceRadiusKm: 7.0
    },
    {
      providerLocationId: 'coffee-time-yunusobod',
      name: 'Coffee Time — Yunusobod Test Branch',
      address: 'Toshkent, Yunusobod tumani',
      latitude: 41.364,
      longitude: 69.287,
      operatingHours: { open: '08:00', close: '23:00', days: [1, 2, 3, 4, 5, 6, 7] },
      serviceRadiusKm: 6.0
    }
  ];

  for (const loc of coffeeLocations) {
    await prisma.location.upsert({
      where: {
        providerId_providerLocationId: {
          providerId: coffeeTimeProvider.id,
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
        providerId: coffeeTimeProvider.id,
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
  console.log(`✅ Seeded ${coffeeLocations.length} Coffee Time locations.`);

  // 3. Internal Developer Simulator Provider (Hidden from public production discovery)
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
        description: 'Internal developer sandbox provider simulator.',
        tier: 'STANDARD',
        environment: 'SANDBOX',
        category: 'general',
        geography: ['UZ', 'Tashkent'],
        reviewStatus: 'APPROVED',
        isCertified: false,
        isPublished: false,
        isInternal: true,
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
        description: 'Internal developer sandbox provider simulator.',
        tier: 'STANDARD',
        environment: 'SANDBOX',
        category: 'general',
        geography: ['UZ', 'Tashkent'],
        reviewStatus: 'APPROVED',
        isCertified: false,
        isPublished: false,
        isInternal: true,
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
  console.log(`✅ Internal Simulator Provider: ${sandboxProvider.name} (slug: ${sandboxProvider.slug})`);

  // 4. HeadHunter Uzbekistan Live Recruitment Provider (Read-Only Discovery)
  const HH_RECRUITMENT_BASE_URL = process.env.HH_RECRUITMENT_PROVIDER_BASE_URL || 'https://hh-recruitment.shopla.uz';
  const hhProvider = await prisma.provider.upsert({
    where: { slug: 'hh-uz' },
    update: {
      name: 'HeadHunter Uzbekistan Jobs',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      adapterType: 'remote-http',
      baseUrl: HH_RECRUITMENT_BASE_URL,
      encryptedSecret: encryptedSandboxSecret,
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.LOCATIONS,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH
      ],
      config: {
        authMethod: 'API_KEY',
        supportContact: {
          phone: '+998712000000',
          email: 'support@hh.uz',
          workingHours: '24/7 (Onlayn vakansiyalar bazasi)',
          supportUrl: 'https://hh.uz'
        }
      },
      metadata: {
        description: 'HeadHunter (hh.uz) — O‘zbekistondagi eng yirik rasmiy ish va vakansiyalar qidiruv platformasi.',
        tier: 'STANDARD',
        environment: 'PRODUCTION',
        category: 'recruitment',
        geography: ['UZ', 'Tashkent', 'Samarkand', 'Bukhara', 'Fergana'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        isReadOnly: true,
        isTemporarilyUnavailable: false,
        fulfillmentMode: 'DISCOVERY',
        supportContact: {
          phone: '+998712000000',
          email: 'support@hh.uz',
          workingHours: '24/7 (Onlayn vakansiyalar bazasi)',
          supportUrl: 'https://hh.uz'
        }
      }
    },
    create: {
      slug: 'hh-uz',
      name: 'HeadHunter Uzbekistan Jobs',
      logoUrl: 'https://zayuno.uz/assets/hh-logo.png',
      status: ProviderStatus.ACTIVE,
      type: ProviderType.SERVICES,
      adapterType: 'remote-http',
      baseUrl: HH_RECRUITMENT_BASE_URL,
      encryptedSecret: encryptedSandboxSecret,
      webhookSecret: WEBHOOK_SECRET,
      capabilities: [
        ProviderCapability.METADATA,
        ProviderCapability.HEALTH,
        ProviderCapability.LOCATIONS,
        ProviderCapability.CATALOG,
        ProviderCapability.SEARCH
      ],
      config: {
        authMethod: 'API_KEY',
        supportContact: {
          phone: '+998712000000',
          email: 'support@hh.uz',
          workingHours: '24/7 (Onlayn vakansiyalar bazasi)',
          supportUrl: 'https://hh.uz'
        }
      },
      metadata: {
        description: 'HeadHunter (hh.uz) — O‘zbekistondagi eng yirik rasmiy ish va vakansiyalar qidiruv platformasi.',
        tier: 'STANDARD',
        environment: 'PRODUCTION',
        category: 'recruitment',
        geography: ['UZ', 'Tashkent', 'Samarkand', 'Bukhara', 'Fergana'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        isReadOnly: true,
        isTemporarilyUnavailable: false,
        fulfillmentMode: 'DISCOVERY',
        supportContact: {
          phone: '+998712000000',
          email: 'support@hh.uz',
          workingHours: '24/7 (Onlayn vakansiyalar bazasi)',
          supportUrl: 'https://hh.uz'
        }
      }
    }
  });
  console.log(`✅ Live Provider: ${hhProvider.name} (slug: ${hhProvider.slug}, certified: true)`);

  // 4. Provider Owner User
  const ownerPasswordHash = await bcrypt.hash('coffee12345', 10);
  const ownerUser = await prisma.user.upsert({
    where: { email: 'coffee.owner@zayuno.io' },
    update: {
      passwordHash: ownerPasswordHash,
      providerId: coffeeTimeProvider.id
    },
    create: {
      email: 'coffee.owner@zayuno.io',
      name: 'Coffee Time Operator',
      passwordHash: ownerPasswordHash,
      role: UserRole.PROVIDER_OWNER,
      providerId: coffeeTimeProvider.id,
      isActive: true
    }
  });
  console.log(`✅ Provider User: ${ownerUser.email} (role: ${ownerUser.role})`);

  // 5. API Key for AI Agent / MCP Server
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
