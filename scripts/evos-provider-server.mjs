import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3006;
const API_KEY = process.env.PROVIDER_API_KEY || 'evos_secret_key_123456789';

const actionsDb = new Map();
const idempotencyDb = new Map();

// Helper to slugify
function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Load real EVOS catalog from saved API JSON
function buildCatalog() {
  const rawPath = path.join(__dirname, '../data/menus/evos-api-raw-uz.json');
  let rawData = null;
  try {
    if (fs.existsSync(rawPath)) {
      rawData = JSON.parse(fs.readFileSync(rawPath, 'utf-8'));
    }
  } catch (e) {
    console.warn('[EVOS-Server] Could not read raw uz menu, using fallback:', e.message);
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
          providerId: 'provider_evos',
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
            sku: food.sku || String(food.id),
            iikoId: food.iiko_id || null
          }
        });
      });
    });
  } else {
    // Basic fallback items if file missing
    categories.push(
      { id: 'cat_lavash', slug: 'lavash', title: 'Lavash', description: 'Shirali lavashlar', displayOrder: 1, offeringsCount: 2 },
      { id: 'cat_shaurma', slug: 'shaurma', title: 'Shaurma', description: 'Qarsildoq shaurmalar', displayOrder: 2, offeringsCount: 1 }
    );
    offerings.push(
      {
        id: 'item_lavash_standart',
        providerId: 'provider_evos',
        offeringCode: 'EVOS-LAVASH-STD',
        title: 'Macho lavash',
        description: 'Tovuq go\'shti, sabzavotlar va maxsus sous bilan shirali lavash',
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
    providerSlug: 'evos',
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY, x-provider-api-key, X-Provider-Api-Key'
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-KEY, x-provider-api-key, X-Provider-Api-Key'
    });
    return res.end();
  }

  // 1. Health endpoint: GET /health (public)
  if (method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, {
      status: 'HEALTHY',
      latencyMs: 14,
      timestamp: new Date().toISOString(),
      details: {
        uptimeSeconds: Math.floor(process.uptime()),
        offeringsCount: catalogData.offerings.length,
        categoriesCount: catalogData.categories.length
      }
    });
  }

  // Auth verification for non-health endpoints if key is provided
  const headerKey = req.headers['x-provider-api-key'] || req.headers['x-api-key'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (headerKey && headerKey !== API_KEY) {
    return sendJson(res, 401, {
      error: 'UNAUTHORIZED',
      message: 'Invalid API Key'
    });
  }

  // 2. Provider Info: GET /provider-info
  if (method === 'GET' && pathname === '/provider-info') {
    const currentSlug = process.env.PROVIDER_SLUG || req.headers['x-provider-slug'] || parsedUrl.searchParams.get('slug') || 'evoss';
    return sendJson(res, 200, {
      id: `provider_${currentSlug}`,
      slug: currentSlug,
      name: 'EVOS',
      description: "O‘zbekistondagi eng yirik fast-food tarmog‘i: lavash, shaurma, burgerlar va taomlarni yetkazib berish xizmati.",
      status: 'ACTIVE',
      type: 'SERVICES',
      environment: 'LIVE',
      category: 'SERVICES',
      subcategory: 'fast_food',
      geography: ['UZ'],
      adapterType: 'remote-http',
      authMethod: 'API_KEY',
      capabilities: [
        'METADATA',
        'HEALTH',
        'CATALOG',
        'SEARCH',
        'QUOTE',
        'ACTION_CREATE',
        'ACTION_STATUS',
        'ACTION_CANCEL'
      ],
      supportContact: {
        email: 'info@evos.uz',
        phone: '+998712031212',
        telegram: '@evosdeliverybot'
      },
      metadata: {
        website: 'https://evos.uz/'
      }
    });
  }

  // 3. Catalog: GET /catalog
  if (method === 'GET' && pathname === '/catalog') {
    const currentSlug = process.env.PROVIDER_SLUG || req.headers['x-provider-slug'] || parsedUrl.searchParams.get('slug') || 'evoss';
    const catSlug = parsedUrl.searchParams.get('category');
    const offerings = catSlug
      ? catalogData.offerings.filter(o => o.categorySlug === catSlug)
      : catalogData.offerings;
    return sendJson(res, 200, {
      ...catalogData,
      providerSlug: currentSlug,
      offerings
    });
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
      return sendJson(res, 404, { error: 'Offering not found', offeringId });
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
    return sendJson(res, 200, {
      providerSlug: 'evos',
      query: q,
      total: results.length,
      offerings: results
    });
  }

  // 6. Quote: POST /quote
  if (method === 'POST' && pathname === '/quote') {
    try {
      const body = await parseJsonBody(req);
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return sendJson(res, 400, { error: 'Items array cannot be empty' });
      }

      let subtotal = 0;
      const lines = [];

      for (const item of items) {
        const offering = catalogData.offerings.find(o => o.id === item.offeringId || o.offeringCode === item.offeringId);
        if (!offering) {
          return sendJson(res, 404, { error: `Offering ${item.offeringId} not found` });
        }

        const qty = Number(item.quantity) || 1;
        let unitPrice = offering.basePrice;
        if (item.variantId) {
          const v = offering.variants?.find(v => v.id === item.variantId);
          if (v) unitPrice = v.basePrice;
        }

        let optionsTotal = 0;
        const selectedOptions = [];
        if (Array.isArray(item.selectedOptions)) {
          for (const sel of item.selectedOptions) {
            const grp = offering.optionGroups?.find(g => g.id === sel.groupId);
            const opt = grp?.options?.find(o => o.id === sel.optionId);
            const delta = opt?.priceDelta || 0;
            optionsTotal += delta * (sel.quantity || 1);
            selectedOptions.push({
              groupId: sel.groupId,
              optionId: sel.optionId,
              name: opt?.name || sel.optionId,
              priceDelta: delta
            });
          }
        }

        const lineTotal = (unitPrice * qty) + optionsTotal;
        subtotal += lineTotal;

        lines.push({
          offeringId: offering.id,
          offeringTitle: offering.title,
          variantId: item.variantId || (offering.variants[0]?.id || 'var_std'),
          quantity: qty,
          unitPrice,
          optionsTotal,
          lineTotal,
          selectedOptions
        });
      }

      const totalFees = 10000; // Yetkazib berish xizmati
      const totalDiscount = 0;
      const total = subtotal + totalFees - totalDiscount;

      const quote = {
        id: `quote_${crypto.randomUUID().slice(0, 8)}`,
        providerSlug: body.providerSlug || process.env.PROVIDER_SLUG || 'evoss',
        locationId: body.locationId || 'loc_main',
        currency: 'UZS',
        subtotal,
        totalFees,
        totalDiscount,
        total,
        lines,
        fees: [
          { name: 'Yetkazib berish xizmati', amount: totalFees }
        ],
        discounts: [],
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        metadata: {}
      };

      return sendJson(res, 200, quote);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 7. Actions: POST /actions
  if (method === 'POST' && pathname === '/actions') {
    try {
      const body = await parseJsonBody(req);
      const { idempotencyKey, quoteId, userConfirmed, customer, destination } = body;

      if (!quoteId) {
        return sendJson(res, 400, { error: 'quoteId is required' });
      }

      // Check idempotency
      if (idempotencyKey && idempotencyDb.has(idempotencyKey)) {
        console.log(`[EVOS-Server] Idempotency cache hit: ${idempotencyKey}`);
        return sendJson(res, 200, idempotencyDb.get(idempotencyKey));
      }

      const actionId = `act_${crypto.randomUUID().slice(0, 8)}`;
      const shortId = actionId.slice(4);

      // Reconstruct or extract lines from request or quote
      const items = Array.isArray(body.items) ? body.items : [];
      let subtotal = 0;
      const lines = [];

      if (items.length > 0) {
        for (const item of items) {
          const offering = catalogData.offerings.find(o => o.id === item.offeringId || o.offeringCode === item.offeringId);
          const qty = Number(item.quantity) || 1;
          const unitPrice = offering ? offering.basePrice : 30000;
          const lineTotal = unitPrice * qty;
          subtotal += lineTotal;
          lines.push({
            offeringId: item.offeringId,
            offeringTitle: offering?.title || item.offeringId,
            quantity: qty,
            unitPrice,
            optionsTotal: 0,
            lineTotal
          });
        }
      } else {
        subtotal = body.quote?.subtotal || 34000;
        lines.push({
          offeringId: 'item_lavash_standart',
          offeringTitle: 'Macho lavash',
          quantity: 1,
          unitPrice: subtotal,
          optionsTotal: 0,
          lineTotal: subtotal
        });
      }

      const fees = body.quote?.fees ?? 10000;
      const discount = body.quote?.discount ?? 0;
      const total = subtotal + fees - discount;

      const action = {
        id: actionId,
        publicId: `ZY-EVOS-${shortId.toUpperCase()}`,
        externalActionId: `ord_evos_${shortId}`,
        providerSlug: body.providerSlug || process.env.PROVIDER_SLUG || 'evoss',
        quoteId,
        status: 'AWAITING_PAYMENT',
        paymentStatus: 'PENDING',
        subtotal,
        fees,
        discount,
        total,
        currency: 'UZS',
        customer: customer || { name: 'Mijoz', phone: '+998901234567' },
        lines,
        nextAction: {
          type: 'OPEN_URL',
          url: `https://pay.evos.uz/checkout/${actionId}`,
          label: 'EVOS xavfsiz to‘lov sahifasiga o‘tish'
        },
        fulfillmentType: 'STANDARD',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          destination: destination?.raw || 'Toshkent shahar'
        }
      };

      actionsDb.set(actionId, action);
      actionsDb.set(action.publicId, action);
      if (idempotencyKey) {
        idempotencyDb.set(idempotencyKey, action);
      }

      return sendJson(res, 201, action);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 8. Action Status: GET /actions/:id
  if (method === 'GET' && pathname.startsWith('/actions/')) {
    const actionId = pathname.replace('/actions/', '').replace('/cancel', '');
    const action = actionsDb.get(actionId);
    if (!action) {
      return sendJson(res, 404, { error: 'Action not found', actionId });
    }
    return sendJson(res, 200, action);
  }

  // 9. Cancel Action: POST /actions/:id/cancel
  if (method === 'POST' && pathname.includes('/cancel')) {
    const actionId = pathname.split('/')[2];
    const action = actionsDb.get(actionId);
    if (!action) {
      return sendJson(res, 404, { error: 'Action not found', actionId });
    }
    action.status = 'CANCELLED';
    action.updatedAt = new Date().toISOString();
    return sendJson(res, 200, action);
  }

  // 404 Not Found
  return sendJson(res, 404, {
    error: 'NOT_FOUND',
    message: `Endpoint ${method} ${pathname} not found on EVOS provider server`
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`🚀 EVOS Mock Provider Server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log(`📦 Loaded ${catalogData.offerings.length} offerings across ${catalogData.categories.length} categories`);
  console.log(`====================================================`);
});
