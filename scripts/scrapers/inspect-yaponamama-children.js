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
  const shipper = 'a93a4f86-b38b-404c-b1d2-7dda06aa6755';
  const c1 = await get(`https://customer.api.delever.uz/v2/category-with-products?shipper_id=${shipper}`);
  for (const cat of c1.categories || []) {
    console.log(cat.title.uz || cat.title.ru, {
      products: cat.products ? cat.products.length : 0,
      favourites: cat.favourites ? cat.favourites.length : 0,
      child_categories: cat.child_categories ? cat.child_categories.length : 0,
    });
    if (cat.child_categories) {
      for (const child of cat.child_categories) {
        console.log('   -> child:', child.title.uz || child.title.ru, 'prods:', child.products ? child.products.length : 0);
      }
    }
  }
}

run();
