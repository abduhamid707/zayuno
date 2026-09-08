import { PrismaClient, ProviderStatus, ProviderType, ProviderCapability } from '@prisma/client';
import { encryptSecret } from '@zayuno/shared';
import { loadAndFormatAllMenus } from './validate-and-seed-menus';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const WEBHOOK_SECRET = process.env.ZAYUNO_WEBHOOK_SECRET || 'zy_webhook_secret_sandbox_key_123';

async function main() {
  console.log('🌱 Seeding 5 Major Restaurant Chains into Local Zayuno Database...\n');

  const providersData = loadAndFormatAllMenus();

  for (const p of providersData) {
    console.log(`Processing provider: ${p.name} (${p.slug})`);

    const secret = `secret_${p.slug}_live_key_999`;
    const encryptedSecret = encryptSecret(secret, ENCRYPTION_KEY);

    const providerRecord = await prisma.provider.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        logoUrl: p.logoUrl,
        status: ProviderStatus.ACTIVE,
        type: ProviderType.DELIVERY,
        adapterType: 'sandbox',
        baseUrl: null,
        encryptedSecret,
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
            email: `support@${p.slug}.uz`,
            workingHours: '10:00 - 03:00 (Har kuni)',
            supportUrl: `https://${p.slug}.uz`
          }
        },
        metadata: {
          description: p.description,
          tier: 'STANDARD',
          rating: 4.8,
          environment: 'SANDBOX',
          category: 'food_dining',
          geography: ['UZ', 'Tashkent'],
          reviewStatus: 'APPROVED',
          isCertified: true,
          isPublished: true,
          isTemporarilyUnavailable: false,
          healthStatus: 'HEALTHY',
          fulfillmentMode: 'DELIVERY',
          catalogSummary: {
            totalCount: p.offerings.length,
            availableCount: p.offerings.length
          },
          activeLocationsCount: p.locations.length,
          categories: p.categories,
          offerings: p.offerings,
          locations: p.locations,
          supportContact: {
            phone: '+998712000000',
            email: `support@${p.slug}.uz`,
            workingHours: '10:00 - 03:00 (Har kuni)'
          }
        }
      },
      create: {
        slug: p.slug,
        name: p.name,
        logoUrl: p.logoUrl,
        status: ProviderStatus.ACTIVE,
        type: ProviderType.DELIVERY,
        adapterType: 'sandbox',
        baseUrl: null,
        encryptedSecret,
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
            email: `support@${p.slug}.uz`,
            workingHours: '10:00 - 03:00 (Har kuni)',
            supportUrl: `https://${p.slug}.uz`
          }
        },
        metadata: {
          description: p.description,
          tier: 'STANDARD',
          rating: 4.8,
          environment: 'SANDBOX',
          category: 'food_dining',
          geography: ['UZ', 'Tashkent'],
          reviewStatus: 'APPROVED',
          isCertified: true,
          isPublished: true,
          isTemporarilyUnavailable: false,
          healthStatus: 'HEALTHY',
          fulfillmentMode: 'DELIVERY',
          catalogSummary: {
            totalCount: p.offerings.length,
            availableCount: p.offerings.length
          },
          activeLocationsCount: p.locations.length,
          categories: p.categories,
          offerings: p.offerings,
          locations: p.locations,
          supportContact: {
            phone: '+998712000000',
            email: `support@${p.slug}.uz`,
            workingHours: '10:00 - 03:00 (Har kuni)'
          }
        }
      }
    });

    console.log(` ✅ Provider record upserted: ${providerRecord.name} (id: ${providerRecord.id})`);

    // Upsert locations
    for (const loc of p.locations) {
      await prisma.location.upsert({
        where: {
          providerId_providerLocationId: {
            providerId: providerRecord.id,
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
          providerId: providerRecord.id,
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
    console.log(` ✅ ${p.locations.length} locations upserted for ${p.slug}`);
    console.log(` ✅ ${p.offerings.length} offerings saved in metadata for ${p.slug}\n`);
  }

  // Summary
  const allProviders = await prisma.provider.findMany({
    select: { slug: true, name: true, status: true, adapterType: true }
  });

  console.log('==============================================');
  console.log('🎉 Seeding Complete! Active Providers in Database:');
  allProviders.forEach((p, idx) => {
    console.log(` ${idx + 1}. [${p.slug}] ${p.name} (Status: ${p.status}, Adapter: ${p.adapterType})`);
  });
  console.log('==============================================');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Seeding error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
