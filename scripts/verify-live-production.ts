const API_URL = process.env.ZAYUNO_PUBLIC_API_URL || 'https://api.zayuno.uz';
const MCP_URL = process.env.ZAYUNO_PUBLIC_MCP_URL || 'https://mcp.zayuno.uz';
const CHECKOUT_ORIGIN = process.env.MOCK_EVOS_CHECKOUT_ORIGIN || 'https://evos-sandbox.shopla.uz';
const API_KEY = process.env.ZAYUNO_API_KEY;

if (!API_KEY) {
  throw new Error('ZAYUNO_API_KEY is required');
}

async function expectOk(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return response;
}

async function run() {
  await expectOk(`${API_URL}/health`);
  await expectOk(`${MCP_URL}/health`);
  await expectOk(`${CHECKOUT_ORIGIN}/health`);

  const providers = await expectOk(`${API_URL}/api/v1/providers`, {
    headers: { 'x-api-key': API_KEY },
  }).then((response) => response.json() as Promise<Array<{ slug: string }>>);

  if (!providers.some((provider) => provider.slug === 'mock-evos')) {
    throw new Error('mock-evos is not registered');
  }

  const checkoutHost = new URL(CHECKOUT_ORIGIN).hostname.toLowerCase();
  if (checkoutHost === 'zayuno.uz' || checkoutHost.endsWith('.zayuno.uz')) {
    throw new Error('Mock EVOS checkout must remain provider-owned');
  }

  console.log('Production health, provider registration, and checkout ownership checks passed.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
