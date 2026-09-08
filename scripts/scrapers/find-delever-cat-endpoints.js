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
  const html = await fetch('https://yaponamama.uz/');
  const scripts = [...html.matchAll(/src="(\/_next\/static\/[^"]+)"/g)].map(m => m[1]);

  for (const s of scripts) {
    const js = await fetch('https://yaponamama.uz' + s);
    const matches = [...js.matchAll(/"(\/v[12]\/[^"]+)"/g)].map(m => m[1]);
    const filtered = matches.filter(m => m.includes('category') || m.includes('product') || m.includes('menu'));
    if (filtered.length > 0) {
      console.log(s, 'matches:', [...new Set(filtered)]);
    }
  }
}

run();
