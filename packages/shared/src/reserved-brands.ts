/**
 * Centralized Reserved Brand Registry & Protection System.
 *
 * Prevents brand impersonation and squatting during public self-service
 * provider onboarding (e.g. EVOS, Uzum, Yandex, Payme, Click, Korzinka).
 * Internal Operations onboarding is permitted to register official accounts.
 */

export interface ReservedBrandDefinition {
  canonicalBrand: string;
  canonicalSlug: string;
  aliases: string[];
  patterns?: RegExp[];
  category?: string;
  description: string;
}

export const RESERVED_BRANDS: ReservedBrandDefinition[] = [
  {
    canonicalBrand: 'EVOS',
    canonicalSlug: 'evos',
    aliases: [
      'evos', 'e-vos', 'ev0s', 'evo-s', 'evos-uz', 'evos-uzbekistan', 'official-evos', 'the-evos',
      'evos-delivery', 'evos-fastfood', 'evos-app', 'эвос', 'евос', 'эво-с', 'ево-с'
    ],
    patterns: [/^ev[o0]s(-.*)?$/, /^e-v[o0]s(-.*)?$/],
    category: 'food_delivery',
    description: 'EVOS Fast Food Chain Uzbekistan'
  },
  {
    canonicalBrand: 'UZUM',
    canonicalSlug: 'uzum',
    aliases: [
      'uzum', 'uzum-market', 'uzum-tezkor', 'uzum-bank', 'uzum-pay', 'uzum-nasiya', 'uzum-uz',
      'official-uzum', 'the-uzum', 'узум', 'узум-маркет', 'узум-тезкор', 'узум-банк'
    ],
    patterns: [/^uzum(-.*)?$/],
    category: 'retail',
    description: 'Uzum Ecosystem (Market, Tezkor, Bank)'
  },
  {
    canonicalBrand: 'YANDEX',
    canonicalSlug: 'yandex',
    aliases: [
      'yandex', 'yandex-go', 'yandex-eats', 'yandex-taxi', 'yandex-delivery', 'yandex-market',
      'yandex-uz', 'yandex-eda', 'яндекс', 'яндекс-го', 'яндекс-еда', 'яндекс-такси'
    ],
    patterns: [/^yandex(-.*)?$/],
    category: 'delivery',
    description: 'Yandex Services Uzbekistan'
  },
  {
    canonicalBrand: 'KORZINKA',
    canonicalSlug: 'korzinka',
    aliases: [
      'korzinka', 'korzinka-uz', 'korzinka-go', 'korzinka-market', 'official-korzinka',
      'корзинка', 'корзинка-уз', 'корзинка-го'
    ],
    patterns: [/^korzinka(-.*)?$/],
    category: 'retail',
    description: 'Korzinka Supermarket Chain'
  },
  {
    canonicalBrand: 'EXPRESS24',
    canonicalSlug: 'express24',
    aliases: [
      'express24', 'express-24', 'express_24', 'express-24-uz', 'экспресс24', 'экспресс-24'
    ],
    patterns: [/^express-?24(-.*)?$/],
    category: 'food_delivery',
    description: 'Express24 Food Delivery Service'
  },
  {
    canonicalBrand: 'PAYME',
    canonicalSlug: 'payme',
    aliases: [
      'payme', 'payme-uz', 'payme-business', 'payme-card', 'official-payme', 'пейми', 'пайме'
    ],
    patterns: [/^payme(-.*)?$/],
    category: 'fintech',
    description: 'Payme Payment System'
  },
  {
    canonicalBrand: 'CLICK',
    canonicalSlug: 'click',
    aliases: [
      'click', 'click-uz', 'click-pass', 'click-pay', 'click-uzbekistan', 'клик', 'клик-уз'
    ],
    patterns: [/^click(-.*)?$/],
    category: 'fintech',
    description: 'Click Payment System'
  },
  {
    canonicalBrand: 'OSON',
    canonicalSlug: 'oson',
    aliases: [
      'oson', 'oson-pay', 'oson-uz', 'oson-pochta', 'осон', 'осон-пей'
    ],
    patterns: [/^oson(-.*)?$/],
    category: 'fintech',
    description: 'Oson Payment & Logistics'
  },
  {
    canonicalBrand: 'ZAYUNO',
    canonicalSlug: 'zayuno',
    aliases: [
      'zayuno', 'zayuno-official', 'zayuno-core', 'zayuno-platform', 'zayuno-admin', 'zayuno-api',
      'zayuno-mcp', 'zayuno-agent', 'зайюно', 'заюно'
    ],
    patterns: [/^zayuno(-.*)?$/],
    category: 'platform',
    description: 'Zayuno Core Platform Infrastructure'
  },
  {
    canonicalBrand: 'MAXWAY',
    canonicalSlug: 'maxway',
    aliases: [
      'maxway', 'max-way', 'maxway-uz', 'maxway-delivery', 'максвей', 'макс-вей'
    ],
    patterns: [/^max-?way(-.*)?$/],
    category: 'food_delivery',
    description: 'MaxWay Fast Food Chain'
  },
  {
    canonicalBrand: 'KFC',
    canonicalSlug: 'kfc',
    aliases: [
      'kfc', 'kfc-uz', 'kfc-uzbekistan', 'kfc-chicken', 'кфс', 'кфс-уз'
    ],
    patterns: [/^kfc(-.*)?$/],
    category: 'food_delivery',
    description: 'KFC Uzbekistan'
  },
  {
    canonicalBrand: 'LESAILES',
    canonicalSlug: 'lesailes',
    aliases: [
      'lesailes', 'les-ailes', 'les_ailes', 'lesailes-uz', 'лесейлс', 'лес-эйлс', 'лесейлес'
    ],
    patterns: [/^les-?ailes(-.*)?$/],
    category: 'food_delivery',
    description: 'Les Ailes Chain'
  },
  {
    canonicalBrand: 'CHOPAR',
    canonicalSlug: 'chopar',
    aliases: [
      'chopar', 'chopar-pizza', 'choparpizza', 'chopar-uz', 'чопар', 'чопар-пицца'
    ],
    patterns: [/^chopar(-.*)?$/],
    category: 'food_delivery',
    description: 'Chopar Pizza Chain'
  },
  {
    canonicalBrand: 'BELLISSIMO',
    canonicalSlug: 'bellissimo',
    aliases: [
      'bellissimo', 'bellissimo-pizza', 'bellissimopizza', 'bellissimo-uz', 'беллиссимо', 'беллиссимо-пицца'
    ],
    patterns: [/^bellissimo(-.*)?$/],
    category: 'food_delivery',
    description: 'Bellissimo Pizza Chain'
  },
  {
    canonicalBrand: 'SAFIA',
    canonicalSlug: 'safia',
    aliases: [
      'safia', 'safia-cafe', 'safia-bakery', 'safia-uz', 'сафия', 'сафия-кафе'
    ],
    patterns: [/^safia(-.*)?$/],
    category: 'food_delivery',
    description: 'Safia Cafe & Bakery'
  },
  {
    canonicalBrand: 'FEEDUP',
    canonicalSlug: 'feedup',
    aliases: [
      'feedup', 'feed-up', 'feedup-uz', 'фидап', 'фид-ап'
    ],
    patterns: [/^feed-?up(-.*)?$/],
    category: 'food_delivery',
    description: 'Feed Up Chain'
  }
];

