const https = require('https');
const fs = require('fs');
const path = require('path');

const API_TOKEN = 'oX4Ad9xEX9CEOQs/HvU5btFlA7g7g7umO4RegLTaPX2lveg0vs2xfGpqE3ng33K7GN4AdsgjWTq8OvuWK8IGQxsOCTiWu2h+A/9lO3zRNMrzBMc4wSDPSyPqO17OunD6nAI11EvtlAtk5FsBmziP2oVV6DUMJuKXgM1xDAjndV7TnF46vdMo9OKyfPKOWwaxS6APgudjulUAmf5Fl1uY3oIpn/8GfYQn5HzBumn7RSaq646bD8aTbtY766YUy1psaexClQXNhezc0KFAO0zyxA0fcMgK5Ua2R3hcxjlNetaj+ZsdTqkBxTX4wu9gW2+05MKnc+r7RUj4CTVXWaC0E7C7OA3ot4ZxseVyBWI/AV8jw/sPZZoTS7rEEDDIOQUWWkkBnSGAqNmmDHVW8Fd0SQIugN6QZJjtnHwuYRS7aw==';

function fetchEvosApi(endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'token': API_TOKEN,
        'content-length': Buffer.byteLength(payload),
        'origin': 'https://evos.uz',
        'referer': 'https://evos.uz/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      }
    };

    const req = https.request('https://evsapi.ectn.uz' + endpoint, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ rawText: data, parsed });
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}\n${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function run() {
  const outDir = path.join(__dirname, '../../data/menus');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log('Fetching raw EVOS API menu (branch_id: 2, default/ru)...');
  const resDefault = await fetchEvosApi('/service/get-menu', { branch_id: 2 });
  const rawFileDefault = path.join(outDir, 'evos-api-raw.json');
  fs.writeFileSync(rawFileDefault, JSON.stringify(resDefault.parsed, null, 2), 'utf-8');
  console.log(`Saved: ${rawFileDefault} (${(fs.statSync(rawFileDefault).size / 1024).toFixed(1)} KB)`);

  console.log('Fetching raw EVOS API menu (branch_id: 2, lang: uz)...');
  const resUz = await fetchEvosApi('/service/get-menu', { branch_id: 2, lang: 'uz' });
  const rawFileUz = path.join(outDir, 'evos-api-raw-uz.json');
  fs.writeFileSync(rawFileUz, JSON.stringify(resUz.parsed, null, 2), 'utf-8');
  console.log(`Saved: ${rawFileUz} (${(fs.statSync(rawFileUz).size / 1024).toFixed(1)} KB)`);

  const menuCategories = resUz.parsed.data?.menu || [];
  const totalFoods = menuCategories.reduce((sum, c) => sum + (c.foods?.length || 0), 0);
  console.log('\n--- EVOS API Menu Summary ---');
  console.log(`Status: ${resUz.parsed.status} (${resUz.parsed.code})`);
  console.log(`Request ID: ${resUz.parsed.request_id}`);
  console.log(`Total Categories: ${menuCategories.length}`);
  console.log(`Total Foods: ${totalFoods}`);
  console.log('Categories:');
  menuCategories.forEach((c, i) => {
    console.log(`  ${i + 1}. [ID: ${c.id}] ${c.title} (${c.foods?.length || 0} taom)`);
  });
}

run().catch(console.error);
