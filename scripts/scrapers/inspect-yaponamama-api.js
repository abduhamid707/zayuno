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
  // find script tags
  const scripts = [...html.matchAll(/src="(\/_next\/static\/[^"]+)"/g)].map(m => m[1]);
  console.log('Found scripts:', scripts.length);

  for (const s of scripts) {
    const fullUrl = 'https://yaponamama.uz' + s;
    const js = await fetch(fullUrl);
    // search for api endpoints
    const matches = js.match(/https?:\/\/[a-zA-Z0-9.-]+\/v[0-9]\/[a-zA-Z0-9_\-\/]+/g) || [];
    if (matches.length > 0) {
      console.log(s, 'matches:', matches);
    }
    const apiMatches = js.match(/https?:\/\/[a-zA-Z0-9.-]*delever[a-zA-Z0-9.-]*/g) || [];
    if (apiMatches.length > 0) {
      console.log(s, 'delever domains:', [...new Set(apiMatches)]);
    }
  }
}

run();
