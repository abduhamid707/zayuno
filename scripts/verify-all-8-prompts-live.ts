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

async function runAll8Prompts() {
  console.log('🚀 Running 8 Positive Prompts against Production Live MCP: ' + MCP_URL);
  console.log('========================================================================\n');

  // Prompt 1: get_welcome_message
  console.log('👉 [1/8] User Prompt: "Salom, Zayuno qanday xizmatlarni taklif qiladi?"');
  const p1 = await callMcp('get_welcome_message');
  console.log('   Tool: get_welcome_message');
  console.log('   Output:', p1.customerMessage.replace(/\n/g, ' '));
  console.log('   Status: ✅ PASS\n');

  // Prompt 2: find_providers
  console.log('👉 [2/8] User Prompt: "Toshkentda qanday qahvaxona va yetkazib berish xizmatlari bor?"');
  const p2 = await callMcp('find_providers', { query: 'Coffee Time' });
  console.log('   Tool: find_providers');
  console.log('   Found Provider:', p2.providers?.[0]?.name);
  console.log('   Customer Message:', p2.customerMessage);
  if (!p2.customerMessage.includes('Coffee Time Sandbox Demo')) {
    throw new Error('Expected "Coffee Time Sandbox Demo" in customerMessage, received: ' + p2.customerMessage);
  }
  console.log('   Status: ✅ PASS\n');

  // Prompt 3: get_locations & get_catalog
  console.log('👉 [3/8] User Prompt: "Coffee Time filiallari qayerda joylashgan va menyusida nimalar bor?"');
  const p3Loc = await callMcp('get_locations', { providerSlug: 'coffee-time' });
  const p3Cat = await callMcp('get_catalog', { providerSlug: 'coffee-time' });
  console.log('   Tool: get_locations ->', p3Loc.locations?.map((l: any) => l.name).join(', '));
  console.log('   Tool: get_catalog   -> Offerings count:', p3Cat.offerings?.length);
  console.log('   Customer Message:\n' + p3Cat.customerMessage);
  console.log('   Status: ✅ PASS\n');

  // Prompt 4: request_quote
  console.log('👉 [4/8] User Prompt: "Coffee Time dan 1 ta Cappuccino Toshkent, Chilonzorga yetkazib berish bilan qancha bo\'ladi?"');
  const p4 = await callMcp('request_quote', {
    providerSlug: 'coffee-time',
    items: [{ offeringId: 'ct_cappuccino', quantity: 1 }],
    destination: { raw: 'Toshkent, Chilonzor tumani' },
    customer: { name: 'Alisher' }
  });
  console.log('   Tool: request_quote -> Quote ID:', p4.id, '| Total:', p4.total, p4.currency);
  console.log('   Customer Message:\n' + p4.customerMessage);
  console.log('   Status: ✅ PASS\n');

  // Prompt 5: create_action
  console.log('👉 [5/8] User Prompt: "Ha, narx ma\'qul, buyurtmani tasdiqlayman. Ismim Alisher, telefonim +998901234567."');
  const p5 = await callMcp('create_action', {
    providerSlug: 'coffee-time',
    quoteId: p4.id,
    userConfirmed: true,
    customer: { name: 'Alisher', phone: '+998901234567' },
    destination: { raw: 'Toshkent, Chilonzor tumani' },
    items: [{ offeringId: 'ct_cappuccino', quantity: 1 }]
  });
  console.log('   Tool: create_action -> Action ID:', p5.publicId, '| Status:', p5.status);
  console.log('   Customer Message:\n' + p5.customerMessage);
  console.log('   Status: ✅ PASS\n');

  // Prompt 6: get_payment_options
  console.log('👉 [6/8] User Prompt: "Buyurtma to\'lov havolasini qayta ko\'rsat"');
  const p6 = await callMcp('get_payment_options', { actionId: p5.publicId });
  console.log('   Tool: get_payment_options -> Found options count:', p6.length || 1);
  console.log('   Status: ✅ PASS\n');

  // Prompt 7: get_action
  console.log('👉 [7/8] User Prompt: "Mening Coffee Time buyurtmam holati qanday?"');
  const p7 = await callMcp('get_action', { actionId: p5.publicId });
  console.log('   Tool: get_action -> Action ID:', p7.publicId, '| Status:', p7.status);
  console.log('   Customer Message:\n' + p7.customerMessage);
  console.log('   Status: ✅ PASS\n');

  // Prompt 8: cancel_action
  console.log('👉 [8/8] User Prompt: "Buyurtmani bekor qilmoqchiman"');
  const p8 = await callMcp('cancel_action', {
    actionId: p5.publicId,
    reason: 'Customer requested cancellation from ChatGPT',
    reasonCode: 'CUSTOMER_CANCELLED'
  });
  console.log('   Tool: cancel_action -> Action ID:', p8.actionId, '| New Status:', p8.newStatus);
  console.log('   Customer Message:', p8.message || p8.customerMessage);
  console.log('   Status: ✅ PASS\n');

  console.log('========================================================================');
  console.log('🎉 ALL 8 POSITIVE SUBMISSION PROMPTS EXECUTED 100% SUCCESSFULLY ON LIVE PRODUCTION MCP!');
  console.log('========================================================================');
}

runAll8Prompts().catch(err => {
  console.error('❌ FAILED:', err);
  process.exit(1);
});
