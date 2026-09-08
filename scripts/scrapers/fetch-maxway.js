const https = require('https');
const fs = require('fs');
const path = require('path');

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
  
  // Extract all self.__next_f.push payloads
  const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let match;
  let fullPayload = '';
  while ((match = regex.exec(html)) !== null) {
    const rawChunk = match[1];
    // Unescape JSON string literal characters
    try {
      fullPayload += JSON.parse(`"${rawChunk}"`);
    } catch {
      fullPayload += rawChunk
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
    }
  }

  const marker = '"categories":[';
  const idx = fullPayload.indexOf(marker);
  if (idx === -1) throw new Error('Could not find categories in fullPayload');
  
  const arrayStart = idx + '"categories":'.length;
  let depth = 0;
  let inString = false;
  let escape = false;
  let arrayEnd = -1;

  for (let i = arrayStart; i < fullPayload.length; i++) {
    const char = fullPayload[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '[') depth++;
      else if (char === ']') {
        depth--;
        if (depth === 0) {
          arrayEnd = i + 1;
          break;
        }
      }
    }
  }

  if (arrayEnd === -1) throw new Error('Failed to balance brackets for MaxWay categories');

  const rawCategoriesStr = fullPayload.substring(arrayStart, arrayEnd);
  const categories = JSON.parse(rawCategoriesStr);

  console.log('Parsed MaxWay categories count:', categories.length);

  const formattedCategories = [];
  const cdnBase = 'https://cdn.delever.uz/delever/';

  categories.forEach((cat) => {
    const catTitleUz = cat.title?.uz || cat.title?.ru || cat.slug;
    const catTitleRu = cat.title?.ru || catTitleUz;
    const prods = (cat.favourites || []).concat(cat.products || []);
    if (!prods.length) return;

    const seenIds = new Set();
    const items = [];

    prods.forEach((p) => {
      if (!p || seenIds.has(p.id)) return;
      seenIds.add(p.id);

      const price = p.out_price || p.price || 0;
      let imageUrl = '';
      if (p.image) {
        imageUrl = p.image.startsWith('http') ? p.image : `${cdnBase}${p.image}`;
      }

      items.push({
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
        weight: p.weight || undefined,
      });
    });

    if (items.length > 0) {
      formattedCategories.push({
        id: cat.id,
        slug: cat.slug,
        title: { uz: catTitleUz, ru: catTitleRu },
        items,
      });
    }
  });

  const fullData = {
    provider: {
      slug: 'maxway',
      name: 'MaxWay Uzbekistan',
      website: 'https://maxway.uz',
      source: 'https://maxway.uz API (Next.js App Router payload via Delever CDN)',
      currency: 'UZS',
      fetchedAt: new Date().toISOString(),
      totalCategories: formattedCategories.length,
      totalItems: formattedCategories.reduce((sum, c) => sum + c.items.length, 0),
    },
    categories: formattedCategories,
  };

  const outJsonPath = path.join(__dirname, '../../data/menus/maxway-menu.json');
  const outMdPath = path.join(__dirname, '../../data/menus/maxway-menu.md');

  fs.writeFileSync(outJsonPath, JSON.stringify(fullData, null, 2), 'utf8');
  console.log(`Saved MaxWay structured JSON to: ${outJsonPath} (${fullData.provider.totalItems} items)`);

  // Markdown
  let md = `# 🍔 MaxWay O‘zbekiston — To‘liq Menyu va Narxlar

- **Manba**: [https://maxway.uz](https://maxway.uz)
- **Valyuta**: UZS (so'm)
- **Ko'chirilgan vaqti**: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}
- **Jami toifalar**: ${fullData.provider.totalCategories} ta
- **Jami mahsulotlar**: ${fullData.provider.totalItems} ta

---

## 📑 Toifalar Mundarijasi
`;

  formattedCategories.forEach((cat, idx) => {
    md += `${idx + 1}. [${cat.title.uz} (${cat.items.length} ta)](#${encodeURIComponent(cat.title.uz.toLowerCase().replace(/[^a-z0-9]+/g, '-'))})\n`;
  });

  md += `\n---\n\n`;

  formattedCategories.forEach((cat) => {
    md += `## ${cat.title.uz} (${cat.title.ru})\n\n`;
    md += `| Rasm | Nomi (UZ / RU) | Narxi | Tavsif |\n`;
    md += `| :---: | :--- | :---: | :--- |\n`;

    cat.items.forEach((item) => {
      const imgHtml = item.image ? `<img src="${item.image}" width="70" alt="${item.name.uz}"/>` : '—';
      const nameStr = `**${item.name.uz}**<br/>_${item.name.ru}_`;
      const priceStr = `**${item.price.toLocaleString()} UZS**`;
      const safeDesc = (item.description?.uz || '').replace(/\|/g, '\\|');
      md += `| ${imgHtml} | ${nameStr} | ${priceStr} | ${safeDesc} |\n`;
    });

    md += `\n---\n\n`;
  });

  fs.writeFileSync(outMdPath, md, 'utf8');
  console.log(`Saved MaxWay Markdown to: ${outMdPath}`);
}

run().catch(console.error);
