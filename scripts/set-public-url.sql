UPDATE "Provider" SET
  "baseUrl" = 'https://evos-sandbox.shopla.uz',
  metadata = jsonb_set(
    jsonb_set(
      jsonb_set(metadata, '{healthStatus}', '"HEALTHY"'),
      '{healthMonitoring,state}', '"HEALTHY"'
    ),
    '{healthMonitoring,isTemporarilyUnavailable}', 'false'
  ),
  "updatedAt" = NOW()
WHERE slug = 'maxway';
