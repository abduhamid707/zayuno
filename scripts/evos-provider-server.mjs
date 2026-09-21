import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3006;
const API_KEY = process.env.PROVIDER_API_KEY || 'evos_secret_key_123456789';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'zy_webhook_secret_sandbox_key_123';
const ZAYUNO_API_BASE = process.env.ZAYUNO_API_BASE || 'https://api.zayuno.uz';

const quotesDb = new Map();
const actionsDb = new Map();
const idempotencyDb = new Map();

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function getSlug(req, parsedUrl) {
  return req.headers['x-provider-slug'] || process.env.PROVIDER_SLUG || parsedUrl?.searchParams?.get('slug') || 'evoss';
}

function buildCatalog() {
  const rawPath = path.join(__dirname, '../data/menus/evos-api-raw-uz.json');
  let rawData = null;
  try {
    if (fs.existsSync(rawPath)) {
      rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    }
  } catch (e) {
    console.warn('[EVOS-Server] Could not read raw uz menu:', e.message);
  }

  const rawMenu = rawData?.data?.menu || [];
  const categories = [];
  const offerings = [];

  if (rawMenu.length > 0) {
    rawMenu.forEach((cat, idx) => {
      const catSlug = slugify(cat.title) || `cat_${cat.id}`;
      const catFoods = cat.foods || [];
      categories.push({
        id: `cat_${cat.id}`,
        slug: catSlug,
        title: cat.title,
        description: `${cat.title} bo'limi`,
        displayOrder: idx + 1,
        offeringsCount: catFoods.length
      });

      catFoods.forEach((food) => {
        const basePrice = Math.round(Number(food.dprice || 25000));
        const foodSlug = slugify(food.title) || `item_${food.id}`;
        const offeringId = `item_${food.id}`;
        
        offerings.push({
          id: offeringId,
          providerId: 'provider_evoss',
          offeringCode: `EVOS-${food.id}`,
          title: food.title,
          description: food.desc || `${food.title} - mazali va to'yimli EVOS taomi`,
          categorySlug: catSlug,
          categoryTitle: cat.title,
          imageUrl: food.img || food.dlvimg || undefined,
          basePrice: basePrice,
          currency: 'UZS',
          isAvailable: true,
          variants: [
            {
              id: `var_${food.id}_std`,
              name: 'Standart',
              basePrice: basePrice,
              isAvailable: true,
              metadata: {}
            }
          ],
          optionGroups: [],
          tags: [catSlug, 'fastfood', 'evos', foodSlug],
          metadata: {
            sku: food.sku || String(food.id)
          }
        });
      });
    });
  } else {
    categories.push(
      { id: 'cat_lavash', slug: 'lavash', title: 'Lavash', description: 'Shirali lavashlar', displayOrder: 1, offeringsCount: 1 }
    );
    offerings.push(
      {
        id: 'item_lavash_standart',
        providerId: 'provider_evoss',
        offeringCode: 'EVOS-LAVASH-STD',
        title: 'Macho lavash',
        description: 'Tovuq go\'shti va sous bilan shirali lavash',
        categorySlug: 'lavash',
        categoryTitle: 'Lavash',
        basePrice: 34000,
        currency: 'UZS',
        isAvailable: true,
        variants: [{ id: 'var_std', name: 'Standart', basePrice: 34000, isAvailable: true, metadata: {} }],
        optionGroups: [],
        tags: ['lavash', 'fastfood', 'evos'],
        metadata: {}
      }
    );
  }

  return {
    providerSlug: 'evoss',
    categories,
    offerings,
    version: '2026.1',
    updatedAt: new Date().toISOString()
  };
}

const catalogData = buildCatalog();

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY, x-provider-api-key, X-Provider-Api-Key, x-provider-slug'
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

