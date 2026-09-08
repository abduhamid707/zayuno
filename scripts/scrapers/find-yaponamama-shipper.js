const fs = require('fs');
const payload = fs.readFileSync('data/menus/yaponamama-raw-payload.txt', 'utf8');

const m = payload.match(/"shipper_id":"([^"]+)"/);
console.log('Shipper id match:', m ? m[1] : 'none');

const m2 = payload.match(/"shipper_ids":\[([^\]]+)\]/);
console.log('Shipper ids match:', m2 ? m2[1] : 'none');

// Look for any api endpoints in client JS bundle
// Let's fetch one of the JS files from yaponamama.uz HTML
