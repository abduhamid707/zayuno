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
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ raw: data.substring(0, 100) });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const shipper = 'a93a4f86-b38b-404c-b1d2-7dda06aa6755';
  const c1 = await get(`https://customer.api.delever.uz/v2/category-with-products?shipper_id=${shipper}`);
  console.log('category-with-products:', c1.categories ? c1.categories.length : c1);

  const c2 = await get(`https://customer.api.delever.uz/v2/category?shipper_id=${shipper}`);
  console.log('category sample:', c2.categories ? c2.categories[0] : null);

  const catId = c2.categories[1].id;
  const pByCat = await get(`https://customer.api.delever.uz/v2/product?shipper_id=${shipper}&category_id=${catId}&page=1&limit=50`);
  console.log(`products for category ${c2.categories[1].title.uz}:`, pByCat.products ? pByCat.products.length : pByCat);
}

run();
