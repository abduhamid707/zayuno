import assert from 'node:assert/strict';
import { runHttpSseServer } from '../src/server.ts';
import { ZayunoApiClient } from '../src/client.ts';
import { registerZayunoTools } from '../src/tools.ts';

async function main() {
  process.env.ZAYUNO_TEXT_CHOICES_ENABLED = 'false';
  // Old deployment flags must not accidentally restore the removed widgets.
  process.env.ZAYUNO_QUICK_REPLIES_ENABLED = 'true';
  process.env.ZAYUNO_CATALOG_WIDGET_ENABLED = 'true';
  const original = ZayunoApiClient.prototype.getCatalog;
  ZayunoApiClient.prototype.getCatalog = async () => ({
    customerMessage: 'Old interactive catalog message',
    offerings: [{ id: 'cola', title: 'Coca-Cola 0.5L', basePrice: 9000, currency: 'UZS', imageUrl: 'https://api.zayuno.uz/assets/gifts/gift-07.jpg' }], categories: []
  }) as any;
  const http = runHttpSseServer(0).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => http.on('listening', resolve));
  const base = `http://127.0.0.1:${(http.address() as { port: number }).port}`;
  const rpc = async (method: string, params = {}) => (await fetch(`${base}/mcp`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  })).json();
  try {
    const health = await (await fetch(`${base}/health`)).json();
    assert.equal(health.uiMode, 'chat-only');
    assert.equal(health.uiResource, null);
    assert.equal(health.quickRepliesEnabled, false);
    for (const tools of [(await rpc('tools/list')).result.tools, (await (await fetch(`${base}/tools`)).json()).tools]) {
      assert.equal(tools.length, 15, 'preserve every business tool');
      for (const tool of tools) assert.equal(tool._meta, undefined, `${tool.name} must not mount UI`);
    }
    assert.deepEqual((await rpc('resources/list')).result.resources, []);
    assert.deepEqual((await rpc('resources/templates/list')).result.resourceTemplates, []);
    for (const file of ['catalog-v3.html', 'quick-replies-v1.html']) {
      assert.equal((await rpc('resources/read', { uri: `ui://zayuno/${file}` })).error.code, -32002);
      assert.equal((await fetch(`${base}/ui/${file}`)).status, 404);
    }
    const result = (await rpc('tools/call', { name: 'get_catalog', arguments: { providerSlug: 'maxway' } })).result;
    assert.equal(result._meta, undefined);
    assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text));
    const customerMessage = result.structuredContent.customerMessage;
    assert.match(customerMessage, /1\. \*\*Coca-Cola 0.5L\*\* — 9\s*000/);
    assert.match(customerMessage, /Qaysi birini tanlaysiz/);
    assert.doesNotMatch(customerMessage, /iframe|widget|interactive|!\[/i);
    assert.ok(result.structuredContent.offerings[0].imageUrl, 'preserve underlying media data');
    const handlers = new Map();
    registerZayunoTools({ registerTool: (name: string, config: any, handler: any) => {
      assert.equal(config._meta, undefined, `${name} SDK descriptor must not mount UI`);
      handlers.set(name, handler);
    } }, new ZayunoApiClient());
    const sdkResult = await handlers.get('get_catalog')({ providerSlug: 'maxway' });
    assert.equal(sdkResult._meta, undefined);
    assert.deepEqual(JSON.parse(JSON.stringify(sdkResult)), result, 'HTTP and SDK wire results stay identical');
    console.log('✓ Chat-only: 15 tools preserved; no UI metadata/resources/routes; concise catalog; HTTP/SDK parity');
  } finally {
    ZayunoApiClient.prototype.getCatalog = original;
    await new Promise<void>(resolve => http.close(() => resolve()));
  }
}
main().catch(error => { console.error(error); process.exit(1); });
