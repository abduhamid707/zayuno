const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, '../../data/menus/evos-raw.json');
const outJsonPath = path.join(__dirname, '../../data/menus/evos-menu.json');
const outMdPath = path.join(__dirname, '../../data/menus/evos-menu.md');

const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
const menu = raw.props?.pageProps?.getMenu?.data?.menu || [];

const categories = [];

menu.forEach((cat) => {
  const catTitle = cat.title?.trim();
  const foods = cat.foods || [];
  if (!foods.length) return;

  const items = foods.map((f) => {
    const priceNum = parseFloat(f.dprice || '0') || 0;
    return {
      id: String(f.id || f.sku || f.iiko_id),
      code: f.sku || '',
      name: {
        uz: f.title?.trim(),
        ru: f.title?.trim(),
      },
      description: {
        uz: f.desc?.trim() || '',
        ru: f.desc?.trim() || '',
      },
      price: priceNum,
      image: f.img || f.dlvimg || '',
      modifiers: (f.modifier_groups || []).flatMap((g) =>
        (g.items || []).map((mod) => ({
          name: mod.name,
          price: parseFloat(mod.price || '0') || 0,
        }))
      ),
    };
  });

  categories.push({
    id: String(cat.id || cat.cat_srt),
    title: { uz: catTitle, ru: catTitle },
    items,
  });
});

const fullData = {
  provider: {
    slug: 'evos',
    name: 'EVOS Uzbekistan',
    website: 'https://evos.uz',
    source: 'https://evos.uz API (__NEXT_DATA__ getMenu)',
    currency: 'UZS',
    fetchedAt: new Date().toISOString(),
    totalCategories: categories.length,
    totalItems: categories.reduce((sum, c) => sum + c.items.length, 0),
  },
  categories,
};

fs.writeFileSync(outJsonPath, JSON.stringify(fullData, null, 2), 'utf8');
console.log(`Saved EVOS structured JSON to: ${outJsonPath} (${fullData.provider.totalItems} items)`);

// Markdown
let md = `# 🌯 EVOS O‘zbekiston — To‘liq Menyu va Narxlar

- **Manba**: [https://evos.uz](https://evos.uz)
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
  md += `## ${cat.title.uz}\n\n`;
  md += `| Rasm | Nomi | Narxi | Tavsif / Tarkibi |\n`;
  md += `| :---: | :--- | :---: | :--- |\n`;

  cat.items.forEach((item) => {
    const imgHtml = item.image ? `<img src="${item.image}" width="70" alt="${item.name.uz}"/>` : '—';
    const nameStr = `**${item.name.uz}**`;
    const priceStr = `**${item.price.toLocaleString()} UZS**`;
    let descStr = item.description?.uz || '';
    if (item.modifiers && item.modifiers.length > 0) {
      const modList = item.modifiers.slice(0, 5).map(m => m.name).join(', ');
      descStr = descStr ? `${descStr}<br/>_Tarkibi: ${modList}_` : `_Tarkibi: ${modList}_`;
    }
    const safeDesc = descStr.replace(/\|/g, '\\|');
    md += `| ${imgHtml} | ${nameStr} | ${priceStr} | ${safeDesc} |\n`;
  });

  md += `\n---\n\n`;
});

fs.writeFileSync(outMdPath, md, 'utf8');
console.log(`Saved EVOS Markdown to: ${outMdPath}`);
