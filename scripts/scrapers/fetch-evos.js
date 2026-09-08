const https = require('https');
const fs = require('fs');
const path = require('path');

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
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching https://evos.uz/ ...');
  const html = await fetchHtml('https://evos.uz/');
  const marker = '<script id="__NEXT_DATA__" type="application/json">';
  const idx = html.indexOf(marker);
  if (idx === -1) throw new Error('No __NEXT_DATA__ in evos.uz');
  
  const start = idx + marker.length;
  const end = html.indexOf('</script>', start);
  const json = JSON.parse(html.substring(start, end));
  
  const outDir = path.join(__dirname, '../../data/menus');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  
  fs.writeFileSync(path.join(outDir, 'evos-raw.json'), JSON.stringify(json, null, 2), 'utf-8');
  console.log('Saved evos-raw.json');
  
  const props = json.props?.pageProps || {};
  console.log('Keys in pageProps:', Object.keys(props));
  
  const menuData = props.getMenu || props.menu;
  console.log('Menu data type:', Array.isArray(menuData) ? 'Array (' + menuData.length + ')' : typeof menuData);
  if (Array.isArray(menuData)) {
    console.log('Categories:', menuData.map(c => ({ id: c.id, name: c.name || c.title, items: c.products?.length || c.items?.length })));
  } else if (menuData && typeof menuData === 'object') {
    console.log('Menu object keys:', Object.keys(menuData));
    console.log('Sample key data:', JSON.stringify(menuData[Object.keys(menuData)[0]], null, 2).slice(0, 300));
  }
}

run().catch(console.error);
