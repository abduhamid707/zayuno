import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { buildQuickReplies, getQuickRepliesHtml, getQuickRepliesResultMeta, getQuickRepliesToolMeta, QUICK_REPLIES_URI, readQuickRepliesResource } from '../src/quick-replies.ts';
import { runHttpSseServer } from '../src/server.ts';
import { ZayunoApiClient } from '../src/client.ts';
import { registerZayunoTools } from '../src/tools.ts';

const wait = () => new Promise(resolve => setTimeout(resolve, 20));
const catalog = { providerSlug: 'maxway', categories: [{ slug: 'drinks', title: 'Ichimliklar' }],
  offerings: Array.from({ length: 22 }, (_, i) => ({ id: `mw-${i}`, title: i ? `Lavash ${i}` : 'Coca-Cola 0.5L', basePrice: i ? 34000 : 9000, currency: 'UZS', isAvailable: i !== 1 })) };
const quote = { id: 'quote-exact', providerSlug: 'maxway', total: 58000, currency: 'UZS', expiresAt: new Date(Date.now() + 60000).toISOString(),
  lines: [{ offeringId: 'mw-0', offeringTitle: 'Coca-Cola 0.5L', quantity: 1 }, { offeringId: 'mw-2', offeringTitle: 'Lavash', quantity: 1 }] };
const metadata = (name: string, result: any, args = { providerSlug: 'maxway' }) => getQuickRepliesResultMeta(name, args, result);

function message(window: any, host: object, data: any) {
  window.dispatchEvent(new window.MessageEvent('message', { source: host, data }));
}

