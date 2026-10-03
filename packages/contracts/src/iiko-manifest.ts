import type { ProviderManifest } from './provider-manifest';

/** Requirements of the native delivery adapter, including existing connections. */
export const IIKO_DELIVERY_MANIFEST: ProviderManifest = {
  version: 1,
  requirements: {
    QUOTE: { inputMode: 'OFFERING', customerRequirements: { phone: 'REQUIRED' } },
    ACTION_CREATE: { inputMode: 'OFFERING', customerRequirements: { phone: 'REQUIRED' } },
  },
  supportedLocationRoles: [{ role: 'DESTINATION', title: 'Yetkazib berish manzili', required: true }],
  supportedPaymentMethods: ['CASH'],
  lifecycle: { status: true, cancel: true },
};
