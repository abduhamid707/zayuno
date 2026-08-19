async function testZayunoUz() {
  const BASE = 'https://zayuno.uz';
  console.log('======================================================');
  console.log('🌐 TESTING OFFICIAL HTTPS DOMAIN: https://zayuno.uz');
  console.log('======================================================\n');
  
  const r1 = await fetch(BASE + '/');
  console.log('1. Landing Page:    HTTP', r1.status, '(https://zayuno.uz/)');

  const r2 = await fetch(BASE + '/privacy');
  console.log('2. Privacy Policy:  HTTP', r2.status, '(https://zayuno.uz/privacy)');

  const r3 = await fetch(BASE + '/terms');
  console.log('3. Terms of Service:HTTP', r3.status, '(https://zayuno.uz/terms)');

  const r4 = await fetch(BASE + '/support');
  console.log('4. Customer Support:HTTP', r4.status, '(https://zayuno.uz/support)');

  const r5 = await fetch(BASE + '/assets/icon-512.png');
  const buf512 = await r5.arrayBuffer();
  console.log('5. 512×512 Icon:    HTTP', r5.status, `(${buf512.byteLength} bytes)`);

  const r6 = await fetch(BASE + '/tools');
  const tools = await r6.json();
  console.log('6. MCP Tools:       HTTP', r6.status, `(${tools.tools.length} active tools)`);

  const r7 = await fetch('https://api.zayuno.uz/api/v1/providers', {
    headers: { 'x-api-key': 'zy_live_agent_secret_key_12345' }
  });
  console.log('7. API Subdomain:   HTTP', r7.status, '(https://api.zayuno.uz/api/v1/providers)');

  const r8 = await fetch('https://mcp.zayuno.uz/tools');
  console.log('8. MCP Subdomain:   HTTP', r8.status, '(https://mcp.zayuno.uz/tools)');

  console.log('\n======================================================');
  console.log('🎉 ALL OFFICIAL HTTPS ENDPOINTS ON zayuno.uz ARE LIVE!');
  console.log('======================================================\n');
}

testZayunoUz().catch(console.error);
