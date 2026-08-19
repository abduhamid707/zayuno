import localtunnel from 'localtunnel';

async function startTunnel() {
  const port = 4002;
  console.log(`🌐 Opening public HTTPS tunnel for Zayuno MCP server on port ${port}...`);

  try {
    const tunnel = await localtunnel({
      port,
      subdomain: `zayuno-mcp-${Math.floor(1000 + Math.random() * 9000)}`
    });

    console.log('\n=============================================================');
    console.log('🚀 PUBLIC REMOTE HTTPS MCP ENDPOINTS FOR CHATGPT CUSTOM APPS:');
    console.log('=============================================================');
    console.log(`🔗 MCP Base URL:           ${tunnel.url}`);
    console.log(`📡 SSE Handshake URL:      ${tunnel.url}/sse`);
    console.log(`🌐 Streamable HTTP URL:    ${tunnel.url}/mcp`);
    console.log(`🩺 Health Verification:    ${tunnel.url}/health`);
    console.log(`🛠️ Tool Inspection:        ${tunnel.url}/tools`);
    console.log('=============================================================\n');

    tunnel.on('close', () => {
      console.log('Tunnel connection closed.');
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err);
    });

    // Keep process alive
    process.stdin.resume();
  } catch (err: any) {
    console.error('Failed to create tunnel:', err.message);
    process.exit(1);
  }
}

startTunnel();
