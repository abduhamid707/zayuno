async function runLiveDemonstration() {
  const BASE = process.env.API_BASE_URL || 'https://api.zayuno.uz';
  const MCP_BASE = process.env.MCP_BASE_URL || 'https://mcp.zayuno.uz';
  const API_KEY = process.env.ZAYUNO_API_KEY || '<API_KEY>';

  console.log('------------------------------------------------------------------------');
  console.log(`1. Fetching active providers from Live API (${BASE}/api/v1/providers):`);
  const r1 = await fetch(`${BASE}/api/v1/providers`, { headers: { 'x-api-key': API_KEY } });
  const providers = await r1.json();
  console.log('   Provider:', providers[0]?.name, '| Slug:', providers[0]?.slug, '| Status:', providers[0]?.status);

  console.log(`\n2. Fetching MCP Tools for ChatGPT (${MCP_BASE}/tools):`);
  const r2 = await fetch(`${MCP_BASE}/tools`);
  const tools = await r2.json();
  console.log('   Total tools:', tools.tools.length);
  console.log('   Tools:', tools.tools.map((t: any) => t.name).join(', '));

  console.log('\n3. Creating Quote for 2 × X Set:');
  const r3 = await fetch(`${BASE}/api/v1/orders/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({
      providerSlug: 'evos',
      items: [{ productId: 'evos_set_x', quantity: 2 }],
      deliveryType: 'DELIVERY'
    })
  });
  const quote = await r3.json();
  console.log('   Quote ID:', quote.quoteId);
  console.log(`   Calculation: 2 × X Set (${quote.subtotal} UZS) + Yetkazish (${quote.deliveryFee} UZS) = Jami ${quote.total} UZS`);

  console.log('\n4. Creating Order in Live Postgres DB:');
  const r4 = await fetch(`${BASE}/api/v1/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({
      idempotencyKey: `live_demo_${Date.now()}`,
      providerSlug: 'evos',
      quoteId: quote.quoteId,
      customer: { name: 'Real Live Test', phone: '+998901234567' },
      address: { raw: 'Toshkent sh., Yunusobod' },
      items: [{ productId: 'evos_set_x', quantity: 2 }],
      paymentMethod: 'payme'
    })
  });
  const order = await r4.json();
  console.log('   Order Created:', order.publicId, '| Status:', order.status);

  console.log('\n5. Getting Payment Options (Public HTTPS URL):');
  const r5 = await fetch(`${BASE}/api/v1/orders/${order.publicId}/payment-options?provider=evos`, {
    headers: { 'x-api-key': API_KEY }
  });
  const payOpts = await r5.json();
  const payme = payOpts.find((p: any) => p.type === 'payme');
  console.log('   Payment URL (Live Public):', payme.paymentUrl);

  console.log('\n6. Simulating Customer Payment on Live EVOS Gateway:');
  const r6 = await fetch(payme.paymentUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'success' })
  });
  const payRes = await r6.json();
  console.log('   Gateway Status:', payRes.status);

  await new Promise(r => setTimeout(r, 1200));

  console.log('\n7. Checking Final Order State in Zayuno Database:');
  const r7 = await fetch(`${BASE}/api/v1/orders/${order.publicId}?provider=evos`, {
    headers: { 'x-api-key': API_KEY }
  });
  const finalOrder = await r7.json();
  console.log('   Final Order Status:  ', finalOrder.status, '(Expected: ACCEPTED)');
  console.log('   Final Payment Status:', finalOrder.paymentStatus, '(Expected: PAID)');
  console.log('------------------------------------------------------------------------');
}

runLiveDemonstration().catch(console.error);
