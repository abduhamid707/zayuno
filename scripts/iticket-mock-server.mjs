import http from 'node:http';
import crypto from 'node:crypto';

const PORT = 3005;
const API_KEY = process.env.PROVIDER_API_KEY || 'iticket_secret_key_123456789';

const actionsDb = new Map();
const idempotencyDb = new Map();

const catalogData = {
  providerSlug: 'iticket-uz',
  categories: [
    {
      id: 'cat_sport',
      slug: 'sport',
      title: 'Sport',
      description: 'MMA, futbol, boks va yirik sport musobaqalari',
      displayOrder: 1,
      offeringsCount: 1
    },
    {
      id: 'cat_concerts',
      slug: 'concerts',
      title: 'Konsertlar',
      description: 'Madaniy, estrada va jonli musiqiy konsertlar',
      displayOrder: 2,
      offeringsCount: 1
    },
    {
      id: 'cat_cultural',
      slug: 'cultural',
      title: 'Madaniy tadbirlar',
      description: 'Muzeylar, tarixiy majmualar va ko‘rgazmalar',
      displayOrder: 3,
      offeringsCount: 2
    },
    {
      id: 'cat_entertainment',
      slug: 'entertainment',
      title: 'Ko‘ngilochar',
      description: 'Sayilgohlar, planetarium va oilaviy dam olish maskanlari',
      displayOrder: 4,
      offeringsCount: 1
    }
  ],
  offerings: [
    {
      id: 'item_mangu_5',
      providerId: 'provider_iticket_uz',
      offeringCode: 'SPORT-MANGU-5',
      title: 'MANGU 5 (MANGU MMA)',
      description: 'Humo Arena muz saroyida MANGU 5 professional MMA xalqaro janglar turniri. O‘zbekiston va xalqaro eng sara jangchilar oktagonda!',
      categorySlug: 'sport',
      categoryTitle: 'Sport',
      imageUrl: 'https://cdn.iticket.uz/event/poster/5iFUJyceuKZ6MElJFN7CMeVcfMKZvmCw3y6LzEot.png',
      coverUrl: 'https://cdn.iticket.uz/event/cover/8vSUq2zuO9fZ8kmJPD6hqf7duu82Ht2Zfn3zRjDu.jpg',
      basePrice: 50000,
      currency: 'UZS',
      isAvailable: true,
      variants: [
        { id: 'var_standart', name: 'Standart (Sektor)', basePrice: 50000, isAvailable: true, metadata: { section: 'Yuqori sektorlar' } },
        { id: 'var_tribuna', name: 'Tribuna (Markaziy sektor)', basePrice: 150000, isAvailable: true, metadata: { section: 'Markaziy sektor' } },
        { id: 'var_parter', name: 'Parter (Oktagon atrofi)', basePrice: 500000, isAvailable: true, metadata: { section: 'Oktagon atrofi' } },
        { id: 'var_vip', name: 'VIP Ring-side (1-qator)', basePrice: 1000000, isAvailable: true, metadata: { section: 'VIP 1-qator' } }
      ],
      optionGroups: [
        {
          id: 'grp_delivery',
          name: 'Chipta yetkazish formati',
          isRequired: false,
          minSelections: 0,
          maxSelections: 1,
          options: [
            { id: 'opt_eticket', name: 'E-Ticket (PDF va SMS QR-kod)', priceDelta: 0, isDefault: true, isAvailable: true, metadata: {} }
          ]
        }
      ],
      tags: ['mangu', 'mangu-5', 'mangu liga', 'mma', 'sport', 'humo-arena', 'toshkent', 'jang'],
      metadata: {
        venue: 'Humo Arena',
        address: 'Tashkent, Uzbekistan, Afrasiab st.',
        date: '2026-09-26',
        time: '18:00 - 22:00',
        ageLimit: '16+',
        availableTickets: 9299,
        phone: '+998 94 800 55 55'
      }
    },
    {
      id: 'item_tashkent_city_park',
      providerId: 'provider_iticket_uz',
      offeringCode: 'PARK-TASHKENT-CITY',
      title: '"Toshkent City" Sayilgohi',
      description: 'Tashkent City Planetarium va sayilgoh bo‘ylab unutilmas oilaviy ko‘ngilochar sayohat',
      categorySlug: 'entertainment',
      categoryTitle: 'Ko‘ngilochar',
      imageUrl: 'https://cdn.iticket.uz/event/poster/Yz1fEefWdtMK4GmCvSfhJft3jl0ucwHyWbEtqxS6.png',
      basePrice: 52500,
      currency: 'UZS',
      isAvailable: true,
      variants: [
        { id: 'var_tc_regular', name: 'Kirish chiptasi', basePrice: 52500, isAvailable: true, metadata: {} },
        { id: 'var_tc_family', name: 'Oilaviy paket', basePrice: 150000, isAvailable: true, metadata: {} },
        { id: 'var_tc_all_inclusive', name: 'Barcha attraksionlar (All-inclusive)', basePrice: 315000, isAvailable: true, metadata: {} }
      ],
      optionGroups: [
        {
          id: 'grp_delivery',
          name: 'Chipta formati',
          isRequired: false,
          minSelections: 0,
          maxSelections: 1,
          options: [
            { id: 'opt_eticket', name: 'Elektron QR-chipta', priceDelta: 0, isDefault: true, isAvailable: true, metadata: {} }
          ]
        }
      ],
      tags: ['tashkent city', 'sayilgoh', 'park', 'planetarium', 'entertainment'],
      metadata: {
        venue: 'Tashkent City Planetarium',
        date: 'Har kuni',
        availableTickets: 6882
      }
    },
    {
      id: 'item_imam_bukhari_museum',
      providerId: 'provider_iticket_uz',
      offeringCode: 'MUSEUM-IMAM-BUKHARI',
      title: 'Imom Buxoriy innovatsion muzeyi',
      description: 'Imom al-Buxoriy yodgorlik majmuasida zamonaviy multimedia va innovatsion muzey ekspozitsiyasi',
      categorySlug: 'cultural',
      categoryTitle: 'Madaniy tadbirlar',
      imageUrl: 'https://cdn.iticket.uz/event/poster/79L7BGHAxFm1v6HNZSZbBvGry3Z5vh7ioOwjTOGX.png',
      basePrice: 20000,
      currency: 'UZS',
      isAvailable: true,
      variants: [
        { id: 'var_museum_standard', name: 'Oddiy kirish chiptasi', basePrice: 20000, isAvailable: true, metadata: {} },
        { id: 'var_museum_guided', name: 'Gid hamrohligida ekskursiya', basePrice: 50000, isAvailable: true, metadata: {} },
        { id: 'var_museum_vip', name: 'VIP interaktiv tur', basePrice: 420000, isAvailable: true, metadata: {} }
      ],
      optionGroups: [],
      tags: ['muzey', 'buxoriy', 'madaniyat', 'samarqand', 'tarix'],
      metadata: {
        venue: 'Imom al-Buxoriy yodgorlik majmuasi',
        availableTickets: 5280
      }
    },
    {
      id: 'item_islamic_civilization',
      providerId: 'provider_iticket_uz',
      offeringCode: 'CULTURE-ISLAMIC-CIVILIZATION',
      title: 'Islom sivilizatsiyasi markazi',
      description: 'Islom sivilizatsiyasi markazi multimedia va nodir qo‘lyozmalar ko‘rgazmasi',
      categorySlug: 'cultural',
      categoryTitle: 'Madaniy tadbirlar',
      imageUrl: 'https://cdn.iticket.uz/event/poster/twB7n9BNxHorHbYttgrl5EEOLNFK8RhUTX8PelZQ.png',
      basePrice: 35000,
      currency: 'UZS',
      isAvailable: true,
      variants: [
        { id: 'var_civ_standard', name: 'Kirish chiptasi', basePrice: 35000, isAvailable: true, metadata: {} },
        { id: 'var_civ_tour', name: 'To‘liq ekspozitsiya va audio-gid', basePrice: 70000, isAvailable: true, metadata: {} }
      ],
      optionGroups: [],
      tags: ['islom sivilizatsiyasi', 'muzey', 'madaniyat', 'toshkent'],
      metadata: {
        venue: 'Islom sivilizatsiyasi markazi',
        availableTickets: 33358
      }
    },
    {
      id: 'item_yalla_concert',
      providerId: 'provider_iticket_uz',
      offeringCode: 'CONCERT-YALLA',
      title: "Yalla ansambli — Sog'inib kutgandim",
      description: "Xalqlar do'stligi san'at saroyida Farruh Zokirov va Yalla guruhi retro konserti",
      categorySlug: 'concerts',
      categoryTitle: 'Konsertlar',
      imageUrl: 'https://cdn.iticket.uz/event/poster/UpKccxJsFAt2dwEqocIRNw7cOhBYUwspvckzel3P.png',
      basePrice: 100000,
      currency: 'UZS',
      isAvailable: true,
      variants: [
        { id: 'var_yalla_standard', name: 'Standart chipta (Balkon)', basePrice: 100000, isAvailable: true, metadata: {} },
        { id: 'var_yalla_parter', name: 'Parter (Markaz)', basePrice: 250000, isAvailable: true, metadata: {} },
        { id: 'var_yalla_vip', name: 'VIP joy', basePrice: 500000, isAvailable: true, metadata: {} }
      ],
      optionGroups: [
        {
          id: 'grp_delivery',
          name: 'Chipta yetkazish',
          isRequired: false,
          minSelections: 0,
          maxSelections: 1,
          options: [
            { id: 'opt_eticket', name: 'Elektron chipta (SMS / Email)', priceDelta: 0, isDefault: true, isAvailable: true, metadata: {} }
          ]
        }
      ],
      tags: ['concert', 'music', 'yalla', 'farruh zokirov', 'tashkent'],
      metadata: {
        venue: "Xalqlar do'stligi saroyi",
        date: '2026-12-17'
      }
    }
  ],
  version: '2026.1',
  updatedAt: new Date().toISOString()
};

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-provider-api-key, x-provider-slug, x-zayuno-signature'
  });
  res.end(json);
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/\/+$/, '') || '/';
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-provider-api-key, x-provider-slug, x-zayuno-signature'
    });
    return res.end();
  }

  // 1. Health endpoint: GET /health
  if (method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, {
      status: 'HEALTHY',
      latencyMs: 12,
      timestamp: new Date().toISOString(),
      details: { uptimeSeconds: Math.floor(process.uptime()) }
    });
  }

  // 2. Provider Info: GET /provider-info
  if (method === 'GET' && pathname === '/provider-info') {
    return sendJson(res, 200, {
      id: 'provider_iticket_uz',
      slug: 'iticket-uz',
      name: 'iTicket.UZ',
      description: "O'zbekistondagi madaniy, sport va ko'ngilochar tadbirlar uchun onlayn chiptalar platformasi",
      status: 'ACTIVE',
      type: 'SERVICES',
      category: 'TICKETING',
      fulfillmentMode: 'REMOTE',
      geography: ['UZ'],
      adapterType: 'remote-http',
      authMethod: 'API_KEY',
      capabilities: ['METADATA', 'HEALTH', 'CATALOG', 'SEARCH', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'ACTION_CANCEL', 'WEBHOOK'],
      supportContact: {
        email: 'info@iticket.uz',
        phone: '+998712071071',
        telegram: '@iticket_tg'
      },
      metadata: {
        website: 'https://iticket.uz'
      }
    });
  }

  // 3. Catalog: GET /catalog
  if (method === 'GET' && pathname === '/catalog') {
    const catSlug = parsedUrl.searchParams.get('category');
    if (catSlug) {
      const filtered = catalogData.offerings.filter(o => o.categorySlug === catSlug);
      return sendJson(res, 200, {
        ...catalogData,
        offerings: filtered
      });
    }
    return sendJson(res, 200, catalogData);
  }

  // 4. Single offering: GET /offerings/:id
  if (method === 'GET' && pathname.startsWith('/offerings/')) {
    const offeringId = decodeURIComponent(pathname.replace('/offerings/', ''));
    const offering = catalogData.offerings.find((o) =>
      o.id === offeringId ||
      o.offeringCode === offeringId ||
      o.id.toLowerCase() === offeringId.toLowerCase()
    );
    if (!offering) {
      return sendJson(res, 404, { error: 'Offering not found' });
    }
    return sendJson(res, 200, offering);
  }

  // 5. Search: GET /search
  if (method === 'GET' && pathname === '/search') {
    const q = (parsedUrl.searchParams.get('q') || '').toLowerCase();
    const results = catalogData.offerings.filter(o =>
      o.title.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      (o.tags && o.tags.some(t => t.includes(q)))
    );
    return sendJson(res, 200, results);
  }

  // 6. Quote: POST /quote
  if (method === 'POST' && pathname === '/quote') {
    const body = await parseJsonBody(req);
    const items = body.items || [];
    let subtotal = 0;
    const lines = [];

    for (const item of items) {
      const off = catalogData.offerings.find(o => o.id === item.offeringId) || catalogData.offerings[0];
      const variant = off.variants?.find(v => v.id === item.variantId) || off.variants?.[0] || { basePrice: off.basePrice, name: 'Standart' };
      const qty = item.quantity || 1;
      const unitPrice = variant.basePrice || off.basePrice;
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;

      lines.push({
        offeringId: off.id,
        offeringTitle: off.title,
        variantId: variant.id,
        quantity: qty,
        unitPrice,
        optionsTotal: 0,
        lineTotal,
        selectedOptions: []
      });
    }

    if (lines.length === 0) {
      const off = catalogData.offerings[0];
      const unitPrice = off.basePrice;
      subtotal = unitPrice;
      lines.push({
        offeringId: off.id,
        offeringTitle: off.title,
        variantId: off.variants[0].id,
        quantity: 1,
        unitPrice,
        optionsTotal: 0,
        lineTotal: unitPrice,
        selectedOptions: []
      });
    }

    const fee = 0;
    const total = subtotal + fee;

    return sendJson(res, 200, {
      id: `quote_iticket_${Date.now()}`,
      providerSlug: body.providerSlug || 'iticket-uz',
      locationId: body.locationId || 'loc_main',
      currency: 'UZS',
      subtotal,
      totalFees: fee,
      totalDiscount: 0,
      total,
      lines,
      fees: [],
      discounts: [],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      metadata: {}
    });
  }

  // 7. Action Cancel: POST /actions/:id/cancel
  if (method === 'POST' && pathname.endsWith('/cancel')) {
    const parts = pathname.split('/');
    const actionId = parts[2];
    const action = actionsDb.get(actionId);
    if (action) {
      action.status = 'CANCELLED';
      action.updatedAt = new Date().toISOString();
    }
    return sendJson(res, 200, {
      success: true,
      actionId,
      status: 'CANCELLED',
      message: 'Action cancelled successfully'
    });
  }

  // 8. Action Create: POST /actions (with Idempotency Protection)
  if (method === 'POST' && pathname === '/actions') {
    const body = await parseJsonBody(req);
    const idempotencyKey = body.idempotencyKey;

    if (idempotencyKey && idempotencyDb.has(idempotencyKey)) {
      return sendJson(res, 200, idempotencyDb.get(idempotencyKey));
    }

    const actionId = `act_iticket_${Date.now()}`;
    const action = {
      id: actionId,
      publicId: `ZY-ITICKET-${Date.now().toString().slice(-5)}`,
      externalActionId: `ord_iticket_${Date.now().toString().slice(-6)}`,
      providerSlug: body.providerSlug || 'iticket-uz',
      quoteId: body.quoteId || 'quote_iticket_123',
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'PENDING',
      subtotal: 50000,
      fees: 0,
      discount: 0,
      total: 50000,
      currency: 'UZS',
      customer: body.customer || { name: 'Ali Valiyev', phone: '+998901234567' },
      lines: [
        {
          offeringId: 'item_mangu_5',
          offeringTitle: 'MANGU 5 (MANGU MMA)',
          quantity: 1,
          unitPrice: 50000,
          optionsTotal: 0,
          lineTotal: 50000
        }
      ],
      nextAction: {
        type: 'OPEN_URL',
        url: `https://iticket.uz/pay/${actionId}`,
        label: 'iTicket.UZ xavfsiz to‘lov sahifasiga o‘tish'
      },
      fulfillmentMode: 'REMOTE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    };

    actionsDb.set(actionId, action);
    if (idempotencyKey) {
      idempotencyDb.set(idempotencyKey, action);
    }
    return sendJson(res, 200, action);
  }

  // 9. Action Status: GET /actions/:id
  if (method === 'GET' && pathname.startsWith('/actions/')) {
    const actionId = pathname.replace('/actions/', '');
    const action = actionsDb.get(actionId) || {
      id: actionId,
      publicId: `ZY-ITICKET-99999`,
      externalActionId: `ord_iticket_99999`,
      providerSlug: 'iticket-uz',
      quoteId: 'quote_iticket_123',
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      subtotal: 50000,
      fees: 0,
      discount: 0,
      total: 50000,
      currency: 'UZS',
      customer: { name: 'Ali Valiyev', phone: '+998901234567' },
      lines: [
        {
          offeringId: 'item_mangu_5',
          offeringTitle: 'MANGU 5 (MANGU MMA)',
          quantity: 1,
          unitPrice: 50000,
          optionsTotal: 0,
          lineTotal: 50000
        }
      ],
      fulfillmentMode: 'REMOTE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    };
    return sendJson(res, 200, action);
  }

  // Default 404
  return sendJson(res, 404, {
    error: 'Not Found',
    path: pathname,
    message: `Endpoint ${method} ${pathname} not found on iTicket mock provider.`
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[iTicket Mock Provider] listening on http://127.0.0.1:${PORT}`);
  console.log(`API Key: ${API_KEY}`);
});