export interface ReservedBrandMatchResult {
  isReserved: boolean;
  canonicalBrand?: string;
  canonicalSlug?: string;
  matchedPattern?: string;
  reason?: string;
}

/**
 * Normalizes text for brand matching:
 * - Unicode NFKC
 * - Lowercase
 * - Cyrillic homoglyphs mapping to Latin
 * - Digit lookalikes (0->o, 1->l, 3->e, 5->s, @->a, $->s)
 * - Removes non-alphanumerics
 */
export function normalizeForBrandComparison(input: string): string {
  if (!input) return '';
  let text = input.normalize('NFKC').toLowerCase().trim();

  // Cyrillic to Latin homoglyph mapping (safe, direct lookalikes)
  const cyrillicMap: Record<string, string> = {
    'а': 'a', 'в': 'b', 'е': 'e', 'ё': 'e', 'к': 'k', 'м': 'm', 'н': 'h',
    'о': 'o', 'р': 'p', 'с': 'c', 'т': 't', 'у': 'y', 'х': 'x', 'э': 'e',
    'з': 'z', 'и': 'i', 'й': 'i', 'п': 'p', 'ф': 'f', 'ч': 'ch', 'ш': 'sh'
  };

  text = text.split('').map(ch => cyrillicMap[ch] || ch).join('');

  // Digit lookalikes
  const digitMap: Record<string, string> = {
    '0': 'o',
    '1': 'l',
    '3': 'e',
    '5': 's',
    '@': 'a',
    '$': 's'
  };

  text = text.split('').map(ch => digitMap[ch] || ch).join('');

  // Normalize separators to single hyphens
  text = text.replace(/[\s_.]+/g, '-');
  return text;
}

