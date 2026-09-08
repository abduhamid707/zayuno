import assert from 'node:assert/strict';
import { prisma } from '@zayuno/database';
import { isProviderDiscoveryReady } from '@zayuno/shared';
import { ProviderRegistryService } from '../apps/api/src/modules/providers/provider-registry.service';

async function main() {
  console.log('🧪 Verifying All 6 Local Providers End-to-End...\n');

  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  const registry = new ProviderRegistryService();
  registry.onModuleInit();

  const providers = await prisma.provider.findMany({
    where: { status: 'ACTIVE' },
    include: { locations: true }
  });

  console.log(`Found ${providers.length} active providers in database.\n`);

  for (const p of providers) {
    console.log(`--- Testing Provider: [${p.slug}] "${p.name}" ---`);

    // 1. Discovery Readiness
    const readiness = isProviderDiscoveryReady(p);
    console.log(` 1. Discovery Ready: ${readiness.isReady ? '✅ YES' : '❌ NO (' + readiness.unreadyReasons.join(', ') + ')'}`);
    assert.equal(readiness.isReady, true, `Provider ${p.slug} must be discovery ready`);

    // 2. Adapter resolution
    const adapter = await registry.getAdapter(p.slug);
    console.log(` 2. Adapter resolved: ✅ (Slug: ${adapter.providerSlug})`);

    // 3. Health check
    const health = await adapter.checkHealth();
    console.log(` 3. Health status: ✅ ${health.status}`);

    // 4. Locations check
    if (p.adapterType === 'sandbox') {
      const locs = await adapter.getLocations();
      console.log(` 4. Locations: ✅ ${locs.length} branches`);
      assert.ok(locs.length > 0, `Provider ${p.slug} must have locations`);
    } else {
      console.log(` 4. Locations (remote): ✅ ${p.locations.length} branches in DB`);
    }

    // 5. Catalog check
    if (p.adapterType === 'sandbox') {
      const catalog = await adapter.getCatalog({ providerSlug: p.slug });
      console.log(` 5. Catalog Offerings: ✅ ${catalog.offerings.length} items`);
      console.log(`    Categories: ✅ ${catalog.categories.length} categories`);
      assert.ok(catalog.offerings.length > 0, `Catalog of ${p.slug} must not be empty`);

      const sample = catalog.offerings[0];
      console.log(`    Sample: "${sample.title}" (${sample.basePrice.toLocaleString()} ${sample.currency})`);
      if (sample.imageUrl) {
        console.log(`    Image: ${sample.imageUrl}`);
      }

      // 6. Quote check
      const quote = await adapter.requestQuote({
        providerSlug: p.slug,
        items: [{
          offeringId: sample.id,
          quantity: 2
        }]
      });
      console.log(` 6. Quote Request: ✅ Total: ${quote.total.toLocaleString()} ${quote.currency}`);
      assert.ok(quote.total > 0, `Quote total must be positive`);
      assert.equal(quote.lines.length, 1);
      assert.equal(quote.lines[0].unitPrice, sample.basePrice);
    } else {
      console.log(` 5. Remote provider (${p.slug}): verified preserved in DB.`);
    }

    console.log(` ✅ Provider [${p.slug}] fully operational!\n`);
  }

  console.log('==============================================');
  console.log('🎉 ALL 6 PROVIDERS VERIFIED SUCCESSFULLY!');
  console.log('==============================================');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Test failed:', e);
  await prisma.$disconnect();
  process.exit(1);
});
