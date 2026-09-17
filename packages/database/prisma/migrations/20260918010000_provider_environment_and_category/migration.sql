-- Provider lifecycle status and deployment environment are independent.
CREATE TYPE "ProviderEnvironment" AS ENUM ('LIVE', 'SANDBOX', 'STAGING');
CREATE TYPE "ProviderCategory" AS ENUM (
  'FOOD_AND_DRINK',
  'RETAIL',
  'TRANSPORT',
  'TICKETING',
  'TRAVEL',
  'ACCOMMODATION',
  'RECRUITMENT',
  'LOGISTICS',
  'HEALTHCARE',
  'HOME_SERVICES',
  'PROFESSIONAL_SERVICES',
  'DIGITAL_SERVICES',
  'OTHER'
);

ALTER TABLE "Provider"
  ADD COLUMN "environment" "ProviderEnvironment" NOT NULL DEFAULT 'LIVE',
  ADD COLUMN "category" "ProviderCategory" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "subcategory" TEXT;

-- Backfill the old metadata fields without assuming a provider-specific slug.
-- Older rows used ProviderStatus.SANDBOX as their only environment signal, so
-- retain that non-public deployment state when metadata does not say otherwise.
UPDATE "Provider"
SET "environment" = CASE LOWER(TRIM(COALESCE("metadata"->>'environment', '')))
  WHEN 'sandbox' THEN 'SANDBOX'::"ProviderEnvironment"
  WHEN 'test' THEN 'SANDBOX'::"ProviderEnvironment"
  WHEN 'staging' THEN 'STAGING'::"ProviderEnvironment"
  WHEN 'preproduction' THEN 'STAGING'::"ProviderEnvironment"
  WHEN 'preprod' THEN 'STAGING'::"ProviderEnvironment"
  WHEN '' THEN CASE "status"::text
    WHEN 'SANDBOX' THEN 'SANDBOX'::"ProviderEnvironment"
    ELSE 'LIVE'::"ProviderEnvironment"
  END
  ELSE 'LIVE'::"ProviderEnvironment"
END;

