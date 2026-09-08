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
  let idx = 0;
  while ((idx = js.indexOf('customer.api.delever.uz', idx)) !== -1) {
    console.log(js.substring(Math.max(0, idx - 50), Math.min(js.length, idx + 150)));
    idx += 25;
  }
}

run();
