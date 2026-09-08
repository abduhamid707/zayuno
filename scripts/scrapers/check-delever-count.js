const https = require('https');

function get(url) {
  const shipper = 'a93a4f86-b38b-404c-b1d2-7dda06aa6755';
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'Shipper': shipper,
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function run() {
  const catsRes = await get('https://customer.api.delever.uz/v2/category?shipper_id=a93a4f86-b38b-404c-b1d2-7dda06aa6755');
  console.log('Categories count:', catsRes.categories ? catsRes.categories.length : 0);
  if (catsRes.categories) {
    catsRes.categories.forEach(c => console.log(' - Cat:', c.title.uz || c.title.ru, 'id:', c.id));
  }

  const prodsRes = await get('https://customer.api.delever.uz/v2/product?shipper_id=a93a4f86-b38b-404c-b1d2-7dda06aa6755&page=1&limit=10');
  console.log('Products response keys:', Object.keys(prodsRes));
  console.log('Count:', prodsRes.count);
  console.log('Products returned:', prodsRes.products ? prodsRes.products.length : 0);
}

run();
