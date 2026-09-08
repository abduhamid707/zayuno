const fs = require('fs');
const path = require('path');

const rawDataPath = path.join(__dirname, '../../data/menus/bellissimo-raw.json');
const outJsonPath = path.join(__dirname, '../../data/menus/bellissimo-menu.json');
const outMdPath = path.join(__dirname, '../../data/menus/bellissimo-menu.md');

const raw = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));
const props = raw.props?.pageProps || {};

const categories = [];

// Helper to clean and format text
const getUzTitle = (obj) => obj?.translations?.title?.uz || obj?.name || '';
const getRuTitle = (obj) => obj?.translations?.title?.ru || obj?.name || '';
const getUzDesc = (obj) => obj?.translations?.desc?.uz || '';
const getRuDesc = (obj) => obj?.translations?.desc?.ru || '';

// 1. Process Product Groups
(props.products || []).forEach((cat) => {
  const catNameUz = getUzTitle(cat);
  const catNameRu = getRuTitle(cat);
  const catId = cat.id;

  const categoryObj = {
    id: catId,
    title: { uz: catNameUz, ru: catNameRu, en: cat?.translations?.title?.en || '' },
    items: [],
  };

  // Check if category has groups (like Pizzas with sizes)
  if (Array.isArray(cat.groups) && cat.groups.length > 0) {
    cat.groups.forEach((pizza) => {
      const pizzaUz = getUzTitle(pizza);
      const pizzaRu = getRuTitle(pizza);
      const pizzaDescUz = getUzDesc(pizza);
      const pizzaDescRu = getRuDesc(pizza);

      const variants = (pizza.products || []).map((v) => ({
        id: v.id,
        code: v.code,
        nameUz: getUzTitle(v),
        nameRu: getRuTitle(v),
        price: v.price,
        image: v.image,
      }));

      categoryObj.items.push({
        id: pizza.id,
        name: { uz: pizzaUz, ru: pizzaRu, en: pizza.translations?.title?.en || '' },
        description: { uz: pizzaDescUz, ru: pizzaDescRu, en: pizza.translations?.desc?.en || '' },
        basePrice: pizza.price || (variants[0] ? variants[0].price : 0),
        image: pizza.image,
        variants,
      });
    });
  }

  // Check direct products
  if (Array.isArray(cat.products) && cat.products.length > 0) {
    cat.products.forEach((prod) => {
      const prodUz = getUzTitle(prod);
      const prodRu = getRuTitle(prod);
      const prodDescUz = getUzDesc(prod);
      const prodDescRu = getRuDesc(prod);

      categoryObj.items.push({
        id: prod.id,
        code: prod.code,
        name: { uz: prodUz, ru: prodRu, en: prod.translations?.title?.en || '' },
        description: { uz: prodDescUz, ru: prodDescRu, en: prod.translations?.desc?.en || '' },
        price: prod.price,
        image: prod.image,
      });
    });
  }

  if (categoryObj.items.length > 0) {
    categories.push(categoryObj);
  }
});

// 2. Process Combos
if (Array.isArray(props.combos) && props.combos.length > 0) {
  const comboCategory = {
    id: 'combos',
    title: { uz: 'Kombo to‘plamlar 🎁', ru: 'Комбо наборы 🎁', en: 'Combo Sets 🎁' },
    items: props.combos.map((combo) => ({
      id: combo.sourceActionId || combo.id,
      name: {
        uz: combo.translations?.title?.uz || combo.name,
        ru: combo.translations?.title?.ru || combo.name,
        en: combo.translations?.title?.en || combo.name,
      },
      description: {
        uz: combo.translations?.desc?.uz || '',
        ru: combo.translations?.desc?.ru || '',
        en: combo.translations?.desc?.en || '',
      },
      price: combo.priceModification,
      originalPrice: combo.originalPrice,
      discountPercent: combo.discountPercent,
      image: combo.image,
    })),
  };
  // Add combos to front
  categories.unshift(comboCategory);
}

