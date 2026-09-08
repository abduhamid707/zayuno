const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchUrl(targetUrl) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'uz,en;q=0.9,ru;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrl(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching https://bellissimo.uz/ ...');
  const html = await fetchUrl('https://bellissimo.uz/');
  
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const startIndex = html.indexOf(marker);
  if (startIndex === -1) {
    throw new Error('Could not find __NEXT_DATA__ tag in HTML');
  }
  
  const jsonStart = startIndex + marker.length;
  const jsonEnd = html.indexOf('</script>', jsonStart);
  const rawJson = html.substring(jsonStart, jsonEnd);
  
  const parsed = JSON.parse(rawJson);
  console.log('Build ID:', parsed.buildId);
  console.log('Locale:', parsed.locale);
  
  const pageProps = parsed.props?.pageProps;
  console.log('pageProps keys:', Object.keys(pageProps || {}));
  
  const outDir = path.join(__dirname, '../../data/menus');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  // Save full raw Next.js data
  fs.writeFileSync(path.join(outDir, 'bellissimo-raw.json'), JSON.stringify(parsed, null, 2), 'utf-8');
  console.log(`Saved raw data to ${path.join(outDir, 'bellissimo-raw.json')}`);

  return pageProps;
}

run().catch(console.error);
