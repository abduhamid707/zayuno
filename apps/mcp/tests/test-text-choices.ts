import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { runHttpSseServer } from '../src/server.ts';
import { ZayunoApiClient } from '../src/client.ts';
import { registerZayunoTools } from '../src/tools.ts';
import { CHOICES_URI, choiceResultMeta } from '../src/choices.ts';

async function main() {
  process.env.ZAYUNO_TEXT_CHOICES_ENABLED = 'true';
  const original = ZayunoApiClient.prototype.getCatalog;
  const fixture = { offerings: [{ id: 'lavash', title: 'Lavash', basePrice: 34000, currency: 'UZS', categoryTitle: 'Lavashlar' }, { id: 'cola', title: '<img src=x onerror=alert(1)>', basePrice: 9000, currency: 'UZS', isAvailable: false, categoryTitle: 'Ichimliklar' }] };
  ZayunoApiClient.prototype.getCatalog = async () => fixture as any;
  const http = runHttpSseServer(0).listen(0, '127.0.0.1');
  await new Promise<void>(resolve => http.on('listening', resolve));
  const base = `http://127.0.0.1:${(http.address() as any).port}`;
  const rpc = async (method: string, params = {}) => (await fetch(`${base}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) })).json();
  try {
    const descriptors = (await rpc('tools/list')).result.tools;
    assert.equal(descriptors.length, 15);
    assert.equal(descriptors.filter((t: any) => t._meta?.ui?.resourceUri === CHOICES_URI).length, 4);
    assert.equal(descriptors.find((t: any) => t.name === 'create_action')._meta, undefined);
    assert.equal((await rpc('resources/list')).result.resources[0].uri, CHOICES_URI);
    const resource = (await rpc('resources/read', { uri: CHOICES_URI })).result.contents[0];
    assert.equal(resource._meta.ui.prefersBorder, false);
    assert.equal(resource.mimeType, 'text/html;profile=mcp-app');
    assert.ok(resource.text.includes('<!doctype html>'));
    const args = { providerSlug: 'evos', locationId: 'branch-1' };
    const wire = (await rpc('tools/call', { name: 'get_catalog', arguments: args })).result;
    const choices = wire._meta.zayunoChoices;
    assert.equal(choices.items[0].price, 34000);
    assert.match(choices.items[0].prompt, /branch-1/);
    assert.equal(choices.items[1].disabled, true);
    const handlers = new Map();
    registerZayunoTools({ registerTool: (name: string, config: any, handler: any) => { handlers.set(name, handler); assert.deepEqual(config._meta, descriptors.find((t: any) => t.name === name)._meta); } }, new ZayunoApiClient());
    assert.deepEqual(JSON.parse(JSON.stringify(await handlers.get('get_catalog')(args))), wire);
    assert.equal(choiceResultMeta('create_action', {}, fixture), undefined);
    assert.equal(choiceResultMeta('find_providers', {}, { providers: [] })!.zayunoChoices.items.length, 0);
    console.log('✓ HTTP/SDK parity, resource metadata, verified choices, unavailable products, checkout isolation');

    const sent: any[] = [];
    const dom = new JSDOM(readFileSync(new URL('../dist/ui/text-choices.html', import.meta.url), 'utf8'), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://widget.test', beforeParse(win) {
      win.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} } as any;
      win.postMessage = (message: any) => {
        const reply = (data: any) => setTimeout(() => win.dispatchEvent(new win.MessageEvent('message', { data: { jsonrpc: '2.0', ...data }, source: win, origin: 'https://widget.test' })), 0);
        if (message.method === 'ui/initialize') reply({ id: message.id, result: { protocolVersion: message.params.protocolVersion, hostInfo: { name: 'Test', version: '1' }, hostCapabilities: { message: { text: {} } }, hostContext: { theme: 'dark' } } });
        if (message.method === 'ui/notifications/initialized') reply({ method: 'ui/notifications/tool-result', params: wire });
        if (message.method === 'ui/message') { sent.push(message); reply({ id: message.id, result: {} }); }
      };
    } });
    try {
      const waitFor = async (predicate: () => boolean) => { for (let i = 0; i < 100 && !predicate(); i++) await new Promise(r => setTimeout(r, 20)); assert.ok(predicate(), 'UI condition timed out'); };
      await waitFor(() => dom.window.document.querySelectorAll('.choice').length === 2);
      const buttons = dom.window.document.querySelectorAll<HTMLButtonElement>('.choice');
      assert.equal(buttons[1].disabled, true);
      assert.equal(dom.window.document.querySelector('img'), null, 'labels cannot inject markup');
      assert.equal(dom.window.document.documentElement.dataset.theme, 'dark');
      buttons[0].click(); buttons[0].click();
      await waitFor(() => dom.window.document.body.textContent!.includes('Chatga yuborildi'));
      assert.equal(sent.length, 1, 'rapid repeat clicks send only once');
      assert.equal(sent[0].params.role, 'user');
      assert.equal(sent[0].params.content[0].text, choices.items[0].prompt);
      console.log('✓ Built React widget: bridge handshake, data render, theme, XSS escaping, disabled choices, click → ui/message, duplicate-click guard');
    } finally { dom.window.close(); }
  } finally { ZayunoApiClient.prototype.getCatalog = original; await new Promise<void>(resolve => http.close(() => resolve())); }
}
main().catch(error => { console.error(error); process.exit(1); });
