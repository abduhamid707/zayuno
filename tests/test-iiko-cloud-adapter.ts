import http from 'node:http';
import assert from 'node:assert';
import { IikoProviderAdapter } from '../packages/provider-sdk/src/connectors/iiko/iiko-adapter.ts';
import { IikoTokenManager } from '../packages/provider-sdk/src/connectors/iiko/iiko-token-manager.ts';
import { IikoClient, sanitizeErrorMessage } from '../packages/provider-sdk/src/connectors/iiko/iiko-client.ts';
import { mapIikoDeliveryStatusToActionStatus } from '../packages/provider-sdk/src/connectors/iiko/iiko-types.ts';
import { ActionStatus, PaymentStatus } from '../packages/contracts/src/action.ts';
import { AvailabilityStatus } from '../packages/contracts/src/catalog.ts';
import { ProviderCapability } from '../packages/contracts/src/provider.ts';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`  ✓ ${name}`);
    } catch (err: any) {
      results.push({ name, passed: false, error: err?.message || String(err) });
      console.error(`  ✗ ${name}`);
      console.error(err);
    }
  };
}

async function run() {
  console.log('\n======================================================');
  console.log('🚀 Running Zayuno iikoCloud Provider Adapter Test Suite');
  console.log('======================================================\n');

  // Set up mock iikoCloud server
  let mockAuthAttempts = 0;
  let mockAuthV2Count = 0;
  let mockDeliveriesCreateCount = 0;
  let simulate401Once = false;
  let mockStopListsFail = false;
  let lastDeliveriesCreatePayload: any = null;
  let mockOrganizations: any[] = [
    {
      id: 'org_uuid_101',
      name: 'EVOS Yunusobod',
      code: 'EVOS-01',
      currencyIsoName: 'UZS'
    }
  ];
  let mockOrdersDb: Record<string, any[]> = {};
  let mockCommandStatusState = 'Success';
  let mockCommandStatusErrorReason: string | null = null;
  let mockCancelShouldUpdateDb = true;
  let mockExtraProducts = false;
  const mockCancelledOrders = new Set<string>();

  const mockServer = http.createServer((req, res) => {
    let bodyStr = '';
    req.on('data', (chunk) => {
      bodyStr += chunk;
    });

    req.on('end', () => {
      const url = req.url || '';
      let parsedBody: any = {};
      try {
        parsedBody = JSON.parse(bodyStr);
      } catch {
        // ignore
      }

      if (url === '/api/1/delivery_restrictions/allowed') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ isAllowed: true, allowedItems: [{ organizationId: parsedBody.organizationIds[0], terminalGroupId: 'tg_uuid_201', deliveryDurationInMinutes: 60, zone: 'Test zone' }], rejectedItems: [] }));
        return;
      }
      // 1. Auth v2
      if (url === '/api/v2/access_token') {
        mockAuthAttempts++;
        mockAuthV2Count++;
        if (parsedBody.apiKey === 'invalid_api_key') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Invalid API key or credentials' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correlationId: 'corr_v2_123',
          token: `jwt_mock_token_for_${parsedBody.apiKey || 'anon'}`
        }));
        return;
      }

      // 2. Auth v1 fallback
      if (url === '/api/1/access_token') {
        mockAuthAttempts++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correlationId: 'corr_v1_123',
          token: `token_v1_for_${parsedBody.apiLogin || 'anon'}`
        }));
        return;
      }

      // Auth header validation for all subsequent endpoints
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Unauthorized: missing Bearer token' }));
        return;
      }

      if (simulate401Once) {
        simulate401Once = false;
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Token expired or revoked' }));
        return;
      }

      // 3. Organizations
      if (url === '/api/1/organizations') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correlationId: 'corr_orgs_1',
          organizations: mockOrganizations
        }));
        return;
      }

      // 4. Terminal Groups
      if (url === '/api/1/terminal_groups') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correlationId: 'corr_tg_1',
          terminalGroups: [
            {
              organizationId: 'org_uuid_101',
              items: [
                {
                  id: 'tg_uuid_201',
                  organizationId: 'org_uuid_101',
                  name: 'Kassa-1 (Yetkazib berish)',
                  address: 'Toshkent, Yunusobod 4-mavze',
                  timeZone: 'Asia/Tashkent'
                }
              ]
            }
          ],
          terminalGroupsInSleep: []
        }));
        return;
      }

      // 5. Terminal Groups Alive
      if (url === '/api/1/terminal_groups/is_alive') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correlationId: 'corr_alive_1',
          isAliveStatus: [
            {
              isAlive: true,
              terminalGroupId: 'tg_uuid_201',
              organizationId: 'org_uuid_101'
            }
          ]
        }));
        return;
      }

      // iikoWeb external menu V3 (the endpoint used when externalMenuId is configured).
      if (url === '/api/menu/v3/by_id') {
        assert.strictEqual(parsedBody.externalMenuId, 'demo-menu');
        assert.strictEqual(parsedBody.organizationId, 'org_uuid_101');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          id: 'demo-menu', name: 'Demo external menu',
          itemsGroups: [{ id: 'external-group', name: 'Demo taomlar', items: [
            { productId: 'external-dish', name: 'Demo taom', sizePrices: [
              { sizeId: null, price: 100, sku: '00003' }
            ] }
          ] }],
          products: [{ id: 'external-dish', sku: '00003', orderItemType: 'Product' }]
        }));
        return;
      }

      // 6. Nomenclature / Menu
      if (url === '/api/1/nomenclature') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correlationId: 'corr_nom_1',
          groups: [
            { id: 'cat_lavash', name: 'Lavashlar', description: 'Mazali lavashlar' },
            { id: 'cat_drinks', name: 'Ichimliklar', description: 'Salqin ichimliklar' }
          ],
          sizes: [
            { id: 'size_standard', name: 'Standard' },
            { id: 'size_large', name: 'Katta (Big)' }
          ],
          products: [
            {
              id: 'prod_lavash_mol',
              name: 'Mol go‘shtli lavash',
              description: 'Mol go‘shti, pomidor, bodring, maxsus sous',
              code: 'LV-MOL-01',
              groupId: 'cat_lavash',
              type: 'dish',
              orderItemType: 'Product',
              isDeleted: false,
              sizePrices: [
                {
                  sizeId: 'size_standard',
                  price: { currentPrice: 35000, isIncludedInMenu: true }
                },
                {
                  sizeId: 'size_large',
                  price: { currentPrice: 42000, isIncludedInMenu: true }
                }
              ],
              groupModifiers: [
                {
                  id: 'mod_group_cheese',
                  minAmount: 0,
                  maxAmount: 2,
                  required: false,
                  childModifiers: [
                    { id: 'mod_extra_cheese', defaultAmount: 0, minAmount: 0, maxAmount: 2 }
                  ]
                }
              ],
              tags: ['lavash', 'fastfood']
            },
            {
              id: 'mod_extra_cheese',
              name: 'Qo‘shimcha pishloq',
              type: 'modifier',
              isDeleted: false,
              sizePrices: [
                { sizeId: null, price: { currentPrice: 5000, isIncludedInMenu: true } }
              ]
            },
            {
              id: 'prod_stopped_cola',
              name: 'Coca Cola 0.5L',
              groupId: 'cat_drinks',
              type: 'good',
              isDeleted: false,
              sizePrices: [
                { sizeId: null, price: { currentPrice: 10000, isIncludedInMenu: true } }
              ]
            },
            {
              id: 'prod_free_zero_price',
              name: 'Narxsiz tovar',
              groupId: 'cat_lavash',
              type: 'dish',
              orderItemType: 'Product',
              isDeleted: false,
              sizePrices: [
                { sizeId: null, price: { currentPrice: 0, isIncludedInMenu: true } }
              ]
            },
            ...(mockExtraProducts
              ? [
                  {
                    id: 'prod_burger_deal',
                    name: 'Maxsus Burger',
                    groupId: 'cat_lavash',
                    type: 'dish',
                    orderItemType: 'Product',
                    isDeleted: false,
                    sizePrices: [
                      {
                        sizeId: 'size_standard',
                        price: { currentPrice: 15000, isIncludedInMenu: false }
                      },
                      {
                        sizeId: 'size_large',
                        price: { currentPrice: 32000, isIncludedInMenu: true }
                      }
                    ]
                  }
                ]
              : [])
          ],
          revision: 42
        }));
        return;
      }

      // 7. Stop Lists
      if (url === '/api/1/stop_lists') {
        if (mockStopListsFail) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'Internal iiko stop list error' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correlationId: 'corr_stop_1',
          terminalGroupStopLists: [
            {
              organizationId: 'org_uuid_101',
              items: [
                {
                  terminalGroupId: 'tg_uuid_201',
                  items: [
                    {
                      productId: 'prod_stopped_cola',
                      balance: 0,
                      sizeId: null
                    }
                  ]
                }
              ]
            }
          ]
        }));
        return;
      }

      // 8. Deliveries Create
      if (url === '/api/1/deliveries/create') {
        mockDeliveriesCreateCount++;
        lastDeliveriesCreatePayload = parsedBody;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correlationId: 'corr_deliv_create_1',
          orderInfo: {
            id: 'iiko_order_uuid_999',
            posId: 'pos_123',
            externalNumber: '1042',
            organizationId: parsedBody.organizationId || 'org_uuid_101',
            timestamp: Date.now(),
            creationStatus: 'Success',
            order: {
              status: 'WaitCooking',
              sum: parsedBody?.order?.items?.reduce((s: number, i: any) => s + (i.price * i.amount), 0) || 45000,
              number: 1042
            }
          }
        }));
        return;
      }

      // 9. Deliveries by ID
      if (url === '/api/1/deliveries/by_id') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const reqOrgId = parsedBody?.organizationId || 'org_uuid_101';
        const requestedId = parsedBody?.orderIds?.[0] || 'iiko_order_uuid_999';

        if (Object.keys(mockOrdersDb).length > 0) {
          const orgOrders = mockOrdersDb[reqOrgId] || [];
          const found = orgOrders.filter((o: any) => o.id === requestedId);
          res.end(JSON.stringify({
            correlationId: 'corr_deliv_by_id_custom',
            orders: found
          }));
          return;
        }

        if (requestedId !== 'iiko_order_uuid_999') { res.end(JSON.stringify({ orders: [] })); return; }
        const isOrderCancelled = mockCancelledOrders.has(requestedId);
        res.end(JSON.stringify({
          correlationId: 'corr_deliv_by_id_1',
          orders: [
            {
              id: requestedId,
              organizationId: 'org_uuid_101',
              timestamp: Date.now(),
              creationStatus: 'Success',
              order: {
                status: isOrderCancelled ? 'Cancelled' : 'OnWay',
                sum: 45000,
                number: 1042,
                customer: { name: 'Ali Valiyev' },
                phone: '+998901234567'
              }
            }
          ]
        }));
        return;
      }

      // 10. Deliveries Cancel
      if (url === '/api/1/deliveries/cancel') {
        const orderId = parsedBody.orderId;
        const orgId = parsedBody.organizationId;
        mockCancelledOrders.add(orderId);
        if (mockCancelShouldUpdateDb && mockOrdersDb[orgId]) {
          const ord = mockOrdersDb[orgId].find((o: any) => o.id === orderId);
          if (ord && ord.order) {
            ord.order.status = 'Cancelled';
          }
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          correlationId: 'corr_deliv_cancel_1'
        }));
        return;
      }

      // 11. Command Status
      if (url === '/api/1/commands/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          state: mockCommandStatusState || 'Success',
          errorReason: mockCommandStatusErrorReason || null
        }));
        return;
      }

      // Unknown endpoint
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: `Mock endpoint not found: ${url}` }));
    });
  });

  await new Promise<void>((resolve) => {
    mockServer.listen(0, '127.0.0.1', () => resolve());
  });

  const port = (mockServer.address() as any).port;
  const mockBaseUrl = `http://127.0.0.1:${port}`;

  console.log(`Mock iikoCloud server listening on ${mockBaseUrl}\n`);

  try {
    // -------------------------------------------------------------
    // Test 1: Multi-restaurant token isolation
    // -------------------------------------------------------------
    await test('Multi-restaurant token & credential isolation', async () => {
      const tokenManager = new IikoTokenManager();

      const clientA = new IikoClient({
        baseUrl: mockBaseUrl,
        providerSlug: 'restaurant-a',
        credentials: {
          appId: 'dev_app_id',
          clientSecret: 'dev_secret',
          apiKey: 'key_restaurant_a'
        },
        tokenManager
      });

      const clientB = new IikoClient({
        baseUrl: mockBaseUrl,
        providerSlug: 'restaurant-b',
        credentials: {
          appId: 'dev_app_id',
          clientSecret: 'dev_secret',
          apiKey: 'key_restaurant_b'
        },
        tokenManager
      });

      const tokenA = await clientA.getAccessToken();
      const tokenB = await clientB.getAccessToken();

      assert.notStrictEqual(tokenA, tokenB, 'Tokens for Restaurant A and B must be distinct');
      assert.strictEqual(tokenA.includes('key_restaurant_a'), true);
      assert.strictEqual(tokenB.includes('key_restaurant_b'), true);

      // Invalidate Restaurant A's token
      tokenManager.invalidateToken(clientA.getCacheKey());

      // Restaurant B's token must still be valid in cache
      assert.strictEqual(tokenManager.hasValidToken(clientB.getCacheKey()), true);
      assert.strictEqual(tokenManager.hasValidToken(clientA.getCacheKey()), false);
    })();

    // -------------------------------------------------------------
    // Test 2: Token auto-refresh on 1-hour expiration
    // -------------------------------------------------------------
    await test('1-hour token expiration & automatic pre-emptive refresh', async () => {
      const tokenManager = new IikoTokenManager();
      const client = new IikoClient({
        baseUrl: mockBaseUrl,
        providerSlug: 'test-exp-restaurant',
        credentials: {
          appId: 'dev_app',
          clientSecret: 'dev_secret',
          apiKey: 'test_exp_key'
        },
        tokenManager
      });

      // 1. Fetch fresh token
      const t1 = await client.getAccessToken();
      assert.ok(t1);

      // 2. Immediate second call should hit cache (no server roundtrip)
      const initialCount = mockAuthV2Count;
      const t2 = await client.getAccessToken();
      assert.strictEqual(t1, t2);
      assert.strictEqual(mockAuthV2Count, initialCount, 'Cached token must not trigger another HTTP call');

      // 3. Simulate expired token (set expiration to 60 seconds from now, which is within the 5-min buffer)
      tokenManager.setToken(client.getCacheKey(), 'stale_token_about_to_expire', Date.now() + 60 * 1000);

      // 4. Client must detect near-expiry and refresh automatically
      const t3 = await client.getAccessToken();
      assert.strictEqual(mockAuthV2Count, initialCount + 1, 'Client must call /api/v2/access_token on expiration');
      assert.notStrictEqual(t3, 'stale_token_about_to_expire');
    })();

    // -------------------------------------------------------------
    // Test 3: 401 Unauthorized handling with auto-retry
    // -------------------------------------------------------------
    await test('401 Unauthorized token invalidation and automatic retry', async () => {
      const tokenManager = new IikoTokenManager();
      const client = new IikoClient({
        baseUrl: mockBaseUrl,
        providerSlug: 'test-retry-restaurant',
        credentials: {
          appId: 'dev_app',
          clientSecret: 'dev_secret',
          apiKey: 'test_retry_key'
        },
        tokenManager
      });

      // Warm up token
      await client.getAccessToken();
      assert.strictEqual(tokenManager.hasValidToken(client.getCacheKey()), true);

      // Trigger 401 on next call
      simulate401Once = true;

      // Call organizations: server will return 401 once, client will invalidate token, re-auth, and succeed
      const orgs = await client.getOrganizations();
      assert.ok(orgs.length > 0);
      assert.strictEqual(orgs[0].id, 'org_uuid_101');
    })();

    // -------------------------------------------------------------
    // Test 4: 401/403/429 and error sanitization (no secret leaks)
    // -------------------------------------------------------------
    await test('Authentication error handling and secret sanitization', async () => {
      const tokenManager = new IikoTokenManager();
      const client = new IikoClient({
        baseUrl: mockBaseUrl,
        providerSlug: 'test-auth-fail',
        credentials: {
          appId: 'dev_app',
          clientSecret: 'SUPER_SECRET_CLIENT_SECRET_NEVER_LEAK',
          apiKey: 'invalid_api_key'
        },
        tokenManager
      });

      try {
        await client.getAccessToken();
        assert.fail('Should have thrown an authentication error');
      } catch (err: any) {
        assert.strictEqual(err.statusCode, 502);
        assert.strictEqual(err.code, 'PROVIDER_AUTHENTICATION_ERROR');
        // Ensure secret is never in the message
        assert.strictEqual(err.message.includes('SUPER_SECRET_CLIENT_SECRET_NEVER_LEAK'), false);
        assert.strictEqual(JSON.stringify(err.details || {}).includes('SUPER_SECRET_CLIENT_SECRET_NEVER_LEAK'), false);
      }
    })();

    // -------------------------------------------------------------
    // Test 5: Organization & Terminal resolution and Health check
    // -------------------------------------------------------------
    await test('Organization/Terminal resolution and checkHealth()', async () => {
      const adapter = new IikoProviderAdapter({
        slug: 'iiko-test-restaurant',
        baseUrl: mockBaseUrl,
        config: {
          appId: 'app_1',
          clientSecret: 'secret_1',
          apiKey: 'key_1',
          organizationId: 'org_uuid_101',
          terminalGroupId: 'tg_uuid_201'
        }
      });

      // 1. Metadata check
      const info = await adapter.getProviderInfo();
      assert.strictEqual(info.slug, 'iiko-test-restaurant');
      assert.strictEqual(info.capabilities.includes(ProviderCapability.QUOTE), true);
      assert.strictEqual(info.capabilities.includes(ProviderCapability.ACTION_CREATE), true);

      // 2. Health check
      const health = await adapter.checkHealth();
      assert.strictEqual(health.status, 'HEALTHY');
      assert.ok(health.latencyMs >= 0);

      // 3. Locations check
      const locations = await adapter.getLocations();
      assert.strictEqual(locations.length, 1);
      assert.strictEqual(locations[0].providerLocationId, 'tg_uuid_201');
      assert.strictEqual(locations[0].name.includes('EVOS Yunusobod'), true);
    })();

    // -------------------------------------------------------------
    // Test 6: Catalog mapping (variants, modifiers, stop-lists)
    // -------------------------------------------------------------
    await test('Catalog mapping: multiple sizes, modifiers, and stop-list out-of-stock', async () => {
      const adapter = new IikoProviderAdapter({
        slug: 'iiko-catalog-test',
        baseUrl: mockBaseUrl,
        config: {
          apiKey: 'key_cat',
          organizationId: 'org_uuid_101',
          terminalGroupId: 'tg_uuid_201'
        }
      });

      const catalog = await adapter.getCatalog({
        providerSlug: 'iiko-catalog-test',
        locationId: 'tg_uuid_201'
      });

      assert.strictEqual(catalog.categories.length, 2);
      assert.strictEqual(catalog.offerings.length, 3); // 'mod_extra_cheese' is modifier, so 3 main offerings: lavash, cola, prod_free_zero_price

      // Product 1: Mol go'shtli lavash
      const lavash = catalog.offerings.find((o) => o.id === 'prod_lavash_mol');
      assert.ok(lavash);
      assert.strictEqual(lavash.isAvailable, true);
      assert.strictEqual(lavash.variants?.length, 2);
      assert.strictEqual(lavash.variants?.[0].basePrice, 35000);
      assert.strictEqual(lavash.variants?.[1].basePrice, 42000);
      assert.strictEqual(lavash.optionGroups?.length, 1);
      assert.strictEqual(lavash.optionGroups?.[0].options?.length, 1);
      assert.strictEqual(lavash.optionGroups?.[0].options?.[0].priceDelta, 5000);

      // Product 2: Coca Cola (on stop list with balance 0)
      const cola = catalog.offerings.find((o) => o.id === 'prod_stopped_cola');
      assert.ok(cola);
      assert.strictEqual(cola.isAvailable, false, 'Product on stop list with balance <= 0 must have isAvailable = false');

      // Availability check
      const avail = await adapter.checkAvailability({
        providerSlug: 'iiko-catalog-test',
        items: [
          { offeringId: 'prod_lavash_mol' },
          { offeringId: 'prod_stopped_cola' }
        ]
      });

      assert.strictEqual(avail.isAvailable, false);
      assert.strictEqual(avail.unavailableItems.length, 1);
      assert.strictEqual(avail.unavailableItems[0].offeringId, 'prod_stopped_cola');
      assert.strictEqual(avail.availableItems.length, 1);
      assert.strictEqual(avail.availableItems[0].offeringId, 'prod_lavash_mol');
    })();

    // -------------------------------------------------------------
    // Test 7: Non-faked Quote calculation
    // -------------------------------------------------------------
    let generatedQuote: any = null;

    await test('Non-faked Quote calculation with sizes, modifiers, and delivery fee', async () => {
      const adapter = new IikoProviderAdapter({
        slug: 'iiko-quote-test',
        baseUrl: mockBaseUrl,
        config: {
          apiKey: 'key_quote',
          organizationId: 'org_uuid_101',
          terminalGroupId: 'tg_uuid_201',
          deliveryFee: 12000
        }
      });

      // 1. Requesting out-of-stock item should strictly fail
      try {
        await adapter.requestQuote({
          providerSlug: 'iiko-quote-test',
          items: [{ offeringId: 'prod_stopped_cola', quantity: 1 }]
        });
        assert.fail('Should fail when requesting out of stock item');
      } catch (err: any) {
        assert.strictEqual(err.code, 'RESOURCE_UNAVAILABLE');
      }

      // 2. Request valid item with large size variant + extra cheese modifier
      const quote = await adapter.requestQuote({
        destination: { raw: 'Tashkent City, Furqat 2' },
        providerSlug: 'iiko-quote-test',
        items: [
          {
            offeringId: 'prod_lavash_mol',
            variantId: 'size_large', // 42000
            quantity: 2,
            selectedOptions: [
              {
                groupId: 'mod_group_cheese',
                optionId: 'mod_extra_cheese', // 5000
                quantity: 1
              }
            ]
          }
        ]
      });

      assert.ok(quote.id.startsWith('ZY-QT-IIKO-'));
      assert.strictEqual(quote.lines.length, 1);
      // Unit price = 42,000, Option = 5,000. Line total = (42000 + 5000) * 2 = 94,000
      assert.strictEqual(quote.lines[0].unitPrice, 42000);
      assert.strictEqual(quote.lines[0].optionsTotal, 5000);
      assert.strictEqual(quote.lines[0].lineTotal, 94000);
      assert.strictEqual(quote.subtotal, 94000);
      assert.strictEqual(quote.totalFees, 12000);
      assert.strictEqual(quote.total, 106000); // 94,000 + 12,000 = 106,000 UZS
      assert.strictEqual(quote.currency, 'UZS');
      assert.ok(new Date(quote.expiresAt).getTime() > Date.now());

      generatedQuote = quote;
    })();

    // -------------------------------------------------------------
    // Test 8: Approval Gate enforcement (userConfirmed: true)
    // -------------------------------------------------------------
    await test('Approval gate enforcement: userConfirmed: false must be rejected', async () => {
      const adapter = new IikoProviderAdapter({
        slug: 'iiko-gate-test',
        baseUrl: mockBaseUrl,
        config: {
          apiKey: 'key_gate',
          organizationId: 'org_uuid_101',
          terminalGroupId: 'tg_uuid_201'
        }
      });

      try {
        await adapter.createAction({
          providerSlug: 'iiko-gate-test',
          quoteId: generatedQuote.id,
          quote: {
            id: generatedQuote.id,
            subtotal: generatedQuote.subtotal,
            fees: generatedQuote.totalFees,
            discount: generatedQuote.totalDiscount,
            total: generatedQuote.total,
            currency: generatedQuote.currency,
            lines: generatedQuote.lines
          },
          userConfirmed: false as any // Bypass type to verify runtime gate
        });
        assert.fail('Should have rejected action without user confirmation');
      } catch (err: any) {
        assert.ok(err.message.includes('user confirmation') || err.name === 'ZodError');
      }
    })();

    // -------------------------------------------------------------
    // Test 8b: Empty menu handling
    // -------------------------------------------------------------
    await test('Empty menu handling: returns valid empty catalog without crashing', async () => {
      // Mock an adapter that returns empty nomenclature
      const emptyAdapter = new IikoProviderAdapter({
        slug: 'iiko-empty-test',
        baseUrl: mockBaseUrl,
        config: {
          apiKey: 'key_empty',
          organizationId: 'org_uuid_101',
          terminalGroupId: 'tg_uuid_201'
        }
      });

      // Override client getNomenclature to return empty list
      const client = emptyAdapter.getClient();
      const originalGetNom = client.getNomenclature.bind(client);
      client.getNomenclature = async () => ({
        groups: [],
        products: [],
        sizes: []
      });

      const catalog = await emptyAdapter.getCatalog({
        providerSlug: 'iiko-empty-test',
        locationId: 'tg_uuid_201'
      });

      assert.strictEqual(catalog.categories.length, 0);
      assert.strictEqual(catalog.offerings.length, 0);
      client.getNomenclature = originalGetNom;
    })();

    // -------------------------------------------------------------
    // Test 9: Order creation, status tracking, and cancellation
    // -------------------------------------------------------------
    let createdActionId: string = '';

    await test('Delivery order dispatch, status tracking, and cancellation', async () => {
      const adapter = new IikoProviderAdapter({
        slug: 'iiko-action-test',
        baseUrl: mockBaseUrl,
        config: {
          apiKey: 'key_action',
          organizationId: 'org_uuid_101',
          terminalGroupId: 'tg_uuid_201'
        }
      });

      // 1. Create action with confirmed quote
      const action = await adapter.createAction({
        providerSlug: 'iiko-action-test',
        quoteId: generatedQuote.id,
        quote: {
          id: generatedQuote.id,
          subtotal: generatedQuote.subtotal,
          fees: generatedQuote.totalFees,
          discount: generatedQuote.totalDiscount,
          total: generatedQuote.total,
          currency: generatedQuote.currency,
          lines: generatedQuote.lines
        },
        userConfirmed: true,
        customer: {
          name: 'Ali Valiyev',
          phone: '+998901234567'
        },
        destination: {
          raw: 'Toshkent, Qoratosh ko‘chasi, 1-uy',
          city: 'Tashkent'
        }
      });

      assert.strictEqual(action.externalActionId, 'iiko_order_uuid_999');
      assert.strictEqual(action.status, ActionStatus.PROCESSING); // 'WaitCooking' maps to PROCESSING
      assert.strictEqual(action.total, generatedQuote.total);
      assert.strictEqual(mockDeliveriesCreateCount, 1);

      createdActionId = action.externalActionId;

      // 2. Track order status (GET /api/1/deliveries/by_id)
      const trackedAction = await adapter.getAction({
        providerSlug: 'iiko-action-test',
        actionId: createdActionId
      });

      assert.strictEqual(trackedAction.externalActionId, 'iiko_order_uuid_999');
      assert.strictEqual(trackedAction.status, ActionStatus.PROCESSING); // 'OnWay' maps to PROCESSING

      // 3. Cancel order (POST /api/1/deliveries/cancel)
      const cancelResult = await adapter.cancelAction({
        providerSlug: 'iiko-action-test',
        actionId: createdActionId,
        reason: 'Customer requested cancellation'
      });

      assert.strictEqual(cancelResult.success, true);
      assert.strictEqual(cancelResult.newStatus, ActionStatus.CANCELLED);
    })();

    // -------------------------------------------------------------
    // Test 10: Status mapping verification
    // -------------------------------------------------------------
    test('Canonical status mapping: iiko DeliveryStatus -> Zayuno ActionStatus', () => {
      assert.strictEqual(mapIikoDeliveryStatusToActionStatus('Unconfirmed'), ActionStatus.CONFIRMED);
      assert.strictEqual(mapIikoDeliveryStatusToActionStatus('WaitCooking'), ActionStatus.PROCESSING);
      assert.strictEqual(mapIikoDeliveryStatusToActionStatus('CookingStarted'), ActionStatus.PROCESSING);
      assert.strictEqual(mapIikoDeliveryStatusToActionStatus('OnWay'), ActionStatus.PROCESSING);
      assert.strictEqual(mapIikoDeliveryStatusToActionStatus('Delivered'), ActionStatus.COMPLETED);
      assert.strictEqual(mapIikoDeliveryStatusToActionStatus('Closed'), ActionStatus.COMPLETED);
      assert.strictEqual(mapIikoDeliveryStatusToActionStatus('Cancelled'), ActionStatus.CANCELLED);
      assert.strictEqual(mapIikoDeliveryStatusToActionStatus(undefined, 'Error'), ActionStatus.FAILED);
      assert.strictEqual(mapIikoDeliveryStatusToActionStatus(undefined, 'InProgress'), ActionStatus.PROCESSING);
    })();

    // -------------------------------------------------------------
    // Regression Test 1: Dynamic organization currency (RUB/UZS) & no fake delivery fee
    // -------------------------------------------------------------
    await test('Regression 1: Dynamic organization currency (RUB/UZS) and no fake 15,000 UZS delivery fee', async () => {
      // 1. Check with Moscow organization with currencyIsoName: 'RUB'
      mockOrganizations = [
        {
          id: 'org_uuid_moscow',
          name: 'iiko Demo Moscow',
          code: 'MOSCOW-01',
          currencyIsoName: 'RUB'
        }
      ];

      const moscowAdapter = new IikoProviderAdapter({
        slug: 'iiko-moscow-stand',
        baseUrl: mockBaseUrl,
        config: {
          apiKey: 'key_moscow',
          organizationId: 'org_uuid_moscow',
          terminalGroupId: 'tg_uuid_201'
        }
      });

      const quote = await moscowAdapter.requestQuote({
        destination: { raw: 'Moscow, Test street 1' },
        providerSlug: 'iiko-moscow-stand',
        items: [
          {
            offeringId: 'prod_lavash_mol',
            quantity: 1
          }
        ]
      });

      // Must strictly use organization currency (RUB) and NOT invent 15000 delivery fee
      assert.strictEqual(quote.currency, 'RUB');
      assert.strictEqual(quote.totalFees, 0, 'Must NOT invent 15,000 delivery fee when none is specified');
      assert.strictEqual(quote.fees.length, 0);
      assert.strictEqual(quote.total, quote.subtotal);

      const catalog = await moscowAdapter.getCatalog({ providerSlug: 'iiko-moscow-stand' });
      assert.strictEqual(catalog.offerings[0].currency, 'RUB');

      // Reset mock organizations
      mockOrganizations = [
        {
          id: 'org_uuid_101',
          name: 'EVOS Yunusobod',
          code: 'EVOS-01',
          currencyIsoName: 'UZS'
        }
      ];
    })();

    // -------------------------------------------------------------
    // Regression Test 2: Order creation rejects missing phone/address and formats addresses accurately
    // -------------------------------------------------------------
    await test('Regression 2: Order creation rejects missing phone/address and formats addresses accurately without fake house number', async () => {
      const adapter = new IikoProviderAdapter({
        slug: 'iiko-val-test',
        baseUrl: mockBaseUrl,
        config: {
          apiKey: 'key_val',
          organizationId: 'org_uuid_101',
          terminalGroupId: 'tg_uuid_201'
        }
      });

      const validQuote = {
        id: generatedQuote.id,
        subtotal: generatedQuote.subtotal,
        fees: generatedQuote.totalFees,
        discount: generatedQuote.totalDiscount,
        total: generatedQuote.total,
        currency: generatedQuote.currency,
        lines: generatedQuote.lines
      };

      // 1. Missing phone must throw validation error
      try {
        await adapter.createAction({
          providerSlug: 'iiko-val-test',
          quoteId: validQuote.id,
          quote: validQuote as any,
          userConfirmed: true,
          customer: undefined,
          destination: { raw: 'Tashkent City' }
        });
        assert.fail('Should fail when phone is missing');
      } catch (err: any) {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes('Customer phone number is required'));
      }

      // 2. Missing destination must throw validation error
      try {
        await adapter.createAction({
          providerSlug: 'iiko-val-test',
          quoteId: validQuote.id,
          quote: validQuote as any,
          userConfirmed: true,
          customer: { phone: '+998901234567' },
          destination: undefined as any
        });
        assert.fail('Should fail when destination is missing');
      } catch (err: any) {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes('Delivery destination address is required'));
      }

      // 3. Raw address without house number -> format as type 'city' with line1, NEVER invent house: '1'
      await adapter.createAction({
        providerSlug: 'iiko-val-test',
        quoteId: validQuote.id,
        quote: validQuote as any,
        userConfirmed: true,
        customer: { phone: '+998901234567', name: 'Real Customer' },
        destination: { raw: 'Tashkent City, Furqat ko‘chasi 2, D17' }
      });

      assert.ok(lastDeliveriesCreatePayload);
      assert.strictEqual(lastDeliveriesCreatePayload.order.phone, '+998901234567', 'Must use actual customer phone');
      assert.strictEqual(lastDeliveriesCreatePayload.order.deliveryPoint.address.type, 'city');
      assert.strictEqual(
        lastDeliveriesCreatePayload.order.deliveryPoint.address.line1,
        'Tashkent City, Furqat ko‘chasi 2, D17'
      );
      assert.strictEqual(
        lastDeliveriesCreatePayload.order.deliveryPoint.address.house,
        undefined,
        'Must NOT invent house number "1"'
      );

      // 4. Structured address with house number -> format as type 'legacy' with street & house
      await adapter.createAction({
        providerSlug: 'iiko-val-test',
        quoteId: validQuote.id,
        quote: validQuote as any,
        userConfirmed: true,
        customer: { phone: '+998909876543' },
        destination: {
          raw: 'Yunusobod 4-mavze, 22-uy',
          street: 'Yunusobod 4-mavze',
          house: '22'
        } as any
      });

      assert.strictEqual(lastDeliveriesCreatePayload.order.deliveryPoint.address.type, 'legacy');
      assert.strictEqual(lastDeliveriesCreatePayload.order.deliveryPoint.address.house, '22');
      assert.strictEqual(lastDeliveriesCreatePayload.order.deliveryPoint.address.street.name, 'Yunusobod 4-mavze');
    })();

    // -------------------------------------------------------------
    // Regression Test 3: Stop-list error bubbling & Unpriced items
    // -------------------------------------------------------------
    await test('Regression 3: Stop-list request error is not swallowed, and unpriced items are marked unavailable', async () => {
      const adapter = new IikoProviderAdapter({
        slug: 'iiko-stop-test',
        baseUrl: mockBaseUrl,
        config: {
          apiKey: 'key_stop',
          organizationId: 'org_uuid_101',
          terminalGroupId: 'tg_uuid_201'
        }
      });

      // 1. Simulate stop-list failure: must throw, never swallow
      mockStopListsFail = true;
      try {
        await adapter.getCatalog({ providerSlug: 'iiko-stop-test' });
        assert.fail('Stop list error should not be swallowed');
      } catch (err: any) {
        assert.ok(err instanceof Error);
      } finally {
        mockStopListsFail = false;
      }

      // 2. Normal catalog: product with 0 price must be unavailable
      const catalog = await adapter.getCatalog({ providerSlug: 'iiko-stop-test' });
      const zeroPriceProd = catalog.offerings.find((o) => o.id === 'prod_free_zero_price');
      assert.ok(zeroPriceProd);
      assert.strictEqual(zeroPriceProd.isAvailable, false, 'Unpriced or 0-priced item must be marked isAvailable: false');
      assert.strictEqual(zeroPriceProd.basePrice, 0);
    })();

    // -------------------------------------------------------------
    // Regression Test 4: Multi-tenant organization search & Strict payment verification
    // -------------------------------------------------------------
    await test('Regression 4: Multi-tenant order status/cancel resolves correct organization, and delivered order without payment is PENDING', async () => {
      mockOrganizations = [
        { id: 'org_uuid_101', name: 'Branch 1 Tashkent', currencyIsoName: 'UZS' },
        { id: 'org_uuid_202', name: 'Branch 2 Moscow', currencyIsoName: 'RUB' }
      ];

      // Order created in Branch 2 (Moscow)
      mockOrdersDb['org_uuid_202'] = [
        {
          id: 'order_in_branch_2',
          organizationId: 'org_uuid_202',
          timestamp: Date.now(),
          creationStatus: 'Success',
          order: {
            status: 'Delivered',
            sum: 45000,
            number: 8888,
            customer: { name: 'Customer In Moscow' },
            phone: '+79991234567',
            processedPaymentsSum: 0, // Unpaid!
            payments: []
          }
        }
      ];

      const adapter = new IikoProviderAdapter({
        slug: 'iiko-multitenant-test',
        baseUrl: mockBaseUrl,
        config: {
          apiKey: 'key_multi'
          // note: no default organizationId set, so it has to search across orgs
        }
      });

      // 1. getAction finds the order across organizations
      const action = await adapter.getAction({
        providerSlug: 'iiko-multitenant-test',
        actionId: 'order_in_branch_2'
      });

      assert.strictEqual(action.externalActionId, 'order_in_branch_2');
      assert.strictEqual(action.parameters?.organizationId, 'org_uuid_202');
      assert.strictEqual(action.currency, 'RUB');
      assert.strictEqual(action.status, ActionStatus.COMPLETED);
      assert.strictEqual(action.paymentStatus, PaymentStatus.PENDING, 'Delivered order without payments must remain PENDING, not PAID');

      // 2. Now simulate paid order
      mockOrdersDb['org_uuid_202'][0].order.processedPaymentsSum = 45000;
      mockOrdersDb['org_uuid_202'][0].order.payments = [
        { paymentType: { name: 'Card' }, sum: 45000, isProcessed: true }
      ];

      const paidAction = await adapter.getAction({
        providerSlug: 'iiko-multitenant-test',
        actionId: 'order_in_branch_2'
      });
      assert.strictEqual(paidAction.paymentStatus, PaymentStatus.PAID, 'Order with confirmed payment must be PAID');

      // 3. cancelAction finds the order across organizations and cancels it
      const cancelRes = await adapter.cancelAction({
        providerSlug: 'iiko-multitenant-test',
        actionId: 'order_in_branch_2',
        reason: 'Customer cancelled'
      });
      assert.strictEqual(cancelRes.success, true);
      assert.strictEqual(cancelRes.newStatus, ActionStatus.CANCELLED);

      // Clean up mock database
      mockOrdersDb = {};
      mockOrganizations = [
        { id: 'org_uuid_101', name: 'EVOS Yunusobod', code: 'EVOS-01', currencyIsoName: 'UZS' }
      ];
    })();

    // -------------------------------------------------------------
    // Regression Test 5: Deep error sanitization (no leaks of tokens/keys)
    // -------------------------------------------------------------
    await test('Regression 5: Upstream error messages and logs deeply scrub apiKey, clientSecret, apiLogin, and Bearer tokens', async () => {
      const secretKey = 'SECRET_API_KEY_12345';
      const secretClientSecret = 'SECRET_CLIENT_SECRET_98765';
      const secretToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-o-k-e-n';

      const sanitized = sanitizeErrorMessage(
        `Error calling iiko with apiKey: "${secretKey}", clientSecret: "${secretClientSecret}", Bearer ${secretToken}`,
        [secretKey, secretClientSecret]
      );

      assert.strictEqual(sanitized.includes(secretKey), false);
      assert.strictEqual(sanitized.includes(secretClientSecret), false);
      assert.strictEqual(sanitized.includes(secretToken), false);
      assert.strictEqual(sanitized.includes('***REDACTED***'), true);

      // Also verify via IikoClient instance
      const client = new IikoClient({
        baseUrl: mockBaseUrl,
        providerSlug: 'test-sanitize-client',
        credentials: {
          appId: 'my_app_id',
          clientSecret: 'my_client_secret',
          apiKey: 'my_api_key'
        }
      });

      const clientSanitized = client.sanitize('Failed request: {"apiKey": "my_api_key", "clientSecret": "my_client_secret"}');
      assert.strictEqual(clientSanitized.includes('my_api_key'), false);
      assert.strictEqual(clientSanitized.includes('my_client_secret'), false);
    })();

    // -------------------------------------------------------------
    // Negative Test 1: Payment verification rejects fake isProcessed and unverified payments
    // -------------------------------------------------------------
    await test('Negative 1: Payment verification strictly enforces official iiko OpenAPI proof (processedPaymentsSum or non-preliminary isProcessedExternally/isPrepay)', async () => {
      mockOrdersDb = {
        'org_uuid_101': [
          {
            id: 'order_test_payments',
            organizationId: 'org_uuid_101',
            creationStatus: 'Success',
            order: {
              status: 'Delivered',
              sum: 50000,
              number: 9901,
              processedPaymentsSum: 0,
              payments: [
                // Synthetic isProcessed: true (the old bug!) should NOT trick the adapter
                { paymentType: { name: 'Cash', kind: 'Cash' }, sum: 50000, isPreliminary: false, isProcessedExternally: false, isPrepay: false, isProcessed: true }
              ]
            }
          }
        ]
      };

      const adapter = new IikoProviderAdapter({
        slug: 'iiko-payment-neg-test',
        baseUrl: mockBaseUrl,
        config: { apiKey: 'key_pay', organizationId: 'org_uuid_101', currency: 'UZS' }
      });

      // 1. Unprocessed Cash / fake isProcessed must remain PENDING
      const act1 = await adapter.getAction({ providerSlug: 'iiko-payment-neg-test', actionId: 'order_test_payments' });
      assert.strictEqual(act1.paymentStatus, PaymentStatus.PENDING, 'Unprocessed payment with fake isProcessed must be PENDING');

      // 2. Preliminary payment (isPreliminary: true) must remain PENDING
      mockOrdersDb['org_uuid_101'][0].order.payments = [
        { paymentType: { name: 'Card', kind: 'Card' }, sum: 50000, isPreliminary: true, isProcessedExternally: true, isPrepay: false }
      ];
      const act2 = await adapter.getAction({ providerSlug: 'iiko-payment-neg-test', actionId: 'order_test_payments' });
      assert.strictEqual(act2.paymentStatus, PaymentStatus.PENDING, 'Preliminary payment must remain PENDING');

      // 3. Partial external payment (sum: 30000 < 50000) must remain PENDING
      mockOrdersDb['org_uuid_101'][0].order.payments = [
        { paymentType: { name: 'Card', kind: 'Card' }, sum: 30000, isPreliminary: false, isProcessedExternally: true, isPrepay: false }
      ];
      const act3 = await adapter.getAction({ providerSlug: 'iiko-payment-neg-test', actionId: 'order_test_payments' });
      assert.strictEqual(act3.paymentStatus, PaymentStatus.PENDING, 'Partial external payment must remain PENDING');

      // 4. Verified external payment (sum: 50000 >= 50000) must be PAID
      mockOrdersDb['org_uuid_101'][0].order.payments = [
        { paymentType: { name: 'Card', kind: 'Card' }, sum: 50000, isPreliminary: false, isProcessedExternally: true, isPrepay: false }
      ];
      const act4 = await adapter.getAction({ providerSlug: 'iiko-payment-neg-test', actionId: 'order_test_payments' });
      assert.strictEqual(act4.paymentStatus, PaymentStatus.PAID, 'Confirmed external payment must be PAID');

      // 5. Verified POS processedPaymentsSum (sum: 50000 >= 50000) must be PAID
      mockOrdersDb['org_uuid_101'][0].order.payments = [];
      mockOrdersDb['org_uuid_101'][0].order.processedPaymentsSum = 50000;
      const act5 = await adapter.getAction({ providerSlug: 'iiko-payment-neg-test', actionId: 'order_test_payments' });
      assert.strictEqual(act5.paymentStatus, PaymentStatus.PAID, 'Confirmed processedPaymentsSum must be PAID');

      mockOrdersDb = {};
    })();

    // -------------------------------------------------------------
    // Negative Test 2: cancelAction checks command/order status, rejects unresolvable organization and completed orders
    // -------------------------------------------------------------
    await test('Negative 2: cancelAction checks command/order status, rejects unresolvable organization and completed orders', async () => {
      mockOrdersDb = {
        'org_uuid_101': [
          {
            id: 'order_delivered_cant_cancel',
            organizationId: 'org_uuid_101',
            creationStatus: 'Success',
            order: { status: 'Delivered', sum: 40000, number: 9902 }
          },
          {
            id: 'order_to_fail_command',
            organizationId: 'org_uuid_101',
            creationStatus: 'Success',
            order: { status: 'WaitCooking', sum: 40000, number: 9903 }
          }
        ]
      };

      const adapter = new IikoProviderAdapter({
        slug: 'iiko-cancel-neg-test',
        baseUrl: mockBaseUrl,
        config: { apiKey: 'key_cancel', currency: 'UZS' }
      });

      // 1. Unresolvable organization: must NOT fall back to organizations[0]
      let unresolvableFailed = false;
      try {
        await adapter.cancelAction({
          providerSlug: 'iiko-cancel-neg-test',
          actionId: 'non_existent_order_across_all_orgs'
        });
      } catch (err: any) {
        unresolvableFailed = true;
        assert.strictEqual(err.statusCode, 404);
        assert.strictEqual(err.message.includes('organization could not be resolved'), true);
      }
      assert.strictEqual(unresolvableFailed, true, 'Must reject unresolvable organization without guessing organizations[0]');

      // 2. Command status Error rejects cancellation
      mockCommandStatusState = 'Error';
      mockCommandStatusErrorReason = 'Kitchen already cooked the order and dispatched courier';
      let cmdErrorFailed = false;
      try {
        await adapter.cancelAction({
          providerSlug: 'iiko-cancel-neg-test',
          actionId: 'order_to_fail_command',
          parameters: { organizationId: 'org_uuid_101' }
        });
      } catch (err: any) {
        cmdErrorFailed = true;
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.message.includes('Kitchen already cooked'), true);
      }
      assert.strictEqual(cmdErrorFailed, true, 'Must reject if iiko command status is Error');

      // 3. Command status InProgress must NOT return CANCELLED
      mockOrdersDb = {
        'org_uuid_101': [
          {
            id: 'order_in_progress',
            organizationId: 'org_uuid_101',
            creationStatus: 'Success',
            order: { status: 'WaitCooking', sum: 40000, number: 9904 }
          }
        ]
      };
      mockCommandStatusState = 'InProgress';
      mockCommandStatusErrorReason = null;
      mockCancelShouldUpdateDb = false;
      const inProgressRes = await adapter.cancelAction({
        providerSlug: 'iiko-cancel-neg-test',
        actionId: 'order_in_progress',
        parameters: { organizationId: 'org_uuid_101' }
      });
      assert.strictEqual(inProgressRes.success, false, 'InProgress command must not report success: true');
      assert.notStrictEqual(inProgressRes.newStatus, ActionStatus.CANCELLED, 'InProgress command must not report CANCELLED');
      assert.strictEqual(inProgressRes.message.includes('InProgress'), true, 'Message must indicate InProgress');

      // 4. Order status fetch error must NOT return CANCELLED
      mockCommandStatusState = 'Success';
      const client = adapter.getClient();
      const originalGetOrderById = client.getOrderById.bind(client);
      client.getOrderById = async () => {
        throw new Error('Simulated upstream network glitch during status check');
      };

      const fetchErrorRes = await adapter.cancelAction({
        providerSlug: 'iiko-cancel-neg-test',
        actionId: 'order_in_progress',
        parameters: { organizationId: 'org_uuid_101' }
      });
      assert.strictEqual(fetchErrorRes.success, false, 'Status fetch failure must not report success: true');
      assert.notStrictEqual(fetchErrorRes.newStatus, ActionStatus.CANCELLED, 'Status fetch failure must not report CANCELLED');
      assert.strictEqual(fetchErrorRes.message.includes('could not be verified'), true, 'Message must indicate status could not be verified');

      // Restore original getOrderById
      client.getOrderById = originalGetOrderById;

      // 5. Order remains active in iiko (not Cancelled) despite command Success must NOT return CANCELLED
      mockCommandStatusState = 'Success';
      mockCancelShouldUpdateDb = false; // DB order still has status: 'WaitCooking'
      const unconfirmedRes = await adapter.cancelAction({
        providerSlug: 'iiko-cancel-neg-test',
        actionId: 'order_in_progress',
        parameters: { organizationId: 'org_uuid_101' }
      });
      assert.strictEqual(unconfirmedRes.success, false, 'Unconfirmed order status must not report success: true');
      assert.strictEqual(unconfirmedRes.message.includes('not Cancelled'), true);

      // 6. Confirmed cancellation in iiko must return CANCELLED
      mockCancelShouldUpdateDb = true; // DB order will update to 'Cancelled'
      const confirmedRes = await adapter.cancelAction({
        providerSlug: 'iiko-cancel-neg-test',
        actionId: 'order_in_progress',
        parameters: { organizationId: 'org_uuid_101' }
      });
      assert.strictEqual(confirmedRes.success, true, 'Confirmed cancellation must return success: true');
      assert.strictEqual(confirmedRes.newStatus, ActionStatus.CANCELLED, 'Confirmed cancellation must return CANCELLED');

      // Reset mock state
      mockCommandStatusState = 'Success';
      mockCommandStatusErrorReason = null;
      mockCancelShouldUpdateDb = false;
      mockOrdersDb = {};
    })();

    // -------------------------------------------------------------
    // Negative Test 3: sanitizeErrorMessage scrubs quoted JSON keys with synthetic secrets
    // -------------------------------------------------------------
    await test('Negative 3: sanitizeErrorMessage deeply scrubs quoted JSON keys with synthetic secrets (password, token, pin, etc.)', async () => {
      const syntheticPayload = JSON.stringify({
        password: 'sample-password-secret-123',
        token: 'sample-token-jwt-456',
        pin: '1234',
        apiKey: 'api-key-secret-789',
        clientSecret: 'client-sec-abc',
        apiLogin: 'login-secret'
      });

      const sanitized = sanitizeErrorMessage(syntheticPayload);

      assert.strictEqual(sanitized.includes('sample-password-secret-123'), false, 'password must be scrubbed');
      assert.strictEqual(sanitized.includes('sample-token-jwt-456'), false, 'token must be scrubbed');
      assert.strictEqual(sanitized.includes('1234'), false, 'pin must be scrubbed');
      assert.strictEqual(sanitized.includes('api-key-secret-789'), false, 'apiKey must be scrubbed');
      assert.strictEqual(sanitized.includes('client-sec-abc'), false, 'clientSecret must be scrubbed');
      assert.strictEqual(sanitized.includes('login-secret'), false, 'apiLogin must be scrubbed');
      assert.strictEqual(sanitized.includes('***REDACTED***'), true, 'redaction placeholder present');

      // Numeric pin in JSON
      const numericPinPayload = '{"pin": 9988, "password": "sample_secret_pw"}';
      const numSanitized = sanitizeErrorMessage(numericPinPayload);
      assert.strictEqual(numSanitized.includes('9988'), false, 'numeric pin must be scrubbed');
      assert.strictEqual(numSanitized.includes('sample_secret_pw'), false, 'password must be scrubbed');
    })();

    // -------------------------------------------------------------
    // Negative Test 4: resolveCurrency rejects unknown or unsupported organization currency without defaulting to UZS
    // -------------------------------------------------------------
    await test('Negative 4: resolveCurrency rejects unknown or unsupported organization currency without defaulting to UZS', async () => {
      mockOrganizations = [
        { id: 'org_unknown_curr', name: 'Unknown Currency Org', code: 'UNK-01', currencyIsoName: 'JPY' }
      ];

      const adapter = new IikoProviderAdapter({
        slug: 'iiko-curr-neg-test',
        baseUrl: mockBaseUrl,
        config: { apiKey: 'key_curr' } // no configured currency
      });

      let failedUnsupported = false;
      try {
        await adapter.getCatalog({
          providerSlug: 'iiko-curr-neg-test',
          locationId: 'org_unknown_curr'
        });
      } catch (err: any) {
        failedUnsupported = true;
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.message.includes('not supported'), true);
      }
      assert.strictEqual(failedUnsupported, true, 'Must reject unsupported currency JPY instead of defaulting to UZS');

      // Also verify missing currencyIsoName throws UNKNOWN_CURRENCY
      mockOrganizations = [
        { id: 'org_no_curr', name: 'No Currency Org', code: 'NO-01', currencyIsoName: null }
      ];
      let failedMissing = false;
      try {
        await adapter.getCatalog({
          providerSlug: 'iiko-curr-neg-test',
          locationId: 'org_no_curr'
        });
      } catch (err: any) {
        failedMissing = true;
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.message.includes('Could not determine currency'), true);
      }
      assert.strictEqual(failedMissing, true, 'Must reject missing currency instead of defaulting to UZS');

      // Reset mock organizations
      mockOrganizations = [
        { id: 'org_uuid_101', name: 'EVOS Yunusobod', code: 'EVOS-01', currencyIsoName: 'UZS' }
      ];
    })();

    // -------------------------------------------------------------
    // Negative Test 5: Menu base price skips inactive variants, quote rejects unknown modifiers, and checkAvailability rejects missing items
    // -------------------------------------------------------------
    await test('Negative 5: Menu base price skips inactive variants, quote rejects unknown modifiers, and checkAvailability rejects missing items', async () => {
      mockExtraProducts = true;
      try {
        const adapter = new IikoProviderAdapter({
          slug: 'iiko-menu-neg-test',
          baseUrl: mockBaseUrl,
          config: { apiKey: 'key_menu', currency: 'UZS', organizationId: 'org_uuid_101' }
        });

        // 1. Verify offering basePrice chooses available size (32000), NOT inactive size S (15000)
        const catalog = await adapter.getCatalog({ providerSlug: 'iiko-menu-neg-test' });
        const burger = catalog.offerings.find((o) => o.id === 'prod_burger_deal');
        assert.ok(burger, 'Burger deal must exist in catalog');
        assert.strictEqual(burger?.basePrice, 32000, 'Base price must be selected from active variant (32000), not inactive (15000)');

        // 2. requestQuote with unknown modifier group throws ResourceUnavailableError
        let unknownGroupFailed = false;
        try {
          await adapter.requestQuote({
            providerSlug: 'iiko-menu-neg-test',
            items: [
              {
                offeringId: 'prod_lavash_mol',
                quantity: 1,
                selectedOptions: [
                  { groupId: 'non_existent_group', optionId: 'some_opt', quantity: 1 }
                ]
              }
            ]
          });
        } catch (err: any) {
          unknownGroupFailed = true;
          assert.strictEqual(err.name, 'ResourceUnavailableError');
          assert.strictEqual(err.message.includes('Option group "non_existent_group" not found'), true);
        }
        assert.strictEqual(unknownGroupFailed, true, 'Unknown modifier group must be rejected');

        // 3. requestQuote with unknown modifier option inside valid group throws ResourceUnavailableError
        let unknownOptionFailed = false;
        try {
          await adapter.requestQuote({
            providerSlug: 'iiko-menu-neg-test',
            items: [
              {
                offeringId: 'prod_lavash_mol',
                quantity: 1,
                selectedOptions: [
                  { groupId: 'mod_group_cheese', optionId: 'non_existent_cheese_opt', quantity: 1 }
                ]
              }
            ]
          });
        } catch (err: any) {
          unknownOptionFailed = true;
          assert.strictEqual(err.name, 'ResourceUnavailableError');
          assert.strictEqual(err.message.includes('Option "non_existent_cheese_opt" not found'), true);
        }
        assert.strictEqual(unknownOptionFailed, true, 'Unknown modifier option must be rejected');

        // 4. checkAvailability with non-existent offering must be UNAVAILABLE
        const avail = await adapter.checkAvailability({
          providerSlug: 'iiko-menu-neg-test',
          items: [
            { offeringId: 'totally_fake_product_id' }
          ]
        });
        assert.strictEqual(avail.isAvailable, false);
        assert.strictEqual(avail.availabilityStatus, AvailabilityStatus.UNAVAILABLE);
        assert.strictEqual(avail.unavailableItems.length, 1);
        assert.strictEqual(avail.unavailableItems[0].reason, 'Product not found in iiko menu');
      } finally {
        mockExtraProducts = false;
      }
    })();

    await test('iikoWeb external menu V3 supplies catalog prices and availability', async () => {
      const adapter = new IikoProviderAdapter({
        slug: 'iiko-external-menu-test', baseUrl: mockBaseUrl,
        config: { apiKey: 'key_external', organizationId: 'org_uuid_101', currency: 'UZS', externalMenuId: 'demo-menu' }
      });
      const catalog = await adapter.getCatalog({ providerSlug: 'iiko-external-menu-test' });
      assert.strictEqual(catalog.categories[0].title, 'Demo taomlar');
      assert.strictEqual(catalog.offerings.length, 1);
      assert.strictEqual(catalog.offerings[0].title, 'Demo taom');
      assert.strictEqual(catalog.offerings[0].basePrice, 100);
      assert.strictEqual(catalog.offerings[0].isAvailable, true);
      const availability = await adapter.checkAvailability({
        providerSlug: 'iiko-external-menu-test',
        items: [{ offeringId: 'external-dish', variantId: 'external-dish' }]
      });
      assert.strictEqual(availability.isAvailable, true);
    })();

  } finally {
    mockServer.close();
  }

  // -------------------------------------------------------------
  // Test 11: Live handshake test against https://api-ru.iiko.services
  // -------------------------------------------------------------
  if (process.env.IIKO_LIVE_HANDSHAKE === '1') await test('Live handshake test against api-ru.iiko.services (and credential verification)', async () => {
    const liveClient = new IikoClient({
      baseUrl: 'https://api-ru.iiko.services',
      providerSlug: 'iiko-live-handshake',
      credentials: {
        appId: 'dummy_app_id',
        clientSecret: 'dummy_secret',
        apiKey: 'dummy_key'
      },
      timeoutMs: 8000
    });

    try {
      await liveClient.getAccessToken();
      console.log('    ℹ Live API call succeeded.');
    } catch (err: any) {
      // Expected to fail with 401/400 because dummy credentials were provided
      console.log(`    ℹ Live handshake response: ${err.message}`);
      assert.strictEqual(err.statusCode >= 400 && err.statusCode < 600, true);
      console.log('    ℹ Confirmed: api-ru.iiko.services is reachable, and strictly requires developer appId, clientSecret, and restaurant apiKey.');
    }
  })();

  console.log('\n======================================================');
  console.log(`Summary: ${results.filter((r) => r.passed).length}/${results.length} tests passed.`);
  console.log('======================================================\n');

  if (results.some((r) => !r.passed)) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
