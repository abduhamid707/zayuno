const fs = require('fs');
const payload = fs.readFileSync('data/menus/yaponamama-raw-payload.txt', 'utf8');

let idx = 0;
while ((idx = payload.indexOf('"categories":[', idx)) !== -1) {
  console.log('Found "categories":[ at index:', idx);
  const sub = payload.substring(idx, idx + 150);
  console.log('Snippet:', sub);
  idx += 14;
}
