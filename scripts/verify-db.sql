SELECT 
  slug, 
  name, 
  status, 
  "adapterType", 
  metadata->>'healthStatus' AS health, 
  metadata->>'reviewStatus' AS review, 
  metadata->>'isCertified' AS cert, 
  metadata->>'isPublished' AS pub,
  jsonb_array_length(metadata->'offerings') AS offerings_count
FROM "Provider" 
ORDER BY slug;
