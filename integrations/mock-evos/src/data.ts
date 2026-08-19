import type { CatalogCategory, Location, Offering } from '@zayuno/contracts';

export const MOCK_EVOS_LOCATIONS: Location[] = [
  {
    id: 'mock-evos-chilonzor',
    providerId: 'mock-evos',
    providerLocationId: 'mock-evos-chilonzor',
    name: 'Mock EVOS — Chilonzor Demo Branch',
    address: 'Tashkent, Chilonzor district (sandbox location)',
    coordinates: { latitude: 41.2851, longitude: 69.2034 },
    operatingHours: { open: '08:00', close: '23:00', days: [1, 2, 3, 4, 5, 6, 7] },
    serviceRadiusKm: 8,
    isActive: true,
    metadata: { sandbox: true, affiliation: 'none' }
  },
  {
    id: 'mock-evos-yunusobod',
    providerId: 'mock-evos',
    providerLocationId: 'mock-evos-yunusobod',
    name: 'Mock EVOS — Yunusobod Demo Branch',
    address: 'Tashkent, Yunusobod district (sandbox location)',
    coordinates: { latitude: 41.3642, longitude: 69.2874 },
    operatingHours: { open: '09:00', close: '23:00', days: [1, 2, 3, 4, 5, 6, 7] },
    serviceRadiusKm: 7,
    isActive: true,
    metadata: { sandbox: true, affiliation: 'none' }
  }
];

export const MOCK_EVOS_CATEGORIES: CatalogCategory[] = [
  { id: 'mock-cat-wraps', slug: 'wraps', title: 'Demo Wraps', description: 'Fictional sandbox wrap selections', displayOrder: 1 },
  { id: 'mock-cat-burgers', slug: 'burgers', title: 'Demo Burgers', description: 'Fictional sandbox burger selections', displayOrder: 2 },
  { id: 'mock-cat-sides', slug: 'sides', title: 'Sides & Drinks', description: 'Fictional sandbox extras', displayOrder: 3 }
];

export const MOCK_EVOS_OFFERINGS: Offering[] = [
  {
    id: 'mock_lavash_classic',
    providerId: 'mock-evos',
    offeringCode: 'MOCK-LAVASH-01',
    title: 'Mock Classic Lavash',
    description: 'Fictional demo wrap with chicken, vegetables and sauce.',
    categorySlug: 'wraps',
    categoryTitle: 'Demo Wraps',
    basePrice: 32000,
    currency: 'UZS',
    isAvailable: true,
    variants: [
      { id: 'regular', name: 'Regular', sku: 'MOCK-LAV-REG', basePrice: 32000, isAvailable: true, metadata: {} },
      { id: 'large', name: 'Large', sku: 'MOCK-LAV-LRG', basePrice: 39000, isAvailable: true, metadata: {} }
    ],
    optionGroups: [
      {
        id: 'sauce', name: 'Sauce', minSelections: 1, maxSelections: 1, isRequired: true,
        options: [
          { id: 'classic', name: 'Classic sauce', priceDelta: 0, isDefault: true, isAvailable: true, metadata: {} },
          { id: 'spicy', name: 'Spicy sauce', priceDelta: 2000, isDefault: false, isAvailable: true, metadata: {} }
        ]
      },
      {
        id: 'extras', name: 'Extras', minSelections: 0, maxSelections: 2, isRequired: false,
        options: [
          { id: 'cheese', name: 'Extra cheese', priceDelta: 5000, isDefault: false, isAvailable: true, metadata: {} },
          { id: 'jalapeno', name: 'Jalapeño', priceDelta: 3000, isDefault: false, isAvailable: true, metadata: {} }
        ]
      }
    ],
    tags: ['sandbox', 'wrap'],
    metadata: { sandbox: true }
  },
  {
    id: 'mock_burger_double',
    providerId: 'mock-evos',
    offeringCode: 'MOCK-BURGER-01',
    title: 'Mock Double Burger',
    description: 'Fictional demo double-patty burger.',
    categorySlug: 'burgers',
    categoryTitle: 'Demo Burgers',
    basePrice: 35000,
    currency: 'UZS',
    isAvailable: true,
    variants: [],
    optionGroups: [],
    tags: ['sandbox', 'burger'],
    metadata: { sandbox: true }
  },
  {
    id: 'mock_combo_one',
    providerId: 'mock-evos',
    offeringCode: 'MOCK-COMBO-01',
    title: 'Mock Lunch Combo',
    description: 'Fictional demo combo with wrap, fries and drink.',
    categorySlug: 'wraps',
    categoryTitle: 'Demo Wraps',
    basePrice: 52000,
    currency: 'UZS',
    isAvailable: true,
    variants: [],
    optionGroups: [],
    tags: ['sandbox', 'combo'],
    metadata: { sandbox: true }
  },
  {
    id: 'mock_fries',
    providerId: 'mock-evos',
    offeringCode: 'MOCK-SIDE-01',
    title: 'Mock Crispy Fries',
    description: 'Fictional demo side.',
    categorySlug: 'sides',
    categoryTitle: 'Sides & Drinks',
    basePrice: 14000,
    currency: 'UZS',
    isAvailable: true,
    variants: [], optionGroups: [], tags: ['sandbox', 'side'], metadata: { sandbox: true }
  },
  {
    id: 'mock_drink',
    providerId: 'mock-evos',
    offeringCode: 'MOCK-DRINK-01',
    title: 'Mock Soft Drink',
    description: 'Fictional demo drink.',
    categorySlug: 'sides',
    categoryTitle: 'Sides & Drinks',
    basePrice: 10000,
    currency: 'UZS',
    isAvailable: true,
    variants: [
      { id: 'small', name: 'Small', sku: 'MOCK-DR-S', basePrice: 10000, isAvailable: true, metadata: {} },
      { id: 'large', name: 'Large', sku: 'MOCK-DR-L', basePrice: 14000, isAvailable: true, metadata: {} }
    ],
    optionGroups: [], tags: ['sandbox', 'drink'], metadata: { sandbox: true }
  }
];
