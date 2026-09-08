const fs = require('fs');
const path = require('path');

function extractJsonArray(payload, marker) {
  const idx = payload.indexOf(marker);
  if (idx === -1) return null;
  const arrayStart = idx + marker.length - 1; // position of '['
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

function run() {
  const payloadPath = path.join(__dirname, '../../data/menus/chopar-raw-payload.txt');
  const payload = fs.readFileSync(payloadPath, 'utf8');

  const categoriesRaw = extractJsonArray(payload, '"categories":[');
  const itemsRaw = extractJsonArray(payload, '"items":[');

  console.log('Categories count:', categoriesRaw?.length);
  console.log('Items count:', itemsRaw?.length);

  // Build category map
  const catMap = new Map();
  (categoriesRaw || []).forEach((c) => {
    const uz = c.attribute_data?.name?.chopar?.uz || c.name || '';
    const ru = c.attribute_data?.name?.chopar?.ru || uz;
    catMap.set(c.id, { id: String(c.id), title: { uz, ru }, items: [] });
  });

  const uncategorized = { id: 'other', title: { uz: 'Boshqalar', ru: 'Другое' }, items: [] };

  (itemsRaw || []).forEach((item) => {
    const nameUz = item.name_uz || item.name || '';
    const nameRu = item.name || nameUz;
    const descUz = item.description_uz || item.description || '';
    const descRu = item.description || descUz;
    const price = item.price || item.min_price || 0;
    const image = item.image || item.thumbnail || '';

    const entry = {
      id: String(item.id),
      name: { uz: nameUz, ru: nameRu },
      description: { uz: descUz, ru: descRu },
      price: Number(price),
      image,
      variants: Array.isArray(item.variants)
        ? item.variants.map((v) => ({
            id: String(v.id),
            name: v.name,
            price: v.price,
          }))
        : [],
    };

    const targetCat = catMap.get(item.category_id) || uncategorized;
    targetCat.items.push(entry);
  });

  const categories = Array.from(catMap.values()).filter((c) => c.items.length > 0);
  if (uncategorized.items.length > 0) categories.push(uncategorized);

  const fullData = {
    provider: {
      slug: 'chopar',
      name: 'Chopar Pizza Uzbekistan',
      website: 'https://choparpizza.uz',
      source: 'https://choparpizza.uz API (Next.js payload)',
      currency: 'UZS',
      fetchedAt: new Date().toISOString(),
      totalCategories: categories.length,
      totalItems: categories.reduce((sum, c) => sum + c.items.length, 0),
    },
    categories,
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

  categories.forEach((cat, idx) => {
    md += `${idx + 1}. [${cat.title.uz} (${cat.items.length} ta)](#${encodeURIComponent(cat.title.uz.toLowerCase().replace(/[^a-z0-9]+/g, '-'))})\n`;
  });

  md += `\n---\n\n`;

  categories.forEach((cat) => {
    md += `## ${cat.title.uz} (${cat.title.ru})\n\n`;
    md += `| Rasm | Nomi (UZ / RU) | Narxi | Tavsif |\n`;
    md += `| :---: | :--- | :---: | :--- |\n`;

    cat.items.forEach((item) => {
      const imgHtml = item.image ? `<img src="${item.image}" width="70" alt="${item.name.uz}"/>` : '—';
      const nameStr = `**${item.name.uz}**<br/>_${item.name.ru}_`;
      const priceStr = `**${item.price.toLocaleString()} UZS**`;
      const safeDesc = (item.description?.uz || '').replace(/\n/g, '<br/>').replace(/\|/g, '\\|');
      md += `| ${imgHtml} | ${nameStr} | ${priceStr} | ${safeDesc} |\n`;
    });

    md += `\n---\n\n`;
  });

  fs.writeFileSync(outMdPath, md, 'utf8');
  console.log(`Saved Chopar Markdown to: ${outMdPath}`);
}

run();
