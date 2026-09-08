const fs = require('fs');

const files = [
  'data/menus/bellissimo-menu.json',
  'data/menus/evos-menu.json',
  'data/menus/maxway-menu.json',
  'data/menus/chopar-menu.json',
  'data/menus/yaponamama-menu.json'
];

for (const f of files) {
  const data = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log(`=== ${f} ===`);
  console.log('Provider:', data.provider);
  console.log('Categories count:', data.categories.length);
  if (data.categories.length > 0) {
    const firstCat = data.categories[0];
    console.log('First category:', firstCat.title, 'items count:', firstCat.items.length);
    if (firstCat.items.length > 0) {
      console.log('Sample item:', firstCat.items[0]);
    }
  }
}
