const https = require('https');
const fs = require('fs');
const path = require('path');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'uz,ru,en',
        'Accept': 'text/html'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractNextF(html) {
  const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let match;
  let fullPayload = '';
  while ((match = regex.exec(html)) !== null) {
    const rawChunk = match[1];
    try {
      fullPayload += JSON.parse(`"${rawChunk}"`);
    } catch {
      fullPayload += rawChunk
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n');
    }
  }
  return fullPayload;
}

async function run() {
  console.log('Fetching https://choparpizza.uz/tashkent ...');
  const html = await fetch('https://choparpizza.uz/tashkent');
  const payload = extractNextF(html);
  
  fs.writeFileSync(path.join(__dirname, '../../data/menus/chopar-raw-payload.txt'), payload, 'utf8');
  console.log('Saved chopar-raw-payload.txt, length:', payload.length);
  
  // Find where categories or products are defined
  // Look for "categories":[ or "products":[ or "menu":[
  const markers = ['"categories":[', '"products":[', '"items":[', '"menu":['];
  markers.forEach(m => {
    const idx = payload.indexOf(m);
    console.log(`Marker ${m} at:`, idx);
    if (idx !== -1) {
      console.log('Snippet around marker:', payload.substring(idx, idx + 200));
    }
  });
}

run().catch(console.error);
