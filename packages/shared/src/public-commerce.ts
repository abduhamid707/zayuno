import { CapabilityRequirementsSchema } from '@zayuno/contracts';

/** Public commerce projections. Adapter objects stay in persistence/cache. */
function pick(value: any, keys: string[]): Record<string, any> {
  return Object.fromEntries(keys.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));
}

export function toPublicQuote(quote: any): Record<string, any> {
  const result = pick(quote, ['id', 'quoteId', 'providerSlug', 'locationId', 'subtotal', 'totalFees',
    'totalDiscount', 'total', 'currency', 'expiresAt', 'estimatedDurationMinutes']);
  const requirements = CapabilityRequirementsSchema.safeParse(quote?.requirements);
  if (requirements.success) result.requirements = requirements.data;
  result.lines = (quote?.lines || []).map((line: any) => ({
    ...pick(line, ['offeringId', 'offeringTitle', 'variantId', 'variantTitle', 'unitPrice', 'quantity', 'optionsTotal', 'lineTotal']),
    selectedOptions: (line.selectedOptions || []).map((option: any) => pick(option, ['groupId', 'optionId', 'quantity'])),
  }));
  result.fees = (quote?.fees || []).map((fee: any) => pick(fee, ['name', 'amount']));
  result.discounts = (quote?.discounts || []).map((discount: any) => pick(discount, ['code', 'description', 'amount']));
  for (const field of ['paymentMethod', 'paymentInstructions', 'estimatedArrivalAt']) {
    const value = quote?.[field] ?? quote?.parameters?.[field];
    if (typeof value === 'string') result[field] = value;
  }
  const warnings = quote?.activeOrderWarnings ?? quote?.parameters?.activeOrderWarnings;
  if (Array.isArray(warnings)) result.activeOrderWarnings = warnings.filter((value: unknown) => typeof value === 'string');
  if ((quote?.deliveryCoverage ?? quote?.parameters?.deliveryCoverage) === 'VERIFIED') result.deliveryCoverage = 'VERIFIED';
  return result;
}

export function toPublicOffering(offering: any): Record<string, any> {
  const result = pick(offering, ['id', 'offeringCode', 'title', 'name', 'description', 'categorySlug',
    'categoryTitle', 'imageUrl', 'basePrice', 'price', 'currency', 'isAvailable', 'tags', 'parametersSchema']);
  if (Array.isArray(offering?.media)) result.media = offering.media.map((media: any) => pick(media, ['url', 'altText', 'order', 'thumbnailUrl', 'aspectRatio']));
  if (Array.isArray(offering?.variants)) result.variants = offering.variants.map((variant: any) =>
    pick(variant, ['id', 'name', 'sku', 'basePrice', 'isAvailable']));
  if (Array.isArray(offering?.optionGroups)) result.optionGroups = offering.optionGroups.map((group: any) => ({
    ...pick(group, ['id', 'name', 'description', 'minSelections', 'maxSelections', 'isRequired']),
    options: (group.options || []).map((option: any) => pick(option, ['id', 'name', 'description', 'priceDelta', 'isDefault', 'isAvailable'])),
  }));
  return result;
}

export function toPublicCatalog(catalog: any): any {
  if (Array.isArray(catalog)) return catalog.map(toPublicOffering);
  const result = pick(catalog, ['providerSlug', 'locationId', 'total', 'version', 'updatedAt', 'parametersSchema']);
  result.offerings = (catalog?.offerings || []).map(toPublicOffering);
  if (Array.isArray(catalog?.categories)) result.categories = catalog.categories.map((category: any) =>
    pick(category, ['id', 'slug', 'title', 'description', 'iconUrl', 'displayOrder', 'parentCategorySlug', 'offeringsCount']));
  return result;
}
