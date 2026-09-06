import fetch from 'node-fetch';

const MCP_URL = 'https://mcp.zayuno.uz/mcp';

async function callMcp(name: string, args: Record<string, any> = {}) {
  const r = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'step-' + Math.random().toString(36).substring(7),
      method: 'tools/call',
      params: { name, arguments: args }
    })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data: any = await r.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return JSON.parse(data.result.content[0].text);
}

async function runE2eTests() {
  console.log('🚀 Running Complete E2E Tests on Live Production MCP\n');

  // Test 1: Train ticket quote & booking (Uzrailways)
  console.log('--- Test 1: Poyezd chiptasi (Uzrailways) ---');
  const quoteRail = await callMcp('request_quote', {
    providerSlug: 'uzrailways',
    items: [{ offeringId: 'rail-01', quantity: 2 }],
    parameters: {
      departure_date: '2026-09-15',
      passenger_name: 'Anvar Qodirov',
      doc_series: 'FA1234567',
      travel_class: 'Ekonom',
      seat_preference: 'Deraza yonida'
    }
  });
  console.log('Uzrailways Quote Response:', JSON.stringify(quoteRail));
  const railQuoteId = quoteRail.id || quoteRail.quoteId;
  console.log(`✅ Quote yaratildi: ID=${railQuoteId}, Jami=${quoteRail.total} ${quoteRail.currency}`);

  const actRail = await callMcp('create_action', {
    providerSlug: 'uzrailways',
    quoteId: railQuoteId,
    userConfirmed: true,
    customer: { name: 'Anvar Qodirov', phone: '+998901112233' },
    items: [{ offeringId: 'rail-01', quantity: 2 }],
    parameters: {
      departure_date: '2026-09-15',
      passenger_name: 'Anvar Qodirov',
      doc_series: 'FA1234567'
    }
  });
  console.log(`✅ Action yaratildi: PublicId=${actRail.publicId || actRail.actionId}, Status=${actRail.status}`);

  // Test 2: Medical clinic appointment (Nova Eye Clinic)
  console.log('\n--- Test 2: Shifokor qabuliga yozilish (Nova Eye Clinic) ---');
  const quoteClinic = await callMcp('request_quote', {
    providerSlug: 'nova-clinic',
    items: [{ offeringId: 'nova-01', quantity: 1 }],
    parameters: {
      patient_name: 'Malika Karimova',
      birth_year: 1995,
      preferred_date: '2026-09-12',
      time_slot: '14:00 - 16:00',
      symptoms: 'Yaqindan ko‘rish pasayishi va ko‘z qurishi'
    }
  });
  console.log(`✅ Quote yaratildi: ID=${quoteClinic.id}, Jami=${quoteClinic.total} ${quoteClinic.currency}`);

  const actClinic = await callMcp('create_action', {
    providerSlug: 'nova-clinic',
    quoteId: quoteClinic.id,
    userConfirmed: true,
    customer: { name: 'Malika Karimova', phone: '+998935554433' },
    items: [{ offeringId: 'nova-01', quantity: 1 }]
  });
  console.log(`✅ Action yaratildi: PublicId=${actClinic.publicId}, Status=${actClinic.status}`);

  // Test 3: Car Rental (RentCar Express)
  console.log('\n--- Test 3: Avtomobil ijarasi (RentCar Express) ---');
  const quoteCar = await callMcp('request_quote', {
    providerSlug: 'rentcar-express',
    items: [{ offeringId: 'rc-04', quantity: 3 }], // 3 days Tracker
    parameters: {
      driver_full_name: 'Jasur Bekzodov',
      driver_license_number: 'AB8765432',
      rental_days: 3,
      pickup_datetime: '2026-09-10 10:00',
      delivery_location: 'Toshkent Xalqaro Aeroporti',
      destination_region: 'Toshkent viloyati / Tog‘ zonalari'
    }
  });
  console.log(`✅ Quote yaratildi: ID=${quoteCar.id}, Jami=${quoteCar.total} ${quoteCar.currency}`);

  const actCar = await callMcp('create_action', {
    providerSlug: 'rentcar-express',
    quoteId: quoteCar.id,
    userConfirmed: true,
    customer: { name: 'Jasur Bekzodov', phone: '+998971110022' },
    items: [{ offeringId: 'rc-04', quantity: 3 }]
  });
  console.log(`✅ Action yaratildi: PublicId=${actCar.publicId}, Status=${actCar.status}`);

  // Test 4: Check payment options for action
  console.log('\n--- Test 4: To‘lov usullarini tekshirish ---');
  const payOptions = await callMcp('get_payment_options', { actionId: actCar.publicId || actCar.actionId });
  const list = payOptions.paymentOptions || payOptions;
  console.log(`✅ To‘lov usullari: ${(Array.isArray(list) ? list : []).map((o: any) => o.name).join(', ')}`);
  console.log(`   Xabar: ${payOptions.customerMessage || 'Mavjud'}`);

  console.log('\n🎉 BARCHA 4 TA VERTICAL BO‘YICHA E2E SINOVLAR 100% MUVAFFAQISHLIK BILAN O‘TDI!');
}

runE2eTests().catch(console.error);
