const https = require('https');

function get(url, headers = {}) {
  return new Promise((resolve) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function test() {
  const shipper = 'a93a4f86-b38b-404c-b1d2-7dda06aa6755';
  
  const urls = [
    `https://customer.api.delever.uz/v2/mika/main-page/category?shipper_id=${shipper}`,
    `https://customer.api.delever.uz/v2/category?shipper_id=${shipper}`,
    `https://customer.api.delever.uz/v2/product?shipper_id=${shipper}&page=1&limit=50`,
    `https://customer.api.delever.uz/v2/products?shipper_id=${shipper}&page=1&limit=50`,
  ];

  for (const u of urls) {
    const res = await get(u, {
      'Shipper': shipper,
      'shipper-id': shipper,
      'Origin': 'https://yaponamama.uz',
      'Referer': 'https://yaponamama.uz/',
      'User-Agent': 'Mozilla/5.0'
    });
    console.log(u);
    console.log('Status:', res.status, 'Body preview:', (res.data || '').substring(0, 200));
  }
}

test();
