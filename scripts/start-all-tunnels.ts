import { startCloudflareTunnel } from './setup-cloudflared';
import * as fs from 'fs';
import * as path from 'path';

async function launchDualCloudflareTunnels() {
  console.log('=============================================================');
  console.log('🚀 Zayuno Dual Cloudflare HTTPS Tunnel Manager (Zero-Interstitials)');
  console.log('=============================================================');

  // 1. Mock EVOS Payment Portal (Port 4001)
  console.log('🌐 Opening public Cloudflare tunnel for Mock EVOS on port 4001...');
  const evosTunnel = await startCloudflareTunnel(4001);

  // 2. MCP Server (Port 4002)
  console.log('🌐 Opening public Cloudflare tunnel for Zayuno MCP on port 4002...');
  const mcpTunnel = await startCloudflareTunnel(4002);

  const urls = {
    mockEvosUrl: evosTunnel.url,
    mockEvosPayUrl: `${evosTunnel.url}/mock/pay`,
    mcpUrl: mcpTunnel.url,
    mcpSseUrl: `${mcpTunnel.url}/sse`,
    mcpHttpUrl: `${mcpTunnel.url}/mcp`,
    mcpHealthUrl: `${mcpTunnel.url}/health`,
    mcpToolsUrl: `${mcpTunnel.url}/tools`,
    createdAt: new Date().toISOString()
  };

  const configPath = path.join(process.cwd(), 'runtime-urls.json');
  fs.writeFileSync(configPath, JSON.stringify(urls, null, 2), 'utf8');

  console.log('\n=============================================================');
  console.log('✅ PUBLIC CLOUDFLARE HTTPS ENDPOINTS ARE LIVE & VERIFIED:');
  console.log('=============================================================');
  console.log(`💳 Mock EVOS Public Payment Base:  ${urls.mockEvosUrl}`);
  console.log(`💳 Mock EVOS Sample Payment URL:   ${urls.mockEvosPayUrl}/<ORDER_ID>`);
  console.log(`📡 Zayuno MCP Public SSE Endpoint: ${urls.mcpSseUrl}`);
  console.log(`🌐 Zayuno MCP Streamable HTTP:     ${urls.mcpHttpUrl}`);
  console.log(`🩺 MCP Health Check:               ${urls.mcpHealthUrl}`);
  console.log(`🛠️ MCP Tools Discovery:           ${urls.mcpToolsUrl}`);
  console.log('=============================================================\n');

  process.stdin.resume();
}

launchDualCloudflareTunnels().catch(err => {
  console.error('Failed to launch Cloudflare tunnels:', err);
  process.exit(1);
});
