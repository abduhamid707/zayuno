import {
  ProviderCapability,
  ProviderFulfillmentMode,
  ProviderStatus,
  ProviderType,
  requiresActiveLocations
} from '@zayuno/contracts';

/**
 * Canonical Provider Publishing Gate.
 * A provider is strictly published and allowed for public discovery, quotes,
 * and actions if and only if ALL four canonical conditions are met:
 * 1. status === ProviderStatus.ACTIVE
 * 2. metadata.reviewStatus === 'APPROVED'
 * 3. metadata.isPublished === true
 * 4. metadata.isCertified === true
 *
 * There are NO legacy bypasses.
 */
export function isProviderPublished(provider: any): boolean {
  if (!provider) return false;
  const metadata = (provider.metadata as Record<string, any>) || {};
  return (
    provider.status === ProviderStatus.ACTIVE &&
    metadata.reviewStatus === 'APPROVED' &&
    metadata.isPublished === true &&
    metadata.isCertified === true
  );
}

export interface ProviderDiscoveryReadiness {
  isReady: boolean;
  unreadyReasons: string[];
}

/**
 * Capability-aware Smart Discovery Readiness Validator.
 * Evaluates whether a provider should be exposed to AI agents in find/list discovery.
 * - Must satisfy canonical publishing gate.
 * - If CATALOG capability is declared, must have at least one available offering.
 * - If LOCATIONS capability or physical delivery/pickup model (DELIVERY, RETAIL, BOOKINGS) is declared,
 *   must have at least one active location. Digital/remote/recruitment providers do not require a location.
 * - Must not be marked unhealthy (DOWN) or temporarily unavailable.
 */
export function isProviderDiscoveryReady(provider: any): ProviderDiscoveryReadiness {
  const unreadyReasons: string[] = [];

  if (!provider) {
    return { isReady: false, unreadyReasons: ['PROVIDER_NOT_FOUND'] };
  }

  const metadata = (provider.metadata as Record<string, any>) || {};

  // 1. Publishing Gate Check
  if (!isProviderPublished(provider)) {
    if (provider.status !== ProviderStatus.ACTIVE) {
      unreadyReasons.push(`STATUS_${provider.status || 'UNKNOWN'}`);
    }
    if (metadata.reviewStatus !== 'APPROVED') {
      unreadyReasons.push(`REVIEW_${metadata.reviewStatus || 'DRAFT'}`);
    }
    if (metadata.isCertified !== true) {
      unreadyReasons.push('NOT_CERTIFIED');
    }
    if (metadata.isPublished !== true) {
      unreadyReasons.push('NOT_PUBLISHED');
    }
  }

  // 2. Health & Temporary Availability
  const healthData = (metadata.healthMonitoring as Record<string, any>) || {};
  const isDown = metadata.healthStatus === 'DOWN' || healthData.state === 'DOWN';
  const isUnavailable = metadata.isTemporarilyUnavailable === true || healthData.isTemporarilyUnavailable === true;

  if (isDown || isUnavailable) {
    unreadyReasons.push('PROVIDER_UNHEALTHY_OR_UNAVAILABLE');
  }

  const capabilities: ProviderCapability[] = provider.capabilities || [];
  const type: ProviderType = provider.type || ProviderType.SERVICES;

  // 3. Catalog Capability Readiness (Must have at least one available offering)
  if (capabilities.includes(ProviderCapability.CATALOG)) {
    const catalogSummary = metadata.catalogSummary;
    const readiness = metadata.readinessSnapshot;

    if (metadata.emptyCatalog === true) {
      unreadyReasons.push('CATALOG_EMPTY');
    } else if (readiness && typeof readiness.availableOfferingsCount === 'number' && readiness.availableOfferingsCount <= 0) {
      unreadyReasons.push('NO_AVAILABLE_OFFERINGS');
    } else if (catalogSummary && typeof catalogSummary.availableCount === 'number' && catalogSummary.availableCount <= 0) {
      unreadyReasons.push('NO_AVAILABLE_OFFERINGS');
    }
  }

  // 4. Locations & Physical Delivery Model Readiness
  const fulfillmentMode = metadata.fulfillmentMode as ProviderFulfillmentMode | undefined;
  const isRemote = fulfillmentMode === ProviderFulfillmentMode.REMOTE;
  const needsActiveLocations = !isRemote && (
    requiresActiveLocations(type, fulfillmentMode) ||
    (!fulfillmentMode && capabilities.includes(ProviderCapability.LOCATIONS))
  );

  if (needsActiveLocations) {
    const locations = provider.locations;
    const activeLocationsCount = Array.isArray(locations)
      ? locations.filter((loc: any) => loc.isActive !== false).length
      : metadata.activeLocationsCount ?? metadata.readinessSnapshot?.activeLocationsCount;

    if (typeof activeLocationsCount === 'number' && activeLocationsCount <= 0) {
      unreadyReasons.push('NO_ACTIVE_LOCATIONS');
    } else if (Array.isArray(locations) && locations.length === 0) {
      unreadyReasons.push('NO_ACTIVE_LOCATIONS');
    }
  }

  return {
    isReady: unreadyReasons.length === 0,
    unreadyReasons
  };
}
