import { z } from 'zod';
import { CurrencySchema } from './common';

export const OptionItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  priceDelta: z.number().default(0),
  isDefault: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
  metadata: z.record(z.any()).optional().default({})
});
export type OptionItem = z.infer<typeof OptionItemSchema>;

export const OptionGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  minSelections: z.number().int().nonnegative().default(0),
  maxSelections: z.number().int().positive().default(1),
  isRequired: z.boolean().default(false),
  options: z.array(OptionItemSchema).default([])
});
export type OptionGroup = z.infer<typeof OptionGroupSchema>;

export const OfferingVariantSchema = z.object({
  id: z.string(),
  name: z.string().describe('e.g. "Standard", "Pro", "Small", "Large"'),
  sku: z.string().optional(),
  basePrice: z.number().nonnegative(),
  isAvailable: z.boolean().default(true),
  metadata: z.record(z.any()).optional().default({})
});
export type OfferingVariant = z.infer<typeof OfferingVariantSchema>;

const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^0:0:0:0:0:0:0:1$/,
  /^fe80:/i,
  /\.local$/i,
  /\.internal$/i,
  /\.lan$/i
];

export function isSafePublicHttpsUrl(val: string): boolean {
  if (!val || typeof val !== 'string') return false;
  if (val.length > 2048) return false;
  if (/\s/.test(val)) return false;

  try {
    const u = new URL(val);
    if (u.protocol !== 'https:') return false;
    if (u.username || u.password) return false;
    const rawHost = u.hostname.toLowerCase();
    if (!rawHost || rawHost.includes('..') || rawHost.startsWith('.') || rawHost.endsWith('.')) return false;
    const cleanHost = rawHost.replace(/^\[|\]$/g, '');
    for (const pattern of PRIVATE_IP_PATTERNS) {
      if (pattern.test(rawHost) || pattern.test(cleanHost)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const SafePublicHttpsUrlSchema = z
  .string()
  .max(2048)
  .refine(isSafePublicHttpsUrl, {
    message: 'Must be an absolute public HTTPS URL without credentials or local/private addresses'
  });

export const MediaItemSchema = z.object({
  url: SafePublicHttpsUrlSchema,
  altText: z.string().max(255).optional(),
  order: z.number().int().min(0).max(100).default(0),
  thumbnailUrl: SafePublicHttpsUrlSchema.optional(),
  aspectRatio: z.string().regex(/^(\d+:\d+)$/, 'Aspect ratio must be in format W:H e.g. 16:9, 1:1').optional()
});
export type MediaItem = z.infer<typeof MediaItemSchema>;

export function sortOfferingMedia(media?: MediaItem[]): MediaItem[] {
  if (!media || !Array.isArray(media)) return [];
  return [...media].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA !== orderB) return orderA - orderB;
    return (a.url || '').localeCompare(b.url || '');
  });
}

export const OfferingSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  offeringCode: z.string().describe('Provider-specific catalog item identifier'),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  categorySlug: z.string().optional(),
  categoryTitle: z.string().optional(),
  imageUrl: SafePublicHttpsUrlSchema.optional(),
  media: z.array(MediaItemSchema).max(10).optional(),
  basePrice: z.number().nonnegative(),
  currency: CurrencySchema.default('UZS'),
  isAvailable: z.boolean().default(true),
  variants: z.array(OfferingVariantSchema).optional().default([]),
  optionGroups: z.array(OptionGroupSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  metadata: z.record(z.any()).optional().default({})
});
export type Offering = z.infer<typeof OfferingSchema>;

/**
 * Migration boundary schema: allows reading legacy catalog offerings with raw HTTP image URLs,
 * while newly submitted or updated offerings must conform to SafePublicHttpsUrlSchema.
 */
export const LegacyOfferingSchema = OfferingSchema.extend({
  imageUrl: z.string().url().optional()
});
export type LegacyOffering = z.infer<typeof LegacyOfferingSchema>;

export const CatalogCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().optional(),
  displayOrder: z.number().int().default(0),
  parentCategorySlug: z.string().optional(),
  offeringsCount: z.number().int().nonnegative().optional()
});
export type CatalogCategory = z.infer<typeof CatalogCategorySchema>;

export const CatalogSchema = z.object({
  providerSlug: z.string(),
  locationId: z.string().optional(),
  categories: z.array(CatalogCategorySchema),
  offerings: z.array(OfferingSchema),
  version: z.string().optional(),
  updatedAt: z.string().datetime().optional()
});
export type Catalog = z.infer<typeof CatalogSchema>;

export const GetCatalogInputSchema = z.object({
  providerSlug: z.string().min(1),
  locationId: z.string().optional(),
  categorySlug: z.string().optional(),
  parameters: z.record(z.any()).optional().describe('Optional dynamic catalog context such as date range, route, party size, or capacity preferences')
});
export type GetCatalogInput = z.infer<typeof GetCatalogInputSchema>;

export const GetOfferingInputSchema = z.object({
  providerSlug: z.string().min(1),
  offeringId: z.string().min(1),
  locationId: z.string().optional(),
  parameters: z.record(z.any()).optional().describe('Dynamic provider context such as travel date, passenger count, selected facility, or booking preferences')
});
export type GetOfferingInput = z.infer<typeof GetOfferingInputSchema>;

export const SearchCatalogInputSchema = z.object({
  providerSlug: z.string().min(1),
  query: z.string().default('').describe('Free-text query. May be empty when structured parameters fully describe the search intent.'),
  categorySlug: z.string().optional(),
  locationId: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  parameters: z.record(z.any()).optional().describe('Structured dynamic search context, for example origin, destination, dates, passengers, capacity, or preferences')
});
export type SearchCatalogInput = z.infer<typeof SearchCatalogInputSchema>;

export const SelectedOptionSchema = z.object({
  groupId: z.string(),
  optionId: z.string(),
  quantity: z.number().int().positive().default(1)
});
export type SelectedOption = z.infer<typeof SelectedOptionSchema>;

export const CheckAvailabilityInputSchema = z.object({
  providerSlug: z.string().min(1),
  locationId: z.string().optional(),
  items: z.array(z.object({
    offeringId: z.string(),
    variantId: z.string().optional(),
    quantity: z.number().int().positive().default(1),
    selectedOptions: z.array(SelectedOptionSchema).optional().default([])
  })).min(1),
  parameters: z.record(z.any()).optional().describe('Provider-specific real-time inventory context such as departure date, passenger mix, room dates, or seat preferences')
});
export type CheckAvailabilityInput = z.infer<typeof CheckAvailabilityInputSchema>;

export const AvailabilityResultSchema = z.object({
  isAvailable: z.boolean(),
  unavailableItems: z.array(z.object({
    offeringId: z.string(),
    reason: z.string()
  })).default([]),
  availableItems: z.array(z.object({
    offeringId: z.string(),
    variantId: z.string().optional(),
    requestedQuantity: z.number().int().positive().optional(),
    remainingCapacity: z.number().int().nonnegative().optional(),
    unitPrice: z.number().nonnegative().optional(),
    currency: CurrencySchema.optional(),
    metadata: z.record(z.any()).optional().default({})
  })).optional().default([]),
  checkedAt: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  parameters: z.record(z.any()).optional().default({})
});
export type AvailabilityResult = z.infer<typeof AvailabilityResultSchema>;
