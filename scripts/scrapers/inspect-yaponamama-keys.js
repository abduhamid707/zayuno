const fs = require('fs');
const payload = fs.readFileSync('data/menus/yaponamama-raw-payload.txt', 'utf8');

// Let's find occurrences of '"categories":[{' or similar
const m = payload.match(/"categories"\s*:\s*\[\s*\{/);
if (m) {
  console.log('Found "categories":[{ at index', m.index);
} else {
  console.log('"categories":[{ not found');
}

// Let's search for "category" or "products" or similar
const prodsM = payload.match(/"products"\s*:\s*\[/g);
console.log('Occurrences of "products": [', prodsM ? prodsM.length : 0);

// Let's find all keys before arrays
const regex = /"([a-zA-Z0-9_]+)"\s*:\s*\[/g;
const counts = {};
let match;
while ((match = regex.exec(payload)) !== null) {
  counts[match[1]] = (counts[match[1]] || 0) + 1;
}
console.log('Top array keys:', counts);
