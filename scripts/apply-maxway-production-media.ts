import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { SafePublicHttpsUrlSchema, MediaItemSchema } from '@zayuno/contracts';

const SEED = 'maxway-gifts-v1';
const IMAGE_HOST = 'https://api.zayuno.uz';
const TARGET_SLUG = 'maxway';
const EXPECTED_OFFERING_COUNT = 22;

const GIFT_IMAGES = [
  'gift-01.jpg', 'gift-02.jpg', 'gift-03.webp', 'gift-04.jpg',
  'gift-05.jpg', 'gift-06.jpg', 'gift-07.jpg', 'gift-08.jpg',
  'gift-09.jpg', 'gift-10.jpg', 'gift-11.jpg', 'gift-12.jpg',
  'gift-13.jpg', 'gift-14.jpg', 'gift-15.jpg', 'gift-16.jpg',
  'gift-17.jpg'
];

function createRng(seedStr: string) {
  let counter = 0;
  return () => {
    const hash = crypto.createHash('sha256').update(`${seedStr}:${counter++}`).digest('hex');
    return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  };
}

function computeDeterministicMapping(offeringIds: string[], images: string[], seedStr: string): Map<string, string> {
  const rng = createRng(seedStr);
  const pool = [...images];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const mapping = new Map<string, string>();
  offeringIds.forEach((id, index) => {
    if (index < pool.length) {
      mapping.set(id, pool[index]);
    } else {
      const extraIndex = Math.floor(rng() * pool.length);
      mapping.set(id, pool[extraIndex]);
    }
  });

  return mapping;
}

async function run() {
  console.log('====================================================');
  console.log('Production MaxWay Media Update & Invalidation');
  console.log('====================================================\n');

  // 1. Fetch current production metadata via SSH
  console.log('1. Fetching current production metadata from PostgreSQL...');
  const fetchSql = `SELECT metadata::text FROM "Provider" WHERE slug = '${TARGET_SLUG}';`;
  const currentMetaRaw = execSync(
    `ssh root@158.220.100.58 "docker exec -i zayuno-postgres psql -U postgres -d zayuno -A -t"`,
    { input: fetchSql, encoding: 'utf8' }
  ).trim();

  const currentMetadata = JSON.parse(currentMetaRaw);
  const offerings: any[] = currentMetadata.offerings || [];

  console.log(`   Found ${offerings.length} offerings in production metadata.`);
  if (offerings.length !== EXPECTED_OFFERING_COUNT) {
    throw new Error(`Expected ${EXPECTED_OFFERING_COUNT} offerings, got ${offerings.length}`);
  }

  // 2. Validate IDs
  const offeringIds = offerings.map((o: any) => String(o.id));
  for (let i = 1; i <= EXPECTED_OFFERING_COUNT; i++) {
    const id = `mw-${String(i).padStart(2, '0')}`;
    if (!offeringIds.includes(id)) {
      throw new Error(`Missing expected ID: ${id}`);
    }
  }
  console.log('   All 22 offering IDs (mw-01 .. mw-22) verified.');

  // 3. Compute deterministic mapping
  const mapping = computeDeterministicMapping(offeringIds, GIFT_IMAGES, SEED);
  console.log('   Deterministic mapping computed with seed:', SEED);

  // 4. Build and validate updated offerings
  const updatedOfferings = offerings.map((offering: any) => {
    const imageName = mapping.get(offering.id)!;
    const imageUrl = `${IMAGE_HOST}/assets/gifts/${imageName}`;

    SafePublicHttpsUrlSchema.parse(imageUrl);

    const mediaItem = {
      url: imageUrl,
      altText: offering.title,
      order: 0
    };
    MediaItemSchema.parse(mediaItem);

    return {
      ...offering,
      imageUrl,
      media: [mediaItem]
    };
  });

  console.log('   All 22 offerings enriched and validated against contracts.');

  // 5. Write local timestamped backup
  const backupDir = path.resolve(process.cwd(), 'scripts/backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `prod-maxway-metadata-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(currentMetadata, null, 2), 'utf8');
  console.log(`   Backup saved to: ${backupPath}`);

  // 6. Build new metadata
  const updatedMetadata = {
    ...currentMetadata,
    offerings: updatedOfferings,
    mediaUpdatedStamp: new Date().toISOString(),
    mediaSeed: SEED
  };

  const escapedJson = JSON.stringify(updatedMetadata).replace(/'/g, "''");

  // 7. Atomic transaction in PostgreSQL
  console.log('\n2. Executing atomic SQL transaction on production database...');
  const transactionSql = `
BEGIN;

DO $$
DECLARE
  v_count INT;
  v_off_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM "Provider" WHERE slug = '${TARGET_SLUG}';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Provider ${TARGET_SLUG} not found or ambiguous';
  END IF;

  SELECT jsonb_array_length(metadata->'offerings') INTO v_off_count FROM "Provider" WHERE slug = '${TARGET_SLUG}';
  IF v_off_count <> ${EXPECTED_OFFERING_COUNT} THEN
    RAISE EXCEPTION 'Expected ${EXPECTED_OFFERING_COUNT} offerings, found %', v_off_count;
  END IF;
END $$;

UPDATE "Provider"
SET
  metadata = '${escapedJson}'::jsonb,
  "updatedAt" = NOW()
WHERE slug = '${TARGET_SLUG}';

COMMIT;
`;

  const txOutput = execSync(
    `ssh root@158.220.100.58 "docker exec -i zayuno-postgres psql -U postgres -d zayuno"`,
    { input: transactionSql, encoding: 'utf8' }
  );
  console.log('   Transaction output:\n', txOutput.trim());

  // 8. Invalidate Redis cache
  console.log('\n3. Invalidating Redis catalog cache for provider "maxway"...');
  const redisDelScript = `
keys=$(docker exec zayuno-redis redis-cli keys 'provider-data:v1:${TARGET_SLUG}:*')
if [ -n "$keys" ]; then
  echo "Found keys: $keys"
  echo "$keys" | xargs -r docker exec zayuno-redis redis-cli del
else
  echo "No cache keys found to delete."
fi
`;
  const redisOutput = execSync(
    `ssh root@158.220.100.58 "${redisDelScript.replace(/\n/g, ' ')}"`,
    { encoding: 'utf8' }
  );
  console.log('   Redis invalidation output:\n', redisOutput.trim());

  // 9. Verify in database
  console.log('\n4. Verifying database state...');
  const verifySql = `
SELECT
  jsonb_array_length(metadata->'offerings') as total_offerings,
  (SELECT count(*) FROM jsonb_array_elements(metadata->'offerings') elem WHERE elem->>'imageUrl' IS NOT NULL) as with_image_url,
  (SELECT count(*) FROM jsonb_array_elements(metadata->'offerings') elem WHERE jsonb_array_length(elem->'media') > 0) as with_media
FROM "Provider" WHERE slug = '${TARGET_SLUG}';
`;
  const verifyOutput = execSync(
    `ssh root@158.220.100.58 "docker exec -i zayuno-postgres psql -U postgres -d zayuno"`,
    { input: verifySql, encoding: 'utf8' }
  );
  console.log('   Verification query result:\n', verifyOutput.trim());

  console.log('\n====================================================');
  console.log('PRODUCTION METADATA UPDATE & CACHE PURGE COMPLETE!');
  console.log('====================================================\n');
}

run().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