/**
 * Extracts stripped alphanumeric root for exact identity checking.
 */
export function extractBrandRoot(normalized: string): string {
  let root = normalized.replace(/[^a-z0-9]/g, '');
  // Remove common affix prefixes
  root = root.replace(/^(official|the|my|app|real)/g, '');
  // Remove common affix suffixes
  root = root.replace(/(uz|uzb|uzbekistan|official|app|bot|delivery|market|tezkor|pay|plus|food|express|group|team)$/g, '');
  return root;
}

/**
 * Checks whether a given provider name or slug matches any protected reserved brand.
 * Designed to avoid false positives (e.g. "evolution", "clever-pos", "revolution" are NOT matched).
 */
export function checkReservedBrand(nameOrSlug: string): ReservedBrandMatchResult {
  if (!nameOrSlug || typeof nameOrSlug !== 'string') {
    return { isReserved: false };
  }

  const raw = nameOrSlug.trim().toLowerCase();
  const normalized = normalizeForBrandComparison(raw);
  const root = extractBrandRoot(normalized);

  for (const brand of RESERVED_BRANDS) {
    const brandCanonical = brand.canonicalSlug.toLowerCase();
    const brandRoot = extractBrandRoot(normalizeForBrandComparison(brandCanonical));

    // 1. Direct match on canonical slug or raw
    if (raw === brandCanonical || normalized === brandCanonical) {
      return {
        isReserved: true,
        canonicalBrand: brand.canonicalBrand,
        canonicalSlug: brand.canonicalSlug,
        matchedPattern: 'exact_canonical_match',
        reason: `"${nameOrSlug}" is the exact identifier of reserved enterprise brand "${brand.canonicalBrand}".`
      };
    }

    // 2. Direct match on registered aliases
    for (const alias of brand.aliases) {
      const aliasNorm = normalizeForBrandComparison(alias);
      if (raw === alias.toLowerCase() || normalized === aliasNorm) {
        return {
          isReserved: true,
          canonicalBrand: brand.canonicalBrand,
          canonicalSlug: brand.canonicalSlug,
          matchedPattern: `alias:${alias}`,
          reason: `"${nameOrSlug}" matches registered protected alias for "${brand.canonicalBrand}".`
        };
      }
    }

    // 3. Pattern match (regex)
    if (brand.patterns) {
      for (const pattern of brand.patterns) {
        if (pattern.test(raw) || pattern.test(normalized)) {
          return {
            isReserved: true,
            canonicalBrand: brand.canonicalBrand,
            canonicalSlug: brand.canonicalSlug,
            matchedPattern: `pattern:${pattern.source}`,
            reason: `"${nameOrSlug}" matches protected brand slug pattern for "${brand.canonicalBrand}".`
          };
        }
      }
    }

    // 4. Exact root match with affixes (e.g. "official-evos", "ev0s-uzbekistan", "uzum-app")
    // Only if root is exact brand root and length is >= 3
    if (brandRoot.length >= 3 && root === brandRoot) {
      return {
        isReserved: true,
        canonicalBrand: brand.canonicalBrand,
        canonicalSlug: brand.canonicalSlug,
        matchedPattern: `brand_root_affix:${brandRoot}`,
        reason: `"${nameOrSlug}" contains the protected root of reserved brand "${brand.canonicalBrand}".`
      };
    }
  }

  return { isReserved: false };
}
