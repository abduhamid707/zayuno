import {
  prisma,
  ProviderCapability,
  ProviderStatus,
  ProviderType
} from '@zayuno/database';
import { encryptSecret } from '@zayuno/shared';

async function main() {
  const sharedSecret = process.env.MOCK_EVOS_SHARED_SECRET;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!sharedSecret) throw new Error('MOCK_EVOS_SHARED_SECRET is required.');
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY is required.');

  const existing = await prisma.provider.findUnique({ where: { slug: 'mock-evos' } });
  const capabilities = Object.values(ProviderCapability);
  const metadata = {
    ...((existing?.metadata as Record<string, unknown>) || {}),
    category: 'food_delivery',
    geography: ['UZ', 'Tashkent'],
    description: 'Fictional food-delivery sandbox used for end-to-end Zayuno demonstrations. Not affiliated with the real EVOS company.',
    sandbox: true,
    affiliation: 'none',
    isPublished: true,
    registeredVia: 'safe-upsert-script'
  };
  const encryptedSecret = encryptSecret(sharedSecret, encryptionKey);

  const provider = await prisma.provider.upsert({
    where: { slug: 'mock-evos' },
    update: {
      name: 'Mock EVOS',
      status: ProviderStatus.SANDBOX,
      type: ProviderType.DELIVERY,
      adapterType: 'remote-http',
      capabilities,
      baseUrl: 'http://mock-evos:4001',
      encryptedSecret,
      webhookSecret: sharedSecret,
      config: { authMethod: 'API_KEY', sandbox: true },
      metadata
    },
    create: {
      slug: 'mock-evos',
      name: 'Mock EVOS',
      status: ProviderStatus.SANDBOX,
      type: ProviderType.DELIVERY,
      adapterType: 'remote-http',
      capabilities,
      baseUrl: 'http://mock-evos:4001',
      encryptedSecret,
      webhookSecret: sharedSecret,
      config: { authMethod: 'API_KEY', sandbox: true },
      metadata
    }
  });

  console.log(`Mock EVOS provider ready: ${provider.slug} (${provider.status})`);
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
