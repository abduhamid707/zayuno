const fs = require('fs');
const payload = fs.readFileSync('data/menus/yaponamama-raw-payload.txt', 'utf8');

function extractJsonArrayFrom(payload, startIdx) {
  const arrayStart = payload.indexOf('[', startIdx);
  if (arrayStart === -1) return null;
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

let pIdx = 0;
let count = 0;
while ((pIdx = payload.indexOf('"products":[', pIdx)) !== -1) {
  const arr = extractJsonArrayFrom(payload, pIdx + 11);
  console.log(`Products array #${count} at ${pIdx}: length = ${arr ? arr.length : 'null'}`);
  if (arr && arr.length > 0) {
    console.log(`  Sample 0: ${JSON.stringify(arr[0].title)}, price=${arr[0].out_price || arr[0].price}`);
  }
  count++;
  pIdx += 12;
}
