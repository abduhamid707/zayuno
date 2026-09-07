import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { SafePublicHttpsUrlSchema, MediaItemSchema } from '@zayuno/contracts';

// Load .env securely from project root
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('CRITICAL: DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const REDIS_URL = process.env.REDIS_URL;

// Parse CLI flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const seedIndex = args.indexOf('--seed');
const SEED = seedIndex !== -1 && args[seedIndex + 1] ? args[seedIndex + 1] : 'maxway-gifts-v1';
const hostIndex = args.indexOf('--image-host');
const IMAGE_HOST = hostIndex !== -1 && args[hostIndex + 1] ? args[hostIndex + 1].replace(/\/+$/, '') : 'https://api.zayuno.uz';

const TARGET_SLUG = 'maxway';
const EXPECTED_OFFERING_COUNT = 22;

const GIFT_IMAGES = [
  'gift-01.jpg',
  'gift-02.jpg',
  'gift-03.webp',
  'gift-04.jpg',
  'gift-05.jpg',
  'gift-06.jpg',
  'gift-07.jpg',
  'gift-08.jpg',
  'gift-09.jpg',
  'gift-10.jpg',
  'gift-11.jpg',
  'gift-12.jpg',
  'gift-13.jpg',
  'gift-14.jpg',
  'gift-15.jpg',
  'gift-16.jpg',
  'gift-17.jpg'
];

// Deterministic PRNG seeded via SHA-256
function createRng(seedStr: string) {
  let counter = 0;
  return () => {
    const hash = crypto.createHash('sha256').update(`${seedStr}:${counter++}`).digest('hex');
    return parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  };
}

// Generate deterministic mapping from 22 offerings to 17 gift images
function computeDeterministicMapping(offeringIds: string[], images: string[], seedStr: string): Map<string, string> {
  const rng = createRng(seedStr);
  const pool = [...images];

  // Fisher-Yates shuffle
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

async function main() {
  console.log('====================================================');
  console.log('Zayuno MaxWay Offering Media Update Script');
  console.log('====================================================');
  console.log(`Target Provider : ${TARGET_SLUG}`);
  console.log(`Seed            : ${SEED}`);
  console.log(`Image Host      : ${IMAGE_HOST}`);
  console.log(`Dry-Run Mode    : ${isDryRun ? 'YES (No database or cache mutations)' : 'NO (Live update)'}`);
  console.log(`Force Overwrite : ${isForce ? 'YES' : 'NO'}`);
  console.log('====================================================\n');

  const prisma = new PrismaClient({
    datasources: { db: { url: DATABASE_URL } }
  });

  try {
    // 1. Fetch provider strictly by slug 'maxway'
    const provider = await prisma.provider.findUnique({
      where: { slug: TARGET_SLUG }
    });

    if (!provider) {
      throw new Error(`Provider with slug "${TARGET_SLUG}" not found in database.`);
    }

    if (provider.slug !== TARGET_SLUG) {
      throw new Error(`Security assertion failed: provider.slug (${provider.slug}) !== ${TARGET_SLUG}`);
    }

    const currentMetadata = (provider.metadata as Record<string, any>) || {};
    const offerings: any[] = Array.isArray(currentMetadata.offerings) ? currentMetadata.offerings : [];

    console.log(`Found provider "${provider.name}" (ID: ${provider.id})`);
    console.log(`Found ${offerings.length} offerings in metadata.`);

    // 2. Validate offering count and ID conventions
    if (offerings.length !== EXPECTED_OFFERING_COUNT) {
      throw new Error(`Expected exactly ${EXPECTED_OFFERING_COUNT} offerings for "${TARGET_SLUG}", but found ${offerings.length}.`);
    }

    const offeringIds = offerings.map((o) => String(o.id));
    const missingExpectedIds = [];
    for (let i = 1; i <= EXPECTED_OFFERING_COUNT; i++) {
      const id = `mw-${String(i).padStart(2, '0')}`;
      if (!offeringIds.includes(id)) {
        missingExpectedIds.push(id);
      }
    }
    if (missingExpectedIds.length > 0) {
      throw new Error(`Missing expected offering IDs: ${missingExpectedIds.join(', ')}`);
    }

    // 3. Overwrite guard check
    const offeringsWithExistingMedia = offerings.filter(
      (o) => o.imageUrl || (Array.isArray(o.media) && o.media.length > 0)
    );

    if (offeringsWithExistingMedia.length > 0 && !isForce) {
      console.error(`WARNING: ${offeringsWithExistingMedia.length} offerings already contain imageUrl or media.`);
      console.error('Use the --force flag if you explicitly intend to overwrite existing media.');
      process.exit(1);
    }

    // 4. Compute deterministic mapping
    const mapping = computeDeterministicMapping(offeringIds, GIFT_IMAGES, SEED);

    // 5. Build updated offerings array with validated contract-compliant imageUrl & media
    const updatedOfferings = offerings.map((offering) => {
      const imageName = mapping.get(offering.id);
      if (!imageName) {
        throw new Error(`No image mapped for offering ${offering.id}`);
      }

      const imageUrl = `${IMAGE_HOST}/assets/gifts/${imageName}`;

      // Contract runtime validation
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

    // Preview
    console.log('\n--- Offering Image Mapping Preview ---');
    updatedOfferings.forEach((item) => {
      console.log(`  [${item.id}] ${item.title.padEnd(45)} -> ${item.imageUrl}`);
    });
    console.log('--------------------------------------\n');

    // Usage statistics
    const usageCounts: Record<string, number> = {};
    GIFT_IMAGES.forEach((img) => (usageCounts[img] = 0));
    mapping.forEach((img) => usageCounts[img]++);
    console.log('Image usage distribution:');
    Object.entries(usageCounts).forEach(([img, count]) => {
      console.log(`  ${img}: used ${count} time(s)`);
    });

    if (isDryRun) {
      console.log('\n[DRY RUN COMPLETE] No changes were written to database or Redis.');
      return;
    }

    // 6. Save backup before mutation
    const backupDir = path.resolve(process.cwd(), 'scripts/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `maxway-metadata-backup-${timestamp}.json`);
    fs.writeFileSync(
      backupFilePath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          providerId: provider.id,
          providerSlug: provider.slug,
          metadata: currentMetadata
        },
        null,
        2
      ),
      'utf8'
    );
    console.log(`\nMetadata backup safely written to: ${backupFilePath}`);

    // 7. Transactional update of provider metadata
    console.log('Applying transactional update to database...');
    const updatedMetadata = {
      ...currentMetadata,
      offerings: updatedOfferings,
      mediaUpdatedStamp: new Date().toISOString(),
      mediaSeed: SEED,
      previousMetadataBackup: {
        timestamp: new Date().toISOString(),
        backupFile: path.basename(backupFilePath)
      }
    };

    await prisma.$transaction(async (tx) => {
      await tx.provider.update({
        where: { id: provider.id },
        data: {
          metadata: updatedMetadata,
          updatedAt: new Date()
        }
      });
    });
    console.log('Database transaction committed successfully.');

    // 8. Safely invalidate Redis catalog cache
    if (REDIS_URL) {
      console.log('Invalidating Redis catalog cache for provider "maxway"...');
      try {
        const redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
        await redis.connect();
        const keys = await redis.keys(`provider-data:v1:${TARGET_SLUG}:*`);
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`Deleted ${keys.length} cache key(s) matching provider-data:v1:${TARGET_SLUG}:*`);
        } else {
          console.log(`No cache keys found matching provider-data:v1:${TARGET_SLUG}:*`);
        }
        redis.disconnect();
      } catch (redisErr: any) {
        console.warn(`Warning: Could not invalidate Redis cache directly: ${redisErr.message}`);
      }
    } else {
      console.log('REDIS_URL not configured in environment, skipping direct Redis flush.');
    }

    console.log('\n====================================================');
    console.log('SUCCESS: All 22 MaxWay offerings updated with images!');
    console.log('====================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('\nEXECUTION FAILED:', err.message);
  process.exit(1);
});
