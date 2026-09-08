const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  const js = await fetch('https://yaponamama.uz/_next/static/chunks/4636-ebd0b24f9c8e1bca.js');
  const matches = [...js.matchAll(/"\/v[12]\/[^"]+"/g)].map(m => m[0]);
  console.log('Endpoints in 4636:', [...new Set(matches)]);

  const js2 = await fetch('https://yaponamama.uz/_next/static/chunks/app/%5Blocale%5D/layout-c94077b84923139d.js');
  const matches2 = [...js2.matchAll(/"\/v[12]\/[^"]+"/g)].map(m => m[0]);
  console.log('Endpoints in layout:', [...new Set(matches2)]);
}

run();
