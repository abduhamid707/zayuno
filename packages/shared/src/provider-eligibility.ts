import {
  ProviderCapability,
  ProviderComplianceStatus,
  ProviderDiscoveryVisibility,
  ProviderEnvironment,
  ProviderOperatingProfile,
  ProviderStatus
} from '@zayuno/contracts';

const READ_ONLY_CAPABILITIES = new Set<ProviderCapability>([
  ProviderCapability.METADATA,
  ProviderCapability.HEALTH,
  ProviderCapability.LOCATIONS,
  ProviderCapability.CATALOG,
  ProviderCapability.SEARCH
]);

const MINIMUM_SAFE_DISCOVERY_CAPABILITIES: ProviderCapability[] = [
  ProviderCapability.METADATA,
  ProviderCapability.HEALTH,
  ProviderCapability.CATALOG
];

const TRANSACTIONAL_BASE_CAPABILITIES: ProviderCapability[] = [
  ProviderCapability.QUOTE,
  ProviderCapability.ACTION_CREATE
];

export interface ProviderEligibilityResult {
  isDiscoveryEligible: boolean;
  discoveryVisibility: ProviderDiscoveryVisibility;
  isTransactionalEligible: boolean;
  allowedCapabilities: ProviderCapability[];
  missingRequirements: string[];
  policy: {
    contractVersion: string;
    complianceStatus: ProviderComplianceStatus;
    profile: ProviderOperatingProfile;
    discoveryVisibility: ProviderDiscoveryVisibility;
  };
}

function asCapability(value: unknown): ProviderCapability | undefined {
  return typeof value === 'string' && Object.values(ProviderCapability).includes(value as ProviderCapability)
    ? value as ProviderCapability
    : undefined;
}

function policyFrom(provider: any) {
  const metadata = (provider?.metadata || {}) as Record<string, any>;
  const raw = (metadata.eligibility || {}) as Record<string, any>;
  const declared = Array.isArray(provider?.capabilities)
    ? provider.capabilities.map(asCapability).filter(Boolean) as ProviderCapability[]
    : [];
  const inferredProfile = declared.some((capability) => !READ_ONLY_CAPABILITIES.has(capability))
    ? ProviderOperatingProfile.TRANSACTIONAL
    : ProviderOperatingProfile.READ_ONLY;
  const compliance = Object.values(ProviderComplianceStatus).includes(raw.complianceStatus)
    ? raw.complianceStatus as ProviderComplianceStatus
    // Existing integrations are intentionally legacy until they complete the v2 audit.
    : ProviderComplianceStatus.RECERTIFICATION_REQUIRED;
  const profile = Object.values(ProviderOperatingProfile).includes(raw.profile)
    ? raw.profile as ProviderOperatingProfile
    : inferredProfile;
  const visibility = Object.values(ProviderDiscoveryVisibility).includes(raw.discoveryVisibility)
    ? raw.discoveryVisibility as ProviderDiscoveryVisibility
    : ProviderDiscoveryVisibility.VISIBLE;
  const certifiedCapabilities = Array.isArray(raw.certifiedCapabilities)
    ? raw.certifiedCapabilities.map(asCapability).filter(Boolean) as ProviderCapability[]
    // v1 reports did not persist per-capability evidence. They may only receive
    // the limited read-only legacy path until a v2 certification is run.
    : compliance === ProviderComplianceStatus.COMPLIANT && metadata.isCertified === true
      ? declared
      : [];
  return {
    contractVersion: typeof raw.contractVersion === 'string' && raw.contractVersion.trim() ? raw.contractVersion.trim() : 'v1 legacy',
    complianceStatus: compliance,
    profile,
    discoveryVisibility: visibility,
    certifiedCapabilities,
    waiver: raw.waiver as Record<string, any> | undefined,
    metadata,
    declared
  };
}

function validWaiver(waiver: Record<string, any> | undefined): boolean {
  if (!waiver || typeof waiver.waiverReason !== 'string' || typeof waiver.approvedBy !== 'string') return false;
  const expiresAt = new Date(waiver.expiresAt || '');
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now() && Array.isArray(waiver.allowedCapabilities);
}

/**
 * Pure policy engine. It never mutates operational status and deliberately
 * fail-closes transactional access when certification is stale or waived.
 */
