UPDATE "Provider" 
SET "baseUrl" = 'https://evos-sandbox.shopla.uz/p/' || slug,
    metadata = jsonb_set(
      jsonb_set(metadata, '{healthStatus}', '"HEALTHY"'::jsonb),
      '{healthMonitoring,state}', '"HEALTHY"'::jsonb
    )
WHERE status = 'ACTIVE' AND "adapterType" = 'remote-http';
