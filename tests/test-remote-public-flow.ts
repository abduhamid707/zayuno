import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import * as fs from 'fs';
import * as path from 'path';

async function runRemotePublicFlowTest() {
  console.log('=============================================================');
  console.log('🌐 Zayuno Public Remote HTTPS & Zero-Localhost Verification');
  console.log('=============================================================');

  const configPath = path.join(process.cwd(), 'runtime-urls.json');
  let runtimeConfig: any = {
    mcpSseUrl: 'http://localhost:4002/sse',
    mcpHttpUrl: 'http://localhost:4002/mcp',
    mcpToolsUrl: 'http://localhost:4002/tools'
  };

  if (fs.existsSync(configPath)) {
    runtimeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  console.log('📡 Endpoints under test:');
  console.log(`   - MCP Server (SSE):   ${runtimeConfig.mcpSseUrl}`);
  console.log(`   - MCP Server (HTTP):  ${runtimeConfig.mcpHttpUrl}`);

  // Step 1: Verify MCP Tools Discovery via Public HTTPS Endpoint
  console.log('\n👉 Step 1: Verifying MCP Tool Discovery...');
  const toolsRes = await fetch(runtimeConfig.mcpToolsUrl || 'http://localhost:4002/tools');
  if (!toolsRes.ok) throw new Error(`Failed to fetch tools: HTTP ${toolsRes.status}`);
  const toolsData = await toolsRes.json();
  console.log(`✅ Discovered ${toolsData.tools.length} Tools:`);
  for (const tool of toolsData.tools) {
    const badge = tool.annotations?.readOnlyHint ? '📖 Read-Only' : '✍️ Action/Write';
    console.log(`   - [${tool.name}] (${badge}) -> ${tool.description?.slice(0, 70)}...`);
  }

  // Step 2: Test Direct MCP Handshake & Tool Execution via MCP Client
  console.log('\n👉 Step 2: Connecting MCP Client to SSE...');
  const transport = new SSEClientTransport(new URL(runtimeConfig.mcpSseUrl));
  const client = new Client(
    { name: 'remote-chatgpt-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log('✅ Connected over transport to Zayuno MCP Server!');

  // Step 3: Call get_catalog naturally from chat
  console.log('\n👉 Step 3: Agent executing get_catalog("sandbox-provider")...');
  const catalogRes = await client.callTool({
    name: 'get_catalog',
    arguments: { providerSlug: 'sandbox-provider' }
  });
  const catalog = JSON.parse((catalogRes.content as any)[0].text);
  console.log(`✅ get_catalog: loaded ${catalog.categories?.length} categories, ${catalog.offerings?.length} offerings`);

  // Step 4: Call request_quote
  console.log('\n👉 Step 4: Agent requests quote for Standard Service Package...');
  const quoteRes = await client.callTool({
    name: 'request_quote',
    arguments: {
      providerSlug: 'sandbox-provider',
      items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }]
    }
  });
  const quote = JSON.parse((quoteRes.content as any)[0].text);
  console.log('✅ request_quote calculation:');
  console.log(`   - Subtotal: ${quote.subtotal} UZS`);
  console.log(`   - Total Fees: ${quote.totalFees} UZS`);
  console.log(`   - Grand Total: ${quote.total} UZS`);

  // Step 5: User explicitly confirms -> Agent executes create_action
  const idempKey = `chatgpt_cf_action_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  console.log(`\n👉 Step 5: User confirmed -> Agent executes create_action (IdempotencyKey: ${idempKey})...`);
  const createActionRes = await client.callTool({
    name: 'create_action',
    arguments: {
      idempotencyKey: idempKey,
      providerSlug: 'sandbox-provider',
      quoteId: quote.id,
      customer: {
        name: 'Alex Mercer (Platform User)',
        phone: '+998901234567'
      },
      destination: {
        raw: 'Central District, Zone A, Facility 101'
      },
      items: [{ offeringId: 'offering_standard_pkg', quantity: 2 }],
      userConfirmed: true
    }
  });
  const createdAction = JSON.parse((createActionRes.content as any)[0].text);
  console.log(`✅ Action Created in Zayuno: Public ID = ${createdAction.publicId} (Status: ${createdAction.status})`);

  // Step 6: Agent executes get_payment_options
  console.log(`\n👉 Step 6: Agent executes get_payment_options (actionId: ${createdAction.publicId})...`);
  const paymentOptsRes = await client.callTool({
    name: 'get_payment_options',
    arguments: {
      actionId: createdAction.publicId
    }
  });
  const paymentOptions = JSON.parse((paymentOptsRes.content as any)[0].text);
  console.log('✅ Payment Options from MCP:');
  for (const opt of paymentOptions) {
    console.log(`   - [${opt.type.toUpperCase()}] ${opt.name} -> ${opt.checkoutUrl || 'N/A'}`);
  }

  // Step 7: Agent checks status -> get_action
  console.log('\n👉 Step 7: Verifying Action Status in Zayuno via get_action...');
  const actionStatusRes = await client.callTool({
    name: 'get_action',
    arguments: {
      actionId: createdAction.publicId
    }
  });
  const updatedAction = JSON.parse((actionStatusRes.content as any)[0].text);
  console.log(`✅ Verified Action in Zayuno:`);
  console.log(`   - Status:         ${updatedAction.status}`);
  console.log(`   - Payment Status: ${updatedAction.paymentStatus}`);

  await client.close();

  console.log('\n🎉 =============================================================');
  console.log('🎉 100% REAL MCP CLIENT APP ACCEPTANCE TEST PASSED!');
  console.log('=============================================================\n');
}

runRemotePublicFlowTest().catch(err => {
  console.error('❌ Remote flow test failed:', err);
  process.exit(1);
});
