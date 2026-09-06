import fetch from 'node-fetch';

const MCP_URL = 'https://mcp.zayuno.uz/mcp';

async function callMcp(name: string, args: Record<string, any> = {}) {
  const r = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'step-' + Math.random().toString(36).substring(7),
      method: 'tools/call',
      params: { name, arguments: args }
    })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data: any = await r.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return JSON.parse(data.result.content[0].text);
}

async function testEcosystem() {
  console.log('Testing MCP Discovery Across Categories:\n');

  const testQueries = [
    { query: 'poyezd', expectedCategory: 'Chiptalar va Transport' },
    { query: 'aviachipta', expectedCategory: 'Aviatsiya' },
    { query: 'umra', expectedCategory: 'Ziyorat va Turizm' },
    { query: 'ko‘z klinikasi', expectedCategory: 'Tibbiyot' },
    { query: 'stomatologiya', expectedCategory: 'Tibbiyot' },
    { query: 'avtomobil ijarasi', expectedCategory: 'Avto transport' },
    { query: 'notarius', expectedCategory: 'Yuridik xizmatlar' },
    { query: 'sport zal', expectedCategory: 'Fitnes' },
    { query: 'lavash', expectedCategory: 'Fast Food' },
    { query: 'smartfon', expectedCategory: 'Elektronika' },
    { query: 'kitob', expectedCategory: 'Kitoblar' },
    { query: 'klining', expectedCategory: 'Tozalash xizmatlari' }
  ];

  for (const t of testQueries) {
    try {
      const res = await callMcp('find_providers', { query: t.query });
      const providers = res.providers || [];
      console.log(`🔍 So‘rov: "${t.query}" (${t.expectedCategory})`);
      if (providers.length > 0) {
        console.log(`   Topildi: ${providers.length} ta provider`);
        providers.slice(0, 3).forEach((p: any) => {
          console.log(`   - ${p.name} (${p.slug}) | Reyting: ${p.rating || 'N/A'}`);
        });
      } else {
        console.log(`   ⚠️ Topilmadi (generic javob: ${res.customerMessage})`);
      }
      console.log('');
    } catch (err: any) {
      console.error(`   ❌ Xato "${t.query}":`, err.message);
    }
  }
}

testEcosystem().catch(console.error);
