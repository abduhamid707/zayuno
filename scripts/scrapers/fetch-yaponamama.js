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

function extractNextF(html) {
  const regex = /self\.__next_f\.push\(\[1,"([\s\S]*?)"\]\)/g;
  let match;
  let fullPayload = '';
  while ((match = regex.exec(html)) !== null) {
    const rawChunk = match[1];
    try {
      fullPayload += JSON.parse(`"${rawChunk}"`);
    } catch {
      fullPayload += rawChunk
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n');
    }
  }
  return fullPayload;
}

function extractJsonArray(payload, marker) {
  const idx = payload.indexOf(marker);
  if (idx === -1) return null;
  const arrayStart = idx + marker.length - 1; // '['
  let depth = 0, inString = false, escape = false, arrayEnd = -1;
  for (let i = arrayStart; i < payload.length; i++) {
    const c = payload[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (!inString) {
      if (c === '[') depth++;
      else if (c === ']') {
        depth--;
        if (depth === 0) { arrayEnd = i + 1; break; }
      }
    }
  }
  if (arrayEnd === -1) return null;
  return JSON.parse(payload.substring(arrayStart, arrayEnd));
}

async function run() {
  console.log('Fetching https://yaponamama.uz/ ...');
  const html = await fetchHtml('https://yaponamama.uz/');
  const payload = extractNextF(html);

  const categoriesRaw = extractJsonArray(payload, '"categories":[');
  if (!categoriesRaw) throw new Error('Could not extract categories from Yaponamama');

  console.log(`Parsed Yaponamama categories: ${categoriesRaw.length}`);
  const cdnBase = 'https://cdn.delever.uz/delever/';

  const formattedCategories = [];
  categoriesRaw.forEach((cat) => {
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
        weight: p.weight ? `${p.weight} g` : undefined,
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
      slug: 'yaponamama',
      name: 'Yaponamama Pan-Asian & Sushi Uzbekistan',
      website: 'https://yaponamama.uz',
      source: 'https://yaponamama.uz API (Next.js Delever platform)',
      currency: 'UZS',
      fetchedAt: new Date().toISOString(),
      totalCategories: formattedCategories.length,
      totalItems: formattedCategories.reduce((sum, c) => sum + c.items.length, 0),
    },
    categories: formattedCategories,
  };

  const outJsonPath = path.join(__dirname, '../../data/menus/yaponamama-menu.json');
  const outMdPath = path.join(__dirname, '../../data/menus/yaponamama-menu.md');

  fs.writeFileSync(outJsonPath, JSON.stringify(fullData, null, 2), 'utf8');
  console.log(`Saved Yaponamama structured JSON to: ${outJsonPath} (${fullData.provider.totalItems} items)`);

  let md = `# 🍣 Yaponamama Sushi & Pan-Asian O‘zbekiston — To‘liq Menyu va Narxlar

- **Manba**: [https://yaponamama.uz](https://yaponamama.uz)
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
    md += `| Rasm | Nomi (UZ / RU) | Narxi | Tavsif / Vazni |\n`;
    md += `| :---: | :--- | :---: | :--- |\n`;

    cat.items.forEach((item) => {
      const imgHtml = item.image ? `<img src="${item.image}" width="70" alt="${item.name.uz}"/>` : '—';
      const nameStr = `**${item.name.uz}**<br/>_${item.name.ru}_`;
      const priceStr = `**${item.price.toLocaleString()} UZS**`;
      let desc = (item.description?.uz || '').replace(/\n/g, '<br/>');
      if (item.weight) desc = desc ? `${desc}<br/>_Vazni: ${item.weight}_` : `_Vazni: ${item.weight}_`;
      const safeDesc = desc.replace(/\|/g, '\\|');
      md += `| ${imgHtml} | ${nameStr} | ${priceStr} | ${safeDesc} |\n`;
    });

    md += `\n---\n\n`;
  });

  fs.writeFileSync(outMdPath, md, 'utf8');
  console.log(`Saved Yaponamama Markdown to: ${outMdPath}`);
}

run().catch(console.error);
