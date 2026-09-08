const https = require('https');

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
    const chunk = match[1]
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n');
    fullPayload += chunk;
  }
  return fullPayload;
}

async function inspect(url, name) {
  console.log(`\n=== Testing ${name} ===`);
  const html = await fetch(url);
  const payload = extractNextF(html);
  console.log('Payload length:', payload.length);
  
  // Search for price-like keywords: "price", "cost", "amount"
  const priceMatches = payload.match(/"(?:price|out_price|cost|amount)":\s*([0-9]+)/g) || [];
  console.log('Price matches count:', priceMatches.length, 'Sample:', priceMatches.slice(0, 5));
  
  // Search for titles or names
  const titleMatches = payload.match(/"(?:name|title)":\s*\{[^}]*"uz":\s*"([^"]+)"/g) || [];
  console.log('Uzbek title matches:', titleMatches.length, 'Sample:', titleMatches.slice(0, 5));
  
  // Look for image links
  const imgMatches = payload.match(/https?:\/\/[^"'\s<>]+\.(?:jpg|png|webp|jpeg)/gi) || [];
  console.log('Image links found:', imgMatches.length, 'Sample:', imgMatches.slice(0, 3));
}

(async () => {
  await inspect('https://choparpizza.uz/tashkent', 'Chopar Pizza');
  await inspect('https://safiabakery.uz/uz', 'Safia Bakery');
  await inspect('https://yaponamama.uz/', 'Yaponamama');
  await inspect('https://feedup.uz/uz', 'FeedUp');
})();
