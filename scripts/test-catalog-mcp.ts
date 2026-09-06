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

async function testCatalog() {
  const slugs = ['uzrailways', 'uzbekistan-airways', 'nova-clinic', 'umrah-travel', 'rentcar-express', 'notarius-express', 'oqtepa-lavash'];

  for (const slug of slugs) {
    console.log(`\n📦 Katalog tekshiruvi: ${slug}`);
    const catalog = await callMcp('get_catalog', { providerSlug: slug });
    console.log(`   Provider: ${catalog.providerName || slug}`);
    console.log(`   Jami mahsulot/xizmat: ${catalog.offerings?.length || 0}`);
    if (catalog.offerings && catalog.offerings.length > 0) {
      console.log(`   Namuna 1: ${catalog.offerings[0].title || catalog.offerings[0].name} (${catalog.offerings[0].price} UZS)`);
      console.log(`   Namuna 2: ${catalog.offerings[1].title || catalog.offerings[1].name} (${catalog.offerings[1].price} UZS)`);
      if (catalog.offerings[0].parametersSchema) {
        console.log(`   Murakkab forma (ParametersSchema): ${Object.keys(catalog.offerings[0].parametersSchema.properties || {}).join(', ')}`);
      }
    }
  }
}

testCatalog().catch(console.error);
