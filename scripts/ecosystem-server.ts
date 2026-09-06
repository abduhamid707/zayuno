import express, { Request, Response } from 'express';
import cors from 'cors';
import { PROVIDERS_25 } from './build-ecosystem-25';

export function createEcosystemApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // In-memory action store for lifecycle tracking
  const actionStore = new Map<string, any>();
  const quoteStore = new Map<string, any>();

  // Resolve target provider from request
  function resolveProvider(req: Request): any {
    // 1. Check API key header: {slug}_secret_live_2026
    const apiKey = (req.headers['x-provider-api-key'] || req.headers['authorization'] || '') as string;
    const keyMatch = apiKey.match(/^([a-z0-9-]+)_secret/i);
    if (keyMatch) {
      const p = PROVIDERS_25.find(c => c.slug === keyMatch[1]);
      if (p) return p;
    }

    // 2. Query param or body
    const slug = (req.query.providerSlug || req.query.provider || req.body?.providerSlug || req.headers['x-provider-slug']) as string;
    if (slug) {
      const p = PROVIDERS_25.find(c => c.slug === slug.toLowerCase().trim());
      if (p) return p;
    }

    // 3. Inspect items offeringId prefix
    const items = req.body?.items || [];
    if (Array.isArray(items) && items.length > 0) {
      const firstId = items[0]?.offeringId || items[0]?.id || '';
      for (const p of PROVIDERS_25) {
        if (p.offerings.some(o => o.id === firstId)) {
          return p;
        }
      }
    }

    // 4. Default to first provider or maxway
    return PROVIDERS_25.find(c => c.slug === 'maxway') || PROVIDERS_25[0];
  }

  // 1. Health check (Always 200 OK & HEALTHY)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'HEALTHY',
      latencyMs: 15,
      message: 'Zayuno Ecosystem Provider Live & Verified',
      timestamp: new Date().toISOString()
    });
  });

  // 2. Provider info
  app.get('/provider-info', (req: Request, res: Response) => {
    const p = resolveProvider(req);
    res.json({
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
  });

  // 3. Locations
  app.get('/locations', (req: Request, res: Response) => {
    const p = resolveProvider(req);
    const locations = p.locations.map((loc: any) => ({
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
    res.json(locations);
  });

  // 4. Catalog
  app.get('/catalog', (req: Request, res: Response) => {
    const p = resolveProvider(req);
    const categorySlug = req.query.category as string;
    let filteredOfferings = p.offerings;
    if (categorySlug) {
      filteredOfferings = filteredOfferings.filter((o: any) => o.category === categorySlug);
    }

    const categoriesMap = new Map<string, any>();
    p.offerings.forEach((o: any) => {
      if (!categoriesMap.has(o.category)) {
        categoriesMap.set(o.category, {
          id: `cat_${o.category}`,
          slug: o.category,
          title: o.category.charAt(0).toUpperCase() + o.category.slice(1).replace(/_/g, ' '),
          displayOrder: categoriesMap.size + 1
        });
      }
    });

    res.json({
      providerSlug: p.slug,
      locationId: req.query.locationId || p.locations[0]?.id,
      categories: Array.from(categoriesMap.values()),
      offerings: filteredOfferings.map((o: any) => ({
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
  });

  // 5. Single Offering
  app.get('/offerings/:id', (req: Request, res: Response) => {
    const p = resolveProvider(req);
    const offeringId = req.params.id;
    const o = p.offerings.find((item: any) => item.id === offeringId);
    if (!o) {
      res.status(404).json({ message: `Offering "${offeringId}" not found in provider "${p.slug}".` });
      return;
    }
    res.json({
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
  });

  // 6. Search Offerings
  app.get('/search', (req: Request, res: Response) => {
    const p = resolveProvider(req);
    const query = (req.query.q || req.query.query || '').toString().toLowerCase();
    const results = p.offerings
      .filter((o: any) => o.title.toLowerCase().includes(query) || o.description.toLowerCase().includes(query))
      .map((o: any) => ({
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
    res.json(results);
  });

  // 7. Availability
  app.post('/availability', (req: Request, res: Response) => {
    res.json({
      isAvailable: true,
      offeringId: req.body?.offeringId || 'unknown',
      timestamp: new Date().toISOString()
    });
  });

  // 8. Quote
  app.post('/quote', (req: Request, res: Response) => {
    const p = resolveProvider(req);
    const items = req.body?.items || [];
    if (items.length === 0) {
      res.status(400).json({ message: 'At least one item is required to request a quote.' });
      return;
    }

    let subtotal = 0;
    const lines = items.map((item: any) => {
      const o = p.offerings.find((cand: any) => cand.id === item.offeringId) || {
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
    const quoteId = `zy_quote_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const quote = {
      id: quoteId,
      providerSlug: p.slug,
      locationId: req.body?.locationId || p.locations[0]?.id,
      lines,
      subtotal,
      fees: feeAmount > 0 ? [{ name: 'Yetkazib berish xizmati', amount: feeAmount }] : [],
      totalFees: feeAmount,
      discounts: [],
      totalDiscount: 0,
      total,
      currency: 'UZS',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      parameters: req.body?.parameters || {}
    };

    quoteStore.set(quoteId, quote);
    res.json(quote);
  });

  // 9. Actions (Order creation)
  app.post('/actions', (req: Request, res: Response) => {
    const p = resolveProvider(req);
    const quoteId = req.body?.quoteId;
    const cachedQuote = quoteId ? quoteStore.get(quoteId) : null;

    let subtotal = cachedQuote ? cachedQuote.subtotal : 0;
    let lines = cachedQuote ? cachedQuote.lines : [];

    if (lines.length === 0) {
      const items = req.body?.items || [];
      lines = items.map((item: any) => {
        const o = p.offerings.find((cand: any) => cand.id === item.offeringId) || {
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
    const actionId = `zy_act_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const publicId = `ZY-ACT-${Math.floor(100000 + Math.random() * 900000)}`;

    const action = {
      id: actionId,
      publicId,
      providerSlug: p.slug,
      providerName: p.name,
      externalActionId: `ext_${Date.now()}`,
      quoteId: quoteId || null,
      locationId: req.body?.locationId || p.locations[0]?.id,
      status: 'CONFIRMED',
      paymentStatus: 'PENDING',
      lines,
      subtotal,
      fees: feeAmount,
      discount: 0,
      total,
      currency: 'UZS',
      customer: req.body?.customer || { name: 'Hurmatli Mijoz' },
      destination: req.body?.destination || null,
      parameters: req.body?.parameters || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [
        {
          id: `evt_${Date.now()}`,
          status: 'CONFIRMED',
          description: 'Buyurtma rasmiylashtirildi va tizim tomonidan tasdiqlandi.',
          source: 'AI_AGENT',
          createdAt: new Date().toISOString()
        }
      ]
    };

    actionStore.set(actionId, action);
    actionStore.set(publicId, action);
    res.json(action);
  });

  // 10. Get Action Status
  app.get('/actions/:id', (req: Request, res: Response) => {
    const actionId = req.params.id;
    const action = actionStore.get(actionId);
    if (!action) {
      // Return a generated fallback action for idempotency
      const p = resolveProvider(req);
      res.json({
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
      return;
    }
    res.json(action);
  });

  // 11. Cancel Action
  app.post('/actions/:id/cancel', (req: Request, res: Response) => {
    const actionId = req.params.id;
    const action = actionStore.get(actionId);
    if (action) {
      action.status = 'CANCELLED';
      action.updatedAt = new Date().toISOString();
    }
    res.json({
      actionId,
      newStatus: 'CANCELLED',
      message: 'Buyurtma muvaffaqiyatli bekor qilindi.'
    });
  });

  // 12. Payment Options
  app.get('/payment-options', (req: Request, res: Response) => {
    const p = resolveProvider(req);
    res.json([
      {
        id: 'pay_click',
        providerSlug: p.slug,
        paymentMethodType: 'PROVIDER_HOSTED_CHECKOUT',
        name: 'Click orqali to‘lov',
        description: 'Click Up ilovasi yoki USSD orqali to‘lov',
        isAvailable: true,
        supportedCurrencies: ['UZS'],
        checkoutUrl: 'https://my.click.uz'
      },
      {
        id: 'pay_payme',
        providerSlug: p.slug,
        paymentMethodType: 'PROVIDER_HOSTED_CHECKOUT',
        name: 'Payme orqali to‘lov',
        description: 'Payme orqali tezkor to‘lov',
        isAvailable: true,
        supportedCurrencies: ['UZS'],
        checkoutUrl: 'https://payme.uz'
      },
      {
        id: 'pay_cash',
        providerSlug: p.slug,
        paymentMethodType: 'CASH_ON_DELIVERY',
        name: 'Qabul qilganda naqd to‘lov',
        description: 'Xizmat yoki mahsulotni qabul qilganda to‘lash',
        isAvailable: true,
        supportedCurrencies: ['UZS']
      }
    ]);
  });

  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 4101;
  const app = createEcosystemApp();
  app.listen(port, () => {
    console.log(`🚀 Zayuno 25 Ecosystem Provider Server listening on port ${port}`);
  });
}
