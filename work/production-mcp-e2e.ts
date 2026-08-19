const endpoint = 'https://mcp.zayuno.uz/mcp';

async function callTool(name: string, args: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: `${name}-${Date.now()}`, method: 'tools/call', params: { name, arguments: args } })
  });
  const body: any = await response.json();
  if (!response.ok || body.error) throw new Error(`${name}: ${body.error?.message || response.statusText}`);
  return JSON.parse(body.result.content[0].text);
}

async function main() {
  const catalog = await callTool('get_catalog', { providerSlug: 'mock-evos' });
  const offering = catalog.offerings.find((item: any) => item.id === 'mock_drink');
  if (!offering) throw new Error('Mock Soft Drink is missing from the provider catalog.');

  const quote = await callTool('request_quote', {
    providerSlug: 'mock-evos', locationId: 'mock-evos-chilonzor',
    items: [{ offeringId: offering.id, quantity: 1 }], fulfillmentType: 'STANDARD',
    destination: { raw: 'Tashkent sandbox test address' }
  });
  const action = await callTool('create_action', {
    idempotencyKey: `mcp-production-test-${crypto.randomUUID()}`,
    providerSlug: 'mock-evos', quoteId: quote.id, locationId: 'mock-evos-chilonzor',
    items: [{ offeringId: offering.id, quantity: 1 }],
    customer: { name: 'MCP Sandbox Tester', phone: '+998900000000' },
    destination: { raw: 'Tashkent sandbox test address' }, fulfillmentType: 'STANDARD', userConfirmed: true
  });
  const paymentOptions = await callTool('get_payment_options', { actionId: action.publicId });
  const status = await callTool('get_action', { actionId: action.publicId });
  const checkout = new URL(action.nextAction.url);
  const checkoutResponse = await fetch(action.nextAction.url);
  if (!checkoutResponse.ok) throw new Error(`Provider checkout returned HTTP ${checkoutResponse.status}.`);
  const simulatedPayment = await fetch(`${action.nextAction.url}/simulate-success`, { method: 'POST', redirect: 'manual' });
  if (simulatedPayment.status !== 303) throw new Error(`Mock payment returned HTTP ${simulatedPayment.status}.`);
  await new Promise(resolve => setTimeout(resolve, 500));
  const updatedStatus = await callTool('get_action', { actionId: action.publicId });

  console.log(JSON.stringify({
    offerings: catalog.offerings.length, quoteTotal: quote.total, actionId: action.publicId,
    actionStatus: status.status, paymentStatus: status.paymentStatus,
    updatedActionStatus: updatedStatus.status, updatedPaymentStatus: updatedStatus.paymentStatus,
    checkoutHost: checkout.host, checkoutStatus: checkoutResponse.status,
    paymentOptions: paymentOptions.length
  }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
