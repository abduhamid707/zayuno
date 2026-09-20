import { CatalogProjection, CatalogProjectionSchema } from '@zayuno/contracts';

const profiles = {
  MINIMAL: ['id', 'title', 'basePrice', 'currency', 'isAvailable'],
  COMPACT: ['id', 'title', 'description', 'basePrice', 'currency', 'isAvailable', 'imageUrl',
    'variants.id', 'variants.name', 'variants.basePrice', 'variants.isAvailable'],
  STANDARD: ['id', 'title', 'description', 'basePrice', 'currency', 'isAvailable', 'imageUrl',
    'categorySlug', 'categoryTitle', 'variants', 'optionGroups', 'parametersSchema', 'presentationHints'],
};

/** Projection never mutates canonical objects or enters adapter/cache boundaries. */
export function projectOffering(value: any, options: CatalogProjection = {}): any {
  const parsed = CatalogProjectionSchema.parse(options);
  const paths = parsed.select ?? (parsed.responseProfile && parsed.responseProfile !== 'FULL'
    ? profiles[parsed.responseProfile] : undefined);
  if (!paths) return value;
  const blocked = new Set(['__proto__', 'prototype', 'constructor']);
  const tree: any = Object.create(null);
  for (const path of paths) {
    const segments = path.split('.');
    if (segments.some(segment => blocked.has(segment))) throw new Error('Unsafe projection path');
    let node = tree;
    for (const segment of segments) node = node[segment] ??= Object.create(null);
    node.$leaf = true;
  }
  const pick = (source: any, fields: any): any => {
    if (source === null || typeof source !== 'object') return source;
    if (fields.$leaf) return structuredClone(source);
    if (Array.isArray(source)) return source.map(item => pick(item, fields));
    const result: any = {};
    for (const key of Object.keys(fields)) {
      if (Object.prototype.hasOwnProperty.call(source, key)) result[key] = pick(source[key], fields[key]);
    }
    return result;
  };
  return pick(value, tree);
}

export function projectCatalog(value: any, options: CatalogProjection = {}): any {
  if (Array.isArray(value)) return value.map(item => projectOffering(item, options));
  return { ...value, offerings: (value.offerings || []).map((item: any) => projectOffering(item, options)) };
}
