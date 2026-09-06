import fs from 'fs';
import { PROVIDERS_25 } from './build-ecosystem-25';

function generatePureServer() {
  const code = `// ==============================================================================
// Zayuno 25 Ecosystem Provider Server (Pure Node.js - Zero External Dependencies)
// High-performance HTTP server serving all 25 providers with rich parametersSchema
// ==============================================================================

const http = require('http');
const url = require('url');

const PROVIDERS_25 = ${JSON.stringify(PROVIDERS_25, null, 2)};

// Also include EVOS for backward compatibility with old tests
const EVOS_LEGACY = {
  slug: 'evos',
  name: 'EVOS Fast Food',
  type: 'DELIVERY',
  category: 'food_dining',
  description: 'Toshkent bo‘ylab mazali lavash, shaurma va fast-food yetkazib berish xizmati.',
  rating: 4.8,
  phone: '+998712000555',
  hours: '09:00 - 02:00',
  baseUrl: 'https://evos-sandbox.shopla.uz',
  locations: [
    { id: 'evos-loc-chilonzor', name: 'EVOS Chilonzor filiali', address: 'Toshkent sh., Chilonzor tumani', lat: 41.2851, lng: 69.2034, radius: 10 }
  ],
  offerings: [
    { id: 'evos_set_x', title: 'X Set (Lavash + Fri + Kola)', category: 'combos', price: 48000, description: 'To‘yimli qarsildoq lavash, fri va muzdek kola.' },
    { id: 'evos_lavash_classic', title: 'Klassik Mol go‘shtli Lavash', category: 'wraps', price: 32000, description: 'Original retsept asosida mol go‘shti va sabzavotlar.' }
  ]
};

const ALL_PROVIDERS = [...PROVIDERS_25, EVOS_LEGACY];

const actionStore = new Map();
const quoteStore = new Map();

function resolveProvider(req, parsedUrl, body, pathSlug) {
  // 0. Path prefix /p/:slug
  if (pathSlug) {
    const found = ALL_PROVIDERS.find(c => c.slug === pathSlug);
    if (found) return found;
  }

  // 1. API key header: {slug}_secret_live_2026
  const apiKey = req.headers['x-provider-api-key'] || req.headers['authorization'] || '';
  const keyMatch = String(apiKey).match(/^([a-z0-9-]+)_secret/i);
  if (keyMatch) {
    const found = ALL_PROVIDERS.find(c => c.slug === keyMatch[1]);
    if (found) return found;
  }

  // 2. Query param or body
  const slug = parsedUrl.query.providerSlug || parsedUrl.query.provider || (body && body.providerSlug) || req.headers['x-provider-slug'];
  if (slug) {
    const cleanSlug = String(slug).toLowerCase().trim();
    const found = ALL_PROVIDERS.find(c => c.slug === cleanSlug);
    if (found) return found;
  }

  // 3. Inspect items offeringId
  const items = (body && body.items) || [];
  if (Array.isArray(items) && items.length > 0) {
    const firstId = items[0].offeringId || items[0].id || '';
    for (const p of ALL_PROVIDERS) {
      if (p.offerings.some(o => o.id === firstId)) {
        return p;
      }
    }
  }

  // Default to maxway
  return ALL_PROVIDERS.find(c => c.slug === 'maxway') || ALL_PROVIDERS[0];
}

function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(json),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-provider-api-key, x-provider-slug, idempotency-key'
  });
  res.end(json);
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-provider-api-key, x-provider-slug, idempotency-key'
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname || '/';
  let pathSlug = null;
  const pathMatch = pathname.match(/^\\/p\\/([a-z0-9-]+)(\\/.*)?$/i);
  if (pathMatch) {
    pathSlug = pathMatch[1].toLowerCase();
    pathname = pathMatch[2] || '/';
  }

  let bodyBuffer = '';
  req.on('data', chunk => { bodyBuffer += chunk; });
  req.on('end', () => {
    let body = null;
    if (bodyBuffer) {
      try { body = JSON.parse(bodyBuffer); } catch {}
    }

    const p = resolveProvider(req, parsedUrl, body, pathSlug);

    // 1. Health check
    if (pathname === '/health') {
      return sendJson(res, 200, {
        status: 'HEALTHY',
        latencyMs: 15,
        message: 'Zayuno Ecosystem Provider Live & Verified',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Provider info
    if (pathname === '/provider-info') {
      return sendJson(res, 200, {
        id: p.slug,
        slug: p.slug,
        name: p.name,
        description: p.description,
        status: 'ACTIVE',
        type: p.type,
        category: p.category,
        geography: ['UZ', 'Tashkent'],
        adapterType: 'remote-http',
        authMethod: 'API_KEY',
        capabilities: [
          'METADATA', 'HEALTH', 'LOCATIONS', 'CATALOG', 'SEARCH',
          'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'ACTION_CANCEL',
          'PAYMENT_OPTIONS', 'WEBHOOK'
        ],
        baseUrl: p.baseUrl,
        supportContact: p.phone,
        isCertified: true,
        isPublished: true,
        metadata: {
          environment: 'PRODUCTION',
          tier: 'STANDARD',
          rating: p.rating,
          hours: p.hours
        }
      });
    }

    // 3. Locations
    if (pathname === '/locations') {
      const locations = p.locations.map(loc => ({
        id: loc.id,
        providerId: p.slug,
        providerLocationId: loc.id,
        name: loc.name,
        address: loc.address,
        coordinates: { latitude: loc.lat, longitude: loc.lng },
        operatingHours: { open: '08:00', close: '22:00', days: [1, 2, 3, 4, 5, 6, 7] },
        serviceRadiusKm: loc.radius,
        isActive: true,
        metadata: {}
      }));
      return sendJson(res, 200, locations);
    }

    // 4. Catalog
    if (pathname === '/catalog') {
      const categorySlug = parsedUrl.query.category;
      let filteredOfferings = p.offerings;
      if (categorySlug) {
        filteredOfferings = filteredOfferings.filter(o => o.category === categorySlug);
      }

      const categoriesMap = new Map();
      p.offerings.forEach(o => {
        if (!categoriesMap.has(o.category)) {
          categoriesMap.set(o.category, {
            id: 'cat_' + o.category,
            slug: o.category,
            title: o.category.charAt(0).toUpperCase() + o.category.slice(1).replace(/_/g, ' '),
            displayOrder: categoriesMap.size + 1
          });
        }
      });

      return sendJson(res, 200, {
        providerSlug: p.slug,
        locationId: parsedUrl.query.locationId || p.locations[0]?.id,
        categories: Array.from(categoriesMap.values()),
        offerings: filteredOfferings.map(o => ({
          id: o.id,
          providerId: p.slug,
          offeringCode: o.id.toUpperCase(),
          title: o.title,
          description: o.description,
          categorySlug: o.category,
          categoryTitle: o.category.charAt(0).toUpperCase() + o.category.slice(1).replace(/_/g, ' '),
          basePrice: o.price,
          currency: 'UZS',
          isAvailable: true,
          variants: [],
          optionGroups: [],
          tags: [p.category, o.category],
          parametersSchema: o.parametersSchema || null,
          metadata: {}
        })),
        version: '1.0.0',
        updatedAt: new Date().toISOString()
      });
    }

    // 5. Single Offering
    if (pathname.startsWith('/offerings/')) {
      const offeringId = pathname.slice('/offerings/'.length);
      const o = p.offerings.find(item => item.id === offeringId);
      if (!o) {
        return sendJson(res, 404, { message: 'Offering "' + offeringId + '" not found in provider "' + p.slug + '".' });
      }
      return sendJson(res, 200, {
        id: o.id,
        providerId: p.slug,
        offeringCode: o.id.toUpperCase(),
        title: o.title,
        description: o.description,
        categorySlug: o.category,
        categoryTitle: o.category.charAt(0).toUpperCase() + o.category.slice(1).replace(/_/g, ' '),
        basePrice: o.price,
        currency: 'UZS',
        isAvailable: true,
        variants: [],
        optionGroups: [],
        tags: [p.category, o.category],
        parametersSchema: o.parametersSchema || null,
        metadata: {}
      });
    }

    // 6. Search
    if (pathname === '/search') {
      const query = String(parsedUrl.query.q || parsedUrl.query.query || '').toLowerCase();
      const results = p.offerings
        .filter(o => o.title.toLowerCase().includes(query) || o.description.toLowerCase().includes(query))
        .map(o => ({
          id: o.id,
          providerId: p.slug,
          offeringCode: o.id.toUpperCase(),
          title: o.title,
          description: o.description,
          categorySlug: o.category,
          categoryTitle: o.category.charAt(0).toUpperCase() + o.category.slice(1).replace(/_/g, ' '),
          basePrice: o.price,
          currency: 'UZS',
          isAvailable: true,
          variants: [],
          optionGroups: [],
          tags: [p.category, o.category],
          parametersSchema: o.parametersSchema || null,
          metadata: {}
        }));
      return sendJson(res, 200, results);
    }

    // 7. Availability
    if (pathname === '/availability') {
      return sendJson(res, 200, {
        isAvailable: true,
        offeringId: (body && body.offeringId) || 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    // 8. Quote
    if (pathname === '/quote') {
      const items = (body && body.items) || [];
      if (items.length === 0) {
        return sendJson(res, 400, { message: 'At least one item is required.' });
      }

      let subtotal = 0;
      const lines = items.map(item => {
        const o = p.offerings.find(cand => cand.id === item.offeringId) || {
          id: item.offeringId,
          title: item.offeringId,
          price: 45000
        };
        const qty = item.quantity || 1;
        const lineTotal = o.price * qty;
        subtotal += lineTotal;
        return {
          offeringId: o.id,
          offeringTitle: o.title,
          variantId: item.variantId || null,
          variantTitle: null,
          unitPrice: o.price,
          quantity: qty,
          optionsTotal: 0,
          lineTotal,
          selectedOptions: item.selectedOptions || []
        };
      });

      const feeAmount = p.type === 'DELIVERY' ? 15000 : 0;
      const total = subtotal + feeAmount;
      const quoteId = 'zy_quote_' + Date.now() + '_' + Math.random().toString(36).substring(7);

      const quote = {
        id: quoteId,
        providerSlug: p.slug,
        locationId: (body && body.locationId) || p.locations[0]?.id,
        lines,
        subtotal,
        fees: feeAmount > 0 ? [{ name: 'Yetkazib berish xizmati', amount: feeAmount }] : [],
        totalFees: feeAmount,
        discounts: [],
        totalDiscount: 0,
        total,
        currency: 'UZS',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        parameters: (body && body.parameters) || {}
      };

      quoteStore.set(quoteId, quote);
      return sendJson(res, 200, quote);
    }

    // 9. Actions
    if (pathname === '/actions' && req.method === 'POST') {
      const quoteId = body && body.quoteId;
      const cachedQuote = quoteId ? quoteStore.get(quoteId) : null;

      let subtotal = cachedQuote ? cachedQuote.subtotal : 0;
      let lines = cachedQuote ? cachedQuote.lines : [];

      if (lines.length === 0) {
        const items = (body && body.items) || [];
        lines = items.map(item => {
          const o = p.offerings.find(cand => cand.id === item.offeringId) || {
            id: item.offeringId,
            title: item.offeringId,
            price: 45000
          };
          const qty = item.quantity || 1;
          const lineTotal = o.price * qty;
          subtotal += lineTotal;
          return {
            offeringId: o.id,
            offeringTitle: o.title,
            variantId: null,
            variantTitle: null,
            unitPrice: o.price,
            quantity: qty,
            optionsTotal: 0,
            lineTotal,
            selectedOptions: []
          };
        });
      }

      const feeAmount = p.type === 'DELIVERY' ? 15000 : 0;
      const total = subtotal + feeAmount;
      const actionId = 'zy_act_' + Date.now() + '_' + Math.random().toString(36).substring(7);
      const publicId = 'ZY-ACT-' + Math.floor(100000 + Math.random() * 900000);

      const action = {
        id: actionId,
        publicId,
        providerSlug: p.slug,
        providerName: p.name,
        externalActionId: 'ext_' + Date.now(),
        quoteId: quoteId || null,
        locationId: (body && body.locationId) || p.locations[0]?.id,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        nextAction: {
          type: 'OPEN_URL',
          url: 'https://my.click.uz/services/pay?service_id=12345&transaction_param=' + actionId,
          label: 'To‘lov qilish',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        },
        paymentUrl: 'https://my.click.uz/services/pay?service_id=12345&transaction_param=' + actionId,
        lines,
        subtotal,
        fees: feeAmount,
        discount: 0,
        total,
        currency: 'UZS',
        customer: (body && body.customer) || { name: 'Hurmatli Mijoz' },
        destination: (body && body.destination) || null,
        parameters: (body && body.parameters) || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        events: [
          {
            id: 'evt_' + Date.now(),
            status: 'CONFIRMED',
            description: 'Buyurtma qabul qilindi va ijroga yo‘naltirildi.',
            source: 'AI_AGENT',
            createdAt: new Date().toISOString()
          }
        ]
      };

      actionStore.set(actionId, action);
      actionStore.set(publicId, action);
      return sendJson(res, 200, action);
    }

    // 10. Payment Options (supports both /payment-options and /actions/:id/payment-options)
    if (pathname === '/payment-options' || pathname.endsWith('/payment-options')) {
      const actId = pathname.replace('/payment-options', '').replace('/actions/', '') || 'act_default';
      return sendJson(res, 200, [
        {
          id: 'pay_click',
          name: 'Click orqali to‘lov',
          type: 'CLICK',
          isOnline: true,
          checkoutUrl: 'https://my.click.uz/services/pay?service_id=12345&transaction_param=' + actId,
          supportedCurrencies: ['UZS']
        },
        {
          id: 'pay_payme',
          name: 'Payme orqali to‘lov',
          type: 'PAYME',
          isOnline: true,
          checkoutUrl: 'https://checkout.payme.uz/' + actId,
          supportedCurrencies: ['UZS']
        },
        {
          id: 'pay_cash',
          name: 'Qabul qilganda naqd to‘lov',
          type: 'CASH_ON_DELIVERY',
          isOnline: false,
          supportedCurrencies: ['UZS']
        }
      ]);
    }

    // 11. Payment Processing Simulator
    if (pathname.includes('/pay') && req.method === 'POST') {
      const actId = pathname.replace('/pay', '').replace('/actions/', '');
      const action = actionStore.get(actId);
      if (action) {
        action.paymentStatus = 'PAID';
        action.status = 'CONFIRMED';
        action.updatedAt = new Date().toISOString();
        action.events.push({
          id: 'evt_' + Date.now(),
          status: 'CONFIRMED',
          description: 'To‘lov muvaffaqiyatli qabul qilindi.',
          source: 'PROVIDER_WEBHOOK',
          createdAt: new Date().toISOString()
        });
      }
      return sendJson(res, 200, {
        success: true,
        actionId: actId,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        message: 'To‘lov muvaffaqiyatli amalga oshirildi.'
      });
    }

    // 12. Action Status & Cancel
    if (pathname.startsWith('/actions/')) {
      const actionId = pathname.slice('/actions/'.length).replace('/cancel', '');
      if (pathname.endsWith('/cancel')) {
        const action = actionStore.get(actionId);
        if (action) {
          action.status = 'CANCELLED';
          action.updatedAt = new Date().toISOString();
        }
        return sendJson(res, 200, {
          actionId,
          newStatus: 'CANCELLED',
          message: 'Buyurtma muvaffaqiyatli bekor qilindi.'
        });
      }

      const action = actionStore.get(actionId);
      if (action) {
        return sendJson(res, 200, action);
      }
      return sendJson(res, 200, {
        id: actionId,
        publicId: actionId,
        providerSlug: p.slug,
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        total: 100000,
        currency: 'UZS',
        lines: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // Default 404
    sendJson(res, 404, { message: 'Not found: ' + pathname });
  });
});

const port = process.env.PORT || 4101;
server.listen(port, () => {
  console.log('🚀 Zayuno 25 Universal Ecosystem Server listening on port ' + port);
});
`;

  fs.writeFileSync('scripts/ecosystem-server.js', code);
  console.log('Generated standalone scripts/ecosystem-server.js successfully!');
}

generatePureServer();