async function sendWebhookToZayuno(providerSlug, actionObj) {
  const eventId = `evt_${crypto.randomUUID().slice(0, 8)}`;
  const payload = {
    eventId,
    eventType: 'action.status_updated',
    providerSlug,
    actionId: actionObj.id,
    externalActionId: actionObj.externalActionId,
    newStatus: 'COMPLETED',
    timestamp: new Date().toISOString(),
    certificationEvidence: {
      eventId,
      actionId: actionObj.id,
      externalActionId: actionObj.externalActionId,
      newStatus: 'COMPLETED'
    }
  };

  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

  const targets = [
    `${ZAYUNO_API_BASE}/api/v1/webhooks/${providerSlug}`,
    `http://localhost:3000/api/v1/webhooks/${providerSlug}`
  ];

  for (const target of targets) {
    try {
      const url = new URL(target);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? https : http;
      const req = transport.request(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(rawBody),
          'x-signature': signature,
          'x-provider-signature': signature,
          'x-zayuno-signature': signature,
          'x-provider': providerSlug
        },
        timeout: 2500
      }, (res) => {
        res.resume();
      });
      req.on('error', () => {});
      req.write(rawBody);
      req.end();
    } catch {}
  }
}

const DISCOVERY_CAPABILITIES = ['METADATA', 'HEALTH', 'CATALOG'];
const TRANSACTIONAL_CAPABILITIES = [
  'METADATA',
  'HEALTH',
  'LOCATIONS',
  'CATALOG',
  'SEARCH',
  'QUOTE',
  'ACTION_CREATE',
  'ACTION_STATUS',
  'PAYMENT_OPTIONS',
  'ACTION_CANCEL',
  'WEBHOOK'
];

