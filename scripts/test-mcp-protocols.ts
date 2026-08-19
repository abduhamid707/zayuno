async function testMcpProtocols() {
  console.log('Testing MCP Endpoints on https://zayuno.uz...\n');

  // Test 1: POST /mcp (Streamable HTTP)
  console.log('1. Testing POST https://zayuno.uz/mcp (initialize)...');
  const initPayload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'openai-tester', version: '1.0' }
    }
  };

  try {
    const res = await fetch('https://zayuno.uz/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify(initPayload)
    });
    console.log('POST /mcp status:', res.status);
    const body = await res.text();
    console.log('POST /mcp body:', body);
  } catch (e) {
    console.error('POST /mcp error:', e);
  }

  // Test 2: SSE handshake
  console.log('\n2. Testing GET https://zayuno.uz/sse...');
  try {
    const sseRes = await fetch('https://zayuno.uz/sse', {
      headers: { 'Accept': 'text/event-stream' }
    });
    console.log('GET /sse status:', sseRes.status);
    console.log('GET /sse content-type:', sseRes.headers.get('content-type'));
    const reader = sseRes.body?.getReader();
    if (reader) {
      const { value } = await reader.read();
      const text = new TextDecoder().decode(value);
      console.log('GET /sse first chunk:\n', text);
    }
  } catch (e) {
    console.error('GET /sse error:', e);
  }
}

testMcpProtocols().catch(console.error);
