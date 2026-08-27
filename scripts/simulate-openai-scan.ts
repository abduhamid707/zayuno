async function simulateOpenAiScan() {
  console.log('--- Simulating OpenAI Tools Scan ---');
  
  // 1. Verify Challenge Token
  const chRes = await fetch('https://zayuno.uz/.well-known/openai-apps-challenge');
  const chText = await chRes.text();
  console.log('1. Challenge Token check:', chRes.status, 'Token match:', chText === 'EVEW8GwWNVKe1uuYBHLPl36l8t-Fh7Xt_Vth2uS7304');

  // 2. Streamable HTTP tools/list check
  console.log('\n2. Testing POST https://zayuno.uz/mcp (tools/list)...');
  const toolsPayload = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  const mcpRes = await fetch('https://zayuno.uz/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify(toolsPayload)
  });
  console.log('   POST /mcp status:', mcpRes.status);
  const mcpBody = await mcpRes.text();
  console.log('   POST /mcp response length:', mcpBody.length, 'bytes');

  // 3. SSE session test
  console.log('\n3. Testing SSE session handshake and tools/list...');
  const sseRes = await fetch('https://zayuno.uz/sse', { headers: { 'Accept': 'text/event-stream' } });
  console.log('   GET /sse status:', sseRes.status);
}

simulateOpenAiScan().catch(console.error);
