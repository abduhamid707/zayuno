
DO $$
DECLARE
  v_provider_id TEXT;
BEGIN
  SELECT id INTO v_provider_id FROM "Provider" WHERE slug = 'maxway';
  
  IF v_provider_id IS NULL THEN
    v_provider_id := gen_random_uuid()::text;
    INSERT INTO "Provider" (
      id, slug, name, status, type, "adapterType", capabilities,
      "encryptedSecret", "webhookSecret", config, metadata, "createdAt", "updatedAt"
    ) VALUES (
      v_provider_id, 'maxway', 'MaxWay', 'ACTIVE', 'DELIVERY', 'sandbox',
      '{METADATA,HEALTH,LOCATIONS,CATALOG,SEARCH,QUOTE,ACTION_CREATE,ACTION_STATUS,ACTION_CANCEL,PAYMENT_OPTIONS,WEBHOOK}'::"ProviderCapability"[],
      'cd3f2b166294096cb47c4560e16e17e9:63cc043c51761377d56dc729866fa615:393a7dea2cfa5008f53afb62165521ecc619c828c1a2bce257653e', 'zy_webhook_secret_key_123', '{"authMethod":"API_KEY"}'::jsonb, '{"description":"Toshkent bo‘ylab tezkor va mazali fast-food, lavash, burger va ichimliklar yetkazib berish xizmati.","tier":"STANDARD","category":"food_delivery","geography":["UZ","Tashkent"],"reviewStatus":"APPROVED","isCertified":true,"isPublished":true,"isTemporarilyUnavailable":false,"healthStatus":"HEALTHY","fulfillmentMode":"DELIVERY","catalogSummary":{"totalCount":8,"availableCount":8},"activeLocationsCount":3,"rating":4.9,"supportContact":{"phone":"+998712005555","telegram":"@maxway_support","workingHours":"09:00 - 03:00 (Har kuni)"}}'::jsonb,
      NOW(), NOW()
    );
    RAISE NOTICE 'Created Provider MaxWay with ID %', v_provider_id;
  ELSE
    UPDATE "Provider" SET
      name = 'MaxWay',
      status = 'ACTIVE',
      type = 'DELIVERY',
      "adapterType" = 'sandbox',
      capabilities = '{METADATA,HEALTH,LOCATIONS,CATALOG,SEARCH,QUOTE,ACTION_CREATE,ACTION_STATUS,ACTION_CANCEL,PAYMENT_OPTIONS,WEBHOOK}'::"ProviderCapability"[],
      "encryptedSecret" = 'cd3f2b166294096cb47c4560e16e17e9:63cc043c51761377d56dc729866fa615:393a7dea2cfa5008f53afb62165521ecc619c828c1a2bce257653e',
      "webhookSecret" = 'zy_webhook_secret_key_123',
      config = '{"authMethod":"API_KEY"}'::jsonb,
      metadata = '{"description":"Toshkent bo‘ylab tezkor va mazali fast-food, lavash, burger va ichimliklar yetkazib berish xizmati.","tier":"STANDARD","category":"food_delivery","geography":["UZ","Tashkent"],"reviewStatus":"APPROVED","isCertified":true,"isPublished":true,"isTemporarilyUnavailable":false,"healthStatus":"HEALTHY","fulfillmentMode":"DELIVERY","catalogSummary":{"totalCount":8,"availableCount":8},"activeLocationsCount":3,"rating":4.9,"supportContact":{"phone":"+998712005555","telegram":"@maxway_support","workingHours":"09:00 - 03:00 (Har kuni)"}}'::jsonb,
      "updatedAt" = NOW()
    WHERE id = v_provider_id;
    RAISE NOTICE 'Updated Provider MaxWay with ID %', v_provider_id;
  END IF;

  -- 1. Location Chilonzor
  INSERT INTO "Location" (
    id, "providerId", "providerLocationId", name, address, latitude, longitude,
    "serviceRadiusKm", "operatingHours", "isActive", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::text, v_provider_id, 'maxway-loc-chilonzor',
    'MaxWay Chilonzor filiali', 'Toshkent sh., Chilonzor tumani, 9-mavze, 12-uy',
    41.2785, 69.2054, 10.0, '{"open": "09:00", "close": "03:00"}'::jsonb, true, NOW(), NOW()
  )
  ON CONFLICT ("providerId", "providerLocationId") DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    "serviceRadiusKm" = EXCLUDED."serviceRadiusKm",
    "operatingHours" = EXCLUDED."operatingHours",
    "isActive" = true,
    "updatedAt" = NOW();

  -- 2. Location Amir Temur
  INSERT INTO "Location" (
    id, "providerId", "providerLocationId", name, address, latitude, longitude,
    "serviceRadiusKm", "operatingHours", "isActive", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::text, v_provider_id, 'maxway-loc-markaz',
    'MaxWay Amir Temur filiali', 'Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi, 45-uy',
    41.3152, 69.2816, 12.0, '{"open": "09:00", "close": "03:00"}'::jsonb, true, NOW(), NOW()
  )
  ON CONFLICT ("providerId", "providerLocationId") DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    "serviceRadiusKm" = EXCLUDED."serviceRadiusKm",
    "operatingHours" = EXCLUDED."operatingHours",
    "isActive" = true,
    "updatedAt" = NOW();

  -- 3. Location Yunusobod
  INSERT INTO "Location" (
    id, "providerId", "providerLocationId", name, address, latitude, longitude,
    "serviceRadiusKm", "operatingHours", "isActive", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::text, v_provider_id, 'maxway-loc-yunusobod',
    'MaxWay Yunusobod filiali', 'Toshkent sh., Yunusobod tumani, 11-mavze, Ahmad Donish ko‘chasi',
    41.3654, 69.2901, 10.0, '{"open": "09:00", "close": "03:00"}'::jsonb, true, NOW(), NOW()
  )
  ON CONFLICT ("providerId", "providerLocationId") DO UPDATE SET
    name = EXCLUDED.name,
    address = EXCLUDED.address,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    "serviceRadiusKm" = EXCLUDED."serviceRadiusKm",
    "operatingHours" = EXCLUDED."operatingHours",
    "isActive" = true,
    "updatedAt" = NOW();

END $$;