UPDATE "Provider"
SET "category" = CASE REGEXP_REPLACE(
  LOWER(TRIM(COALESCE("metadata"->>'category', ''))),
  '[[:space:]-]+',
  '_',
  'g'
)
  WHEN 'food' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'food_and_drink' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'food_delivery' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'food_dining' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'restaurant' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'restaurants' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'fast_food' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'cafe' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'coffee' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'coffee_shop' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'pizza' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'sushi' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
  WHEN 'retail' THEN 'RETAIL'::"ProviderCategory"
  WHEN 'commerce' THEN 'RETAIL'::"ProviderCategory"
  WHEN 'ecommerce' THEN 'RETAIL'::"ProviderCategory"
  WHEN 'marketplace' THEN 'RETAIL'::"ProviderCategory"
  WHEN 'shop' THEN 'RETAIL'::"ProviderCategory"
  WHEN 'transport' THEN 'TRANSPORT'::"ProviderCategory"
  WHEN 'mobility' THEN 'TRANSPORT'::"ProviderCategory"
  WHEN 'taxi' THEN 'TRANSPORT'::"ProviderCategory"
  WHEN 'ride_hailing' THEN 'TRANSPORT'::"ProviderCategory"
  WHEN 'ticket' THEN 'TICKETING'::"ProviderCategory"
  WHEN 'tickets' THEN 'TICKETING'::"ProviderCategory"
  WHEN 'ticketing' THEN 'TICKETING'::"ProviderCategory"
  WHEN 'events' THEN 'TICKETING'::"ProviderCategory"
  WHEN 'travel' THEN 'TRAVEL'::"ProviderCategory"
  WHEN 'tourism' THEN 'TRAVEL'::"ProviderCategory"
  WHEN 'flights' THEN 'TRAVEL'::"ProviderCategory"
  WHEN 'accommodation' THEN 'ACCOMMODATION'::"ProviderCategory"
  WHEN 'hotel' THEN 'ACCOMMODATION'::"ProviderCategory"
  WHEN 'hotels' THEN 'ACCOMMODATION'::"ProviderCategory"
  WHEN 'lodging' THEN 'ACCOMMODATION'::"ProviderCategory"
  WHEN 'recruitment' THEN 'RECRUITMENT'::"ProviderCategory"
  WHEN 'jobs' THEN 'RECRUITMENT'::"ProviderCategory"
  WHEN 'job_board' THEN 'RECRUITMENT'::"ProviderCategory"
  WHEN 'hiring' THEN 'RECRUITMENT'::"ProviderCategory"
  WHEN 'employment' THEN 'RECRUITMENT'::"ProviderCategory"
  WHEN 'logistics' THEN 'LOGISTICS'::"ProviderCategory"
  WHEN 'delivery' THEN 'LOGISTICS'::"ProviderCategory"
  WHEN 'parcel' THEN 'LOGISTICS'::"ProviderCategory"
  WHEN 'courier' THEN 'LOGISTICS'::"ProviderCategory"
  WHEN 'shipping' THEN 'LOGISTICS'::"ProviderCategory"
  WHEN 'healthcare' THEN 'HEALTHCARE'::"ProviderCategory"
  WHEN 'health' THEN 'HEALTHCARE'::"ProviderCategory"
  WHEN 'medical' THEN 'HEALTHCARE'::"ProviderCategory"
  WHEN 'pharmacy' THEN 'HEALTHCARE'::"ProviderCategory"
  WHEN 'home_services' THEN 'HOME_SERVICES'::"ProviderCategory"
  WHEN 'home_service' THEN 'HOME_SERVICES'::"ProviderCategory"
  WHEN 'general_services' THEN 'PROFESSIONAL_SERVICES'::"ProviderCategory"
  WHEN 'professional_services' THEN 'PROFESSIONAL_SERVICES'::"ProviderCategory"
  WHEN 'services' THEN 'PROFESSIONAL_SERVICES'::"ProviderCategory"
  WHEN 'online_services' THEN 'DIGITAL_SERVICES'::"ProviderCategory"
  WHEN 'digital_services' THEN 'DIGITAL_SERVICES'::"ProviderCategory"
  WHEN 'digital' THEN 'DIGITAL_SERVICES'::"ProviderCategory"
  WHEN 'general' THEN 'OTHER'::"ProviderCategory"
  WHEN 'other' THEN 'OTHER'::"ProviderCategory"
  WHEN 'misc' THEN 'OTHER'::"ProviderCategory"
  -- The core-schema reconciliation maps legacy ProviderType.FOOD to DELIVERY
  -- and records its original meaning in metadata. Preserve that classification
  -- instead of treating it as an unclassified delivery provider.
  ELSE CASE
    WHEN UPPER(TRIM(COALESCE("metadata"->>'legacyProviderType', ''))) = 'FOOD' THEN 'FOOD_AND_DRINK'::"ProviderCategory"
    WHEN "type"::text = 'RETAIL' THEN 'RETAIL'::"ProviderCategory"
    WHEN "type"::text = 'COMMERCE' THEN 'RETAIL'::"ProviderCategory"
    WHEN "type"::text = 'TICKETING' THEN 'TICKETING'::"ProviderCategory"
    WHEN "type"::text = 'DIGITAL' THEN 'DIGITAL_SERVICES'::"ProviderCategory"
    WHEN "type"::text = 'SERVICES' THEN 'PROFESSIONAL_SERVICES'::"ProviderCategory"
    ELSE 'OTHER'::"ProviderCategory"
  END
END;

UPDATE "Provider"
SET "subcategory" = NULLIF("metadata"->>'subcategory', '');

CREATE INDEX "Provider_environment_status_category_idx"
  ON "Provider"("environment", "status", "category");
