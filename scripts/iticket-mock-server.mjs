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
      id: 'cat_concerts',
      slug: 'concerts',
      title: 'Konsertlar',
      description: 'Madaniy va jonli musiqiy konsertlar',
      displayOrder: 1,
      offeringsCount: 1
    }
  ],
  offerings: [
    {
      id: 'item_yalla_concert',
      providerId: 'provider_iticket_uz',
      offeringCode: 'CONCERT-YALLA',
      title: "Yalla ansambli — Sog'inib kutgandim",
      description: "Xalqlar do'stligi san'at saroyida Yalla ansambli konserti",
      categorySlug: 'concerts',
      categoryTitle: 'Konsertlar',
      basePrice: 100000,
      currency: 'UZS',
      isAvailable: true,
      variants: [
        { id: 'var_standard', name: 'Standart chipta', basePrice: 100000, isAvailable: true, metadata: {} },
        { id: 'var_vip', name: 'VIP joy', basePrice: 300000, isAvailable: true, metadata: {} }
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
      tags: ['concert', 'music', 'yalla', 'tashkent'],
      metadata: { venue: "Xalqlar do'stligi saroyi", date: '2026-12-17' }
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
      description: "O'zbekistondagi madaniy va ko'ngilochar tadbirlar uchun onlayn chiptalar platformasi",
      status: 'ACTIVE',
      type: 'SERVICES',
      category: 'entertainment',
      geography: ['UZ'],
      adapterType: 'remote-http',
      authMethod: 'API_KEY',
      capabilities: ['METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK'],
      supportContact: {
        email: 'info@iticket.uz',
        phone: '+998712071071',
        telegram: '@iticket_tg'
      },
      metadata: {}
    });
  }

  // 3. Catalog: GET /catalog
  if (method === 'GET' && pathname === '/catalog') {
    return sendJson(res, 200, catalogData);
  }

  // 4. Single offering: GET /offerings/:id
  if (method === 'GET' && pathname.startsWith('/offerings/')) {
    const offeringId = decodeURIComponent(pathname.replace('/offerings/', ''));
    const offering = catalogData.offerings.find((o) => o.id === offeringId || o.offeringCode === offeringId);
    if (!offering) {
      return sendJson(res, 404, { error: 'Offering not found' });
    }
    return sendJson(res, 200, offering);
  }

  // 5. Quote: POST /quote
  if (method === 'POST' && pathname === '/quote') {
    const body = await parseJsonBody(req);
    const items = body.items || [];
    const quantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
    const unitPrice = 100000;
    const subtotal = quantity * unitPrice;
    const fee = 10000;
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
      lines: items.length > 0 ? items.map((item) => ({
        offeringId: item.offeringId || 'item_yalla_concert',
        offeringTitle: "Yalla ansambli — Sog'inib kutgandim",
        variantId: item.variantId || 'var_standard',
        quantity: item.quantity || 1,
        unitPrice,
        optionsTotal: 0,
        lineTotal: (item.quantity || 1) * unitPrice,
        selectedOptions: []
      })) : [
        {
          offeringId: 'item_yalla_concert',
          offeringTitle: "Yalla ansambli — Sog'inib kutgandim",
          variantId: 'var_standard',
          quantity: 1,
          unitPrice,
          optionsTotal: 0,
          lineTotal: unitPrice,
          selectedOptions: []
        }
      ],
      fees: [
        { name: 'Servis va bronlash to‘lovi', amount: fee }
      ],
      discounts: [],
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      metadata: {}
    });
  }

  // 6. Action Cancel: POST /actions/:id/cancel
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

  // 7. Action Create: POST /actions (with Idempotency Protection)
  if (method === 'POST' && pathname === '/actions') {
    const body = await parseJsonBody(req);
    const idempotencyKey = body.idempotencyKey;

    // Return cached action if idempotencyKey already exists
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
      subtotal: 100000,
      fees: 10000,
      discount: 0,
      total: 110000,
      currency: 'UZS',
      customer: body.customer || { name: 'Ali Valiyev', phone: '+998901234567' },
      lines: [
        {
          offeringId: 'item_yalla_concert',
          offeringTitle: "Yalla ansambli — Sog'inib kutgandim",
          quantity: 1,
          unitPrice: 100000,
          optionsTotal: 0,
          lineTotal: 100000
        }
      ],
      nextAction: {
        type: 'OPEN_URL',
        url: `https://iticket.uz/pay/${actionId}`,
        label: 'iTicket.UZ xavfsiz to‘lov sahifasiga o‘tish'
      },
      fulfillmentType: 'STANDARD',
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

  // 8. Action Status: GET /actions/:id
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
      subtotal: 100000,
      fees: 10000,
      discount: 0,
      total: 110000,
      currency: 'UZS',
      customer: { name: 'Ali Valiyev', phone: '+998901234567' },
      lines: [
        {
          offeringId: 'item_yalla_concert',
          offeringTitle: "Yalla ansambli — Sog'inib kutgandim",
          quantity: 1,
          unitPrice: 100000,
          optionsTotal: 0,
          lineTotal: 100000
        }
      ],
      fulfillmentType: 'STANDARD',
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
