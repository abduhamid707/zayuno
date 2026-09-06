UPDATE "Provider" SET
  "baseUrl" = 'http://mock-evos:4001',
  metadata = jsonb_set(
    jsonb_set(
      jsonb_set(metadata, '{healthStatus}', '"HEALTHY"'),
      '{healthMonitoring,state}', '"HEALTHY"'
    ),
    '{healthMonitoring,isTemporarilyUnavailable}', 'false'
  ),
  "updatedAt" = NOW()
WHERE slug = 'maxway';
