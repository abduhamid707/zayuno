const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');

// Read .env on server
const envContent = fs.readFileSync('/root/zayuno/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const DATABASE_URL = env.DATABASE_URL || 'postgresql://postgres:admin@zayuno-postgres:5432/zayuno?schema=public';
const ENCRYPTION_KEY = env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const WEBHOOK_SECRET = env.ZAYUNO_WEBHOOK_SECRET || 'zy_webhook_secret_key_123';

function encryptSecret(plainText, hexKey) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(hexKey, 'hex'), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL.replace('localhost', '127.0.0.1')
  });

  await client.connect();
  console.log('Connected to production PostgreSQL database.');

  const slug = 'maxway';
  const name = 'MaxWay';
  const encryptedSecret = encryptSecret('maxway_secret_key_live_2026', ENCRYPTION_KEY);

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

  const config = JSON.stringify({ authMethod: 'API_KEY' });
  const metadata = JSON.stringify({
    description: 'Toshkent bo‘ylab tezkor va mazali fast-food, lavash, burger va ichimliklar yetkazib berish xizmati.',
    tier: 'STANDARD',
    category: 'food_delivery',
    geography: ['UZ', 'Tashkent'],
    reviewStatus: 'APPROVED',
    isCertified: true,
    isPublished: true,
    isTemporarilyUnavailable: false,
    healthStatus: 'HEALTHY',
    fulfillmentMode: 'DELIVERY',
    catalogSummary: { totalCount: 8, availableCount: 8 },
    activeLocationsCount: 3,
    rating: 4.9,
    supportContact: {
      phone: '+998712005555',
      telegram: '@maxway_support',
      workingHours: '09:00 - 03:00 (Har kuni)'
    }
  });

  // 1. Check if provider exists
  const existing = await client.query('SELECT id FROM "Provider" WHERE slug = $1', [slug]);
  let providerId;

  if (existing.rows.length > 0) {
    providerId = existing.rows[0].id;
    await client.query(`
      UPDATE "Provider"
      SET name = $1, status = 'ACTIVE', type = 'DELIVERY', "adapterType" = 'sandbox',
          capabilities = $2, "encryptedSecret" = $3, "webhookSecret" = $4,
          config = $5, metadata = $6, "updatedAt" = NOW()
      WHERE id = $7
    `, [name, capabilities, encryptedSecret, WEBHOOK_SECRET, config, metadata, providerId]);
    console.log(`Updated Provider: ${name} (ID: ${providerId})`);
  } else {
    providerId = crypto.randomUUID();
    await client.query(`
      INSERT INTO "Provider" (id, slug, name, status, type, "adapterType", capabilities, "encryptedSecret", "webhookSecret", config, metadata, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, 'ACTIVE', 'DELIVERY', 'sandbox', $4, $5, $6, $7, $8, NOW(), NOW())
    `, [providerId, slug, name, capabilities, encryptedSecret, WEBHOOK_SECRET, config, metadata]);
    console.log(`Created Provider: ${name} (ID: ${providerId})`);
  }

  // 2. Insert Locations
  const locations = [
    {
      locId: 'maxway-loc-chilonzor',
      name: 'MaxWay Chilonzor filiali',
      address: 'Toshkent sh., Chilonzor tumani, 9-mavze, 12-uy',
      lat: 41.2785,
      lng: 69.2054,
      radius: 10.0,
      hours: JSON.stringify({ open: '09:00', close: '03:00' })
    },
    {
      locId: 'maxway-loc-markaz',
      name: 'MaxWay Amir Temur filiali',
      address: 'Toshkent sh., Yunusobod tumani, Amir Temur shoh ko‘chasi, 45-uy',
      lat: 41.3152,
      lng: 69.2816,
      radius: 12.0,
      hours: JSON.stringify({ open: '09:00', close: '03:00' })
    },
    {
      locId: 'maxway-loc-yunusobod',
      name: 'MaxWay Yunusobod filiali',
      address: 'Toshkent sh., Yunusobod tumani, 11-mavze, Ahmad Donish ko‘chasi',
      lat: 41.3654,
      lng: 69.2901,
      radius: 10.0,
      hours: JSON.stringify({ open: '09:00', close: '03:00' })
    }
  ];

  for (const loc of locations) {
    const locExist = await client.query(
      'SELECT id FROM "Location" WHERE "providerId" = $1 AND "providerLocationId" = $2',
      [providerId, loc.locId]
    );

    if (locExist.rows.length > 0) {
      await client.query(`
        UPDATE "Location"
        SET name = $1, address = $2, latitude = $3, longitude = $4, "serviceRadiusKm" = $5,
            "operatingHours" = $6, "isActive" = true, "updatedAt" = NOW()
        WHERE id = $7
      `, [loc.name, loc.address, loc.lat, loc.lng, loc.radius, loc.hours, locExist.rows[0].id]);
      console.log(`  Updated location: ${loc.name}`);
    } else {
      const locUUID = crypto.randomUUID();
      await client.query(`
        INSERT INTO "Location" (id, "providerId", "providerLocationId", name, address, latitude, longitude, "serviceRadiusKm", "operatingHours", "isActive", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
      `, [locUUID, providerId, loc.locId, loc.name, loc.address, loc.lat, loc.lng, loc.radius, loc.hours]);
      console.log(`  Created location: ${loc.name}`);
    }
  }

  console.log('MaxWay successfully deployed to production database!');
  await client.end();
}

run().catch(err => {
  console.error('Error seeding prod:', err);
  process.exit(1);
});
