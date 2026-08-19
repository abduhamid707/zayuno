import express, { Request, Response, Express } from 'express';
import cors from 'cors';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  EVOS_BRANCHES,
  EVOS_CATEGORIES,
  EVOS_PRODUCTS,
  EvosProduct,
  EvosBranch
} from './data';

export interface EvosStoredOrder {
  evos_order_id: string;
  zayuno_order_id?: string;
  idempotency_key?: string;
  branch_code?: string;
  items: Array<{
    evos_id: string;
    title: string;
    variant_id?: string;
    variant_title?: string;
    mods?: Array<{ mod_id: string; title: string; cost: number }>;
    qty: number;
    unit_price: number;
    total_price: number;
  }>;
  subtotal: number;
  delivery_price: number;
  discount: number;
  total_price: number;
  currency: string;
  order_status: 'NEW' | 'AWAITING_PAY' | 'PAID' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
  payment_method?: string;
  payment_status: 'PENDING' | 'PAID' | 'FAILED';
  payment_url?: string;
  client: {
    name: string;
    phone: string;
  };
  destination?: {
    address: string;
    lat?: number;
    lng?: number;
  };
  created_at: string;
  updated_at: string;
}

export function createMockEvosApp(): Express {
  const app: Express = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const ordersDb = new Map<string, EvosStoredOrder>();
  const idempotencyMap = new Map<string, string>(); // idempotency_key -> evos_order_id

  const WEBHOOK_SECRET = process.env.ZAYUNO_WEBHOOK_SECRET || 'zayuno_webhook_secret_evos_test_key_123';
  const ZAYUNO_API_URL = process.env.API_BASE_URL || 'http://localhost:4000';
  const PORT = process.env.MOCK_EVOS_PORT || 4001;

  // Helper to determine public base URL dynamically (from runtime-urls.json, env, or tunnel headers)
  function getEffectiveBaseUrl(req?: Request): string {
    if (process.env.MOCK_EVOS_PUBLIC_BASE_URL && !process.env.MOCK_EVOS_PUBLIC_BASE_URL.includes('localhost')) {
      return process.env.MOCK_EVOS_PUBLIC_BASE_URL.replace(/\/$/, '');
    }
    if (process.env.MOCK_EVOS_PUBLIC_URL && !process.env.MOCK_EVOS_PUBLIC_URL.includes('localhost')) {
      return process.env.MOCK_EVOS_PUBLIC_URL.replace(/\/$/, '');
    }


    try {
      const p = path.join(process.cwd(), 'runtime-urls.json');
      if (fs.existsSync(p)) {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (data.mockEvosUrl && !data.mockEvosUrl.includes('localhost')) {
          return data.mockEvosUrl.replace(/\/$/, '');
        }
      }
    } catch {}

    if (process.env.MOCK_EVOS_BASE_URL && !process.env.MOCK_EVOS_BASE_URL.includes('localhost')) {
      return process.env.MOCK_EVOS_BASE_URL.replace(/\/$/, '');
    }
    if (req) {
      const forwardedProto = (req.headers['x-forwarded-proto'] as string) || 'https';
      const forwardedHost = (req.headers['x-forwarded-host'] as string) || req.headers['host'];
      if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
        return `${forwardedProto}://${forwardedHost}`;
      }
    }
    return (process.env.MOCK_EVOS_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
  }

  // Helper to send HMAC signed webhook to Zayuno
  async function dispatchWebhookToZayuno(eventType: string, order: EvosStoredOrder): Promise<void> {
    const webhookUrl = `${ZAYUNO_API_URL}/api/v1/webhooks/providers/evos`;
    const payload = {
      event_id: `evos_evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      event_type: eventType,
      evos_order_id: order.evos_order_id,
      zayuno_order_id: order.zayuno_order_id,
      status: order.order_status,
      payment_status: order.payment_status,
      timestamp: new Date().toISOString(),
      data: order
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

    try {
      console.log(`[Mock EVOS] Dispatching webhook ${eventType} for order ${order.evos_order_id} -> ${webhookUrl}`);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-zayuno-signature': signature,
          'x-provider-signature': signature
        },
        body: rawBody
      });
      console.log(`[Mock EVOS] Webhook response status: ${res.status}`);
    } catch (err: any) {
      console.warn(`[Mock EVOS] Webhook dispatch warning (Zayuno API may not be reachable): ${err.message}`);
    }
  }

  // 1. Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Mock EVOS API Server & Payment Portal',
      version: '1.0.0',
      publicBaseUrl: getEffectiveBaseUrl(req)
    });
  });

  // 2. GET /branches
  app.get('/branches', (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: EVOS_BRANCHES
    });
  });

  // 3. GET /menu
  app.get('/menu', (req: Request, res: Response) => {
    const branchCode = req.query.branch_code as string | undefined;
    res.json({
      success: true,
      provider: 'EVOS Fast Food',
      branch_code: branchCode || 'evos_branch_chilonzor_1',
      categories: EVOS_CATEGORIES,
      products: EVOS_PRODUCTS,
      server_time: new Date().toISOString()
    });
  });

  // 4. GET /products/:id
  app.get('/products/:id', (req: Request, res: Response) => {
    const productId = String(req.params.id);
    const product = EVOS_PRODUCTS.find(p => p.evos_id === productId);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.json({ success: true, data: product });
  });

  // 5. POST /availability
  app.post('/availability', (req: Request, res: Response) => {
    const items = req.body.items || [];
    const results = items.map((item: any) => {
      const prod = EVOS_PRODUCTS.find(p => p.evos_id === item.evos_id || p.evos_id === item.product_id);
      return {
        evos_id: item.evos_id || item.product_id,
        is_available: prod ? prod.in_stock : false
      };
    });

    const isAllAvailable = results.every((r: any) => r.is_available);
    res.json({
      success: true,
      all_available: isAllAvailable,
      items: results
    });
  });

  // 6. POST /orders/quote
  app.post('/orders/quote', (req: Request, res: Response) => {
    const { items, delivery_type, branch_code } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Items array is required' });
      return;
    }

    let subtotal = 0;
    const pricedItems = items.map((reqItem: any) => {
      const prod = EVOS_PRODUCTS.find(p => p.evos_id === reqItem.evos_id || p.evos_id === reqItem.product_id);
      if (!prod) {
        throw new Error(`Product not found: ${reqItem.evos_id || reqItem.product_id}`);
      }

      let unitPrice = prod.cost;
      let variantTitle: string | undefined;

      if (reqItem.variant_id && prod.variants) {
        const variant = prod.variants.find(v => v.var_id === reqItem.variant_id);
        if (variant) {
          unitPrice = variant.price;
          variantTitle = variant.title;
        }
      }

      let modsTotal = 0;
      const appliedMods: Array<{ mod_id: string; title: string; cost: number }> = [];

      if (reqItem.mods && Array.isArray(reqItem.mods) && prod.modifier_groups) {
        for (const m of reqItem.mods) {
          for (const group of prod.modifier_groups) {
            const foundMod = group.options.find(opt => opt.mod_id === (m.mod_id || m.modifier_id));
            if (foundMod) {
              modsTotal += foundMod.extra_cost;
              appliedMods.push({
                mod_id: foundMod.mod_id,
                title: foundMod.title,
                cost: foundMod.extra_cost
              });
            }
          }
        }
      }

      const singleItemPrice = unitPrice + modsTotal;
      const qty = reqItem.qty || reqItem.quantity || 1;
      const totalItemPrice = singleItemPrice * qty;
      subtotal += totalItemPrice;

      return {
        evos_id: prod.evos_id,
        title: prod.title,
        variant_id: reqItem.variant_id,
        variant_title: variantTitle,
        mods: appliedMods,
        qty,
        unit_price: singleItemPrice,
        total_price: totalItemPrice
      };
    });

    const isDelivery = delivery_type !== 'PICKUP' && delivery_type !== 'pickup';
    const deliveryPrice = isDelivery ? 15000 : 0;
    const discount = 0;
    const total = subtotal + deliveryPrice - discount;

    const quoteId = `evos_quote_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    res.json({
      success: true,
      quote_id: quoteId,
      branch_code: branch_code || 'evos_branch_chilonzor_1',
      items: pricedItems,
      subtotal,
      delivery_price: deliveryPrice,
      discount,
      total_price: total,
      currency: 'UZS',
      estimated_delivery_min: 25,
      expires_at: expiresAt
    });
  });

  // 7. POST /orders
  app.post('/orders', (req: Request, res: Response) => {
    const {
      idempotency_key,
      zayuno_order_id,
      items,
      delivery_type,
      branch_code,
      client,
      destination,
      payment_method
    } = req.body;

    const baseUrl = getEffectiveBaseUrl(req);

    if (idempotency_key && idempotencyMap.has(idempotency_key)) {
      const existingOrderId = idempotencyMap.get(idempotency_key)!;
      const existingOrder = ordersDb.get(existingOrderId);
      if (existingOrder) {
        console.log(`[Mock EVOS] Idempotent hit for key ${idempotency_key} -> returning order ${existingOrderId}`);
        res.json({ success: true, data: existingOrder, is_idempotent_duplicate: true });
        return;
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, error: 'Items are required' });
      return;
    }

    let subtotal = 0;
    const orderedItems = items.map((reqItem: any) => {
      const prod = EVOS_PRODUCTS.find(p => p.evos_id === reqItem.evos_id || p.evos_id === reqItem.product_id);
      const unitPrice = reqItem.unit_price || (prod ? prod.cost : 30000);
      const qty = reqItem.qty || reqItem.quantity || 1;
      const totalPrice = unitPrice * qty;
      subtotal += totalPrice;

      return {
        evos_id: reqItem.evos_id || reqItem.product_id,
        title: reqItem.title || (prod ? prod.title : 'EVOS Item'),
        variant_id: reqItem.variant_id,
        variant_title: reqItem.variant_title,
        mods: reqItem.mods || [],
        qty,
        unit_price: unitPrice,
        total_price: totalPrice
      };
    });

    const isDelivery = delivery_type !== 'PICKUP' && delivery_type !== 'pickup';
    const deliveryPrice = isDelivery ? 15000 : 0;
    const totalPrice = subtotal + deliveryPrice;

    const evosOrderId = `EVOS-ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const paymentUrl = `${baseUrl}/mock/pay/${evosOrderId}`;

    const newOrder: EvosStoredOrder = {
      evos_order_id: evosOrderId,
      zayuno_order_id,
      idempotency_key,
      branch_code: branch_code || 'evos_branch_chilonzor_1',
      items: orderedItems,
      subtotal,
      delivery_price: deliveryPrice,
      discount: 0,
      total_price: totalPrice,
      currency: 'UZS',
      order_status: payment_method === 'cash' ? 'ACCEPTED' : 'AWAITING_PAY',
      payment_method: payment_method || 'payme',
      payment_status: payment_method === 'cash' ? 'PENDING' : 'PENDING',
      payment_url: paymentUrl,
      client: {
        name: client?.name || 'Hurmatli Mijoz',
        phone: client?.phone || '+998901234567'
      },
      destination: {
        address: destination?.address || 'Toshkent sh.',
        lat: destination?.lat,
        lng: destination?.lng
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    ordersDb.set(evosOrderId, newOrder);
    if (idempotency_key) {
      idempotencyMap.set(idempotency_key, evosOrderId);
    }

    console.log(`[Mock EVOS] Created Order: ${evosOrderId} (Total: ${totalPrice} UZS, Payment URL: ${paymentUrl})`);

    res.status(201).json({
      success: true,
      data: newOrder
    });
  });

  // 8. GET /orders/:id
  app.get('/orders/:id', (req: Request, res: Response) => {
    const orderId = String(req.params.id);
    const order = ordersDb.get(orderId);
    if (!order) {
      res.status(404).json({ success: false, error: 'EVOS Order not found' });
      return;
    }
    res.json({ success: true, data: order });
  });

  // 9. POST /orders/:id/cancel
  app.post('/orders/:id/cancel', async (req: Request, res: Response) => {
    const orderId = String(req.params.id);
    const order = ordersDb.get(orderId);
    if (!order) {
      res.status(404).json({ success: false, error: 'EVOS Order not found' });
      return;
    }

    if (order.order_status === 'DELIVERING' || order.order_status === 'DELIVERED') {
      res.status(400).json({ success: false, error: 'Cannot cancel order in delivering/delivered state' });
      return;
    }

    order.order_status = 'CANCELLED';
    order.updated_at = new Date().toISOString();
    ordersDb.set(order.evos_order_id, order);

    await dispatchWebhookToZayuno('ORDER_CANCELLED', order);

    res.json({ success: true, message: 'Order successfully cancelled', data: order });
  });

  // 10. GET /orders/:id/payment-options
  app.get('/orders/:id/payment-options', (req: Request, res: Response) => {
    const orderId = String(req.params.id);
    const baseUrl = getEffectiveBaseUrl(req);
    const paymentUrl = `${baseUrl}/mock/pay/${orderId}`;

    res.json({
      success: true,
      data: [
        {
          type: 'payme',
          label: 'Payme orqali to‘lash',
          payment_url: paymentUrl,
          is_available: true
        },
        {
          type: 'card',
          label: 'Bank kartasi (Uzcard / Humo / Visa)',
          payment_url: paymentUrl,
          is_available: true
        },
        {
          type: 'cash',
          label: 'Kuryerga naqd to‘lov',
          is_available: true
        }
      ]
    });
  });

  // 11. POST /mock/pay/:orderId (API payment trigger)
  app.post('/mock/pay/:orderId', async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId);
    const { action } = req.body; // 'success' | 'fail'
    const order = ordersDb.get(orderId);

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (action === 'fail') {
      order.payment_status = 'FAILED';
      order.order_status = 'CANCELLED';
      order.updated_at = new Date().toISOString();
      await dispatchWebhookToZayuno('PAYMENT_FAILED', order);
      res.json({ success: true, status: 'PAYMENT_FAILED', order });
      return;
    }

    order.payment_status = 'PAID';
    order.order_status = 'ACCEPTED';
    order.updated_at = new Date().toISOString();
    ordersDb.set(orderId, order);

    await dispatchWebhookToZayuno('PAYMENT_COMPLETED', order);

    res.json({
      success: true,
      status: 'PAYMENT_COMPLETED',
      order
    });
  });

  // 12. POST /mock/status/:orderId (Status transition simulator)
  app.post('/mock/status/:orderId', async (req: Request, res: Response) => {
    const orderId = String(req.params.orderId);
    const { status } = req.body;
    const order = ordersDb.get(orderId);

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    const validStatuses = ['ACCEPTED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    order.order_status = status as any;
    order.updated_at = new Date().toISOString();
    ordersDb.set(orderId, order);

    let eventType = `ORDER_${status}`;
    if (status === 'COMPLETED') eventType = 'ORDER_COMPLETED';
    if (status === 'DELIVERED') eventType = 'ORDER_DELIVERED';

    await dispatchWebhookToZayuno(eventType, order);

    res.json({ success: true, message: `Status updated to ${status}`, order });
  });

  // 13. Interactive Mock Payment UI: GET /mock/pay/:orderId
  app.get('/mock/pay/:orderId', (req: Request, res: Response) => {
    const orderId = String(req.params.orderId);
    const order = ordersDb.get(orderId);

    const itemsHtml = order
      ? order.items
          .map(
            it => `
        <div class="flex justify-between py-2 border-b border-gray-100 text-sm">
          <div>
            <span class="font-semibold text-gray-800">${it.qty} × ${it.title}</span>
            ${it.variant_title ? `<span class="text-xs text-gray-500 block">Variant: ${it.variant_title}</span>` : ''}
            ${
              it.mods && it.mods.length > 0
                ? `<span class="text-xs text-amber-600 block">+ ${it.mods.map(m => m.title).join(', ')}</span>`
                : ''
            }
          </div>
          <span class="font-medium text-gray-900">${(it.total_price).toLocaleString('uz-UZ')} UZS</span>
        </div>`
          )
          .join('')
      : '<p class="text-gray-500 text-sm">Buyurtma maʼlumotlari yuklanmoqda...</p>';

    const html = `
<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EVOS Checkout & Payment Portal</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 min-h-screen flex items-center justify-center p-4">
  <div class="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-amber-900/10 border border-amber-100 overflow-hidden">
    <!-- Header -->
    <div class="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white text-center relative">
      <div class="inline-flex items-center justify-center w-14 h-14 bg-white/15 backdrop-blur-md rounded-2xl mb-3 text-2xl font-black shadow-inner">
        🥙
      </div>
      <h1 class="text-2xl font-extrabold tracking-tight">EVOS To‘lov Markazi</h1>
      <p class="text-emerald-100 text-xs font-medium mt-1">Xavfsiz Onlayn To‘lov Shlyuzi (Public HTTPS)</p>
      <div class="mt-3 inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-mono tracking-wide">
        Order: ${orderId}
      </div>
    </div>

    <!-- Order Summary -->
    <div class="p-6">
      <div class="mb-4">
        <h2 class="text-xs uppercase tracking-wider text-gray-400 font-bold mb-3">Buyurtma tarkibi</h2>
        <div class="space-y-1 bg-stone-50 rounded-2xl p-4 border border-stone-100">
          ${itemsHtml}
          
          <div class="pt-3 border-t border-stone-200 mt-2 space-y-1 text-xs text-gray-600">
            <div class="flex justify-between">
              <span>Mahsulotlar:</span>
              <span class="font-medium">${(order ? order.subtotal : 0).toLocaleString('uz-UZ')} UZS</span>
            </div>
            <div class="flex justify-between">
              <span>Yetkazib berish:</span>
              <span class="font-medium">${(order ? order.delivery_price : 0).toLocaleString('uz-UZ')} UZS</span>
            </div>
            <div class="flex justify-between text-base font-extrabold text-emerald-800 pt-2 border-t border-stone-200">
              <span>Jami To‘lov:</span>
              <span>${(order ? order.total_price : 0).toLocaleString('uz-UZ')} UZS</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Current Status Badge -->
      <div class="mb-6 flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <span class="text-xs font-semibold text-amber-800">Hozirgi holat:</span>
        <span id="orderStatusBadge" class="text-xs font-bold px-2.5 py-1 bg-amber-200 text-amber-900 rounded-lg">
          ${order ? order.order_status : 'UNKNOWN'}
        </span>
      </div>

      <!-- Actions -->
      <div class="space-y-2.5">
        <button onclick="handlePayment('success')" class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 transition duration-150 active:scale-[0.98] flex items-center justify-center gap-2">
          <span>💳</span> Payme orqali to‘lash (Muvaffaqiyatli)
        </button>

        <button onclick="handlePayment('fail')" class="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-2xl border border-rose-200 transition duration-150 active:scale-[0.98] flex items-center justify-center gap-2 text-sm">
          <span>❌</span> To‘lovni bekor qilish / rad etish
        </button>
      </div>

      <!-- Status Stepper Simulator -->
      <div class="mt-6 pt-4 border-t border-gray-100">
        <p class="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2 text-center">Bosqichlarni test qilish (Kitchen & Delivery Simulator)</p>
        <div class="grid grid-cols-2 gap-2 text-xs">
          <button onclick="advanceStatus('PREPARING')" class="py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition">
            👨‍🍳 Oshxonada (PREPARING)
          </button>
          <button onclick="advanceStatus('READY')" class="py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition">
            📦 Tayyor (READY)
          </button>
          <button onclick="advanceStatus('DELIVERING')" class="py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-medium transition">
            🛵 Yo‘lda (DELIVERING)
          </button>
          <button onclick="advanceStatus('COMPLETED')" class="py-2 px-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl font-bold transition">
            ✅ Yetkazildi (COMPLETED)
          </button>
        </div>
      </div>

      <div id="resultBox" class="mt-4 hidden p-3 rounded-xl text-xs font-mono transition"></div>
    </div>
  </div>

  <script>
    async function handlePayment(action) {
      const box = document.getElementById('resultBox');
      box.classList.remove('hidden');
      box.className = 'mt-4 p-3 rounded-xl text-xs font-mono bg-blue-50 text-blue-800 border border-blue-200';
      box.innerText = 'Toʻlov amalga oshirilmoqda va Zayunoga webhook yuborilmoqda...';

      try {
        const res = await fetch('/mock/pay/${orderId}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
        const data = await res.json();
        
        if (action === 'success') {
          box.className = 'mt-4 p-3 rounded-xl text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200';
          box.innerHTML = '✅ <strong>TO‘LOV MUVAFFAQITYATLI!</strong> Webhook Zayuno tizimiga jo‘natildi. ChatGPT / AI agent order statusini yangiladi.';
          document.getElementById('orderStatusBadge').innerText = data.order.order_status;
          document.getElementById('orderStatusBadge').className = 'text-xs font-bold px-2.5 py-1 bg-emerald-200 text-emerald-900 rounded-lg';
        } else {
          box.className = 'mt-4 p-3 rounded-xl text-xs font-mono bg-rose-50 text-rose-800 border border-rose-200';
          box.innerHTML = '❌ <strong>TO‘LOV RAD ETILDI / BEKOR QILINDI.</strong>';
          document.getElementById('orderStatusBadge').innerText = 'CANCELLED';
        }
      } catch (err) {
        box.className = 'mt-4 p-3 rounded-xl text-xs font-mono bg-rose-50 text-rose-800 border border-rose-200';
        box.innerText = 'Xatolik: ' + err.message;
      }
    }

    async function advanceStatus(status) {
      const box = document.getElementById('resultBox');
      box.classList.remove('hidden');
      box.className = 'mt-4 p-3 rounded-xl text-xs font-mono bg-amber-50 text-amber-800 border border-amber-200';
      box.innerText = 'Status yangilanmoqda: ' + status + '...';

      try {
        const res = await fetch('/mock/status/${orderId}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        const data = await res.json();
        box.className = 'mt-4 p-3 rounded-xl text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200';
        box.innerHTML = '⚡ Status yangilandi: <strong>' + status + '</strong>. Webhook Zayuno tizimiga yetkazildi.';
        document.getElementById('orderStatusBadge').innerText = status;
      } catch (err) {
        box.className = 'mt-4 p-3 rounded-xl text-xs font-mono bg-rose-50 text-rose-800 border border-rose-200';
        box.innerText = 'Xatolik: ' + err.message;
      }
    }
  </script>
</body>
</html>
    `;

    res.send(html);
  });

  return app;
}
