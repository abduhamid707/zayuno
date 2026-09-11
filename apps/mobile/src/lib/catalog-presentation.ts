import type { CatalogSectionItem } from './interaction';

export function safeImageUri(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const uri = value.trim();
  if (/^https?:\/\/\S+$/i.test(uri) || /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(uri)) return uri;
  return undefined;
}

/** A rendering boundary, not a source of invented product IDs or prices. */
export function normalizeCatalogSections(value: unknown): CatalogSectionItem[] {
  if (!Array.isArray(value)) return [];
  const sections = new Map<string, CatalogSectionItem>();
  const seen = new Set<string>();
  for (const section of value) {
    if (!section || typeof section !== 'object' || !Array.isArray(section.offerings)) continue;
    const categorySlug = typeof section.categorySlug === 'string' ? section.categorySlug : 'general';
    const target: CatalogSectionItem = sections.get(categorySlug) || { categorySlug, categoryTitle: typeof section.categoryTitle === 'string' ? section.categoryTitle : 'Mahsulotlar', itemCount: 0, offerings: [] };
    for (const item of section.offerings) {
      if (!item || typeof item !== 'object' || typeof item.offeringId !== 'string' || !item.offeringId.trim() || typeof item.providerSlug !== 'string' || !item.providerSlug.trim() || typeof item.title !== 'string' || !item.title.trim()) continue;
      const key = `${item.providerSlug}:${item.offeringId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const knownPrice = typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 && item.priceKnown !== false;
      target.offerings.push({ ...item, id: key, categorySlug, title: item.title.trim(), description: typeof item.description === 'string' ? item.description : undefined, price: knownPrice ? item.price : 0, priceKnown: knownPrice, isAvailable: item.isAvailable !== false, currency: typeof item.currency === 'string' && /^[A-Z]{3}$/i.test(item.currency) ? item.currency.toUpperCase() : 'UZS', imageUrl: safeImageUri(item.imageUrl) });
    }
    target.itemCount = target.offerings.length;
    if (target.itemCount) sections.set(categorySlug, target);
  }
  return [...sections.values()];
}
