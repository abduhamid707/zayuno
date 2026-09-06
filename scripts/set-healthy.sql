UPDATE "Provider" SET
  metadata = jsonb_set(
    jsonb_set(metadata, '{healthMonitoring,state}', '"HEALTHY"'),
    '{healthStatus}', '"HEALTHY"'
  ),
  "updatedAt" = NOW()
WHERE slug = 'maxway';
