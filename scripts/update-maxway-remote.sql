
UPDATE "Provider" SET
  "adapterType" = 'remote-http',
  "baseUrl" = 'http://zayuno-mock-evos:4001',
  metadata = '{"description":"Toshkent bo‘ylab tezkor va mazali fast-food, lavash, burger va ichimliklar yetkazib berish xizmati.","tier":"STANDARD","category":"food_delivery","geography":["UZ","Tashkent"],"reviewStatus":"APPROVED","isCertified":true,"isPublished":true,"isTemporarilyUnavailable":false,"healthStatus":"HEALTHY","healthMonitoring":{"state":"HEALTHY","lastLatencyMs":45,"lastCheckedAt":"2026-09-06T03:07:51.961Z"},"fulfillmentMode":"DELIVERY","catalogSummary":{"totalCount":8,"availableCount":8},"activeLocationsCount":3,"rating":4.9,"supportContact":{"phone":"+998712005555","telegram":"@maxway_support","workingHours":"09:00 - 03:00 (Har kuni)"}}'::jsonb,
  "updatedAt" = NOW()
WHERE slug = 'maxway';
