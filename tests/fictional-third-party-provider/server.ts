import http from 'http';
import crypto from 'crypto';

export const FICTIONAL_PROVIDER_PORT = 5005;
export const FICTIONAL_PROVIDER_SLUG = 'apex-couriers';

// Internal memory store of the fictional provider
const actionsStore = new Map<string, any>();
const idempotencyStore = new Map<string, string>();

export function createFictionalProviderServer() {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${FICTIONAL_PROVIDER_PORT}`);
    const method = req.method || 'GET';

    const sendJson = (status: number, data: any) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // Body parser helper
    let body: any = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawText = Buffer.concat(chunks).toString('utf8');
      if (rawText) {
        try {
          body = JSON.parse(rawText);
        } catch {
          body = rawText;
        }
      }
    }

    // 1. GET /provider-info
    if (method === 'GET' && url.pathname === '/provider-info') {
      return sendJson(200, {
        id: 'apex_couriers_live',
        slug: FICTIONAL_PROVIDER_SLUG,
        name: 'Apex Express Couriers',
        description: 'Third-party independent urban logistics and parcel delivery network.',
        status: 'ACTIVE',
        type: 'DELIVERY',
        category: 'logistics',
        geography: ['UZ', 'Tashkent'],
        capabilities: ['METADATA', 'HEALTH', 'CATALOG', 'QUOTE', 'ACTION_CREATE', 'ACTION_STATUS', 'WEBHOOK'],
        baseUrl: `http://localhost:${FICTIONAL_PROVIDER_PORT}`,
        supportContact: '+998712000000',
        metadata: {
          fleet: 'Electric cargo bikes & vans',
          coverage: 'Tashkent City Metropolitan Area'
        }
      });
    }

    // 2. GET /health
    if (method === 'GET' && url.pathname === '/health') {
      return sendJson(200, {
        status: 'HEALTHY',
        latencyMs: 3,
        timestamp: new Date().toISOString()
      });
    }

    // 3. GET /catalog
    if (method === 'GET' && url.pathname === '/catalog') {
      return sendJson(200, {
        providerSlug: FICTIONAL_PROVIDER_SLUG,
        categories: [
          {
            id: 'cat_courier',
            slug: 'same-day',
            name: 'Same Day Dispatch',
            description: 'Fast urban courier services',
            sortOrder: 1
          }
        ],
        offerings: [
          {
            id: 'apex_pkg_standard',
            offeringCode: 'APEX_STD',
            providerSlug: FICTIONAL_PROVIDER_SLUG,
            categorySlug: 'same-day',
            title: 'Standard Urban Parcel Delivery',
            description: 'Door-to-door delivery within 90 minutes across Tashkent.',
            basePrice: 30000,
            currency: 'UZS',
            isAvailable: true,
            optionGroups: []
          }
        ],
        version: '1.0.0',
        updatedAt: new Date().toISOString()
      });
    }

    // 4. GET /offerings/:id
    if (method === 'GET' && url.pathname.startsWith('/offerings/')) {
      const offeringId = url.pathname.replace('/offerings/', '');
      return sendJson(200, {
        id: offeringId,
        offeringCode: 'APEX_STD',
        providerSlug: FICTIONAL_PROVIDER_SLUG,
        title: 'Standard Urban Parcel Delivery',
        basePrice: 30000,
        currency: 'UZS',
        isAvailable: true,
        optionGroups: []
      });
    }

    // 5. POST /quote
    if (method === 'POST' && url.pathname === '/quote') {
      const items = body.items || [];
      const quantity = items[0]?.quantity || 1;
      const subtotal = 30000 * quantity;
      const fee = 5000;
      const total = subtotal + fee;

      const quoteId = `quote_apex_${Date.now()}`;
      return sendJson(200, {
        id: quoteId,
        providerSlug: FICTIONAL_PROVIDER_SLUG,
        lines: [
          {
            offeringId: 'apex_pkg_standard',
            offeringTitle: 'Standard Urban Parcel Delivery',
            unitPrice: 30000,
            quantity,
            optionsTotal: 0,
            lineTotal: subtotal,
            selectedOptions: []
          }
        ],
        subtotal,
        fees: [{ name: 'Urban Dispatch Handling', amount: fee }],
        totalFees: fee,
        discounts: [],
        totalDiscount: 0,
        total,
        currency: 'UZS',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        estimatedDurationMinutes: 90
      });
    }

    // 6. POST /actions
    if (method === 'POST' && url.pathname === '/actions') {
      const idempKey = req.headers['idempotency-key'] as string || body.idempotencyKey;

      // Idempotency check
      if (idempKey && idempotencyStore.has(idempKey)) {
        const existingId = idempotencyStore.get(idempKey)!;
        return sendJson(200, actionsStore.get(existingId));
      }

      const externalActionId = `apex_order_${Date.now()}`;
      const checkoutUrl = `https://checkout.apex-couriers.example/pay/${externalActionId}`;

      const action = {
        id: externalActionId,
        externalActionId,
        providerSlug: FICTIONAL_PROVIDER_SLUG,
        status: 'AWAITING_PAYMENT',
        nextAction: {
          type: 'OPEN_URL',
          url: checkoutUrl,
          label: 'Pay now with Apex Checkout',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        },
        lines: [
          {
            offeringId: 'apex_pkg_standard',
            offeringTitle: 'Standard Urban Parcel Delivery',
            unitPrice: 30000,
            quantity: body.items?.[0]?.quantity || 1,
            lineTotal: 30000 * (body.items?.[0]?.quantity || 1)
          }
        ],
        subtotal: 30000 * (body.items?.[0]?.quantity || 1),
        fees: 5000,
        discount: 0,
        total: (30000 * (body.items?.[0]?.quantity || 1)) + 5000,
        currency: 'UZS',
        customer: body.customer,
        paymentUrl: checkoutUrl,
        idempotencyKey: idempKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      actionsStore.set(externalActionId, action);
      if (idempKey) {
        idempotencyStore.set(idempKey, externalActionId);
      }

      return sendJson(201, action);
    }

    // 7. GET /actions/:id
    if (method === 'GET' && url.pathname.startsWith('/actions/')) {
      const actionId = url.pathname.replace('/actions/', '');
      const action = actionsStore.get(actionId) || Array.from(actionsStore.values()).find(a => a.id === actionId || a.externalActionId === actionId);

      if (!action) {
        return sendJson(404, { error: 'NOT_FOUND', message: `Action ${actionId} not found in Apex backend.` });
      }

      return sendJson(200, action);
    }

    // Fallback 404
    sendJson(404, { error: 'NOT_FOUND', message: `Endpoint ${method} ${url.pathname} not found.` });
  });

  return server;
}
