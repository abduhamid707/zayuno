const fs = require('fs');
const payload = fs.readFileSync('data/menus/yaponamama-raw-payload.txt', 'utf8');

const regex = /https?:\/\/[^\s"',;]+/g;
const urls = new Set();
let match;
while ((match = regex.exec(payload)) !== null) {
  urls.add(match[0]);
}

console.log('Found URLs:');
for (const u of urls) {
  if (!u.includes('w3.org') && !u.includes('schema.org')) {
    console.log(' -', u);
  }
}
