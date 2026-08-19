import { Location, CatalogCategory, Offering } from '@zayuno/contracts';

export const SANDBOX_LOCATIONS: Location[] = [
  {
    id: 'loc_central_01',
    providerId: 'provider_sandbox',
    providerLocationId: 'loc_central_01',
    name: 'Sandbox Central Hub',
    address: 'Central District, Zone A, Facility 101',
    coordinates: { latitude: 41.3111, longitude: 69.2797 },
    operatingHours: { open: '08:00', close: '22:00', days: [1, 2, 3, 4, 5, 6, 7] },
    serviceRadiusKm: 15.0,
    isActive: true,
    metadata: { facilityType: 'PRIMARY_HUB' }
  },
  {
    id: 'loc_north_02',
    providerId: 'provider_sandbox',
    providerLocationId: 'loc_north_02',
    name: 'Sandbox North Facility',
    address: 'North District, Sector 4, Suite 22',
    coordinates: { latitude: 41.3500, longitude: 69.2900 },
    operatingHours: { open: '09:00', close: '20:00', days: [1, 2, 3, 4, 5, 6] },
    serviceRadiusKm: 10.0,
    isActive: true,
    metadata: { facilityType: 'REGIONAL_BRANCH' }
  }
];

export const SANDBOX_CATEGORIES: CatalogCategory[] = [
  {
    id: 'cat_services',
    slug: 'professional-services',
    title: 'Professional Services',
    description: 'Verified consulting, technical audits, and implementation packages',
    displayOrder: 1
  },
  {
    id: 'cat_fulfillment',
    slug: 'logistics-fulfillment',
    title: 'Logistics & Fulfillment',
    description: 'Scheduled dispatch, priority handling, and verification services',
    displayOrder: 2
  }
];

export const SANDBOX_OFFERINGS: Offering[] = [
  {
    id: 'offering_standard_pkg',
    providerId: 'provider_sandbox',
    offeringCode: 'offering_standard_pkg',
    title: 'Standard Service Package',
    description: 'Complete base capability execution with standard fulfillment and digital audit trail.',
    categorySlug: 'professional-services',
    categoryTitle: 'Professional Services',
    basePrice: 50000,
    currency: 'UZS',
    isAvailable: true,
    variants: [
      {
        id: 'var_std_monthly',
        name: 'Single Execution',
        sku: 'SB-STD-01',
        basePrice: 50000,
        isAvailable: true,
        metadata: {}
      },
      {
        id: 'var_std_extended',
        name: 'Extended Coverage',
        sku: 'SB-STD-02',
        basePrice: 85000,
        isAvailable: true,
        metadata: {}
      }
    ],
    optionGroups: [
      {
        id: 'opt_priority',
        name: 'Processing Speed',
        minSelections: 0,
        maxSelections: 1,
        isRequired: false,
        options: [
          {
            id: 'opt_speed_express',
            name: 'High Priority Queue',
            priceDelta: 15000,
            isDefault: false,
            isAvailable: true,
            metadata: {}
          }
        ]
      }
    ],
    tags: ['standard', 'services', 'popular'],
    metadata: { turnaroundHours: 2 }
  },
  {
    id: 'offering_pro_tier',
    providerId: 'provider_sandbox',
    offeringCode: 'offering_pro_tier',
    title: 'Professional Enterprise Suite',
    description: 'High-throughput capability execution with dedicated service allocation and live SLA tracking.',
    categorySlug: 'professional-services',
    categoryTitle: 'Professional Services',
    basePrice: 120000,
    currency: 'UZS',
    isAvailable: true,
    variants: [],
    optionGroups: [],
    tags: ['enterprise', 'pro', 'verified'],
    metadata: { turnaroundHours: 1 }
  },
  {
    id: 'offering_express_dispatch',
    providerId: 'provider_sandbox',
    offeringCode: 'offering_express_dispatch',
    title: 'Express Logistics Dispatch',
    description: 'Guaranteed rapid point-to-point courier and verification dispatch.',
    categorySlug: 'logistics-fulfillment',
    categoryTitle: 'Logistics & Fulfillment',
    basePrice: 25000,
    currency: 'UZS',
    isAvailable: true,
    variants: [],
    optionGroups: [],
    tags: ['logistics', 'dispatch', 'fast'],
    metadata: { estimatedMinutes: 30 }
  }
];
