const https = require('https');
const fs = require('fs');
const path = require('path');

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
  const cRes = await get(`https://customer.api.delever.uz/v2/category-with-products?shipper_id=${shipper}`);
  const cdnBase = 'https://cdn.delever.uz/delever/';

  const formattedCategories = [];
  const seenIds = new Set();
  let totalItemsCount = 0;

  function processCategory(cat, prefix = '') {
    const titleUz = (prefix ? `${prefix} > ` : '') + (cat.title?.uz || cat.title?.ru || cat.slug);
    const titleRu = (prefix ? `${prefix} > ` : '') + (cat.title?.ru || titleUz);
    const catItems = [];

    const prods = (cat.products || []).concat(cat.favourites || []);
    for (const p of prods) {
      if (!p || seenIds.has(p.id)) continue;
      seenIds.add(p.id);

      const price = p.out_price || p.price || 0;
      let imageUrl = '';
      if (p.image) {
        imageUrl = p.image.startsWith('http') ? p.image : `${cdnBase}${p.image}`;
      }

      catItems.push({
        id: p.id,
        code: p.code || '',
        name: {
          uz: p.title?.uz || p.title?.ru || '',
          ru: p.title?.ru || p.title?.uz || '',
          en: p.title?.en || '',
        },
        description: {
          uz: p.description?.uz || p.description?.ru || '',
          ru: p.description?.ru || '',
          en: p.description?.en || '',
        },
        price: Number(price),
        image: imageUrl,
        weight: p.weight ? `${p.weight} g` : undefined,
      });
    }

    if (catItems.length > 0) {
      formattedCategories.push({
        id: cat.id,
        slug: cat.slug,
        title: { uz: titleUz, ru: titleRu },
        items: catItems,
      });
      totalItemsCount += catItems.length;
    }

    if (cat.child_categories && cat.child_categories.length > 0) {
      for (const child of cat.child_categories) {
        processCategory(child, cat.title?.uz || cat.title?.ru);
      }
    }
  }

  for (const cat of cRes.categories || []) {
    processCategory(cat);
  }

  const fullData = {
    provider: {
      slug: 'yaponamama',
      name: 'Yaponamama Pan-Asian & Sushi Uzbekistan',
      website: 'https://yaponamama.uz',
      source: 'https://customer.api.delever.uz/v2 (Yaponamama API)',
      currency: 'UZS',
      fetchedAt: new Date().toISOString(),
      totalCategories: formattedCategories.length,
      totalItems: totalItemsCount,
    },
    categories: formattedCategories,
  };

  const outJsonPath = path.join(__dirname, '../../data/menus/yaponamama-menu.json');
  const outMdPath = path.join(__dirname, '../../data/menus/yaponamama-menu.md');

  fs.writeFileSync(outJsonPath, JSON.stringify(fullData, null, 2), 'utf8');

  let md = `# 🍣 Yaponamama Sushi & Pan-Asian O‘zbekiston — To‘liq Menyu va Narxlar\n\n`;
  md += `- **Manba**: [https://yaponamama.uz](https://yaponamama.uz)\n`;
  md += `- **Valyuta**: UZS (so'm)\n`;
  md += `- **Jami toifalar**: ${formattedCategories.length} ta\n`;
  md += `- **Jami mahsulotlar**: ${totalItemsCount} ta\n\n---\n\n`;

  for (const cat of formattedCategories) {
    md += `## 🥢 ${cat.title.uz}\n\n`;
    for (const item of cat.items) {
      md += `### ${item.name.uz} (${item.name.ru})\n`;
      md += `- **Narxi**: ${item.price.toLocaleString('uz-UZ')} UZS\n`;
      if (item.weight) md += `- **Vazni**: ${item.weight}\n`;
      if (item.description.uz) md += `- **Tarkibi / Tavsifi**: ${item.description.uz}\n`;
      if (item.image) md += `- **Rasm**: [Ko'rish](${item.image})\n`;
      md += `\n`;
    }
    md += `---\n\n`;
  }

  fs.writeFileSync(outMdPath, md, 'utf8');
  console.log(`Saved ${totalItemsCount} items across ${formattedCategories.length} categories.`);
}

run();
