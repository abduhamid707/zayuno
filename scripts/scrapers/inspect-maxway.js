const https = require('https');

function fetchHtml(url) {
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

async function run() {
  console.log('Fetching https://maxway.uz/ ...');
  const html = await fetchHtml('https://maxway.uz/');
  
  // Extract all self.__next_f.push calls
  const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let match;
  let fullPayload = '';
  while ((match = regex.exec(html)) !== null) {
    // unescape quotes and backslashes
    const chunk = match[1]
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\n/g, '\n');
    fullPayload += chunk;
  }
  
  console.log('Full payload length:', fullPayload.length);
  
  // Search for categories or products in payload
  const categoryMatches = fullPayload.match(/"title":\{"uz":"([^"]+)"/g) || [];
  console.log('Found category titles:', categoryMatches.slice(0, 15));
  
  const priceMatches = fullPayload.match(/"price":([0-9]+)/g) || [];
  console.log('Found price fields count:', priceMatches.length);
  
  // Look for image domains
  const imgMatches = fullPayload.match(/https?:\/\/[^"'\s]+\.(?:jpg|png|webp|svg)/gi) || [];
  console.log('Sample images:', Array.from(new Set(imgMatches)).slice(0, 8));
}

run().catch(console.error);
