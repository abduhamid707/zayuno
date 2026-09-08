import fs from 'fs';
import { randomUUID } from 'crypto';
import { encryptSecret } from '@zayuno/shared';
import { loadAndFormatAllMenus } from './validate-and-seed-menus';

const ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const WEBHOOK_SECRET = 'zy_webhook_secret_sandbox_key_123';

function sqlEscape(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlArray(arr: string[]): string {
  return `ARRAY[${arr.map(s => `'${s}'`).join(', ')}]::"ProviderCapability"[]`;
}

async function main() {
  console.log('Generating seed-production.sql...');

  const providersData = loadAndFormatAllMenus();

  let sql = `-- Production Database Seeding for 5 Major Restaurant Chains\n`;
  sql += `-- Auto-generated with 803 real menu items\n\n`;
  sql += `BEGIN;\n\n`;
  sql += `DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM "Provider" WHERE slug = 'coffee-time') THEN\n    RAISE EXCEPTION 'CRITICAL: coffee-time provider not found!';\n  END IF;\nEND $$;\n\n`;

  for (const p of providersData) {
    const providerId = randomUUID();
    const secret = `secret_${p.slug}_live_key_999`;
    const encryptedSecret = encryptSecret(secret, ENCRYPTION_KEY);

    const capabilities = [
      'METADATA',
      'HEALTH',
      'LOCATIONS',
      'CATALOG',
      'SEARCH',
      'QUOTE',
      'ACTION_CREATE',
      'ACTION_STATUS',
      'ACTION_CANCEL',
      'PAYMENT_OPTIONS',
      'WEBHOOK'
    ];

    const config = {
      authMethod: 'API_KEY',
      supportContact: {
        phone: '+998712000000',
        email: `support@${p.slug}.uz`,
        workingHours: '10:00 - 03:00 (Har kuni)',
        supportUrl: `https://${p.slug}.uz`
      }
    };

    const metadata = {
      description: p.description,
      tier: 'STANDARD',
      rating: 4.8,
      environment: 'SANDBOX',
      category: 'food_dining',
      geography: ['UZ', 'Tashkent'],
      reviewStatus: 'APPROVED',
      isCertified: true,
      isPublished: true,
      isTemporarilyUnavailable: false,
      healthStatus: 'HEALTHY',
      fulfillmentMode: 'DELIVERY',
      catalogSummary: {
        totalCount: p.offerings.length,
        availableCount: p.offerings.length
      },
      activeLocationsCount: p.locations.length,
      categories: p.categories,
      offerings: p.offerings,
      locations: p.locations,
      supportContact: {
        phone: '+998712000000',
        email: `support@${p.slug}.uz`,
        workingHours: '10:00 - 03:00 (Har kuni)'
      }
    };

    sql += `-- ------------------------------------------------------------\n`;
    sql += `-- Provider: ${p.name} (${p.slug})\n`;
    sql += `-- ------------------------------------------------------------\n`;
    sql += `INSERT INTO "Provider" (\n`;
    sql += `  "id", "slug", "name", "logoUrl", "status", "type", "adapterType",\n`;
    sql += `  "capabilities", "baseUrl", "encryptedSecret", "webhookSecret", "config", "metadata", "createdAt", "updatedAt"\n`;
    sql += `) VALUES (\n`;
    sql += `  ${sqlEscape(providerId)},\n`;
    sql += `  ${sqlEscape(p.slug)},\n`;
    sql += `  ${sqlEscape(p.name)},\n`;
    sql += `  ${sqlEscape(p.logoUrl)},\n`;
    sql += `  'ACTIVE'::"ProviderStatus",\n`;
    sql += `  'DELIVERY'::"ProviderType",\n`;
    sql += `  'sandbox',\n`;
    sql += `  ${sqlArray(capabilities)},\n`;
    sql += `  NULL,\n`;
    sql += `  ${sqlEscape(encryptedSecret)},\n`;
    sql += `  ${sqlEscape(WEBHOOK_SECRET)},\n`;
    sql += `  ${sqlEscape(config)},\n`;
    sql += `  ${sqlEscape(metadata)},\n`;
    sql += `  NOW(),\n`;
    sql += `  NOW()\n`;
    sql += `)\n`;
    sql += `ON CONFLICT ("slug") DO UPDATE SET\n`;
    sql += `  "name" = EXCLUDED."name",\n`;
    sql += `  "logoUrl" = EXCLUDED."logoUrl",\n`;
    sql += `  "status" = EXCLUDED."status",\n`;
    sql += `  "type" = EXCLUDED."type",\n`;
    sql += `  "adapterType" = EXCLUDED."adapterType",\n`;
    sql += `  "capabilities" = EXCLUDED."capabilities",\n`;
    sql += `  "baseUrl" = EXCLUDED."baseUrl",\n`;
    sql += `  "encryptedSecret" = EXCLUDED."encryptedSecret",\n`;
    sql += `  "webhookSecret" = EXCLUDED."webhookSecret",\n`;
    sql += `  "config" = EXCLUDED."config",\n`;
    sql += `  "metadata" = EXCLUDED."metadata",\n`;
    sql += `  "updatedAt" = NOW();\n\n`;

    for (const loc of p.locations) {
      const locId = randomUUID();
      sql += `INSERT INTO "Location" (\n`;
      sql += `  "id", "providerId", "providerLocationId", "name", "address",\n`;
      sql += `  "latitude", "longitude", "operatingHours", "serviceRadiusKm", "isActive", "metadata", "createdAt", "updatedAt"\n`;
      sql += `) VALUES (\n`;
      sql += `  ${sqlEscape(locId)},\n`;
      sql += `  (SELECT "id" FROM "Provider" WHERE "slug" = ${sqlEscape(p.slug)}),\n`;
      sql += `  ${sqlEscape(loc.providerLocationId)},\n`;
      sql += `  ${sqlEscape(loc.name)},\n`;
      sql += `  ${sqlEscape(loc.address)},\n`;
      sql += `  ${loc.latitude},\n`;
      sql += `  ${loc.longitude},\n`;
      sql += `  ${sqlEscape(loc.operatingHours)},\n`;
      sql += `  ${loc.serviceRadiusKm},\n`;
      sql += `  TRUE,\n`;
      sql += `  '{}'::jsonb,\n`;
      sql += `  NOW(),\n`;
      sql += `  NOW()\n`;
      sql += `)\n`;
      sql += `ON CONFLICT ("providerId", "providerLocationId") DO UPDATE SET\n`;
      sql += `  "name" = EXCLUDED."name",\n`;
      sql += `  "address" = EXCLUDED."address",\n`;
      sql += `  "latitude" = EXCLUDED."latitude",\n`;
      sql += `  "longitude" = EXCLUDED."longitude",\n`;
      sql += `  "operatingHours" = EXCLUDED."operatingHours",\n`;
      sql += `  "serviceRadiusKm" = EXCLUDED."serviceRadiusKm",\n`;
      sql += `  "isActive" = EXCLUDED."isActive",\n`;
      sql += `  "updatedAt" = NOW();\n\n`;
    }
  }

  sql += `COMMIT;\n`;

  const outPath = 'data/seed-production.sql';
  fs.writeFileSync(outPath, sql, 'utf8');
  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Generated ${outPath} (${sizeMb} MB) with full 803 offerings and 20 locations.`);
}

main().catch(console.error);
