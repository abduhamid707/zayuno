UPDATE "Provider" SET
  metadata = jsonb_set(
    jsonb_set(
      jsonb_set(metadata, '{isTemporarilyUnavailable}', 'false'),
      '{healthMonitoring,isTemporarilyUnavailable}', 'false'
    ),
    '{healthMonitoring,state}', '"HEALTHY"'
  ),
  "updatedAt" = NOW()
WHERE slug = 'maxway';