// 3. Process Sauces (if not already included)
if (Array.isArray(props.sauces) && props.sauces.length > 0) {
  const existingSaucesCat = categories.find((c) => c.title.uz.toLowerCase().includes('sous'));
  if (!existingSaucesCat) {
    categories.push({
      id: 'sauces',
      title: { uz: 'Souslar', ru: 'Соусы', en: 'Sauces' },
      items: props.sauces.map((sauce) => ({
        id: sauce.id,
        code: sauce.code,
        name: {
          uz: sauce.translations?.title?.uz || sauce.name,
          ru: sauce.translations?.title?.ru || sauce.name,
          en: sauce.translations?.title?.en || sauce.name,
        },
        description: { uz: '', ru: '', en: '' },
        price: sauce.price,
        image: sauce.image,
      })),
    });
  }
}

// Write Structured JSON
const fullData = {
  provider: {
    slug: 'bellissimo',
    name: 'Bellissimo Pizza Uzbekistan',
    website: 'https://bellissimo.uz',
    source: 'https://bellissimo.uz API (Next.js SSG/SSR payload)',
    currency: 'UZS',
    fetchedAt: new Date().toISOString(),
    totalCategories: categories.length,
    totalItems: categories.reduce((sum, c) => sum + c.items.length, 0),
  },
  categories,
};

fs.writeFileSync(outJsonPath, JSON.stringify(fullData, null, 2), 'utf8');
console.log(`Saved structured JSON to: ${outJsonPath}`);

// Generate Markdown
let md = `# 🍕 Bellissimo Pizza O‘zbekiston — To‘liq Menyu va Narxlar

- **Manba**: [https://bellissimo.uz](https://bellissimo.uz)
- **Valyuta**: UZS (so'm)
- **Ko'chirilgan vaqti**: ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}
- **Jami toifalar**: ${fullData.provider.totalCategories} ta
- **Jami mahsulotlar**: ${fullData.provider.totalItems} ta asosiy taom/to'plam

---

## 📑 Toifalar Mundarijasi
`;

categories.forEach((cat, idx) => {
  md += `${idx + 1}. [${cat.title.uz} (${cat.items.length} ta)](#${encodeURIComponent(cat.title.uz.toLowerCase().replace(/[^a-z0-9]+/g, '-'))})\n`;
});

md += `\n---\n\n`;

categories.forEach((cat) => {
  md += `## ${cat.title.uz} (${cat.title.ru})\n\n`;
  md += `| Rasm | Nomi (UZ / RU) | Narxi | Tavsif / O‘lchamlar |\n`;
  md += `| :---: | :--- | :---: | :--- |\n`;

  cat.items.forEach((item) => {
    const imgHtml = item.image ? `<img src="${item.image}" width="70" alt="${item.name.uz}"/>` : '—';
    const nameStr = `**${item.name.uz}**<br/>_${item.name.ru}_`;
    const priceStr = item.originalPrice
      ? `~~${item.originalPrice.toLocaleString()}~~<br/>**${item.price.toLocaleString()} UZS** (-${item.discountPercent}%)`
      : `**${(item.price || item.basePrice || 0).toLocaleString()} UZS**`;

    let details = item.description?.uz ? `${item.description.uz}` : '';
    if (Array.isArray(item.variants) && item.variants.length > 0) {
      const variantList = item.variants
        .map((v) => `• ${v.nameUz || v.nameRu}: ${v.price ? v.price.toLocaleString() + ' UZS' : '—'}`)
        .join('<br/>');
      details = details ? `${details}<br/><br/>**O‘lchamlar:**<br/>${variantList}` : `**O‘lchamlar:**<br/>${variantList}`;
    }

    // Escape pipes for table formatting
    const safeDetails = details.replace(/\|/g, '\\|');
    md += `| ${imgHtml} | ${nameStr} | ${priceStr} | ${safeDetails} |\n`;
  });

  md += `\n---\n\n`;
});

fs.writeFileSync(outMdPath, md, 'utf8');
console.log(`Saved readable Markdown to: ${outMdPath}`);
