import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { getCatalogWidgetHtml } from '../src/catalog-ui.ts';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function dispatchMessage(window: Window, source: object, data: unknown) {
  const event = new window.Event('message');
  Object.defineProperty(event, 'source', { value: source });
  Object.defineProperty(event, 'data', { value: data });
  window.dispatchEvent(event);
}

async function main() {
  const html = getCatalogWidgetHtml();
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  let initialized = false;
  let childWindow: Window;
  const host = {
    postMessage(message: any) {
      if (message.method === 'ui/initialize') {
        dispatchMessage(childWindow, host, {
          jsonrpc: '2.0',
          id: message.id,
          result: { protocolVersion: '2026-01-26', hostContext: { theme: 'light' } }
        });
        return;
      }
      if (message.method === 'ui/notifications/initialized') {
        initialized = true;
        dispatchMessage(childWindow, host, {
          jsonrpc: '2.0',
          method: 'ui/notifications/tool-input',
          params: { arguments: { providerSlug: 'maxway', locationId: 'tashkent' } }
        });
        dispatchMessage(childWindow, host, {
          jsonrpc: '2.0',
          method: 'ui/notifications/tool-result',
          params: { result: { structuredContent: {
            customerMessage: 'Katalog tayyor', providerSlug: 'maxway', locationId: 'tashkent',
            categories: [{ slug: 'lavash', title: 'Lavash' }],
            offerings: [{
              id: 'lavash-1', title: 'Katta mol go‘shtli lavash', basePrice: 34000, currency: 'UZS',
              categorySlug: 'lavash', isAvailable: true, optionGroups: [],
              imageUrl: 'https://api.zayuno.uz/assets/gifts/gift-07.jpg',
              media: [{ url: 'https://api.zayuno.uz/assets/gifts/gift-07.jpg', order: 0, altText: 'Katta mol go‘shtli lavash' }]
            }]
          } } }
        });
        return;
      }
      if (message.method === 'tools/call') {
        calls.push({ name: message.params.name, args: message.params.arguments });
        const name = message.params.name;
        const result = name === 'request_quote'
          ? { customerMessage: 'Quote tayyor', id: 'quote-1', quoteId: 'quote-1', providerSlug: 'maxway', lines: [{ offeringId: 'lavash-1', offeringTitle: 'Katta mol go‘shtli lavash', quantity: 1, unitPrice: 34000, lineTotal: 34000 }], subtotal: 34000, totalFees: 15000, totalDiscount: 0, total: 49000, currency: 'UZS', expiresAt: new Date(Date.now() + 600000).toISOString() }
          : name === 'create_action'
            ? { customerMessage: 'Buyurtma yaratildi', id: 'action-1', actionId: 'action-1', publicId: 'ZY-1', status: 'CONFIRMED', paymentUrl: 'https://pay.example.test/zy-1' }
            : { customerMessage: 'To‘lov qabul qilindi', id: 'action-1', actionId: 'action-1', publicId: 'ZY-1', status: 'CONFIRMED', paymentStatus: 'PAID' };
        dispatchMessage(childWindow, host, { jsonrpc: '2.0', id: message.id, result: { structuredContent: result } });
      }
    }
  };

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://widget.example.test',
    beforeParse(window) {
      childWindow = window;
      Object.defineProperty(window, 'parent', { configurable: true, value: host });
    }
  });
  await sleep(40);
  assert.equal(initialized, true, 'widget must complete ui/initialize and send initialized notification');
  assert.equal(childWindow.document.body.textContent?.includes('Katta mol go‘shtli lavash'), true);

  const select = childWindow.document.querySelector<HTMLButtonElement>('[data-item="lavash-1"]');
  assert.ok(select, 'catalog item must be rendered');
  assert.equal(childWindow.document.querySelector<HTMLImageElement>('.catalog-grid img')?.src, 'https://api.zayuno.uz/assets/gifts/gift-07.jpg', 'catalog image must be rendered from media/imageUrl');
  select.click();
  const add = childWindow.document.querySelector<HTMLButtonElement>('[data-action="add"]');
  assert.ok(add, 'detail dialog must have add button');
  add.click();

  const address = childWindow.document.querySelector<HTMLInputElement>('[data-form="address"]');
  assert.ok(address, 'cart must collect delivery address before quote');
  address.value = 'Toshkent City Park';
  address.dispatchEvent(new childWindow.Event('input', { bubbles: true }));
  childWindow.document.querySelector<HTMLButtonElement>('[data-action="quote"]')?.click();
  await sleep(30);
  assert.equal(calls.some(call => call.name === 'request_quote'), true, 'quote must be requested from provider');
  assert.match(childWindow.document.body.textContent || '', /49\s*000 so‘m/);

  const name = childWindow.document.querySelector<HTMLInputElement>('[data-form="name"]');
  assert.ok(name);
  name.value = 'Test User';
  name.dispatchEvent(new childWindow.Event('input', { bubbles: true }));
  const phone = childWindow.document.querySelector<HTMLInputElement>('[data-form="phone"]');
  assert.ok(phone);
  phone.value = '+998901234567';
  phone.dispatchEvent(new childWindow.Event('input', { bubbles: true }));
  childWindow.document.querySelector<HTMLButtonElement>('[data-action="create"]')?.click();
  await sleep(30);
  const createCall = calls.find(call => call.name === 'create_action');
  assert.ok(createCall, 'explicit confirmation must create an action');
  assert.equal(createCall.args.userConfirmed, true);
  assert.equal(typeof createCall.args.idempotencyKey, 'string');
  assert.notEqual(childWindow.document.querySelector('.status-pill')?.textContent?.trim(), 'PAID', 'CONFIRMED without paymentStatus must not render as PAID');
  assert.equal(childWindow.document.body.textContent?.includes('Buyurtma yaratildi'), true);

  childWindow.document.querySelector<HTMLButtonElement>('[data-action="status"]')?.click();
  await sleep(30);
  assert.equal(calls.some(call => call.name === 'get_action'), true, 'status refresh must call get_action');
  assert.equal(childWindow.document.body.textContent?.includes('PAID'), true, 'explicit PAID status must render as paid');

  dom.window.close();
  console.log('✓ catalog widget handshake, catalog render, quote, confirmation and payment-state regression passed');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
