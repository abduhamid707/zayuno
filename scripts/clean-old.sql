UPDATE "Provider" 
SET status = 'SUSPENDED',
    metadata = jsonb_set(
      jsonb_set(metadata, '{isPublished}', 'false'::jsonb),
      '{reviewStatus}', '"SUSPENDED"'::jsonb
    )
WHERE slug IN ('coffee-express', 'rayhon-table-booking', 'silk-road-travel', 'skyline-avia-booking', 'maxifood-express', 'hh-uz');
