-- The original migration history still creates Order/Branch tables, while the
-- current runtime data model uses Action/Location. Reconcile that legacy shape
-- without deleting records before later migrations add new fields.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_info
    JOIN pg_namespace namespace_info ON namespace_info.oid = type_info.typnamespace
    WHERE namespace_info.nspname = 'public' AND type_info.typname = 'ActionStatus'
  ) THEN
    CREATE TYPE "ActionStatus" AS ENUM (
      'DRAFT',
      'PENDING_CONFIRMATION',
      'AWAITING_PAYMENT',
      'SUBMITTED',
      'ACCEPTED',
      'IN_PROGRESS',
      'READY',
      'FULFILLING',
      'COMPLETED',
      'CANCELLED',
      'FAILED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF (to_regclass('public."Branch"') IS NOT NULL AND to_regclass('public."Location"') IS NOT NULL)
    OR (to_regclass('public."OrderQuote"') IS NOT NULL AND to_regclass('public."Quote"') IS NOT NULL)
    OR (to_regclass('public."Order"') IS NOT NULL AND to_regclass('public."Action"') IS NOT NULL)
    OR (to_regclass('public."OrderEvent"') IS NOT NULL AND to_regclass('public."ActionEvent"') IS NOT NULL) THEN
    RAISE EXCEPTION
      'Legacy and canonical core tables coexist; stop and reconcile the database manually before applying this migration.';
  END IF;

  IF to_regclass('public."Branch"') IS NOT NULL
    AND to_regclass('public."Location"') IS NULL THEN
    ALTER TABLE "Branch" RENAME TO "Location";
    ALTER TABLE "Location" RENAME COLUMN "providerBranchId" TO "providerLocationId";
    ALTER TABLE "Location" RENAME COLUMN "workingHours" TO "operatingHours";
    ALTER TABLE "Location" RENAME COLUMN "deliveryRadiusKm" TO "serviceRadiusKm";
    ALTER TABLE "Location" ALTER COLUMN "latitude" DROP NOT NULL;
    ALTER TABLE "Location" ALTER COLUMN "longitude" DROP NOT NULL;
    ALTER TABLE "Location" ALTER COLUMN "operatingHours" SET DEFAULT '{}';
    ALTER TABLE "Location" ALTER COLUMN "serviceRadiusKm" SET DEFAULT 10.0;
  END IF;

  IF to_regclass('public."OrderQuote"') IS NOT NULL
    AND to_regclass('public."Quote"') IS NULL THEN
    ALTER TABLE "OrderQuote" RENAME TO "Quote";
    ALTER TABLE "Quote" RENAME COLUMN "branchId" TO "locationId";
    ALTER TABLE "Quote" RENAME COLUMN "items" TO "lines";
    ALTER TABLE "Quote" RENAME COLUMN "deliveryFee" TO "fees";
    ALTER TABLE "Quote" RENAME COLUMN "deliveryType" TO "fulfillmentType";
    ALTER TABLE "Quote" RENAME COLUMN "address" TO "destination";
    ALTER TABLE "Quote" ALTER COLUMN "fulfillmentType" DROP DEFAULT;
    ALTER TABLE "Quote" ALTER COLUMN "fulfillmentType" TYPE TEXT USING "fulfillmentType"::text;
    ALTER TABLE "Quote" ALTER COLUMN "fulfillmentType" SET DEFAULT 'STANDARD';
    ALTER TABLE "Quote" ADD COLUMN "parameters" JSONB NOT NULL DEFAULT '{}';
  END IF;

  IF to_regclass('public."Order"') IS NOT NULL
    AND to_regclass('public."Action"') IS NULL THEN
    ALTER TABLE "Order" RENAME TO "Action";
    ALTER TABLE "Action" RENAME COLUMN "branchId" TO "locationId";
    ALTER TABLE "Action" RENAME COLUMN "items" TO "lines";
    ALTER TABLE "Action" RENAME COLUMN "deliveryFee" TO "fees";
    ALTER TABLE "Action" RENAME COLUMN "deliveryType" TO "fulfillmentType";
    ALTER TABLE "Action" RENAME COLUMN "deliveryAddress" TO "destination";
    ALTER TABLE "Action" RENAME COLUMN "providerOrderId" TO "externalActionId";
    ALTER TABLE "Action" ALTER COLUMN "fulfillmentType" DROP DEFAULT;
    ALTER TABLE "Action" ALTER COLUMN "fulfillmentType" TYPE TEXT USING "fulfillmentType"::text;
    ALTER TABLE "Action" ALTER COLUMN "fulfillmentType" SET DEFAULT 'STANDARD';
    ALTER TABLE "Action" ADD COLUMN "parameters" JSONB NOT NULL DEFAULT '{}';
  END IF;

  IF to_regclass('public."OrderEvent"') IS NOT NULL
    AND to_regclass('public."ActionEvent"') IS NULL THEN
    ALTER TABLE "OrderEvent" RENAME TO "ActionEvent";
    ALTER TABLE "ActionEvent" RENAME COLUMN "orderId" TO "actionId";

    ALTER TABLE "Location" RENAME CONSTRAINT "Branch_pkey" TO "Location_pkey";
    ALTER TABLE "Quote" RENAME CONSTRAINT "OrderQuote_pkey" TO "Quote_pkey";
    ALTER TABLE "Action" RENAME CONSTRAINT "Order_pkey" TO "Action_pkey";
    ALTER TABLE "ActionEvent" RENAME CONSTRAINT "OrderEvent_pkey" TO "ActionEvent_pkey";

    ALTER TABLE "Location" RENAME CONSTRAINT "Branch_providerId_fkey" TO "Location_providerId_fkey";
    ALTER TABLE "Action" RENAME CONSTRAINT "Order_providerId_fkey" TO "Action_providerId_fkey";
    ALTER TABLE "Action" RENAME CONSTRAINT "Order_branchId_fkey" TO "Action_locationId_fkey";
    ALTER TABLE "Action" RENAME CONSTRAINT "Order_quoteId_fkey" TO "Action_quoteId_fkey";
    ALTER TABLE "Action" RENAME CONSTRAINT "Order_userId_fkey" TO "Action_userId_fkey";
    ALTER TABLE "ActionEvent" RENAME CONSTRAINT "OrderEvent_orderId_fkey" TO "ActionEvent_actionId_fkey";

    ALTER INDEX "Branch_providerId_providerBranchId_key" RENAME TO "Location_providerId_providerLocationId_key";
    ALTER INDEX "Order_publicId_key" RENAME TO "Action_publicId_key";
    ALTER INDEX "Order_idempotencyKey_key" RENAME TO "Action_idempotencyKey_key";
    ALTER INDEX "Order_providerId_status_idx" RENAME TO "Action_providerId_status_idx";
    ALTER INDEX "Order_createdAt_idx" RENAME TO "Action_createdAt_idx";
    ALTER INDEX "OrderEvent_orderId_createdAt_idx" RENAME TO "ActionEvent_actionId_createdAt_idx";

  END IF;

  IF to_regclass('public."Quote"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public."Quote"'::regclass
        AND conname = 'Quote_providerId_fkey'
    ) THEN
    IF EXISTS (
      SELECT 1
      FROM "Quote"
      LEFT JOIN "Provider" ON "Provider"."id" = "Quote"."providerId"
      WHERE "Provider"."id" IS NULL
    ) THEN
      RAISE EXCEPTION
        'Cannot add Quote provider foreign key because legacy quotes reference missing providers.';
    END IF;
    ALTER TABLE "Quote"
      ADD CONSTRAINT "Quote_providerId_fkey"
      FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF to_regclass('public."Quote"') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public."Quote"'::regclass
        AND conname = 'Quote_locationId_fkey'
    ) THEN
    IF EXISTS (
      SELECT 1
      FROM "Quote"
      LEFT JOIN "Location" ON "Location"."id" = "Quote"."locationId"
      WHERE "Quote"."locationId" IS NOT NULL
        AND "Location"."id" IS NULL
    ) THEN
      RAISE EXCEPTION
        'Cannot add Quote location foreign key because legacy quotes reference missing locations.';
    END IF;
    ALTER TABLE "Quote"
      ADD CONSTRAINT "Quote_locationId_fkey"
      FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_attribute attribute_info
    JOIN pg_type type_info ON type_info.oid = attribute_info.atttypid
    WHERE attribute_info.attrelid = 'public."Action"'::regclass
      AND attribute_info.attname = 'status'
      AND NOT attribute_info.attisdropped
      AND type_info.typname = 'OrderStatus'
  ) THEN
    UPDATE "Action"
    SET "metadata" = COALESCE("metadata", '{}'::jsonb)
      || jsonb_build_object('legacyOrderStatus', "status"::text)
    WHERE "status"::text IN (
      'AWAITING_CONFIRMATION',
      'CREATING',
      'PAID',
      'PREPARING',
      'DELIVERING',
      'DELIVERED'
    );
    ALTER TABLE "Action" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Action" ALTER COLUMN "status" TYPE "ActionStatus"
      USING (
        CASE "status"::text
          WHEN 'AWAITING_CONFIRMATION' THEN 'PENDING_CONFIRMATION'
          WHEN 'CREATING' THEN 'SUBMITTED'
          WHEN 'PAID' THEN 'SUBMITTED'
          WHEN 'PREPARING' THEN 'IN_PROGRESS'
          WHEN 'DELIVERING' THEN 'FULFILLING'
          WHEN 'DELIVERED' THEN 'COMPLETED'
          ELSE "status"::text
        END
      )::"ActionStatus";
    ALTER TABLE "Action" ALTER COLUMN "status" SET DEFAULT 'AWAITING_PAYMENT';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_attribute attribute_info
    JOIN pg_type type_info ON type_info.oid = attribute_info.atttypid
    WHERE attribute_info.attrelid = 'public."ActionEvent"'::regclass
      AND attribute_info.attname = 'status'
      AND NOT attribute_info.attisdropped
      AND type_info.typname = 'OrderStatus'
  ) THEN
    UPDATE "ActionEvent"
    SET "payload" = COALESCE("payload", '{}'::jsonb)
      || jsonb_build_object('legacyOrderStatus', "status"::text)
    WHERE "status"::text IN (
      'AWAITING_CONFIRMATION',
      'CREATING',
      'PAID',
      'PREPARING',
      'DELIVERING',
      'DELIVERED'
    );
    ALTER TABLE "ActionEvent" ALTER COLUMN "status" TYPE "ActionStatus"
      USING (
        CASE "status"::text
          WHEN 'AWAITING_CONFIRMATION' THEN 'PENDING_CONFIRMATION'
          WHEN 'CREATING' THEN 'SUBMITTED'
          WHEN 'PAID' THEN 'SUBMITTED'
          WHEN 'PREPARING' THEN 'IN_PROGRESS'
          WHEN 'DELIVERING' THEN 'FULFILLING'
          WHEN 'DELIVERED' THEN 'COMPLETED'
          ELSE "status"::text
        END
      )::"ActionStatus";
  END IF;
