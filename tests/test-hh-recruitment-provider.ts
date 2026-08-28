import { createHhRecruitmentApp } from '../integrations/hh-recruitment/src/server.ts';
import http from 'node:http';
import assert from 'node:assert/strict';
import { CatalogSchema, OfferingSchema } from '../packages/contracts/src/catalog.ts';

async function runHhRecruitmentTests() {
  console.log('================================================================');
  console.log('🧪 HEADHUNTER UZBEKISTAN (HH-UZ) RECRUITMENT INTEGRATION TEST');
  console.log('================================================================\n');

  const app = createHhRecruitmentApp();
  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address() as { port: number; address: string };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`📡 Local HH test server listening on ${baseUrl}\n`);

  try {
    // 1. Health check
    console.log('👉 [1/6] Testing GET /health...');
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200, 'Health endpoint should return 200');
    const healthData: any = await healthRes.json();
    assert.equal(healthData.status, 'HEALTHY');
    console.log(`   ✅ /health returned status: ${healthData.status} (latency: ${healthData.latencyMs}ms)`);

    // 2. Provider Info
    console.log('\n👉 [2/6] Testing GET /provider-info...');
    const infoRes = await fetch(`${baseUrl}/provider-info`);
    assert.equal(infoRes.status, 200);
    const infoData: any = await infoRes.json();
    assert.equal(infoData.slug, 'hh-uz');
    assert.equal(infoData.type, 'SERVICES');
    assert.ok(infoData.capabilities.includes('SEARCH'));
    assert.ok(infoData.capabilities.includes('CATALOG'));
    console.log(`   ✅ /provider-info returned: "${infoData.name}" with capabilities: ${infoData.capabilities.join(', ')}`);

    // 3. Locations
    console.log('\n👉 [3/6] Testing GET /locations...');
    const locRes = await fetch(`${baseUrl}/locations`);
    assert.equal(locRes.status, 200);
    const locations: any[] = await locRes.json();
    assert.ok(Array.isArray(locations) && locations.length >= 3);
    const tashkentLoc = locations.find(l => l.providerLocationId === '2759');
    assert.ok(tashkentLoc, 'Tashkent location must be present');
    console.log(`   ✅ /locations returned ${locations.length} regions (Found: ${tashkentLoc.name})`);

    // 4. Catalog
    console.log('\n👉 [4/6] Testing GET /catalog...');
    const catRes = await fetch(`${baseUrl}/catalog`);
    assert.equal(catRes.status, 200);
    const catalogData: any = await catRes.json();
    CatalogSchema.parse(catalogData);
    assert.ok(catalogData.categories.length > 0);
    assert.ok(Array.isArray(catalogData.offerings));
    console.log(`   ✅ /catalog schema valid with ${catalogData.categories.length} categories and ${catalogData.offerings.length} featured offerings`);

    // 5. Search Vacancies
    console.log('\n👉 [5/6] Testing GET /search?q=developer...');
    const searchRes = await fetch(`${baseUrl}/search?q=developer&limit=5`);
    assert.equal(searchRes.status, 200);
    const searchResults: any[] = await searchRes.json();
    assert.ok(Array.isArray(searchResults));
    assert.ok(searchResults.length > 0, 'Should find developer vacancies in Uzbekistan');
    for (const item of searchResults) {
      OfferingSchema.parse(item);
    }
    console.log(`   ✅ /search returned ${searchResults.length} verified offering items:`);
    searchResults.slice(0, 3).forEach((item, idx) => {
      console.log(`      • [${idx + 1}] ${item.title} | Price: ${item.basePrice} ${item.currency}`);
    });

    // 6. Single Offering
    console.log('\n👉 [6/6] Testing GET /offerings/:id...');
    const targetOffering = searchResults[0];
    const offRes = await fetch(`${baseUrl}/offerings/${targetOffering.id}`);
    assert.equal(offRes.status, 200);
    const singleData: any = await offRes.json();
    OfferingSchema.parse(singleData);
    assert.equal(singleData.id, targetOffering.id);
    console.log(`   ✅ /offerings/${targetOffering.id} verified with title: "${singleData.title}"`);

    console.log('\n================================================================');
    console.log('🎉 ALL 6 HEADHUNTER RECRUITMENT TESTS PASSED 100%!');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runHhRecruitmentTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
