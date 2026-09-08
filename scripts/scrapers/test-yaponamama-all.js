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
  const res = await get('https://customer.api.delever.uz/v2/product?shipper_id=a93a4f86-b38b-404c-b1d2-7dda06aa6755&page=1&limit=200');
  console.log('Returned products length:', res.products ? res.products.length : 0);
  if (res.products && res.products.length > 0) {
    const p = res.products[0];
    console.log('Sample product:', {
      id: p.id,
      title: p.title,
      description: p.description,
      price: p.out_price,
      categories: p.categories,
      image: p.image
    });
  }
}

run();