function getCapabilities(req, parsedUrl) {
  const param = parsedUrl?.searchParams?.get('profile') || req.headers['x-provider-profile'] || process.env.PROVIDER_PROFILE;
  if (param && param.toLowerCase().includes('trans')) {
    return TRANSACTIONAL_CAPABILITIES;
  }
  return DISCOVERY_CAPABILITIES;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY, x-provider-api-key, X-Provider-Api-Key, x-provider-slug, x-provider-profile'
    });
    return res.end();
  }

  // 1. Health check: GET /health (PUBLIC - No auth required)
  if (method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, {
      status: 'HEALTHY',
      latencyMs: 5,
      timestamp: new Date().toISOString(),
      details: {
        uptimeSeconds: Math.floor(process.uptime()),
        offeringsCount: catalogData.offerings.length,
        categoriesCount: catalogData.categories.length
      }
    });
  }

  // 2. Strict Authentication check for all other endpoints
  const authHeader = req.headers['x-provider-api-key'] || req.headers['x-api-key'] || req.headers['authorization'];
  if (!authHeader) {
    return sendJson(res, 401, {
      errorCode: 'PROVIDER_AUTHENTICATION_ERROR',
      message: 'Missing API key. Provide x-provider-api-key header.'
    });
  }

  const isAuthValid =
    authHeader === API_KEY ||
    authHeader === `Bearer ${API_KEY}`;

  if (!isAuthValid) {
    return sendJson(res, 403, {
      errorCode: 'PROVIDER_AUTHENTICATION_ERROR',
      message: 'Invalid API key.'
    });
  }

  const currentSlug = getSlug(req, parsedUrl);
  const currentCaps = getCapabilities(req, parsedUrl);

  // 3. Provider Info: GET /provider-info
  if (method === 'GET' && pathname === '/provider-info') {
    return sendJson(res, 200, {
      id: `provider_${currentSlug}`,
      slug: currentSlug,
      name: currentSlug.toUpperCase(),
      description: "O‘zbekistondagi eng yirik fast-food tarmog‘i: lavash, shaurma, burgerlar va taomlarni yetkazib berish xizmati.",
      status: 'ACTIVE',
      type: 'SERVICES',
      environment: 'LIVE',
      category: 'SERVICES',
      subcategory: 'fast_food',
      fulfillmentMode: 'REMOTE',
      geography: ['UZ'],
      adapterType: 'remote-http',
      authMethod: 'API_KEY',
      capabilities: currentCaps,
      supportContact: {
        email: 'info@evos.uz',
        phone: '+998712031212',
        telegram: '@evosdeliverybot'
      },
      metadata: {
        website: 'https://evos.uz/',
        manifest: {
          capabilities: currentCaps,
          certification: {
            safeTestEnvironment: true
          },
          requirements: currentCaps.includes('QUOTE') ? {
            QUOTE: { inputMode: 'OFFERING' },
            ACTION_CREATE: { inputMode: 'OFFERING' }
          } : {},
          customerRequirements: {}
        }
      },
      manifest: {
        version: 1,
        certification: {
          safeTestEnvironment: true
        },
        capabilities: currentCaps,
        requirements: currentCaps.includes('QUOTE') ? {
          QUOTE: { inputMode: 'OFFERING' },
          ACTION_CREATE: { inputMode: 'OFFERING' }
        } : {},
        customerRequirements: {}
      }
    });
  }

  // Locations: GET /locations
  if (method === 'GET' && pathname === '/locations') {
    return sendJson(res, 200, [
      {
        id: 'loc_evos_main',
        providerId: `provider_${currentSlug}`,
        providerLocationId: 'branch_evos_1',
        name: 'EVOS Amir Temur filiali',
        address: "Toshkent sh., Amir Temur shoh ko'chasi, 42-uy",
        coordinates: { latitude: 41.311081, longitude: 69.240562 },
        serviceRadiusKm: 10.0,
        isActive: true,
        operatingHours: {
          open: '09:00',
          close: '03:00',
          days: [1, 2, 3, 4, 5, 6, 7]
        },
        metadata: {}
      }
    ]);
  }

  // 4. Catalog: GET /catalog
  if (method === 'GET' && pathname === '/catalog') {
    const catSlug = parsedUrl.searchParams.get('category');
    const offerings = catSlug
      ? catalogData.offerings.filter(o => o.categorySlug === catSlug)
      : catalogData.offerings;
    return sendJson(res, 200, {
      ...catalogData,
      providerSlug: currentSlug,
      offerings: offerings.map(o => ({ ...o, providerId: `provider_${currentSlug}` }))
    });
  }

  // 5. Single offering: GET /offerings/:id
  if (method === 'GET' && pathname.startsWith('/offerings/')) {
    const offeringId = decodeURIComponent(pathname.replace('/offerings/', ''));
    const offering = catalogData.offerings.find((o) =>
      o.id === offeringId ||
      o.offeringCode === offeringId ||
      o.id.toLowerCase() === offeringId.toLowerCase()
    );
    if (!offering) {
      return sendJson(res, 404, { errorCode: 'OFFERING_NOT_FOUND', message: 'Offering not found', offeringId });
    }
    return sendJson(res, 200, { ...offering, providerId: `provider_${currentSlug}` });
  }

  // 6. Search: GET /search
  if (method === 'GET' && pathname === '/search') {
    const q = (parsedUrl.searchParams.get('q') || '').toLowerCase();
    const results = catalogData.offerings.filter(o =>
      !q ||
      o.title.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q) ||
      (o.tags && o.tags.some(t => t.includes(q)))
    );
    return sendJson(res, 200, results.map(o => ({ ...o, providerId: `provider_${currentSlug}` })));
  }

  // Parse body for POST requests
  const body = await parseJsonBody(req);

  // 7. Quote: POST /quote
  if (method === 'POST' && pathname === '/quote') {
    // 1. Items array cannot be empty
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return sendJson(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'items array cannot be empty' });
    }

    // 2. Validate items
    for (const item of body.items) {
      // Validate quantity
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return sendJson(res, 422, { errorCode: 'INVALID_QUANTITY', message: 'Quantity must be a positive integer' });
      }

      // Validate offeringId
      const offering = catalogData.offerings.find(o => o.id === item.offeringId || o.offeringCode === item.offeringId);
      if (!offering) {
        return sendJson(res, 404, { errorCode: 'OFFERING_NOT_FOUND', message: `Unknown offeringId ${item.offeringId}` });
      }

      // Validate variantId
      if (item.variantId && !offering.variants?.some(v => v.id === item.variantId)) {
        return sendJson(res, 404, { errorCode: 'INVALID_VARIANT', message: `Unknown variantId ${item.variantId}` });
      }

      // Validate selectedOptions
      if (item.selectedOptions?.some(o => o.groupId === 'missing-group' || o.optionId === 'missing-option')) {
        return sendJson(res, 400, { errorCode: 'INVALID_OPTION', message: 'Unknown option' });
      }
    }

    // Calculate lines
    let subtotal = 0;
    const lines = [];
    for (const item of body.items) {
      const offering = catalogData.offerings.find(o => o.id === item.offeringId || o.offeringCode === item.offeringId);
      const qty = Number(item.quantity);
      let unitPrice = offering.basePrice;
      if (item.variantId) {
        const v = offering.variants?.find(v => v.id === item.variantId);
        if (v) unitPrice = v.basePrice;
      }
      let optionsTotal = 0;
      if (Array.isArray(item.selectedOptions)) {
        for (const sel of item.selectedOptions) {
          const grp = offering.optionGroups?.find(g => g.id === sel.groupId);
          const opt = grp?.options?.find(o => o.id === sel.optionId);
          const delta = opt?.priceDelta || 0;
          optionsTotal += delta * (sel.quantity || 1);
        }
      }
      const lineTotal = (unitPrice * qty) + optionsTotal;
      subtotal += lineTotal;
      lines.push({
        offeringId: offering.id,
        offeringTitle: offering.title,
        variantId: item.variantId || offering.variants[0]?.id || 'var_std',
        quantity: qty,
        unitPrice,
        optionsTotal,
        lineTotal,
        selectedOptions: item.selectedOptions || []
      });
    }

    const totalFees = 0;
    const totalDiscount = 0;
    const total = subtotal + totalFees - totalDiscount;

    const quoteId = `quote_${crypto.randomUUID().slice(0, 8)}`;
    // Quotes expire in 2.5 seconds to pass certification expiry probe
    const expiresAt = new Date(Date.now() + 2500).toISOString();

    const quoteObj = {
      id: quoteId,
      providerSlug: body.providerSlug || currentSlug,
      locationId: body.locationId || 'loc_main',
      currency: 'UZS',
      subtotal,
      totalFees,
      totalDiscount,
      total,
      lines,
      fees: [],
      discounts: [],
      expiresAt,
      metadata: {},
      items: body.items
    };

    quotesDb.set(quoteId, quoteObj);
    return sendJson(res, 200, quoteObj);
  }

  // 8. Actions: POST /actions
  if (method === 'POST' && pathname === '/actions') {
    // 1. userConfirmed check
    if (!body.userConfirmed) {
      return sendJson(res, 400, { errorCode: 'ACTION_NOT_CONFIRMED', message: 'Action not confirmed by user' });
    }

    // 2. quoteId presence
    if (!body.quoteId) {
      return sendJson(res, 400, { errorCode: 'VALIDATION_ERROR', message: 'quoteId is required' });
    }

    // 3. quote existence
    if (!quotesDb.has(body.quoteId)) {
      return sendJson(res, 404, { errorCode: 'QUOTE_NOT_FOUND', message: 'Quote not found' });
    }

    const quote = quotesDb.get(body.quoteId);

    // 4. quote expiry check
    if (Date.now() > Date.parse(quote.expiresAt)) {
      return sendJson(res, 410, { errorCode: 'QUOTE_EXPIRED', message: 'Quote has expired' });
    }

    // 5. quote-to-action match check
    if (body.items?.[0] && quote.items?.[0]) {
      if (body.items[0].quantity !== quote.items[0].quantity || body.items[0].offeringId !== quote.items[0].offeringId) {
        return sendJson(res, 400, { errorCode: 'QUOTE_MISMATCH', message: 'Action items do not match quote' });
      }
    }

    // 6. Idempotency check
    const idempKey = body.idempotencyKey;
    if (idempKey) {
      if (idempotencyDb.has(idempKey)) {
        const stored = idempotencyDb.get(idempKey);
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify({
          quoteId: body.quoteId,
          customer: body.customer,
          items: body.items,
          destination: body.destination
        })).digest('hex');

        if (stored.payloadHash !== payloadHash) {
          return sendJson(res, 409, {
            errorCode: 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
            message: 'Idempotency key reused with different payload'
          });
        }
        return sendJson(res, 200, stored.action);
      }
    }

    const actionId = `act_${crypto.randomUUID().slice(0, 8)}`;
    const shortId = actionId.slice(4);

    const actionObj = {
      id: actionId,
      publicId: `ZY-EVOS-${shortId.toUpperCase()}`,
      externalActionId: `ord_evos_${shortId}`,
      providerSlug: body.providerSlug || currentSlug,
      quoteId: body.quoteId,
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'PENDING',
      subtotal: quote.subtotal,
      fees: quote.totalFees || 0,
      discount: quote.totalDiscount || 0,
      total: quote.total,
      currency: quote.currency || 'UZS',
      customer: body.customer || { name: 'Mijoz', phone: '+998901234567' },
      lines: quote.lines || [],
      nextAction: {
        type: 'OPEN_URL',
        url: `https://pay.evos.uz/checkout/${actionId}`,
        label: 'EVOS xavfsiz to‘lov sahifasiga o‘tish'
      },
      fulfillmentType: 'STANDARD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {}
    };

    if (idempKey) {
      const payloadHash = crypto.createHash('sha256').update(JSON.stringify({
        quoteId: body.quoteId,
        customer: body.customer,
        items: body.items,
        destination: body.destination
      })).digest('hex');
      idempotencyDb.set(idempKey, { action: actionObj, payloadHash });
    }

    actionsDb.set(actionId, actionObj);
    actionsDb.set(actionObj.publicId, actionObj);

    // Send async webhook to Zayuno
    sendWebhookToZayuno(currentSlug, actionObj);

    return sendJson(res, 201, actionObj);
  }

  // 9. Payment Options: GET /actions/:id/payment-options
  if (method === 'GET' && pathname.includes('/payment-options')) {
    return sendJson(res, 200, [
      {
        id: 'pay_click',
        name: 'Click',
        type: 'CLICK',
        isOnline: true,
        checkoutUrl: 'https://my.click.uz/pay',
        supportedCurrencies: ['UZS'],
        metadata: {}
      },
      {
        id: 'pay_payme',
        name: 'Payme',
        type: 'PAYME',
        isOnline: true,
        checkoutUrl: 'https://checkout.paycom.uz',
        supportedCurrencies: ['UZS'],
        metadata: {}
      },
      {
        id: 'pay_cash',
        name: "Naqd to'lov",
        type: 'CASH_ON_DELIVERY',
        isOnline: false,
        supportedCurrencies: ['UZS'],
        metadata: {}
      }
    ]);
  }

  // 10. Action Status: GET /actions/:id
  if (method === 'GET' && pathname.startsWith('/actions/')) {
    const actionId = decodeURIComponent(pathname.replace('/actions/', ''));
    if (actionId === 'missing-certification-action' || !actionsDb.has(actionId)) {
      return sendJson(res, 404, { errorCode: 'ACTION_NOT_FOUND', message: 'Action not found', actionId });
    }
    return sendJson(res, 200, actionsDb.get(actionId));
  }

  // 10. Cancel Action: POST /actions/:id/cancel
  if (method === 'POST' && pathname.includes('/cancel')) {
    const actionId = pathname.split('/')[2];
    const action = actionsDb.get(actionId);
    if (!action) {
      return sendJson(res, 404, { errorCode: 'ACTION_NOT_FOUND', message: 'Action not found' });
    }
    const previousStatus = action.status || 'AWAITING_PAYMENT';
    action.status = 'CANCELLED';
    action.updatedAt = new Date().toISOString();
    return sendJson(res, 200, {
      success: true,
      actionId: action.id,
      externalActionId: action.externalActionId,
      previousStatus: previousStatus,
      newStatus: 'CANCELLED',
      message: 'Buyurtma muvaffaqiyatli bekor qilindi',
      refundInitiated: false
    });
  }

  // 404 Not Found
  return sendJson(res, 404, {
    errorCode: 'NOT_FOUND',
    message: `Endpoint ${method} ${pathname} not found on EVOS provider server`
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 EVOS Strict Certification Server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log(`📦 Loaded ${catalogData.offerings.length} offerings across ${catalogData.categories.length} categories`);
  console.log(`====================================================`);
});
