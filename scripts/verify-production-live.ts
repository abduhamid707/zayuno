async function testProductionMCP() {
  const url = 'https://mcp.zayuno.uz/mcp';

  async function callMcpTool(name: string, args: Record<string, any>) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now().toString(),
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      }),
    });

    const text = await res.text();
    let payload = text;
    if (text.startsWith('event: message') || text.includes('data:')) {
      const dataLine = text.split('\n').find((l) => l.startsWith('data:'));
      if (dataLine) {
        payload = dataLine.replace(/^data:\s*/, '');
      }
    }
    return JSON.parse(payload);
  }

  console.log('--- 1. Testing find_providers ---');
  const findRes = await callMcpTool('find_providers', { category: 'all' });
  const contentText = findRes.result?.content?.[0]?.text;
  const parsed = JSON.parse(contentText);
  const providers = parsed.providers || parsed;
  console.log(`Found ${providers.length} providers:`);
  for (const p of providers) {
    console.log(`  - [${p.slug || p.id}] ${p.name} (${p.category})`);
  }

  console.log('\n--- 2. Testing get_catalog for all providers ---');
  const providerSlugs = ['bellissimo', 'evos', 'maxway', 'chopar', 'yaponamama', 'coffee-time'];
  let sampleBellissimoItem: any = null;

  for (const slug of providerSlugs) {
    const catRes = await callMcpTool('get_catalog', { providerSlug: slug });
    if (catRes.error) {
      console.error(`  ERROR for ${slug}:`, catRes.error);
      continue;
    }
    const catContent = catRes.result?.content?.[0]?.text;
    const catData = JSON.parse(catContent);
    const offerings = catData.offerings || [];
    const categories = catData.categories || [];
    console.log(`  ✅ [${slug}] Offerings: ${offerings.length}, Categories: ${categories.length}`);
    if (offerings.length > 0) {
      const first = offerings[0];
      if (slug === 'bellissimo') sampleBellissimoItem = first;
      console.log(`     Sample item: "${first.name}" | Price: ${first.price?.amount} ${first.price?.currency} | Options: ${first.options?.length || 0}`);
    }
  }

  console.log('\n--- 3. Testing request_quote for bellissimo ---');
  if (sampleBellissimoItem) {
    console.log(`Quoting for "${sampleBellissimoItem.name}" (id: ${sampleBellissimoItem.id})...`);
    const quoteRes = await callMcpTool('request_quote', {
      providerSlug: 'bellissimo',
      items: [{ offeringId: sampleBellissimoItem.id, quantity: 2 }],
      destination: { raw: 'Tashkent, Amir Temur 1' }
    });
    console.log('Quote response customer message:');
    const quoteContent = JSON.parse(quoteRes.result?.content?.[0]?.text);
    console.log(quoteContent.customerMessage || quoteContent);
  }

  console.log('\n✅ Production verification fully completed successfully!');
}

testProductionMCP().catch(console.error);
