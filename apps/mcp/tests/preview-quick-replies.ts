// Local-only visual/interaction harness. It does not call a model, API or order endpoint.
import { createServer } from 'node:http';
import { getQuickRepliesHtml, getQuickRepliesResultMeta } from '../src/quick-replies.ts';

const products = ['Katta mol go‘shtli lavash', 'Pishloqli lavash', 'Mini lavash', 'Coca-Cola 0.5L', 'Gamburger', 'Chizburger', 'Kartoshka fri', 'Ko‘k choy'];
const catalog = { providerSlug: 'maxway', categories: [{ slug: 'lavash', title: 'Lavash' }, { slug: 'burgers', title: 'Burgerlar' }, { slug: 'drinks', title: 'Ichimliklar' }],
  offerings: products.map((title, i) => ({ id: `preview-${i}`, title, basePrice: [34000, 38000, 28000, 9000, 26000, 29000, 15000, 6000][i], currency: 'UZS' })) };
const scenarios: Record<string, [string, object]> = {
  catalog: ['get_catalog', catalog],
  providers: ['find_providers', { providers: [{ slug: 'maxway', name: 'MaxWay', status: 'ACTIVE' }, { slug: 'oqtepa', name: 'Oqtepa Lavash', status: 'ACTIVE' }] }],
  details: ['get_offering', { ...catalog.offerings[0], variants: [{ id: 'small', name: 'Kichik', basePrice: 28000 }, { id: 'large', name: 'Katta', basePrice: 34000 }], optionGroups: [{ id: 'sauce', name: 'Sous', isRequired: true, options: [{ id: 'mild', name: 'Oddiy', priceDelta: 0 }, { id: 'spicy', name: 'Achchiq', priceDelta: 0 }] }] }],
  quote: ['request_quote', { id: 'preview-quote', providerSlug: 'maxway', total: 58000, currency: 'UZS', expiresAt: new Date(Date.now() + 600000).toISOString(), lines: [{ offeringTitle: products[0], quantity: 1 }, { offeringTitle: products[3], quantity: 1 }] }]
};
const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (url.pathname === '/widget') return res.end(getQuickRepliesHtml());
  const [tool, result] = scenarios[url.searchParams.get('scenario') || 'catalog'] || scenarios.catalog;
  const meta = getQuickRepliesResultMeta(tool, { providerSlug: 'maxway' }, result);
  res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quick replies — local test host</title>
  <style>body{background:#171717;color:#eee;font:14px system-ui;margin:24px auto;padding:0 16px;max-width:680px}header{color:#aaa;font-size:12px;margin-bottom:20px}a{color:#8edbcd;margin-right:12px}iframe{border:0;width:100%;height:80px}li{margin:12px 0;line-height:1.6;overflow-wrap:anywhere}</style>
  <header>LOCAL TEST HOST · Sample data · Not ChatGPT · No orders<br><br><a href="?scenario=providers">Providers</a><a href="?scenario=catalog">Catalog</a><a href="?scenario=details">Details</a><a href="?scenario=quote">Quote</a></header>
  <iframe title="Zayuno choices" src="/widget"></iframe><ul id="messages"></ul>
  <script>
  const frame=document.querySelector('iframe');
  const meta=${JSON.stringify(meta).replace(/</g, '\\u003c')};
  window.addEventListener('message', event=>{
    if(event.source!==frame.contentWindow || event.data?.jsonrpc!=='2.0')return;
    const data=event.data;
    const post=body=>frame.contentWindow.postMessage({jsonrpc:'2.0',...body},location.origin);
    if(data.method==='ui/initialize')post({id:data.id,result:{protocolVersion:'2026-01-26',hostContext:{theme:'dark'}}});
    if(data.method==='ui/notifications/initialized')post({method:'ui/notifications/tool-result',params:{_meta:meta}});
    if(data.method==='ui/notifications/size-changed')frame.style.height=data.params.height+'px';
    if(data.method==='ui/message'){
      const row=document.createElement('li');row.textContent=data.params.content[0].text;document.getElementById('messages').append(row);
      post({id:data.id,result:{}});
    }
  });
  </script>`);
});
server.listen(Number(process.env.QUICK_REPLIES_PREVIEW_PORT || 8766), '127.0.0.1', () => console.log('Local quick-reply preview: http://127.0.0.1:8766'));
