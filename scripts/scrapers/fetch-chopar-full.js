const https = require('https');
const fs = require('fs');
const path = require('path');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Fetching Chopar categories from API...');
  const catRes = await getJson('https://api.choparpizza.uz/api/categories');
  const categoriesRaw = catRes.data || [];

  // Map main categories
  const mainCategories = [
    { id: 'sets', title: { uz: 'Setlar 🍱', ru: 'Сеты 🍱' }, match: /сет|set/i, items: [] },
    { id: 'pizza', title: { uz: 'Pitsa 🍕', ru: 'Пицца 🍕' }, match: /пицца|pitsa|байрам|пепперони|маргарита|чикен|барбекю|сыр|мясн|гавай|панчо/i, items: [] },
    { id: 'pide_lavash', title: { uz: 'Pide va Lavash 🌯', ru: 'Пиде и Лаваш 🌯' }, match: /пиде|лаваш|pide|lavash|донар|donar/i, items: [] },
    { id: 'snacks', title: { uz: 'Sneklar 🍟', ru: 'Снеки 🍟' }, match: /снек|snek|фри|картофель|крылышки|наггетсы|стрипсы|байтсы/i, items: [] },
    { id: 'salads', title: { uz: 'Salatlar 🥗', ru: 'Салаты 🥗' }, match: /салат|salat|греческий|цезарь/i, items: [] },
    { id: 'drinks', title: { uz: 'Ichimliklar 🥤', ru: 'Напитки 🥤' }, match: /кола|cola|fanta|sprite|сок|вода|напиток|choy|chay|kofe|fuse/i, items: [] },
    { id: 'desserts', title: { uz: 'Desertlar 🍰', ru: 'Десерты 🍰' }, match: /десерт|desert|чизкейк|пончик|шоколад|маффин|пирог/i, items: [] },
    { id: 'sauces', title: { uz: 'Souslar 🥫', ru: 'Соусы 🥫' }, match: /соус|sous|кетчуп|майонез|сырный|барбекю|чесночный/i, items: [] },
    { id: 'other', title: { uz: 'Boshqalar', ru: 'Другие' }, match: /.*/, items: [] }
  ];

  console.log('Fetching all Chopar products...');
  let page = 1;
  const allProducts = [];
  while (true) {
    const pageData = await getJson(`https://api.choparpizza.uz/api/products?page=${page}`);
    const prods = pageData.data || [];
    if (!prods.length) break;
    allProducts.push(...prods);
    if (page >= (pageData.meta?.last_page || 1)) break;
    page++;
  }
  console.log(`Fetched ${allProducts.length} total products from Chopar API.`);

  // Load payload to extract image URLs if available
  const payloadPath = path.join(__dirname, '../../data/menus/chopar-raw-payload.txt');
  let imageMap = {};
  if (fs.existsSync(payloadPath)) {
    const payload = fs.readFileSync(payloadPath, 'utf8');
    const imgMatches = payload.match(/"name":"([^"]+)","description":"[^"]*","image":"([^"]+)"/g) || [];
    imgMatches.forEach(m => {
      const match = m.match(/"name":"([^"]+)".*"image":"([^"]+)"/);
      if (match) {
        imageMap[match[1].toLowerCase().trim()] = match[2];
      }
    });
    console.log(`Extracted ${Object.keys(imageMap).length} image links from Chopar web payload.`);
  }

  const seenKeys = new Set();
  allProducts.forEach(p => {
    if (!p.active) return;
    const nameUz = p.attribute_data?.name?.chopar?.uz || p.attribute_data?.name?.ru || p.name || '';
    const nameRu = p.attribute_data?.name?.chopar?.ru || p.attribute_data?.name?.ru || p.name || nameUz;
    if (!nameUz && !nameRu) return;

    const price = parseFloat(p.price || '0') || 0;
    if (price <= 0) return;

    const key = `${nameUz}_${price}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);

    // Find image
    const cleanName = (p.attribute_data?.name?.ru || nameRu).toLowerCase().trim();
    let img = p.image || '';
    if (!img) {
      for (const [k, v] of Object.entries(imageMap)) {
        if (cleanName.includes(k) || k.includes(cleanName)) {
          img = v;
          break;
        }
      }
    }

    const item = {
      id: String(p.id),
      code: p.xml_id?.chopar?.val || '',
      name: { uz: nameUz, ru: nameRu },
      description: {
        uz: p.attribute_data?.description?.chopar?.uz || '',
        ru: p.attribute_data?.description?.chopar?.ru || '',
      },
      price,
      image: img,
      weight: p.weight ? `${p.weight} ${p.weight_unit || 'g'}` : undefined,
    };

    // Classify into main categories
    const searchText = `${nameUz} ${nameRu}`;
    let placed = false;
    for (const cat of mainCategories.slice(0, -1)) {
      if (cat.match.test(searchText)) {
        cat.items.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      mainCategories[mainCategories.length - 1].items.push(item);
    }
  });

  const finalCategories = mainCategories.filter(c => c.items.length > 0);

  const fullData = {
    provider: {
      slug: 'chopar',
      name: 'Chopar Pizza Uzbekistan',
      website: 'https://choparpizza.uz',
      source: 'https://api.choparpizza.uz/api/products (Official REST API)',
      currency: 'UZS',
      fetchedAt: new Date().toISOString(),
      totalCategories: finalCategories.length,
      totalItems: finalCategories.reduce((sum, c) => sum + c.items.length, 0),
    },
    categories: finalCategories,
  };

  const outJsonPath = path.join(__dirname, '../../data/menus/chopar-menu.json');
  const outMdPath = path.join(__dirname, '../../data/menus/chopar-menu.md');

  fs.writeFileSync(outJsonPath, JSON.stringify(fullData, null, 2), 'utf8');
  console.log(`Saved Chopar structured JSON to: ${outJsonPath} (${fullData.provider.totalItems} items)`);

  let md = `# 🍕 Chopar Pizza O‘zbekiston — To‘liq Menyu va Narxlar

- **Manba**: [https://choparpizza.uz](https://choparpizza.uz)
- **Valyuta**: UZS (so'm)
- **Ko'chirilgan vaqti**: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}
- **Jami toifalar**: ${fullData.provider.totalCategories} ta
- **Jami mahsulotlar**: ${fullData.provider.totalItems} ta

---

## 📑 Toifalar Mundarijasi
`;

  finalCategories.forEach((cat, idx) => {
    md += `${idx + 1}. [${cat.title.uz} (${cat.items.length} ta)](#${encodeURIComponent(cat.title.uz.toLowerCase().replace(/[^a-z0-9]+/g, '-'))})\n`;
  });

  md += `\n---\n\n`;

  finalCategories.forEach((cat) => {
    md += `## ${cat.title.uz} (${cat.title.ru})\n\n`;
    md += `| Rasm | Nomi (UZ / RU) | Narxi | Vazni |\n`;
    md += `| :---: | :--- | :---: | :--- |\n`;

    cat.items.forEach((item) => {
      const imgHtml = item.image ? `<img src="${item.image}" width="70" alt="${item.name.uz}"/>` : '—';
      const nameStr = `**${item.name.uz}**<br/>_${item.name.ru}_`;
      const priceStr = `**${item.price.toLocaleString()} UZS**`;
      const weightStr = item.weight ? `${item.weight}` : '—';
      md += `| ${imgHtml} | ${nameStr} | ${priceStr} | ${weightStr} |\n`;
    });

    md += `\n---\n\n`;
  });

  fs.writeFileSync(outMdPath, md, 'utf8');
  console.log(`Saved Chopar Markdown to: ${outMdPath}`);
}

run().catch(console.error);