export function evaluateProviderEligibility(provider: any): ProviderEligibilityResult {
  const policy = policyFrom(provider);
  const missing = new Set<string>();
  // The database schema defaults this field to LIVE. Keep the same safe default
  // for pre-environment rows and in-memory legacy callers, while honoring an
  // explicit provider or metadata environment.
  const environment = provider?.environment ?? policy.metadata.environment ?? ProviderEnvironment.LIVE;
  const isLive = environment === ProviderEnvironment.LIVE || environment === 'LIVE';
  const isActive = provider?.status === ProviderStatus.ACTIVE || provider?.status === 'ACTIVE';
  const published = policy.metadata.reviewStatus === 'APPROVED' && policy.metadata.isPublished === true;
  const health = (policy.metadata.healthMonitoring || {}) as Record<string, any>;
  const healthState = health.state || policy.metadata.healthStatus;
  // Health monitoring keeps a provider discoverable during the first two
  // degraded probes. It becomes unavailable only after the DOWN threshold,
  // during recovery, or when an explicit unavailable flag is set.
  const unhealthy = ['DOWN', 'RECOVERING'].includes(healthState) ||
    policy.metadata.isTemporarilyUnavailable === true || health.isTemporarilyUnavailable === true;

  if (!isLive) missing.add('ENVIRONMENT_NOT_LIVE');
  if (!isActive) missing.add(`STATUS_${provider?.status || 'UNKNOWN'}`);
  if (!published) missing.add('PUBLICATION_NOT_APPROVED');
  if (unhealthy) missing.add(`HEALTH_${healthState || 'UNAVAILABLE'}`);
  if (policy.discoveryVisibility === ProviderDiscoveryVisibility.HIDDEN) missing.add('DISCOVERY_HIDDEN_BY_POLICY');

  const waiverActive = validWaiver(policy.waiver);
  if (policy.complianceStatus === ProviderComplianceStatus.FAILED) missing.add('COMPLIANCE_FAILED');
  if (policy.complianceStatus === ProviderComplianceStatus.GRANDFATHERED && !waiverActive) missing.add('WAIVER_MISSING_OR_EXPIRED');

  const evidence = new Set(policy.certifiedCapabilities);
  const hasSafeLegacySet = MINIMUM_SAFE_DISCOVERY_CAPABILITIES.every((capability) => policy.declared.includes(capability));
  if (policy.complianceStatus === ProviderComplianceStatus.RECERTIFICATION_REQUIRED && !hasSafeLegacySet) {
    missing.add(`MISSING_SAFE_CAPABILITIES:${MINIMUM_SAFE_DISCOVERY_CAPABILITIES.filter((capability) => !policy.declared.includes(capability)).join(',')}`);
  }

  const complianceAllowsDiscovery = policy.complianceStatus === ProviderComplianceStatus.COMPLIANT ||
    policy.complianceStatus === ProviderComplianceStatus.GRANDFATHERED ||
    (policy.complianceStatus === ProviderComplianceStatus.RECERTIFICATION_REQUIRED && hasSafeLegacySet);
  const isDiscoveryEligible = missing.size === 0 && complianceAllowsDiscovery;
  const discoveryVisibility = !isDiscoveryEligible
    ? ProviderDiscoveryVisibility.HIDDEN
    : policy.complianceStatus === ProviderComplianceStatus.RECERTIFICATION_REQUIRED
      ? ProviderDiscoveryVisibility.LIMITED
      : policy.discoveryVisibility === ProviderDiscoveryVisibility.LIMITED
        ? ProviderDiscoveryVisibility.LIMITED
        : ProviderDiscoveryVisibility.VISIBLE;

  const baseCapabilities = policy.complianceStatus === ProviderComplianceStatus.RECERTIFICATION_REQUIRED
    ? policy.declared.filter((capability) => READ_ONLY_CAPABILITIES.has(capability))
    : policy.declared.filter((capability) => policy.profile === ProviderOperatingProfile.TRANSACTIONAL || READ_ONLY_CAPABILITIES.has(capability));
  const waiverCapabilities = waiverActive ? new Set((policy.waiver?.allowedCapabilities || []).map(asCapability).filter(Boolean)) : undefined;
  const allowedCapabilities = baseCapabilities.filter((capability) => {
    if (policy.complianceStatus === ProviderComplianceStatus.RECERTIFICATION_REQUIRED) return READ_ONLY_CAPABILITIES.has(capability);
    if (policy.complianceStatus === ProviderComplianceStatus.GRANDFATHERED) return waiverCapabilities?.has(capability) === true;
    return evidence.has(capability);
  });

  const requiredTransactional = TRANSACTIONAL_BASE_CAPABILITIES.filter((capability) => !allowedCapabilities.includes(capability));
  const isTransactionalEligible = isDiscoveryEligible &&
    policy.complianceStatus === ProviderComplianceStatus.COMPLIANT &&
    policy.profile === ProviderOperatingProfile.TRANSACTIONAL &&
    requiredTransactional.length === 0;
  // Transactional revocation must not turn an otherwise safe legacy provider
  // into a discovery failure. `isTransactionalEligible` and
  // `allowedCapabilities` carry that narrower capability decision.

  return {
    isDiscoveryEligible,
    discoveryVisibility,
    isTransactionalEligible,
    allowedCapabilities,
    missingRequirements: [...missing],
    policy: {
      contractVersion: policy.contractVersion,
      complianceStatus: policy.complianceStatus,
      profile: policy.profile,
      discoveryVisibility: policy.discoveryVisibility
    }
  };
}

export function getProviderEligibilityPolicy(provider: any) {
  return policyFrom(provider);
}

/** Safe persistence projection; omits provider metadata and derived capabilities. */
export function getStoredProviderEligibilityPolicy(provider: any) {
  const policy = policyFrom(provider);
  return {
    contractVersion: policy.contractVersion,
    complianceStatus: policy.complianceStatus,
    profile: policy.profile,
    discoveryVisibility: policy.discoveryVisibility,
    certifiedCapabilities: policy.certifiedCapabilities,
    ...(policy.waiver ? { waiver: policy.waiver } : {})
  };
}

export const CERTIFICATION_VERSION = 2;

export function isCurrentCertification(report: any): boolean {
  return report?.certificationVersion === CERTIFICATION_VERSION && report?.mode === 'STRICT' && report?.isProductionReady === true;
}
