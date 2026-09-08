const https = require('https');
const http = require('http');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/json'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = res.headers.location.startsWith('http') 
          ? res.headers.location 
          : new URL(res.headers.location, url).href;
        return resolve(fetch(nextUrl));
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ url, status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function inspect(url, name) {
  try {
    const res = await fetch(url);
    console.log(`\n=================== ${name} (${url}) ===================`);
    console.log('Status:', res.status, 'HTML Length:', res.data.length);
    
    // Check Next.js __NEXT_DATA__
    if (res.data.includes('__NEXT_DATA__')) {
      console.log('-> Has __NEXT_DATA__');
    }
    
    // Check Next.js App Router RSC self.__next_f
    if (res.data.includes('self.__next_f')) {
      console.log('-> Has self.__next_f (Next.js App Router)');
    }
    
    // Check Nuxt __NUXT__
    if (res.data.includes('window.__NUXT__') || res.data.includes('__NUXT_DATA__')) {
      console.log('-> Has Nuxt data (__NUXT__ / __NUXT_DATA__)');
    }

    // Look for API endpoints in scripts/HTML
    const apiRegex = /https?:\/\/[a-zA-Z0-9.-]+(?:\/api|\/v[0-9]|\/graphql|\/web-api)[^"'\s<>]*/gi;
    const matches = Array.from(new Set(res.data.match(apiRegex) || []));
    if (matches.length > 0) {
      console.log('-> Discovered API URLs:');
      matches.slice(0, 8).forEach(m => console.log('   ', m));
    }
    
    // Check if food categories or keywords appear
    const sampleKeywords = ['lavash', 'burger', 'pizza', 'pitsa', 'shaurma', 'combo', 'donar', 'sushi'];
    const foundKeywords = sampleKeywords.filter(k => new RegExp(k, 'i').test(res.data));
    console.log('-> Found keywords in HTML:', foundKeywords.join(', '));
  } catch (e) {
    console.error(`Error inspecting ${name}:`, e.message);
  }
}

(async () => {
  await inspect('https://maxway.uz/', 'MaxWay');
  await inspect('https://oqtepalavash.uz/', 'Oqtepa Lavash');
  await inspect('https://choparpizza.uz/tashkent', 'Chopar Pizza');
  await inspect('https://yaponamama.uz/', 'Yaponamama');
  await inspect('https://feedup.uz/uz', 'FeedUp');
  await inspect('https://safiabakery.uz/uz', 'Safia Bakery');
  await inspect('https://kfc.com.uz/', 'KFC Uzbekistan');
})();
