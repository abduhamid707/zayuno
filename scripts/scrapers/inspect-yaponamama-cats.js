const fs = require('fs');
const payload = fs.readFileSync('data/menus/yaponamama-raw-payload.txt', 'utf8');

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

const cats = extractJsonArray(payload, '"categories":[');
console.log('Total items in categories array:', cats.length);
cats.forEach((c, i) => {
  console.log(`Cat ${i}: id=${c.id}, title=${JSON.stringify(c.title)}, prods=${c.products ? c.products.length : 'none'}, favs=${c.favourites ? c.favourites.length : 'none'}`);
});

// Also let's check where the other products are!
let pIdx = 0;
while ((pIdx = payload.indexOf('"products":[', pIdx)) !== -1) {
  console.log('Found "products":[ at index:', pIdx);
  const arr = extractJsonArray(payload, '"products":[');
  pIdx += 12;
}