END $$;

DROP TYPE IF EXISTS "DeliveryType";
DROP TYPE IF EXISTS "OrderStatus";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum enum_info
    JOIN pg_type type_info ON type_info.oid = enum_info.enumtypid
    WHERE type_info.typname = 'ProviderType' AND enum_info.enumlabel = 'FOOD'
  ) THEN
    UPDATE "Provider"
    SET "metadata" = COALESCE("metadata", '{}'::jsonb)
      || jsonb_build_object('legacyProviderType', "type"::text)
    WHERE "type"::text = 'FOOD';
    CREATE TYPE "ProviderType_reconciled" AS ENUM (
      'RETAIL',
      'DELIVERY',
      'SERVICES',
      'BOOKINGS',
      'TICKETING',
      'DIGITAL',
      'COMMERCE',
      'OTHER'
    );
    ALTER TABLE "Provider" ALTER COLUMN "type" DROP DEFAULT;
    ALTER TABLE "Provider" ALTER COLUMN "type" TYPE "ProviderType_reconciled"
      USING (
        CASE "type"::text
          WHEN 'FOOD' THEN 'DELIVERY'
          ELSE "type"::text
        END
      )::"ProviderType_reconciled";
    ALTER TYPE "ProviderType" RENAME TO "ProviderType_legacy";
    ALTER TYPE "ProviderType_reconciled" RENAME TO "ProviderType";
    DROP TYPE "ProviderType_legacy";
    ALTER TABLE "Provider" ALTER COLUMN "type" SET DEFAULT 'SERVICES';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum enum_info
    JOIN pg_type type_info ON type_info.oid = enum_info.enumtypid
    WHERE type_info.typname = 'ProviderCapability' AND enum_info.enumlabel = 'MENU'
  ) THEN
    -- Retain the legacy value (including SQL NULL) in metadata.  The conversion
    -- function below safely normalizes NULL to the required empty array.
    UPDATE "Provider"
    SET "metadata" = COALESCE("metadata", '{}'::jsonb)
      || jsonb_build_object('legacyCapabilities', to_jsonb("capabilities"))
    ;
    CREATE TYPE "ProviderCapability_reconciled" AS ENUM (
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
    );
    CREATE FUNCTION "zayuno_upgrade_provider_capabilities"(legacy_values "ProviderCapability"[])
    RETURNS "ProviderCapability_reconciled"[]
    LANGUAGE SQL
    IMMUTABLE
    AS $function$
      SELECT COALESCE(
        ARRAY(
          SELECT DISTINCT (
            CASE capability::text
              WHEN 'MENU' THEN 'CATALOG'
              WHEN 'SEARCH' THEN 'SEARCH'
              WHEN 'ORDER_QUOTE' THEN 'QUOTE'
              WHEN 'ORDER_CREATE' THEN 'ACTION_CREATE'
              WHEN 'ORDER_CANCEL' THEN 'ACTION_CANCEL'
              WHEN 'ORDER_STATUS' THEN 'ACTION_STATUS'
              WHEN 'PAYMENT_LINK' THEN 'PAYMENT_OPTIONS'
              WHEN 'DELIVERY' THEN 'LOCATIONS'
              WHEN 'PICKUP' THEN 'LOCATIONS'
            END
          )::"ProviderCapability_reconciled"
          FROM unnest(legacy_values) AS capability
        ),
        ARRAY[]::"ProviderCapability_reconciled"[]
      );
    $function$;
    ALTER TABLE "Provider" ALTER COLUMN "capabilities" TYPE "ProviderCapability_reconciled"[]
      USING "zayuno_upgrade_provider_capabilities"("capabilities");
    DROP FUNCTION "zayuno_upgrade_provider_capabilities"("ProviderCapability"[]);
    ALTER TYPE "ProviderCapability" RENAME TO "ProviderCapability_legacy";
    ALTER TYPE "ProviderCapability_reconciled" RENAME TO "ProviderCapability";
    DROP TYPE "ProviderCapability_legacy";
    ALTER TABLE "Provider" ALTER COLUMN "capabilities" SET NOT NULL;
  END IF;
END $$;

ALTER TABLE "Provider"
  ADD COLUMN IF NOT EXISTS "adapterType" TEXT NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS "config" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Provider" ALTER COLUMN "baseUrl" DROP NOT NULL;
