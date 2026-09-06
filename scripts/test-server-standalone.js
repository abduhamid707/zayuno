const http = require('http');

// Start server on 4999
process.env.PORT = '4999';
require('./ecosystem-server.js');

setTimeout(async () => {
  try {
    const resHealth = await fetch('http://127.0.0.1:4999/health').then(r => r.json());
    console.log('Health:', resHealth);

    const resRail = await fetch('http://127.0.0.1:4999/p/uzrailways/catalog').then(r => r.json());
    console.log('Uzrailways offerings count:', resRail.offerings.length);
    console.log('Sample train:', resRail.offerings[0].title, '| Price:', resRail.offerings[0].basePrice);

    const resClinic = await fetch('http://127.0.0.1:4999/p/nova-clinic/catalog').then(r => r.json());
    console.log('Nova Clinic offerings count:', resClinic.offerings.length);
    console.log('Sample clinic service:', resClinic.offerings[0].title, '| Price:', resClinic.offerings[0].basePrice);

    const resUmrah = await fetch('http://127.0.0.1:4999/p/umrah-travel/catalog').then(r => r.json());
    console.log('Umrah Travel offerings count:', resUmrah.offerings.length);
    console.log('Sample package:', resUmrah.offerings[0].title, '| Price:', resUmrah.offerings[0].basePrice);

    const resQuote = await fetch('http://127.0.0.1:4999/p/uzrailways/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ offeringId: 'rail-01', quantity: 2 }]
      })
    }).then(r => r.json());
    console.log('Quote test:', resQuote.lines[0].offeringTitle, '| Total:', resQuote.total, resQuote.currency);

    console.log('\n ALL CHECKS PASSED PERFECTLY!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}, 500);
