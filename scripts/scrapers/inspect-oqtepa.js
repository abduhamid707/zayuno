const https = require('https');
const fs = require('fs');
const path = require('path');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching Oqtepa...');
  const html = await fetch('https://oqtepalavash.uz/');
  
  if (html.includes('id="__NUXT_DATA__"')) {
    console.log('Found __NUXT_DATA__!');
    const start = html.indexOf('id="__NUXT_DATA__"') + 18;
    const jsonStart = html.indexOf('>', start) + 1;
    const jsonEnd = html.indexOf('</script>', jsonStart);
    const jsonStr = html.substring(jsonStart, jsonEnd);
    const parsed = JSON.parse(jsonStr);
    console.log('__NUXT_DATA__ array length:', parsed.length);
    fs.writeFileSync(path.join(__dirname, '../../data/menus/oqtepa-raw.json'), jsonStr, 'utf8');
    console.log('Saved oqtepa-raw.json');
  } else if (html.includes('window.__NUXT__')) {
    console.log('Found window.__NUXT__!');
    const start = html.indexOf('window.__NUXT__');
    const end = html.indexOf('</script>', start);
    console.log(html.substring(start, start + 300));
  }
}

run().catch(console.error);