async function main() {
  const providers = buildQuickReplies('find_providers', {}, { providers: [{ slug: 'maxway', name: 'MaxWay', status: 'ACTIVE' }, { slug: 'offline', name: 'Offline', status: 'SUSPENDED' }] });
  assert.match(providers.groups[0].choices[0].prompt, /maxway/);
  assert.equal(providers.groups[0].choices[1].disabled, true);
  const payload = buildQuickReplies('get_catalog', { providerSlug: 'maxway' }, catalog);
  assert.equal(payload.groups[1].choices.length, 22, 'do not silently drop choices beyond the first page');
  assert.match(payload.groups[1].choices[0].label, /9\s*000/);
  assert.match(payload.groups[1].choices[0].prompt, /offeringId: mw-0/);
  assert.match(payload.groups[1].choices[0].prompt, /hali yaratma/);
  assert.equal(payload.groups[1].choices[1].disabled, true);
  const details = buildQuickReplies('get_offering', { providerSlug: 'maxway' }, {
    id: 'mw-0', name: 'Cola', currency: 'UZS', variants: [{ id: 'big', name: 'Katta', basePrice: 12000 }],
    optionGroups: [{ id: 'ice', name: 'Muz', isRequired: true, options: [{ id: 'yes', name: 'Muz bilan', priceDelta: 0 }] }]
  });
  assert.equal(details.groups[0].choices.length, 3);
  assert.match(details.groups[1].choices[0].prompt, /variantId: big/);
  assert.match(details.groups[2].choices[0].prompt, /groupId: ice, optionId: yes/);
  assert.equal(buildQuickReplies('get_locations', { providerSlug: 'maxway' }, { locations: [{ id: 'branch', name: 'City Park' }] }).groups[0].choices[0].prompt.includes('locationId: branch'), true);
  assert.equal(buildQuickReplies('request_quote', {}, { ...quote, expiresAt: '2000-01-01' }).groups[0].choices.some(c => c.id === 'confirm'), false);
  assert.equal(buildQuickReplies('request_quote', {}, { ...quote, expiresAt: undefined }).groups[0].choices.some(c => c.id === 'confirm'), false);
  assert.equal(buildQuickReplies('request_quote', {}, { ...quote, lines: [] }).groups[0].choices.some(c => c.id === 'confirm'), false);
  const confirmation = buildQuickReplies('request_quote', {}, quote).groups[0].choices[0];
  assert.match(confirmation.label, /58\s*000/);
  assert.match(confirmation.prompt, /quoteId: quote-exact/);
  assert.equal(buildQuickReplies('get_action', { actionId: 'order-1' }, { status: 'CONFIRMED' }).groups[0].choices.some(c => c.id === 'payment'), true, 'CONFIRMED is not PAID');
  assert.equal(buildQuickReplies('get_action', { actionId: 'order-1' }, { status: 'CONFIRMED', paymentStatus: 'PAID' }).groups[0].choices.some(c => c.id === 'payment'), false);

  let child: any;
  let queued: any;
  const requests: any[] = [];
  const host = { postMessage(data: any) {
    requests.push(data);
    if (data.method === 'ui/initialize') message(child, host, { jsonrpc: '2.0', id: data.id, result: { protocolVersion: '2026-01-26', hostContext: { theme: 'dark' } } });
    if (data.method === 'ui/notifications/initialized') message(child, host, { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { structuredContent: catalog, _meta: metadata('get_catalog', catalog) } });
    if (data.method === 'ui/message') queued = data;
  } };
  const dom = new JSDOM(getQuickRepliesHtml(), { runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(window) {
    child = window;
    Object.defineProperty(window, 'parent', { value: host });
  } });
  await wait();
  assert.equal(child.document.documentElement.dataset.theme, 'dark');
  assert.equal(child.document.querySelectorAll('img,iframe,form').length, 0, 'no storefront, images, nested frames or checkout form');
  assert.equal(child.document.querySelectorAll('[data-choice]').length, 8, 'first view: category + six products + cart review');
  assert.equal(child.document.querySelectorAll('.more').length, 1);
  child.document.querySelector('.more').click();
  assert.equal(child.document.querySelectorAll('[data-choice]').length, 14);
  const cola = Array.from(child.document.querySelectorAll('button')).find((b: any) => b.textContent.includes('Coca-Cola')) as any;
  cola.click(); cola.click();
  await wait();
  assert.equal(requests.filter(r => r.method === 'ui/message').length, 1, 'double click must send exactly one message');
  assert.match(queued.params.content[0].text, /Coca-Cola/);
  assert.equal(queued.params.role, 'user');
  assert.equal(requests.some(r => r.method === 'tools/call'), false, 'UI never creates orders, quotes or calls payment tools');
  message(child, host, { jsonrpc: '2.0', id: queued.id, result: {} });
  await wait();
  assert.match(child.document.getElementById('feedback').textContent, /Yuborildi/);
  assert.equal(cola.disabled, true);
  message(child, host, { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { structuredContent: catalog, _meta: metadata('get_catalog', catalog) } });
  assert.equal(cola.isConnected, true, 'repeated host notifications must not reset the whole DOM or send lock');

  // A foreign frame cannot replace choices or spoof a successful send.
  message(child, {}, { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { _meta: metadata('request_quote', quote) } });
  assert.equal(cola.isConnected, true);
  const another = child.document.querySelector('[data-choice="1:2"]');
  another.click(); await wait();
  message(child, host, { jsonrpc: '2.0', id: queued.id, result: { isError: true } });
  await wait();
  assert.match(child.document.getElementById('feedback').textContent, /yuborilmadi/);
  assert.equal(child.document.getElementById('fallback').hidden, false);
  assert.equal(another.disabled, false, 'a rejected send can be retried');

  message(child, host, { jsonrpc: '2.0', method: 'ui/notifications/tool-result', params: { result: { _meta: metadata('request_quote', { ...quote, expiresAt: new Date(Date.now() + 100).toISOString() }) } } });
  assert.match(child.document.querySelector('h1').textContent, /58\s*000/);
  assert.match(child.document.querySelector('.summary').textContent, /Coca-Cola/);
  await new Promise(resolve => setTimeout(resolve, 150));
  const confirm = Array.from(child.document.querySelectorAll('button')).find((b: any) => b.textContent.includes('Tasdiqlayman')) as any;
  assert.equal(confirm.disabled, true, 'confirmation disables at expiry without requiring another render');
  dom.window.close();

  // Compatibility hosts should send immediately, without waiting 8s for MCP init.
  const compatibilityMessages: string[] = [];
  const legacy = new JSDOM(getQuickRepliesHtml(), { runScripts: 'dangerously', beforeParse(window: any) {
    window.openai = { toolResponseMetadata: metadata('get_catalog', catalog), theme: 'light',
      sendFollowUpMessage: async ({ prompt }: any) => { compatibilityMessages.push(prompt); } };
  } });
  const legacyCola = Array.from(legacy.window.document.querySelectorAll('button')).find(b => b.textContent.includes('Coca-Cola'))!;
  legacyCola.click(); await wait();
  assert.equal(compatibilityMessages.length, 1);
  assert.match(legacy.window.document.getElementById('feedback')!.textContent!, /Yuborildi/);
  legacy.window.close();

  // A host without initial globals can provide them later. Unknown delivery
  // times out visibly, and is not automatically retried or falsely marked sent.
  let lateWindow: any;
  const late = new JSDOM(getQuickRepliesHtml(), { runScripts: 'dangerously', beforeParse(window: any) {
    lateWindow = window;
    const timer = window.setTimeout.bind(window);
    window.setTimeout = (fn: any, ms: number) => timer(fn, ms === 15000 ? 5 : ms);
    window.openai = { sendFollowUpMessage: () => new Promise(() => {}) };
  } });
  lateWindow.dispatchEvent(new lateWindow.CustomEvent('openai:set_globals', { detail: { globals: { toolResponseMetadata: metadata('get_catalog', catalog) } } }));
  const lateCola = Array.from(lateWindow.document.querySelectorAll('button')).find((b: any) => b.textContent.includes('Coca-Cola')) as any;
  lateCola.click(); await wait();
  assert.match(lateWindow.document.getElementById('feedback').textContent, /tasdiqlay olmadik/);
  assert.equal(lateCola.disabled, true, 'do not automatically retry uncertain delivery');
  lateWindow.dispatchEvent(new lateWindow.CustomEvent('openai:set_globals', { detail: { globals: { toolResponseMetadata: metadata('get_offering', { id: 'mw-0', name: 'Cola' }) } } }));
  assert.equal(lateWindow.document.getElementById('fallback').hidden, true, 'new choices must clear a stale fallback message');
  late.window.close();

  // Provider strings are text, never executable HTML.
  const unsafe = buildQuickReplies('find_providers', {}, { providers: [{ slug: 'x', name: '<img src=x onerror=alert(1)>' }] });
  const escaped = new JSDOM(getQuickRepliesHtml(), { runScripts: 'dangerously', beforeParse(window: any) {
    window.openai = { toolResponseMetadata: { 'zayuno/quickReplies': unsafe } };
  } });
  assert.equal(escaped.window.document.querySelector('img'), null);
  assert.match(escaped.window.document.querySelector('button')!.textContent!, /<img/);
  escaped.window.close();

  // Test the real transport boundary, not just a browser with handcrafted data.
  const original = ZayunoApiClient.prototype.getCatalog;
  ZayunoApiClient.prototype.getCatalog = async () => catalog as any;
  const app = runHttpSseServer(0);
  const http = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => http.on('listening', resolve));
  const address = http.address() as { port: number };
  const call = async (method: string, params = {}) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    return (await response.json()).result;
  };
  try {
    const tools = await call('tools/list');
    for (const name of ['find_providers', 'get_catalog', 'get_offering', 'request_quote']) assert.equal(tools.tools.find((t: any) => t.name === name)._meta.ui.resourceUri, QUICK_REPLIES_URI);
    const resources = await call('resources/list');
    assert.ok(resources.resources.some((r: any) => r.uri === QUICK_REPLIES_URI));
    const resource = await call('resources/read', { uri: QUICK_REPLIES_URI });
    assert.equal(resource.contents[0].mimeType, 'text/html;profile=mcp-app');
    assert.equal(resource.contents[0]._meta.ui.prefersBorder, false);
    const result = await call('tools/call', { name: 'get_catalog', arguments: { providerSlug: 'maxway' } });
    assert.equal(result._meta.ui.resourceUri, QUICK_REPLIES_URI);
    assert.equal(result._meta['zayuno/quickReplies'].groups[1].choices.length, 22);
    assert.deepEqual(result.structuredContent, JSON.parse(result.content[0].text), 'non-UI clients keep their structured/text contract');
    const handlers = new Map();
    registerZayunoTools({ registerTool: (name: string, _config: any, handler: any) => handlers.set(name, handler) }, new ZayunoApiClient());
    const sdkResult = await handlers.get('get_catalog')({ providerSlug: 'maxway' });
    assert.deepEqual(sdkResult._meta, result._meta, 'SDK (stdio/SSE) and HTTP must emit identical metadata');
  } finally {
    ZayunoApiClient.prototype.getCatalog = original;
    await new Promise<void>(resolve => http.close(() => resolve()));
  }
  assert.equal(getQuickRepliesToolMeta('cancel_action'), undefined);
  assert.equal(readQuickRepliesResource().contents[0]._meta.ui.csp.resourceDomains.length, 0);
  assert.ok(Buffer.byteLength(getQuickRepliesHtml()) < 22000, 'quick replies stay lightweight and dependency-free');
  console.log('✓ quick replies: selections, prices, variants, quote expiry, double-click guard, host messaging, error recovery, XSS, pagination, HTTP and SDK parity');
}

main().catch(error => { console.error(error); process.exit(1); });
