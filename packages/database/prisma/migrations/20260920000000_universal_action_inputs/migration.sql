-- Additive migration; existing rows and quote financial authority are retained.
ALTER TABLE "Action" ALTER COLUMN "customerName" DROP NOT NULL;
ALTER TABLE "Action" ALTER COLUMN "customerPhone" DROP NOT NULL;
ALTER TABLE "Action" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Action" ADD COLUMN "locations" JSONB;
ALTER TABLE "Quote" ADD COLUMN "requestInput" JSONB;
