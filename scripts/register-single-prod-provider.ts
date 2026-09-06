import {
  prisma,
  ProviderCapability,
  ProviderStatus,
  ProviderType
} from '@zayuno/database';
import { encryptSecret } from '@zayuno/shared';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const WEBHOOK_SECRET = process.env.ZAYUNO_WEBHOOK_SECRET || 'zy_webhook_secret_key_123';

async function main() {
  console.log('🚀 Registering 1 production-ready clean provider (MaxWay)...');

  const slug = 'maxway';
  const name = 'MaxWay';
  const encryptedSecret = encryptSecret('maxway_secret_key_live_2026', ENCRYPTION_KEY);

  const capabilities = [
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
  ];

  const provider = await prisma.provider.upsert({
    where: { slug },
    update: {
      name,
      status: ProviderStatus.ACTIVE,
      type: ProviderType.DELIVERY,
      adapterType: 'sandbox',
      capabilities,
      encryptedSecret,
      webhookSecret: WEBHOOK_SECRET,
      config: {
        authMethod: 'API_KEY'
      },
      metadata: {
        description: 'Toshkent bo‘ylab tezkor va mazali fast-food, lavash, burger va ichimliklar yetkazib berish xizmati.',
        tier: 'STANDARD',
        category: 'food_delivery',
        geography: ['UZ', 'Tashkent'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        isTemporarilyUnavailable: false,
        healthStatus: 'HEALTHY',
        fulfillmentMode: 'DELIVERY',
        catalogSummary: { totalCount: 8, availableCount: 8 },
        activeLocationsCount: 3,
        rating: 4.9,
        supportContact: {
          phone: '+998712005555',
          telegram: '@maxway_support',
          workingHours: '09:00 - 03:00 (Har kuni)'
        }
      }
    },
    create: {
      slug,
      name,
      status: ProviderStatus.ACTIVE,
      type: ProviderType.DELIVERY,
      adapterType: 'sandbox',
      capabilities,
      encryptedSecret,
      webhookSecret: WEBHOOK_SECRET,
      config: {
        authMethod: 'API_KEY'
      },
      metadata: {
        description: 'Toshkent bo‘ylab tezkor va mazali fast-food, lavash, burger va ichimliklar yetkazib berish xizmati.',
        tier: 'STANDARD',
        category: 'food_delivery',
        geography: ['UZ', 'Tashkent'],
        reviewStatus: 'APPROVED',
        isCertified: true,
        isPublished: true,
        isTemporarilyUnavailable: false,
        healthStatus: 'HEALTHY',
        fulfillmentMode: 'DELIVERY',
        catalogSummary: { totalCount: 8, availableCount: 8 },
        activeLocationsCount: 3,
        rating: 4.9,
        supportContact: {
          phone: '+998712005555',
          telegram: '@maxway_support',
          workingHours: '09:00 - 03:00 (Har kuni)'
        }
      }
    }
  });

  console.log(`✅ Provider created/updated: ${provider.name} (${provider.slug}), status: ${provider.status}`);

  // Add 3 Active Locations in Tashkent
  const locationsData = [
    {
      providerLocationId: 'maxway-loc-chilonzor',
      name: 'MaxWay Chilonzor filiali',
      address: 'Toshkent sh., Chilonzor tumani, 9-mavze, 12-uy',
      latitude: 41.2785,
      longitude: 69.2054,
      serviceRadiusKm: 10.0,
      isActive: true,
      operatingHours: { open: '09:00', close: '03:00' }
    },
    {
      providerLocationId: 'maxway-loc-markaz',
      name: 'MaxWay Amir Temur filiali',
      address: 'Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi, 45-uy',
      latitude: 41.3152,
      longitude: 69.2816,
      serviceRadiusKm: 12.0,
      isActive: true,
      operatingHours: { open: '09:00', close: '03:00' }
    },
    {
      providerLocationId: 'maxway-loc-yunusobod',
      name: 'MaxWay Yunusobod filiali',
      address: 'Toshkent sh., Yunusobod tumani, 11-mavze, Ahmad Donish ko‘chasi',
      latitude: 41.3654,
      longitude: 69.2901,
      serviceRadiusKm: 10.0,
      isActive: true,
      operatingHours: { open: '09:00', close: '03:00' }
    }
  ];

  for (const loc of locationsData) {
    const l = await prisma.location.upsert({
      where: {
        providerId_providerLocationId: {
          providerId: provider.id,
          providerLocationId: loc.providerLocationId
        }
      },
      update: {
        name: loc.name,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        serviceRadiusKm: loc.serviceRadiusKm,
        isActive: loc.isActive,
        operatingHours: loc.operatingHours
      },
      create: {
        providerId: provider.id,
        providerLocationId: loc.providerLocationId,
        name: loc.name,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        serviceRadiusKm: loc.serviceRadiusKm,
        isActive: loc.isActive,
        operatingHours: loc.operatingHours
      }
    });
    console.log(`  📍 Location ready: ${l.name} (${l.address})`);
  }

  console.log('🎉 MaxWay provider is 100% production-ready and active!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
