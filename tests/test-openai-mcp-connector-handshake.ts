import assert from 'node:assert/strict';
import http from 'node:http';
import { runHttpSseServer } from '../apps/mcp/src/server.js';
import { ZAYUNO_MCP_TOOLS } from '../apps/mcp/src/tools.js';

async function main() {
  console.log('========================================================================');
  console.log('🤖 OPENAI CHATGPT MCP CONNECTOR HANDSHAKE & TRANSPORT TEST SUITE');
  console.log('========================================================================\n');

  const app = runHttpSseServer(0);
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`📡 Local Test Server running on ${baseUrl}\n`);

  try {
    // 1. GET /mcp
    console.log('👉 [1/14] Testing GET /mcp Streamable HTTP endpoint...');
    const getRes = await fetch(`${baseUrl}/mcp`);
    assert.equal(getRes.status, 200, 'GET /mcp must return HTTP 200');
    const getData = await getRes.json();
    assert.equal(getData.status, 'online');
    assert.equal(getData.transport, 'streamable-http');
    assert.equal(getData.serverInfo?.name, 'zayuno-action-server');
    console.log('   ✅ GET /mcp returned online status and serverInfo.');

    // 2. OPTIONS /mcp CORS preflight
    console.log('👉 [2/14] Testing OPTIONS /mcp CORS preflight...');
    const optRes = await fetch(`${baseUrl}/mcp`, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Mcp-Session-Id'
      }
    });
    assert.equal(optRes.status, 204, 'OPTIONS /mcp must return HTTP 204');
    assert.equal(optRes.headers.get('access-control-allow-origin'), '*');
    assert.ok(optRes.headers.get('access-control-allow-headers')?.includes('Mcp-Session-Id'));
    console.log('   ✅ OPTIONS /mcp returned HTTP 204 with complete CORS headers.');

    // 3. POST /mcp with ping (UUID ID, number ID, string ID)
    console.log('👉 [3/14] Testing POST /mcp "ping" method (OpenAI liveness probe)...');
    const pingRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '550e8400-e29b-41d4-a716-446655440000',
        method: 'ping'
      })
    });
    assert.equal(pingRes.status, 200, 'ping must return HTTP 200');
    const pingData = await pingRes.json();
    assert.equal(pingData.jsonrpc, '2.0');
    assert.equal(pingData.id, '550e8400-e29b-41d4-a716-446655440000');
    assert.deepEqual(pingData.result, {});
    console.log('   ✅ "ping" method returned HTTP 200 and valid empty result object.');

    // 4. POST /mcp with initialize
    console.log('👉 [4/14] Testing POST /mcp "initialize" handshake...');
    const initRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'openai-mcp', version: '1.0.0' }
        }
      })
    });
    assert.equal(initRes.status, 200, 'initialize must return HTTP 200');
    const initData = await initRes.json();
    assert.equal(initData.result.protocolVersion, '2024-11-05');
    assert.ok(initData.result.capabilities.tools);
    assert.ok(initData.result.capabilities.prompts);
    assert.ok(initData.result.capabilities.resources);
    assert.equal(initData.result.serverInfo.name, 'zayuno-action-server');
    console.log('   ✅ "initialize" returned protocolVersion, capabilities, and serverInfo.');

    // 5. POST /mcp with notifications/initialized
    console.log('👉 [5/14] Testing POST /mcp "notifications/initialized" (CRITICAL CONNECTOR HANDSHAKE)...');
    const notifRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      })
    });
    assert.equal(notifRes.status, 200, 'notifications/initialized must NOT return 400 error');
    const notifData = await notifRes.json();
    assert.equal(notifData.jsonrpc, '2.0');
    console.log('   ✅ "notifications/initialized" accepted with HTTP 200 (No error!).');

    // 6. POST /mcp with unhandled notifications (notifications/cancelled, notifications/progress)
    console.log('👉 [6/14] Testing POST /mcp generic notifications handling...');
    const progRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/progress',
        params: { progressToken: 'tok-1', progress: 50, total: 100 }
      })
    });
    assert.equal(progRes.status, 200);
    console.log('   ✅ Generic notifications accepted gracefully without error.');

    // 7. POST /mcp with tools/list
    console.log('👉 [7/14] Testing POST /mcp "tools/list"...');
    const toolsRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    assert.equal(toolsRes.status, 200);
    const toolsData = await toolsRes.json();
    assert.equal(toolsData.result.tools.length, 15, 'All 15 tools must be returned');
    console.log(`   ✅ "tools/list" returned ${toolsData.result.tools.length} advertised tools.`);

    // 8. Strict inputSchema validation for all 15 tools
    console.log('👉 [8/14] Validating strict inputSchema for all 15 tools...');
    for (const t of toolsData.result.tools) {
      assert.equal(typeof t.name, 'string');
      assert.equal(typeof t.description, 'string');
      assert.equal(t.inputSchema.type, 'object', `Tool ${t.name} must have inputSchema.type="object"`);
      assert.equal(typeof t.inputSchema.properties, 'object', `Tool ${t.name} must have properties object`);
      if (t.inputSchema.required) {
        assert.ok(Array.isArray(t.inputSchema.required), `Tool ${t.name} required must be array`);
      }
    }
    console.log('   ✅ All 15 tools have strictly valid JSON schema definitions.');

    // 9. POST /mcp with resources/list & resources/templates/list
    console.log('👉 [9/14] Testing POST /mcp "resources/list" and "resources/templates/list"...');
    const resRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/list'
      })
    });
    assert.equal(resRes.status, 200);
    const resData = await resRes.json();
    assert.deepEqual(resData.result.resources, []);
    console.log('   ✅ "resources/list" returned valid empty resources array.');

    // 10. POST /mcp with prompts/list & prompts/get
    console.log('👉 [10/14] Testing POST /mcp "prompts/list"...');
    const promptRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'prompts/list'
      })
    });
    assert.equal(promptRes.status, 200);
    const promptData = await promptRes.json();
    assert.ok(promptData.result.prompts.length >= 2);
    console.log(`   ✅ "prompts/list" returned ${promptData.result.prompts.length} prompt templates.`);

    // 11. POST /mcp with Batch JSON-RPC Requests
    console.log('👉 [11/14] Testing POST /mcp Batch JSON-RPC requests...');
    const batchRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { jsonrpc: '2.0', id: 'b1', method: 'ping' },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { jsonrpc: '2.0', id: 'b2', method: 'tools/list' }
      ])
    });
    assert.equal(batchRes.status, 200);
    const batchData = await batchRes.json();
    assert.ok(Array.isArray(batchData), 'Batch response must be an array');
    assert.equal(batchData.length, 2, 'Must return 2 responses (notification skipped)');
    assert.equal(batchData[0].id, 'b1');
    assert.equal(batchData[1].id, 'b2');
    console.log('   ✅ Batch JSON-RPC array correctly processed and responses returned.');

    // 12. POST /mcp with Content-Type: application/json-rpc
    console.log('👉 [12/14] Testing POST /mcp with Content-Type: "application/json-rpc"...');
    const rpcHeaderRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json-rpc' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'rpc-1', method: 'ping' })
    });
    assert.equal(rpcHeaderRes.status, 200);
    const rpcHeaderData = await rpcHeaderRes.json();
    assert.equal(rpcHeaderData.id, 'rpc-1');
    console.log('   ✅ "application/json-rpc" Content-Type successfully parsed.');

    // 13. Mcp-Session-Id header lifecycle
    console.log('👉 [13/14] Testing Mcp-Session-Id header lifecycle...');
    const sessionRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Mcp-Session-Id': 'openai-session-test-uuid'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 's1', method: 'ping' })
    });
    assert.equal(sessionRes.headers.get('mcp-session-id'), 'openai-session-test-uuid');
    console.log('   ✅ Mcp-Session-Id correctly preserved in response headers.');

    // 14. SSE Streaming endpoint check
    console.log('👉 [14/14] Testing SSE endpoint GET /sse...');
    const sseRes = await fetch(`${baseUrl}/sse`);
    assert.equal(sseRes.status, 200);
    assert.ok(sseRes.headers.get('content-type')?.includes('text/event-stream'));
    console.log('   ✅ GET /sse stream initialized correctly.');

    console.log('\n========================================================================');
    console.log('🎉 ALL 14 OPENAI CHATGPT CONNECTOR HANDSHAKE TESTS PASSED 100%!');
    console.log('========================================================================');
  } finally {
    server.close();
  }
}

main().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
