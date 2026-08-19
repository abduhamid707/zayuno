import type { CatalogCategory, Location, Offering } from '@zayuno/contracts';

export const COFFEE_LOCATIONS: Location[] = [
  { id: 'coffee-time-chilonzor', providerId: 'coffee-time', providerLocationId: 'coffee-time-chilonzor', name: 'Coffee Time — Chilonzor Test Branch', address: 'Toshkent, Chilonzor tumani', coordinates: { latitude: 41.285, longitude: 69.204 }, operatingHours: { open: '08:00', close: '22:00', days: [1,2,3,4,5,6,7] }, serviceRadiusKm: 7, isActive: true, metadata: { sandbox: true } },
  { id: 'coffee-time-yunusobod', providerId: 'coffee-time', providerLocationId: 'coffee-time-yunusobod', name: 'Coffee Time — Yunusobod Test Branch', address: 'Toshkent, Yunusobod tumani', coordinates: { latitude: 41.364, longitude: 69.287 }, operatingHours: { open: '08:00', close: '23:00', days: [1,2,3,4,5,6,7] }, serviceRadiusKm: 6, isActive: true, metadata: { sandbox: true } }
];

export const COFFEE_CATEGORIES: CatalogCategory[] = [
  { id: 'coffee-cat-hot', slug: 'hot-coffee', title: 'Issiq qahvalar', displayOrder: 1 },
  { id: 'coffee-cat-cold', slug: 'cold-drinks', title: 'Sovuq ichimliklar', displayOrder: 2 },
  { id: 'coffee-cat-dessert', slug: 'desserts', title: 'Desertlar', displayOrder: 3 }
];

const sizes = [
  { id: 'small', name: 'Small', sku: 'CT-S', basePrice: 18000, isAvailable: true, metadata: {} },
  { id: 'large', name: 'Large', sku: 'CT-L', basePrice: 24000, isAvailable: true, metadata: {} }
];

export const COFFEE_OFFERINGS: Offering[] = [
  { id: 'ct_cappuccino', providerId: 'coffee-time', offeringCode: 'CT-CAP-01', title: 'Cappuccino', description: 'Espresso, sut va mayin ko‘pik.', categorySlug: 'hot-coffee', categoryTitle: 'Issiq qahvalar', basePrice: 18000, currency: 'UZS', isAvailable: true, variants: sizes, optionGroups: [{ id: 'syrup', name: 'Sirop', minSelections: 0, maxSelections: 1, isRequired: false, options: [{ id: 'vanilla', name: 'Vanil', priceDelta: 3000, isDefault: false, isAvailable: true, metadata: {} }, { id: 'caramel', name: 'Karamel', priceDelta: 3000, isDefault: false, isAvailable: true, metadata: {} }] }], tags: ['coffee','cappuccino','standard'], metadata: { sandbox: true } },
  { id: 'ct_americano', providerId: 'coffee-time', offeringCode: 'CT-AME-01', title: 'Americano', description: 'Klassik espresso va issiq suv.', categorySlug: 'hot-coffee', categoryTitle: 'Issiq qahvalar', basePrice: 15000, currency: 'UZS', isAvailable: true, variants: [], optionGroups: [], tags: ['coffee','americano'], metadata: { sandbox: true } },
  { id: 'ct_iced_latte', providerId: 'coffee-time', offeringCode: 'CT-ICE-01', title: 'Iced Latte', description: 'Muzli espresso va sut.', categorySlug: 'cold-drinks', categoryTitle: 'Sovuq ichimliklar', basePrice: 24000, currency: 'UZS', isAvailable: true, variants: [], optionGroups: [], tags: ['coffee','latte','cold'], metadata: { sandbox: true } },
  { id: 'ct_cheesecake', providerId: 'coffee-time', offeringCode: 'CT-DES-01', title: 'Cheesecake', description: 'Klassik test desert.', categorySlug: 'desserts', categoryTitle: 'Desertlar', basePrice: 28000, currency: 'UZS', isAvailable: true, variants: [], optionGroups: [], tags: ['dessert','standard'], metadata: { sandbox: true } }
];
