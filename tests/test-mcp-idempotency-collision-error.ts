import assert from 'node:assert/strict';
import http, { Server } from 'node:http';
import { runHttpSseServer } from '../apps/mcp/src/server.ts';

async function main() {
  const apiServer = http.createServer((request, response) => {
    if (request.method === 'POST' && request.url === '/api/v1/actions') {
      response.writeHead(409, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({
        errorCode: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
        retryable: false,
        message: 'This idempotency key was already used for a different action request.'
      }));
      return;
    }
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: 'Not found' }));
  });
  await new Promise<void>((resolve) => apiServer.listen(0, '127.0.0.1', resolve));
  const apiPort = (apiServer.address() as any).port;
  process.env.API_BASE_URL = `http://127.0.0.1:${apiPort}`;
  process.env.ZAYUNO_API_KEY = 'test-mcp-key';

  const mcpApp = runHttpSseServer(0);
  const mcpServer: Server = await new Promise((resolve) => {
    const server = mcpApp.listen(0, '127.0.0.1', () => resolve(server));
  });
  const mcpPort = (mcpServer.address() as any).port;

  try {
    const response = await fetch(`http://127.0.0.1:${mcpPort}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'idempotency-collision',
        method: 'tools/call',
        params: {
          name: 'create_action',
          arguments: {
            providerSlug: 'provider-demo',
            quoteId: 'quote-demo',
            idempotencyKey: 'reused-key',
            items: [{ offeringId: 'offering-demo', quantity: 2 }],
            userConfirmed: true
          }
        }
      })
    });
    assert.equal(response.status, 200);
    const body: any = await response.json();
    assert.equal(body.result?.isError, true);
    const error = JSON.parse(body.result.content[0].text);
    assert.equal(error.errorCode, 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD');
    assert.equal(error.retryable, false);
    assert.match(error.customerMessage, /boshqa buyurtma/i);
    assert.match(error.agentMessage, /fresh quote and use a new idempotency key/i);
    assert.deepEqual(body.result.structuredContent, error);
  } finally {
    await new Promise<void>((resolve) => mcpServer.close(() => resolve()));
    await new Promise<void>((resolve) => apiServer.close(() => resolve()));
  }

  console.log('MCP preserves deterministic idempotency collision guidance for agents.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
