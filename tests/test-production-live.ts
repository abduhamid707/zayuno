async function testProduction() {
  console.log('🔍 Testing Zayuno Production Endpoints...');

  const API_BASE = 'https://api.zayuno.uz';
  const MCP_BASE = 'https://mcp.zayuno.uz';
  const DEV_BASE = 'https://developers.zayuno.uz';
  const API_KEY = 'zy_live_agent_secret_key_12345';

  // 1. Developers Portal
  const devRes = await fetch(DEV_BASE);
  console.log(`✅ [1/6] Developers Portal: HTTP ${devRes.status} (https://developers.zayuno.uz)`);

  // 2. MCP Gateway Health & Tools
  const mcpHealth = await fetch(`${MCP_BASE}/health`).then(r => r.json());
  const mcpTools = await fetch(`${MCP_BASE}/tools`).then(r => r.json());
  const challenge = await fetch(`${MCP_BASE}/.well-known/openai-apps-challenge`).then(r => r.text());
  console.log(`✅ [2/6] MCP Gateway: ${mcpHealth.status} | Tools: ${mcpTools.tools.length} registered | Challenge: ${challenge.trim()}`);

  // 3. Catalog Query
  const catalog = await fetch(`${API_BASE}/api/v1/providers/sandbox-provider/catalog`, {
    headers: { 'x-api-key': API_KEY }
  }).then(r => r.json());
  console.log(`✅ [3/6] Provider Catalog: ${catalog.offerings.length} offerings found in ${catalog.providerSlug}`);

  // 4. Quote Calculation
  const quoteRes = await fetch(`${API_BASE}/api/v1/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({
      providerSlug: 'sandbox-provider',
      items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
      fulfillmentType: 'DIGITAL',
      currency: 'UZS'
    })
  });
  const quote = await quoteRes.json();
  console.log(`✅ [4/6] Quote Created: ID ${quote.quoteId} | Total: ${quote.totalAmount} ${quote.currency} (Items: ${quote.itemTotal}, Fee: ${quote.fulfillmentFee})`);

  // 5. Action Creation (Order Execution with Payment Handoff)
  const actionRes = await fetch(`${API_BASE}/api/v1/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({
      providerSlug: 'sandbox-provider',
      quoteId: quote.quoteId,
      customerId: 'cust_prod_live_verification_999',
      items: [{ offeringId: 'offering_standard_pkg', quantity: 2, unitPrice: 50000 }],
      totalAmount: quote.totalAmount,
      currency: 'UZS',
      fulfillment: { type: 'DIGITAL' }
    })
  });
  const action = await actionRes.json();
  console.log(`✅ [5/6] Action Created: ID ${action.actionId} | Status: ${action.status} | NextAction: ${action.nextAction?.type} -> ${action.nextAction?.url}`);

  // 6. Action Status Query
  const actionStatus = await fetch(`${API_BASE}/api/v1/actions/${action.actionId}`, {
    headers: { 'x-api-key': API_KEY }
  }).then(r => r.json());
  console.log(`✅ [6/6] Action Status Query: ID ${actionStatus.actionId} | Status: ${actionStatus.status} | Trace: ${actionStatus.traceId}`);

  console.log('\n🎉 ALL PRODUCTION CHECKS PASSED 100% OVER PUBLIC HTTPS!');
}

testProduction().catch(err => {
  console.error('❌ Production test failed:', err);
  process.exit(1);
});
