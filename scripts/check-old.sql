SELECT p.slug, count(a.id) as action_count, count(q.id) as quote_count
FROM "Provider" p
LEFT JOIN "Action" a ON a."providerId" = p.id
LEFT JOIN "Quote" q ON q."providerId" = p.id
WHERE p.slug IN ('coffee-express', 'maxifood-express', 'silk-road-travel', 'skyline-avia-booking', 'rayhon-table-booking', 'hh-uz')
GROUP BY p.slug;
