const https = require('https');

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'uz,en;q=0.9,ru;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).href;
        return resolve(fetchHtml(nextUrl));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ url, data }));
    }).on('error', reject);
  });
}

async function testNext(siteUrl, name) {
  try {
    const { url, data } = await fetchHtml(siteUrl);
    const marker = '<script id="__NEXT_DATA__" type="application/json">';
    const idx = data.indexOf(marker);
    if (idx !== -1) {
      const start = idx + marker.length;
      const end = data.indexOf('</script>', start);
      const json = JSON.parse(data.substring(start, end));
      console.log(`\n=== ${name} (${url}) ===`);
      console.log('BuildId:', json.buildId);
      console.log('pageProps keys:', Object.keys(json.props?.pageProps || {}));
      return { name, json };
    } else {
      console.log(`\n=== ${name} ===: No __NEXT_DATA__ found. Length: ${data.length}`);
    }
  } catch (e) {
    console.error(`Error testing ${name}:`, e.message);
  }
}

(async () => {
  await testNext('https://evos.uz/', 'EVOS');
  await testNext('https://maxway.uz/', 'MaxWay');
  await testNext('https://yaponamama.uz/', 'Yaponamama');
})();
