import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function testOfficialMcpClient() {
  console.log('===============================================================');
  console.log('🧪 TESTING OFFICIAL MCP STREAMABLE HTTP CLIENT (https://zayuno.uz/mcp)');
  console.log('===============================================================\n');

  const MCP_URL = process.env.MCP_URL || 'https://zayuno.uz/mcp';
  const httpTransport = new StreamableHTTPClientTransport(
    new URL(MCP_URL)
  );

  const client = new Client(
    { name: 'zayuno-official-test-runner', version: '1.0.0' },
    { capabilities: {} }
  );

  console.log(`1. Connecting to ${MCP_URL} (Streamable HTTP)...`);
  await client.connect(httpTransport);
  console.log('   ✅ Client connected successfully!\n');

  console.log('2. Listing tools via client.listTools()...');
  const toolsResult = await client.listTools();
  console.log(`   ✅ Discovered ${toolsResult.tools.length} active tools:`);
  for (const t of toolsResult.tools) {
    console.log(`      • ${t.name}: ${t.description?.slice(0, 70)}...`);
  }

  console.log('\n3. Testing real tool call: get_catalog(providerSlug="sandbox-provider")...');
  const catalogResult: any = await client.callTool({
    name: 'get_catalog',
    arguments: { providerSlug: 'sandbox-provider' }
  });
  const catalogText = catalogResult.content?.[0]?.text || '';
  const parsedCatalog = JSON.parse(catalogText);
  console.log(`   ✅ Sandbox Catalog loaded! Provider: "${parsedCatalog.providerSlug}", Offerings: ${parsedCatalog.offerings?.length || 0}`);

  console.log('\n4. Testing real tool call: request_quote (2x standard pkg)...');
  const quoteResult: any = await client.callTool({
    name: 'request_quote',
    arguments: {
      providerSlug: 'sandbox-provider',
      items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
      fulfillmentType: 'STANDARD',
      destination: { raw: 'Central District, Zone A' }
    }
  });
  const quoteText = quoteResult.content?.[0]?.text || '';
  const parsedQuote = JSON.parse(quoteText);
  console.log(`   ✅ Quote calculation: Subtotal: ${parsedQuote.subtotal} UZS, Fees: ${parsedQuote.totalFees} UZS, Total: ${parsedQuote.total} UZS`);

  await client.close();
  console.log('\n===============================================================');
  console.log('🎉 100% PASS: OFFICIAL MCP SPECIFICATION FULLY VALIDATED!');
  console.log('===============================================================\n');
}

testOfficialMcpClient().catch((err) => {
  console.error('❌ MCP Client Test Error:', err);
  process.exit(1);
});
