import crypto from 'node:crypto';
import {
  ProviderAdapter,
  ProviderCapability,
  MANDATORY_CAPABILITIES,
  OPTIONAL_CAPABILITIES,
  ProviderCapabilityProfile,
  ProviderFulfillmentMode,
  ProviderInfo,
  ProviderManifestSchema,
  ProviderType,
  determineProviderCapabilityProfile,
  getMandatoryCapabilitiesForProfile,
  requiresActiveLocations,
  ActionStatus,
  CreateActionInput,
  Offering,
  SelectedOption,
  PROVIDER_PROTOCOL_ENDPOINTS
} from '@zayuno/contracts';
import { ProviderContractValidationError } from './protocol-validation';
import { CERTIFICATION_VERSION, assertStrictManifest, assertCertificationFixture, expectRemoteRejection,
  requiredInputMutations, invalidParameterMutations, WebhookDeliveryEvidence } from './strict-certification';

export type CertificationTestStatus = 'PASS' | 'FAIL' | 'SKIPPED';
export type CertificationTestStage = 'CONTRACT_READINESS' | 'LIFECYCLE_E2E';
export type CertificationMode = 'STANDARD' | 'ADVERSARIAL' | 'STRICT';

/**
 * STANDARD retains the existing compatibility-oriented certification flow.
 * ADVERSARIAL adds safe negative probes only for capabilities implemented by
 * the adapter. It is intentionally opt-in because a transactional provider
 * must prepare a certification-safe test environment before it is probed.
 */
export interface CertificationRunOptions {
  mode?: CertificationMode;
  verifyWebhookDelivery?: (actionIds: string[], since: Date) => Promise<WebhookDeliveryEvidence | null>;
}

export interface CertificationIssue {
  code: string;
  endpoint?: string;
  path?: string;
  expected?: string;
  received?: string;
  docsUrl?: string;
  rootCause: string;
  fixExample?: string;
}

export interface CertificationTestResult {
  testId: string;
  name: string;
  stage?: CertificationTestStage;
  capability: ProviderCapability;
  isMandatory: boolean;
  passed: boolean;
  status: CertificationTestStatus;
  durationMs: number;
  endpoint?: string;
  docsUrl?: string;
  blockedBy?: string[];
  issue?: CertificationIssue;
  issues?: CertificationIssue[];
  error?: string;
  details?: any;
}

export interface CertificationReport {
  certificationVersion: number;
  scope: 'DIAGNOSTIC' | 'AUTOMATED_INTEGRATION';
  operationalReviewRequired: boolean;
  operationalReviewRequirements?: string[];
  providerSlug: string;
  mode: CertificationMode;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  skippedCount: number;
  isCertified: boolean;
  isProductionReady: boolean;
  missingMandatoryCapabilities: ProviderCapability[];
  capabilitiesTested: ProviderCapability[];
  profile: ProviderCapabilityProfile;
  providerType?: ProviderType;
  fulfillmentMode?: ProviderFulfillmentMode;
  discoveryReadiness: {
    isReady: boolean;
    reasons: string[];
  };
  tests: CertificationTestResult[];
}

/**
 * Universal Provider Integration Certification Harness.
 * Inspects the adapter's declared capabilities and runs compliance tests
 * only for those specific capabilities.
 */
export class ProviderCertificationRunner {
  private adapter: ProviderAdapter;
  private readonly defaultOptions: CertificationRunOptions;

  constructor(adapter: ProviderAdapter, options: CertificationRunOptions = {}) {
    this.adapter = adapter;
    this.defaultOptions = options;
  }

  private endpointFor(testId?: string, capability?: ProviderCapability) {
    if (testId) {
      const byId = PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.id === testId);
      if (byId) return byId;
    }
    if (capability) {
      return PROVIDER_PROTOCOL_ENDPOINTS.find(e => e.capability === capability);
    }
    return undefined;
  }

  private formatFriendlyError(raw: string): string {
    const lower = (raw || '').toLowerCase();
    if (
      lower.includes('401') ||
      lower.includes('unauthorized') ||
      lower.includes('invalid provider api key') ||
      lower.includes('api key required') ||
      lower.includes('invalid api key')
    ) {
      return 'API kaliti noto‘g‘ri yoki yo‘q';
    }
    if (
      lower.includes('404') ||
      lower.includes('not found') ||
      lower.includes('cannot get') ||
      lower.includes('cannot post')
    ) {
      return 'Server endpointi topilmadi';
    }
    if (
      lower.includes('econnrefused') ||
      lower.includes('etimedout') ||
      lower.includes('fetch failed') ||
      lower.includes('timeout') ||
      lower.includes('enotfound') ||
      lower.includes('network') ||
      lower.includes('server javob bermadi')
    ) {
      return 'Server javob bermadi';
    }
    if (
      lower.includes('missing mandatory') ||
      (lower.includes('capability') && lower.includes('missing')) ||
      lower.includes('not supported') ||
      lower.includes('must advertise at least one capability')
    ) {
      return 'Majburiy endpoint yo‘q';
    }
    return raw;
  }

  private async runTest(
    results: CertificationTestResult[],
    testId: string,
    name: string,
    capability: ProviderCapability,
    isMandatory: boolean,
    testFn: () => Promise<void>,
    dependsOn: string[] = [],
    stage: CertificationTestStage = 'LIFECYCLE_E2E'
  ): Promise<void> {
    const endpoint = this.endpointFor(testId, capability);
    const blockedBy = dependsOn.filter(dependency =>
      !results.some(result => result.testId === dependency && result.status === 'PASS')
    );
    if (blockedBy.length > 0) {
      results.push({
        testId,
        name,
        stage,
        capability,
        isMandatory,
        passed: false,
        status: 'SKIPPED',
        durationMs: 0,
        endpoint: endpoint ? `${endpoint.method} ${endpoint.path}` : undefined,
        docsUrl: endpoint ? `https://partners.zayuno.uz/docs/contract-reference/#${endpoint.docsAnchor}` : undefined,
        blockedBy,
        error: `Oldingi asosiy test muvaffaqiyatsiz: ${blockedBy.join(', ')}`,
        issue: {
          code: 'DEPENDENCY_FAILED',
          endpoint: endpoint ? `${endpoint.method} ${endpoint.path}` : undefined,
          docsUrl: endpoint ? `https://partners.zayuno.uz/docs/contract-reference/#${endpoint.docsAnchor}` : undefined,
          rootCause: `Bu test ${blockedBy.join(', ')} natijasiga bog‘liq. Avval asosiy xatoni tuzating.`
        }
      });
      return;
    }

    const start = Date.now();
    try {
      await testFn();
      results.push({
        testId,
        name,
        stage,
        capability,
        isMandatory,
        passed: true,
        status: 'PASS',
        endpoint: endpoint ? `${endpoint.method} ${endpoint.path}` : undefined,
        docsUrl: endpoint ? `https://partners.zayuno.uz/docs/contract-reference/#${endpoint.docsAnchor}` : undefined,
        durationMs: Date.now() - start
      });
    } catch (err: any) {
      const rawError = err.message || String(err);
      const friendlyError = this.formatFriendlyError(rawError);
      const contractIssues = err instanceof ProviderContractValidationError
        ? (err.issues && err.issues.length ? err.issues : [err.issue])
        : undefined;

      const issues: CertificationIssue[] | undefined = contractIssues
        ? contractIssues.map(ci => ({
            code: ci.code,
            endpoint: ci.endpoint || (endpoint ? `${endpoint.method} ${endpoint.path}` : undefined),
            path: ci.path,
            expected: ci.expected,
            received: ci.received,
            docsUrl: ci.docsUrl || (endpoint ? `https://partners.zayuno.uz/docs/contract-reference/#${endpoint.docsAnchor}` : undefined),
            rootCause: ci.message,
            fixExample: ci.fixExample
          }))
        : undefined;

      const primaryIssue: CertificationIssue = issues && issues.length
        ? issues[0]
        : {
            code: this.inferErrorCode(rawError),
            endpoint: endpoint ? `${endpoint.method} ${endpoint.path}` : undefined,
            docsUrl: endpoint ? `https://partners.zayuno.uz/docs/contract-reference/#${endpoint.docsAnchor}` : undefined,
            rootCause: rawError
          };

      results.push({
        testId,
        name,
        stage,
        capability,
        isMandatory,
        passed: false,
        status: 'FAIL',
        endpoint: primaryIssue.endpoint,
        docsUrl: primaryIssue.docsUrl,
        durationMs: Date.now() - start,
        error: friendlyError,
        issue: primaryIssue,
        issues: issues && issues.length ? issues : [primaryIssue],
        details: { rawMessage: rawError }
      });
    }
  }

  private addSkippedTest(
    results: CertificationTestResult[],
    testId: string,
    name: string,
    capability: ProviderCapability,
    reason: string
  ): void {
    const endpoint = this.endpointFor(testId, capability);
    results.push({
      testId,
      name,
      stage: 'LIFECYCLE_E2E',
      capability,
      isMandatory: false,
      passed: false,
      status: 'SKIPPED',
      durationMs: 0,
      endpoint: endpoint ? `${endpoint.method} ${endpoint.path}` : undefined,
      docsUrl: endpoint ? `https://partners.zayuno.uz/docs/contract-reference/#${endpoint.docsAnchor}` : undefined,
      error: reason,
      issue: {
        code: 'ADVERSARIAL_PROBE_NOT_APPLICABLE',
        endpoint: endpoint ? `${endpoint.method} ${endpoint.path}` : undefined,
        docsUrl: endpoint ? `https://partners.zayuno.uz/docs/contract-reference/#${endpoint.docsAnchor}` : undefined,
        rootCause: reason
      }
    });
  }

  private errorCodeFor(error: unknown): string | undefined {
    if (!error || typeof error !== 'object') return undefined;
    const candidate = error as {
      code?: unknown;
      errorCode?: unknown;
      name?: unknown;
      details?: { code?: unknown; errorCode?: unknown };
    };
    const value = candidate.errorCode || candidate.code || candidate.details?.errorCode || candidate.details?.code;
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    }
    // Adapters that validate the canonical request locally surface ZodError
    // before any network call. That is a valid rejection of malformed input.
    if (candidate.name === 'ZodError') return 'VALIDATION_ERROR';
    return undefined;
  }

  private async expectRejectedWithCode(
    attempt: () => Promise<unknown>,
    expectedCodes: string[],
    label: string
  ): Promise<void> {
    try {
      await attempt();
    } catch (error: any) {
      const code = this.errorCodeFor(error);
      if (code && expectedCodes.includes(code)) return;
      const received = code || error?.message || String(error);
      throw new Error(`${label} must be rejected with ${expectedCodes.join(' or ')}; received ${received}.`);
    }
    throw new Error(`${label} was accepted. The provider must reject malformed selections before pricing.`);
  }

  async runAllTests(runOptions: CertificationRunOptions = {}): Promise<CertificationReport> {
    const mode = runOptions.mode ?? this.defaultOptions.mode ?? 'STANDARD';
    const adversarialMode = mode === 'ADVERSARIAL';
    const strict = mode === 'STRICT';
    const startedAt = new Date();
    if (strict && typeof (this.adapter as any).forCertification === 'function' && !(this.adapter as any).config?.config?.certificationRunId) {
      this.adapter = (this.adapter as any).forCertification(crypto.randomUUID());
    }
    const results: CertificationTestResult[] = [];
    const declaredCaps = this.adapter.getCapabilities();
    const profile = determineProviderCapabilityProfile(declaredCaps);
    let providerInfo: ProviderInfo | undefined;
    let mandatoryForProfile = getMandatoryCapabilitiesForProfile(declaredCaps);

    // 1. Metadata Capability (MANDATORY)
    if (this.adapter.hasCapability(ProviderCapability.METADATA) && this.adapter.getProviderInfo) {
      await this.runTest(results, 'metadata', 'Provider Metadata Verification', ProviderCapability.METADATA, mandatoryForProfile.includes(ProviderCapability.METADATA), async () => {
        const info = await this.adapter.getProviderInfo!();
        providerInfo = info;
        if (!info.slug || !info.name) throw new Error('Invalid provider info: missing slug or name.');
        if (info.slug.toLowerCase().trim() !== this.adapter.providerSlug.toLowerCase().trim()) {
          throw new Error(`Provider slug mismatch: expected "${this.adapter.providerSlug}" but remote API returned "${info.slug}".`);
        }
        if (!info.capabilities || info.capabilities.length === 0) throw new Error('Provider must advertise at least one capability.');
        if (!info.status) throw new Error('Provider info missing status field.');
        if (strict) assertStrictManifest(info, declaredCaps, profile === 'TRANSACTIONAL');
        const manifest = info.manifest || info.metadata?.manifest;
        if (manifest) {
          const parsed = ProviderManifestSchema.parse(manifest);
          if (parsed.capabilities?.some(capability => !declaredCaps.includes(capability as ProviderCapability))) {
            throw new Error('Manifest capability is not declared by the adapter.');
          }
        }
      }, [], 'CONTRACT_READINESS');
    }

    if (strict) {
      const methods: Partial<Record<ProviderCapability, string[]>> = {
        METADATA: ['getProviderInfo'], HEALTH: ['checkHealth'], CATALOG: ['getCatalog', 'getOffering'],
        SEARCH: ['searchOfferings'], LOCATIONS: ['getLocations'], QUOTE: ['requestQuote'],
        ACTION_CREATE: ['createAction'], ACTION_STATUS: ['getAction'], ACTION_CANCEL: ['cancelAction'],
        PAYMENT_OPTIONS: ['getPaymentOptions'], WEBHOOK: ['verifyWebhook', 'parseWebhookEvent'],
      };
      for (const capability of declaredCaps) {
        await this.runTest(results, `implementation-${capability}`, `${capability} implementation`, capability, true, async () => {
          const required = methods[capability];
          if (!required?.length || required.some(method => typeof (this.adapter as any)[method] !== 'function')) {
            throw new Error(`Declared capability ${capability} has no complete testable implementation.`);
          }
        }, [], 'CONTRACT_READINESS');
      }
      for (const auth of ['missing', 'invalid'] as const) {
        await this.runTest(results, `auth-${auth}`, `Upstream rejects ${auth} credentials`, ProviderCapability.METADATA, true,
          () => expectRemoteRejection(this.adapter, '/provider-info', undefined, [401, 403], auth), [], 'CONTRACT_READINESS');
      }
    }

    const configuredFulfillmentMode =
      (this.adapter as any)?.getConfig?.()?.metadata?.fulfillmentMode ||
      (this.adapter as any)?.getConfig?.()?.config?.fulfillmentMode ||
      (this.adapter as any)?.config?.metadata?.fulfillmentMode ||
      (this.adapter as any)?.config?.config?.fulfillmentMode ||
      (this.adapter as any)?.config?.fulfillmentMode ||
      (this.adapter as any)?.fulfillmentMode as ProviderFulfillmentMode | undefined;

    const fulfillmentMode =
      configuredFulfillmentMode ||
      providerInfo?.fulfillmentMode ||
      (providerInfo?.metadata?.fulfillmentMode as ProviderFulfillmentMode | undefined);

    const configuredType =
      (this.adapter as any)?.getConfig?.()?.metadata?.type ||
      (this.adapter as any)?.config?.metadata?.type ||
      (this.adapter as any)?.providerType ||
      (this.adapter as any)?.type as ProviderType | undefined;

    const effectiveType = providerInfo?.type || configuredType;

    mandatoryForProfile = getMandatoryCapabilitiesForProfile(declaredCaps, {
      type: effectiveType,
      fulfillmentMode
    });
    const missingMandatoryCapabilities = mandatoryForProfile.filter(
      cap => !this.adapter.hasCapability(cap)
    );

    const locationRequired = requiresActiveLocations(effectiveType, fulfillmentMode);
    if (locationRequired && !this.adapter.hasCapability(ProviderCapability.LOCATIONS)) {
      results.push({
        testId: 'discovery-readiness',
        name: 'AI Discovery Readiness',
        stage: 'CONTRACT_READINESS',
        capability: ProviderCapability.LOCATIONS,
        isMandatory: true,
        passed: false,
        status: 'FAIL',
        durationMs: 0,
        endpoint: 'GET /locations',
        docsUrl: 'https://partners.zayuno.uz/docs/contract-reference/#contract-locations',
        error: 'Jismoniy xizmat uchun LOCATIONS majburiy',
        issue: {
          code: 'MISSING_REQUIRED_LOCATIONS',
          endpoint: 'GET /locations',
          path: 'capabilities.LOCATIONS',
          expected: 'LOCATIONS capability and at least one active location',
          received: 'LOCATIONS capability is not declared',
          docsUrl: 'https://partners.zayuno.uz/docs/contract-reference/#contract-locations',
          rootCause: 'Bu xizmat mijozga fizik joyda yoki yetkazib berish orqali ko‘rsatiladi. Faol filial bo‘lmasa AI discovery provider’ni yashiradi.',
          fixExample: 'GET /locations endpointini qo‘shing, LOCATIONS capabilityni e’lon qiling va kamida bitta isActive=true filial qaytaring.'
        }
      });
    }

    // 2. Health Capability (MANDATORY)
    if (this.adapter.hasCapability(ProviderCapability.HEALTH) && this.adapter.checkHealth) {
      await this.runTest(results, 'health', 'Health Check Protocol', ProviderCapability.HEALTH, true, async () => {
        const health = await this.adapter.checkHealth!();
        if (!health.status || !['HEALTHY', 'DEGRADED', 'DOWN'].includes(health.status)) {
          throw new Error('Invalid health status response.');
        }
        if (typeof health.latencyMs !== 'number') {
          throw new Error('Health check must report latencyMs.');
        }
        if (strict && health.status !== 'HEALTHY') throw new Error('Provider must report HEALTHY before certification can proceed.');
      }, [], 'CONTRACT_READINESS');
    }

    // 3. Locations Capability (mandatory for physical fulfilment, optional otherwise)
    let testLocationId: string | undefined;
    if (this.adapter.hasCapability(ProviderCapability.LOCATIONS) && this.adapter.getLocations) {
      await this.runTest(results, 'locations', 'Locations & Facilities Query', ProviderCapability.LOCATIONS, mandatoryForProfile.includes(ProviderCapability.LOCATIONS), async () => {
        const locations = await this.adapter.getLocations!({ providerSlug: this.adapter.providerSlug });
        if (!Array.isArray(locations) || locations.length === 0) {
          throw new Error('Provider declared LOCATIONS but returned an empty list.');
        }
        const activeLocation = locations.find(l => l.isActive !== false);
        if (!activeLocation) {
          throw new Error('Provider must return at least one active location (isActive=true) for AI discovery.');
        }
        testLocationId = activeLocation.id || (activeLocation as any).providerLocationId;
        if (!activeLocation.name || !activeLocation.address) {
          throw new Error('Location object missing required name or address.');
        }
      }, [], 'CONTRACT_READINESS');
    }

    // 4. Catalog Capability (MANDATORY)
    const manifest = providerInfo?.manifest || providerInfo?.metadata?.manifest;
    const parameterOnly = manifest?.requirements?.QUOTE?.inputMode === 'PARAMETERS';
    const certificationInput = manifest?.certificationInput || {};
    let selectedTestOffering: Offering | undefined;
    let selectedTestVariantId: string | undefined;
    let selectedTestOptions: SelectedOption[] = [];

    if (this.adapter.hasCapability(ProviderCapability.CATALOG) && this.adapter.getCatalog) {
      await this.runTest(results, 'catalog', 'Catalog Structure & Offerings', ProviderCapability.CATALOG, true, async () => {
        const catalog = await this.adapter.getCatalog!({ providerSlug: this.adapter.providerSlug, locationId: testLocationId });
        if (parameterOnly && Array.isArray(catalog.offerings)) return;
        if (!catalog.offerings || catalog.offerings.length === 0) throw new Error('Catalog has no offerings.');

        // Select an available offering
        const availableOfferings = catalog.offerings.filter(o => o.isAvailable !== false);
        if (availableOfferings.length === 0) {
          throw new Error('Catalog has no available offerings for testing.');
        }

        selectedTestOffering = availableOfferings[0];

        // If offering has variants, select the default or first available variant
        if (selectedTestOffering.variants && selectedTestOffering.variants.length > 0) {
          const availableVariants = selectedTestOffering.variants.filter(v => v.isAvailable !== false);
          if (!availableVariants.length) throw new Error('Offering has no available variant for certification.');
          const defaultVariant = availableVariants.find(v => (v as any).isDefault) || availableVariants[0] || selectedTestOffering.variants[0];
          selectedTestVariantId = defaultVariant.id;
        }

        // If offering has required option groups, deterministically select valid options
        selectedTestOptions = [];
        if (selectedTestOffering.optionGroups && selectedTestOffering.optionGroups.length > 0) {
          for (const group of selectedTestOffering.optionGroups) {
            if (group.isRequired || (group.minSelections && group.minSelections > 0)) {
              const availableOpts = group.options.filter(o => o.isAvailable !== false);
              const minimum = Math.max(group.minSelections || 0, group.isRequired ? 1 : 0);
              if (availableOpts.length < minimum) throw new Error(`Not enough available options in required group ${group.id}.`);
              selectedTestOptions.push(...availableOpts.slice(0, minimum).map(option => ({ groupId: group.id, optionId: option.id, quantity: 1 })));
            }
          }
        }
      }, [], 'CONTRACT_READINESS');
    }

    // 4b. Single Offering Lookup (MANDATORY with Catalog)
    if (!parameterOnly && this.adapter.hasCapability(ProviderCapability.CATALOG) && this.adapter.getOffering) {
      await this.runTest(results, 'offering', 'Single Offering Lookup', ProviderCapability.CATALOG, true, async () => {
        const offeringId = selectedTestOffering?.id || selectedTestOffering?.offeringCode;
        if (!offeringId) {
          throw new Error('Catalog has no offering ID available for single offering lookup.');
        }
        const singleOffering = await this.adapter.getOffering!({
          providerSlug: this.adapter.providerSlug,
          offeringId
        });
        if (!singleOffering || singleOffering.basePrice < 0) {
          throw new Error('Failed to retrieve single offering by ID or basePrice is invalid.');
        }
      }, ['catalog'], 'CONTRACT_READINESS');
    }

    // 5. Search Capability (OPTIONAL)
    if (this.adapter.hasCapability(ProviderCapability.SEARCH) && this.adapter.searchOfferings) {
      await this.runTest(results, 'search', 'Catalog Search Indexing', ProviderCapability.SEARCH, false, async () => {
        const queryTerm = selectedTestOffering?.title?.split(' ')[0] || 'standard';
        const searchRes = await this.adapter.searchOfferings!({
          providerSlug: this.adapter.providerSlug,
          query: queryTerm,
          limit: 5
        });
        if (!Array.isArray(searchRes)) throw new Error('Search result must be an array of offerings.');
      }, ['catalog'], 'LIFECYCLE_E2E');
    }

    // Keep quote and action inputs identical so providers can safely bind a
    // short-lived quote to the exact fulfillment request being certified.
    const certificationDestination = {
      raw: 'Toshkent shahri, Certification Test manzili',
      region: 'tashkent'
    };

    // 6. Quote Capability (MANDATORY)
    let testQuoteId: string | undefined;
    let testQuote: any;
    let quoteInput: any;
    if (this.adapter.hasCapability(ProviderCapability.QUOTE) && this.adapter.requestQuote) {
      await this.runTest(results, 'quote', 'Verified Quote Pricing & Math', ProviderCapability.QUOTE, true, async () => {
        const testOfferingId = selectedTestOffering?.id || selectedTestOffering?.offeringCode;
        quoteInput = {
          providerSlug: this.adapter.providerSlug,
          locationId: testLocationId,
          items: parameterOnly ? [] : [{
            offeringId: testOfferingId!,
            variantId: selectedTestVariantId,
            quantity: 1,
            selectedOptions: selectedTestOptions
          }],
          ...(!strict && !parameterOnly ? { destination: certificationDestination } : {}),
          ...certificationInput
        };
        if (strict) assertCertificationFixture(providerInfo, quoteInput, 'QUOTE', selectedTestOffering);
        const quote = await this.adapter.requestQuote!(quoteInput);

        if (quote.total < 0) throw new Error('Quote total must be nonnegative.');
        if (!Array.isArray(quote.lines) || (!parameterOnly && quote.lines.length === 0)) throw new Error('Quote must return an appropriate lines breakdown.');

        // Strict Quote Math Validation: total == subtotal + fees - discount
        const subtotal = Number(quote.subtotal);
        const fees = typeof quote.totalFees === 'number'
          ? quote.totalFees
          : Array.isArray(quote.fees)
          ? quote.fees.reduce((acc, f) => acc + Number(f.amount || 0), 0)
          : Number((quote as any).fees || 0);

        const discount = typeof quote.totalDiscount === 'number'
          ? quote.totalDiscount
          : Array.isArray(quote.discounts)
          ? quote.discounts.reduce((acc, d) => acc + Number(d.amount || 0), 0)
          : Number((quote as any).discount || 0);

        const total = Number(quote.total);

        if (subtotal < 0 || fees < 0 || discount < 0 || total < 0) {
          throw new Error('Quote financial amounts must not be negative.');
        }

        const expectedTotal = subtotal + fees - discount;
        if (Math.abs(expectedTotal - total) > 0.01) {
          throw new Error(`Quote math error: expected total ${expectedTotal} (subtotal: ${subtotal} + fees: ${fees} - discount: ${discount}) but received ${total}.`);
        }

        // Line math validation
        if (!parameterOnly || quote.lines.length > 0) {
          const calculatedLinesTotal = quote.lines.reduce((sum, line) => sum + Number(line.lineTotal || (line as any).total || 0), 0);
          if (Math.abs(calculatedLinesTotal - subtotal) > 0.01) {
            throw new Error(`Quote lines math mismatch: sum of line totals (${calculatedLinesTotal}) does not match subtotal (${subtotal}).`);
          }
        }

        if (quote.expiresAt) {
          const exp = new Date(quote.expiresAt).getTime();
          if (isNaN(exp) || exp <= Date.now()) {
            throw new Error('Quote expiresAt must be a valid timestamp in the future.');
          }
        }

        testQuoteId = quote.id;
        testQuote = quote;
      }, [...(parameterOnly ? [] : ['catalog']), ...(strict ? ['metadata', 'health', 'auth-missing', 'auth-invalid'] : [])], 'LIFECYCLE_E2E');
    }

    // V2 adversarial probes are opt-in and quote-only: they cannot create a
    // provider action. Each probe is tied to QUOTE and runs only after a valid
    // quote proves the selected catalog fixture is usable.
    if ((strict || adversarialMode) && !parameterOnly && this.adapter.hasCapability(ProviderCapability.QUOTE) && this.adapter.requestQuote) {
      await this.runTest(
        results,
        'adversarial-invalid-selection',
        'Adversarial Invalid Selection Rejection',
        ProviderCapability.QUOTE,
        true,
        async () => {
          const offering = selectedTestOffering;
          const offeringId = offering?.id || offering?.offeringCode;
          if (!offering || !offeringId) {
            throw new Error('Catalog has no offering available for the invalid-selection probe.');
          }

          const invalidSuffix = `__zayuno_cert_invalid_${crypto.randomUUID()}`;
          const invalidItem: {
            offeringId: string;
            variantId?: string;
            quantity: number;
            selectedOptions: SelectedOption[];
          } = {
            offeringId,
            variantId: selectedTestVariantId,
            quantity: 1,
            selectedOptions: selectedTestOptions
          };

          const availableVariant = offering.variants?.find(variant => variant.isAvailable !== false);
          const optionGroup = offering.optionGroups?.find(group =>
            group.options.some(option => option.isAvailable !== false)
          );

          if (availableVariant) {
            invalidItem.variantId = `${availableVariant.id}${invalidSuffix}`;
          } else if (optionGroup) {
            invalidItem.selectedOptions = [
              ...selectedTestOptions.filter(option => option.groupId !== optionGroup.id),
              { groupId: optionGroup.id, optionId: `invalid-option${invalidSuffix}`, quantity: 1 }
            ];
          } else {
            invalidItem.offeringId = `${offeringId}${invalidSuffix}`;
          }

          await this.expectRejectedWithCode(
            () => this.adapter.requestQuote!({
              providerSlug: this.adapter.providerSlug,
              locationId: testLocationId,
              items: [invalidItem],
              ...(!strict && !parameterOnly ? { destination: certificationDestination } : {}),
              ...certificationInput
            }),
            ['OFFERING_NOT_FOUND', 'INVALID_VARIANT', 'INVALID_OPTION', 'VALIDATION_ERROR', 'RESOURCE_NOT_FOUND'],
            'Invalid catalog selection'
          );
        },
        ['quote'],
        'LIFECYCLE_E2E'
      );

      await this.runTest(
        results,
        'adversarial-zero-quantity',
        'Adversarial Zero Quantity Rejection',
        ProviderCapability.QUOTE,
        true,
        async () => {
          const offeringId = selectedTestOffering?.id || selectedTestOffering?.offeringCode;
          if (!offeringId) throw new Error('Catalog has no offering available for the zero-quantity probe.');

          await this.expectRejectedWithCode(
            () => this.adapter.requestQuote!({
              providerSlug: this.adapter.providerSlug,
              locationId: testLocationId,
              items: [{
                offeringId,
                variantId: selectedTestVariantId,
                quantity: 0,
                selectedOptions: selectedTestOptions
              }],
              ...(!strict && !parameterOnly ? { destination: certificationDestination } : {}),
              ...certificationInput
            }),
            ['INVALID_QUANTITY', 'VALIDATION_ERROR'],
            'Zero item quantity'
          );
        },
        ['quote'],
        'LIFECYCLE_E2E'
      );

      const pricedOption = selectedTestOffering?.optionGroups
        .flatMap(group => group.options
          .filter(option => option.isAvailable !== false && Number.isFinite(Number(option.priceDelta)) && Number(option.priceDelta) !== 0)
          .map(option => ({ group, option })))
        .find(Boolean);

      if (!pricedOption) {
        this.addSkippedTest(
          results,
          'adversarial-option-quantity-math',
          'Adversarial Option Quantity Math',
          ProviderCapability.QUOTE,
          'Catalogda narxi nol bo‘lmagan selectable option yo‘q; option-quantity matematikasi bu provider uchun qo‘llanmaydi.'
        );
      } else {
        await this.runTest(
          results,
          'adversarial-option-quantity-math',
          'Adversarial Option Quantity Math',
          ProviderCapability.QUOTE,
          true,
          async () => {
            const offeringId = selectedTestOffering?.id || selectedTestOffering?.offeringCode;
            if (!offeringId) throw new Error('Catalog has no offering available for the option-quantity probe.');

            const itemQuantity = 2;
            const optionQuantity = 2;
            const expectedOptionsTotal = Number(pricedOption.option.priceDelta) * optionQuantity * itemQuantity;
            const selectedOptions = [
              ...selectedTestOptions.filter(option => option.groupId !== pricedOption.group.id),
              { groupId: pricedOption.group.id, optionId: pricedOption.option.id, quantity: optionQuantity }
            ];

            const quote = await this.adapter.requestQuote!({
              providerSlug: this.adapter.providerSlug,
              locationId: testLocationId,
              items: [{
                offeringId,
                variantId: selectedTestVariantId,
                quantity: itemQuantity,
                selectedOptions
              }],
              ...(!strict && !parameterOnly ? { destination: certificationDestination } : {}),
              ...certificationInput
            });

            const line = quote.lines.find(candidate => candidate.offeringId === offeringId);
            if (!line) throw new Error('Option-quantity quote is missing the requested offering line.');

            const reportedOptionsTotal = Number(line.optionsTotal);
            if (!Number.isFinite(reportedOptionsTotal) || Math.abs(reportedOptionsTotal - expectedOptionsTotal) > 0.01) {
              throw new Error(
                `Option quantity math error: expected optionsTotal ${expectedOptionsTotal} ` +
                `(priceDelta ${pricedOption.option.priceDelta} × option quantity ${optionQuantity} × item quantity ${itemQuantity}) ` +
                `but received ${line.optionsTotal}.`
              );
            }

            const expectedLineTotal = Number(line.unitPrice) * itemQuantity + reportedOptionsTotal;
            if (!Number.isFinite(Number(line.lineTotal)) || Math.abs(Number(line.lineTotal) - expectedLineTotal) > 0.01) {
              throw new Error(
                `Option quantity line math error: expected lineTotal ${expectedLineTotal} ` +
                `(unitPrice ${line.unitPrice} × item quantity ${itemQuantity} + optionsTotal ${reportedOptionsTotal}) ` +
                `but received ${line.lineTotal}.`
              );
            }
          },
          ['quote'],
          'LIFECYCLE_E2E'
        );
      }
    }

    // 7. Action Create & Payment Handoff (MANDATORY)
    let createdActionId: string | undefined;
    const testIdempKey = crypto.randomUUID();
    const createCertificationActionInput = (customerName = 'Certification Validator'): CreateActionInput => {
      const offeringId = selectedTestOffering?.id || selectedTestOffering?.offeringCode;
      return {
        idempotencyKey: testIdempKey,
        providerSlug: this.adapter.providerSlug,
        quoteId: testQuoteId!,
        locationId: testLocationId,
        ...(!strict ? { customer: {
          name: customerName,
          phone: '+998901234567'
        } } : {}),
        ...(!strict && !parameterOnly ? { destination: certificationDestination } : {}),
        items: parameterOnly ? [] : [{
          offeringId: offeringId!,
          variantId: selectedTestVariantId,
          quantity: 1,
          selectedOptions: selectedTestOptions
        }],
        ...certificationInput,
        userConfirmed: true
      };
    };

    let createdAction: any;

    if (this.adapter.hasCapability(ProviderCapability.ACTION_CREATE) && this.adapter.createAction) {
      await this.runTest(results, 'action-create', 'Action Creation & Payment Handoff', ProviderCapability.ACTION_CREATE, true, async () => {
        if (strict) assertCertificationFixture(providerInfo, createCertificationActionInput(), 'ACTION_CREATE', selectedTestOffering, testQuote);
        const action = await this.adapter.createAction!(createCertificationActionInput());
        createdAction = action;

        if (!action.id && !action.externalActionId) {
          throw new Error('Action creation must return a valid ID or externalActionId.');
        }
        createdActionId = action.id || action.externalActionId;
        if (strict && (action.providerSlug !== this.adapter.providerSlug || action.quoteId !== testQuoteId ||
          action.currency !== testQuote.currency || Math.abs(action.total - testQuote.total) > 0.01 || !Number.isFinite(action.total))) {
          throw new Error('Created action must preserve the provider, quoteId, currency and verified quote total.');
        }

        // Payment handoff validation: If awaiting payment, nextAction with OPEN_URL is mandatory
        if (action.status === ActionStatus.AWAITING_PAYMENT) {
          if (!action.nextAction && !action.paymentUrl) {
            throw new Error('Action in AWAITING_PAYMENT status must include nextAction with type OPEN_URL.');
          }
          if (action.nextAction) {
            if (action.nextAction.type !== 'OPEN_URL' || !action.nextAction.url) {
              throw new Error('nextAction must specify type="OPEN_URL" and a valid provider checkout URL.');
            }
          }
        }
      }, ['quote'], 'LIFECYCLE_E2E');

      // 7b. Idempotency Validation (MANDATORY)
      await this.runTest(results, 'action-idempotency', 'Action Idempotency Protection', ProviderCapability.ACTION_CREATE, true, async () => {
        const dupAction = await this.adapter.createAction!(createCertificationActionInput());

        const originalId = createdActionId;
        const dupId = dupAction.id || dupAction.externalActionId;
        if (originalId !== dupId) {
          throw new Error(`Idempotency failure: duplicate creation generated new ID (${dupId}) instead of returning original (${originalId}).`);
        }
      }, ['action-create'], 'LIFECYCLE_E2E');

      if (adversarialMode) {
        await this.runTest(
          results,
          'adversarial-idempotency-payload-collision',
          'Adversarial Idempotency Payload Collision',
          ProviderCapability.ACTION_CREATE,
          true,
          async () => {
            let collisionError: unknown;
            try {
              // The quote, item and destination remain unchanged. Changing a
              // customer field proves the key is bound to the full request,
              // rather than merely to a quote or provider slug.
              await this.adapter.createAction!(createCertificationActionInput('Certification Collision Probe'));
            } catch (error) {
              collisionError = error;
            }

            if (!collisionError) {
              throw new Error('Idempotency payload collision was accepted and may create a different action.');
            }

            const code = this.errorCodeFor(collisionError);
            if (code !== 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD') {
              const received = code || (collisionError as any)?.message || String(collisionError);
              throw new Error(
                'Changed payload with the same idempotency key must return ' +
                `IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD; received ${received}.`
              );
            }
          },
          ['action-idempotency'],
          'LIFECYCLE_E2E'
        );
      }
    }

    // 8. Action Status Capability (MANDATORY)
    if (this.adapter.hasCapability(ProviderCapability.ACTION_STATUS) && this.adapter.getAction) {
      await this.runTest(results, 'action-status', 'Action Status Lookup', ProviderCapability.ACTION_STATUS, true, async () => {
        const fetched = await this.adapter.getAction!({
          providerSlug: this.adapter.providerSlug,
          actionId: createdActionId!
        });
        if (!fetched || !fetched.status) {
          throw new Error('Failed to retrieve action by ID or status field is missing.');
        }
        if (strict && (fetched.id !== createdAction?.id || fetched.providerSlug !== this.adapter.providerSlug ||
          fetched.quoteId !== testQuoteId || fetched.total !== createdAction?.total || fetched.currency !== createdAction?.currency)) {
          throw new Error('Action lookup must return the same provider, action, quote and financial amounts that were created.');
        }
      }, ['action-create'], 'LIFECYCLE_E2E');
    }

    // 9. Payment Options Capability (OPTIONAL)
    if (this.adapter.hasCapability(ProviderCapability.PAYMENT_OPTIONS) && this.adapter.getPaymentOptions) {
      await this.runTest(results, 'payment-options', 'Payment Options Discovery', ProviderCapability.PAYMENT_OPTIONS, false, async () => {
        const options = await this.adapter.getPaymentOptions!({
          providerSlug: this.adapter.providerSlug,
          actionId: createdActionId!
        });
        if (!Array.isArray(options) || options.length === 0) {
          throw new Error('Provider declared PAYMENT_OPTIONS but returned an empty array.');
        }
      }, ['action-create'], 'LIFECYCLE_E2E');
    }

    // 10. Action Cancel Capability (OPTIONAL)
    if (this.adapter.hasCapability(ProviderCapability.ACTION_CANCEL) && this.adapter.cancelAction) {
      await this.runTest(results, 'action-cancel', 'Action Cancellation Lifecycle', ProviderCapability.ACTION_CANCEL, false, async () => {
        const cancelRes = await this.adapter.cancelAction!({
          providerSlug: this.adapter.providerSlug,
          actionId: createdActionId!,
          reason: 'Automated certification test run completion'
        });
        if (!cancelRes || typeof cancelRes.success !== 'boolean') {
          throw new Error('Cancel action returned invalid response format.');
        }
      }, ['action-create'], 'LIFECYCLE_E2E');
    }

    // 11. Webhook Capability (MANDATORY)
    if (this.adapter.hasCapability(ProviderCapability.WEBHOOK)) {
      await this.runTest(results, 'webhook', 'Webhook HMAC Verification & Event Parsing', ProviderCapability.WEBHOOK, true, async () => {
        const testSecret = 'zy_test_webhook_secret_cert_123';
        const samplePayload = JSON.stringify({
          event: 'action.status_updated',
          actionId: createdActionId || 'ZY-CERT-12345',
          status: 'COMPLETED',
          timestamp: new Date().toISOString()
        });

        if (this.adapter.verifyWebhook) {
          // Valid signature test
          const validSig = crypto.createHmac('sha256', testSecret).update(samplePayload).digest('hex');
          const isValid = await this.adapter.verifyWebhook(
            { 'x-signature': validSig, 'x-provider': this.adapter.providerSlug },
            samplePayload,
            testSecret
          );
          if (!isValid) throw new Error('Webhook verification failed for a valid HMAC signature.');

          // Invalid signature rejection test
          const isInvalid = await this.adapter.verifyWebhook(
            { 'x-signature': 'invalid_forged_hmac_sig', 'x-provider': this.adapter.providerSlug },
            samplePayload,
            testSecret
          );
          if (isInvalid) throw new Error('Webhook verification must reject forged/invalid HMAC signatures.');
        }

        if (this.adapter.parseWebhookEvent) {
          const parsed = await this.adapter.parseWebhookEvent(
            { 'x-provider': this.adapter.providerSlug },
            samplePayload
          );
          if (!parsed.eventType || !parsed.providerSlug) {
            throw new Error('Parsed webhook event missing eventType or providerSlug.');
          }
        }
      }, [], 'CONTRACT_READINESS');
    }

    if (strict && this.adapter.hasCapability(ProviderCapability.QUOTE)) {
      const reject = (
        id: string,
        endpoint: '/quote' | '/actions' | '/actions/missing-certification-action',
        body: () => any,
        statuses = [400, 404, 409, 410, 422],
        deps = ['quote'],
        disallowedCodes?: string[]
      ) =>
        this.runTest(results, id, id.replace(/-/g, ' '), endpoint === '/quote' ? ProviderCapability.QUOTE : ProviderCapability.ACTION_CREATE,
          true, async () => {
            const resolvedBody = typeof body === 'function' ? await body() : body;
            await expectRemoteRejection(this.adapter, endpoint, resolvedBody, statuses, { auth: 'valid', disallowedCodes });
          }, deps, 'LIFECYCLE_E2E');
      for (const capability of ['QUOTE', 'ACTION_CREATE']) {
        if (!this.adapter.hasCapability(capability as ProviderCapability)) continue;
        await this.runTest(results, `required-fields-${capability}`, `${capability}: missing declared fields rejected upstream`, capability as ProviderCapability, true, async () => {
          let input = capability === 'QUOTE' ? quoteInput : createCertificationActionInput();
          const endpoint = capability === 'QUOTE' ? '/quote' : '/actions';
          if (capability === 'ACTION_CREATE' && this.adapter.requestQuote) {
            const freshQuote = await this.adapter.requestQuote(quoteInput);
            input = { ...input, quoteId: freshQuote.id };
          }
          for (const mutation of requiredInputMutations(providerInfo, input, capability, selectedTestOffering, testQuote)) {
            let probeInput = mutation.input;
            if (capability === 'ACTION_CREATE' && this.adapter.requestQuote) {
              const freshQuote = await this.adapter.requestQuote(quoteInput);
              probeInput = { ...probeInput, quoteId: freshQuote.id };
            }
            try {
              await expectRemoteRejection(this.adapter, endpoint, probeInput, [400, 422], {
                auth: 'valid',
                disallowedCodes: ['QUOTE_EXPIRED', 'QUOTE_NOT_FOUND', 'ACTION_NOT_CONFIRMED']
              });
            } catch (err: any) {
              throw new Error(`Provider must reject missing required field ${mutation.path}: ${err.message}`);
            }
          }
          for (const mutation of invalidParameterMutations(providerInfo, input, capability)) {
            let probeInput = mutation;
            if (capability === 'ACTION_CREATE' && this.adapter.requestQuote) {
              const freshQuote = await this.adapter.requestQuote(quoteInput);
              probeInput = { ...probeInput, quoteId: freshQuote.id };
            }
            await expectRemoteRejection(this.adapter, endpoint, probeInput, [400, 422], {
              auth: 'valid',
              disallowedCodes: ['QUOTE_EXPIRED', 'QUOTE_NOT_FOUND', 'ACTION_NOT_CONFIRMED']
            });
          }
        }, capability === 'QUOTE' ? ['quote'] : ['action-create'], 'LIFECYCLE_E2E');
      }
      if (!parameterOnly) {
        for (const quantity of [0, -1, 1.5]) {
          await reject(`upstream-quantity-${quantity}`, '/quote', () => ({ ...quoteInput, items: [{ ...quoteInput.items[0], quantity }] }), [400, 422]);
        }
        await reject('upstream-unknown-offering', '/quote', () => ({ ...quoteInput, items: [{ ...quoteInput.items[0], offeringId: crypto.randomUUID() }] }), [400, 404, 422]);
        if (selectedTestOffering?.variants?.length) {
          await reject('upstream-unknown-variant', '/quote', () => ({ ...quoteInput, items: [{ ...quoteInput.items[0], variantId: crypto.randomUUID() }] }), [400, 404, 422]);
        }
        if (selectedTestOffering?.optionGroups?.length) {
          await reject('upstream-unknown-option', '/quote', () => ({ ...quoteInput, items: [{ ...quoteInput.items[0], selectedOptions: [{ groupId: 'missing-group', optionId: 'missing-option', quantity: 1 }] }] }), [400, 404, 422]);
        }
      }
      if (this.adapter.hasCapability(ProviderCapability.ACTION_CREATE)) {
        const freshAction = async () => {
          let qId = testQuote?.id;
          if (this.adapter.requestQuote) {
            const q = await this.adapter.requestQuote(quoteInput);
            qId = q.id;
          }
          return { ...createCertificationActionInput(), idempotencyKey: crypto.randomUUID(), quoteId: qId };
        };
        await reject('upstream-unconfirmed-action', '/actions', async () => ({ ...(await freshAction()), userConfirmed: false }), [400, 422], ['action-create'], ['QUOTE_EXPIRED', 'QUOTE_NOT_FOUND']);
        await reject('upstream-unknown-quote', '/actions', async () => ({ ...(await freshAction()), quoteId: crypto.randomUUID() }), [400, 404, 409, 410, 422], ['action-create'], ['QUOTE_EXPIRED', 'ACTION_NOT_CONFIRMED']);

        // Idempotency collision probe: Same idempotency key with modified payload must be rejected with 409
        const baseAction = createCertificationActionInput();
        const mutatedIdempotencyPayload = {
          ...baseAction,
          idempotencyKey: testIdempKey,
          ...(parameterOnly
            ? { parameters: { ...(baseAction.parameters || {}), __idempotency_collision_probe: 'modified' } }
            : { customer: { ...(baseAction.customer || {}), name: 'Idempotency Collision Probe' } })
        };
        await reject('upstream-idempotency-collision', '/actions', () => mutatedIdempotencyPayload, [409], ['action-idempotency'], ['QUOTE_EXPIRED']);

        // Quote-to-action match probe: If items are changed without re-quoting, provider must reject
        if (!parameterOnly && quoteInput?.items?.length) {
          await reject('upstream-quote-action-mismatch', '/actions', async () => ({
            ...(await freshAction()),
            idempotencyKey: crypto.randomUUID(),
            items: [{ ...quoteInput.items[0], quantity: 99 }]
          }), [400, 409, 422], ['action-create'], ['QUOTE_EXPIRED']);
        }

        await this.runTest(results, 'upstream-expired-quote', 'Expired quote rejected upstream', ProviderCapability.ACTION_CREATE, true, async () => {
          const expiring = await this.adapter.requestQuote!(quoteInput);
          const remaining = Date.parse(expiring.expiresAt!) - Date.now();
          if (!Number.isFinite(remaining) || remaining < 0 || remaining > 5000) {
            throw new Error(`Certification quotes must expire within 5 seconds so expiry enforcement can be verified (got ${Math.round(remaining / 1000)}s).`);
          }
          await new Promise(resolve => setTimeout(resolve, remaining + 150));
          await expectRemoteRejection(this.adapter, '/actions', { ...(await freshAction()), quoteId: expiring.id }, [400, 409, 410, 422]);
        }, ['action-create'], 'LIFECYCLE_E2E');
        await reject('upstream-unknown-action', '/actions/missing-certification-action', () => undefined, [404], ['action-create']);
      }
    }

    if (strict && this.adapter.hasCapability(ProviderCapability.WEBHOOK)) {
      await this.runTest(results, 'webhook-delivery', 'Signed provider webhook received for this test action', ProviderCapability.WEBHOOK, true, async () => {
        const verify = runOptions.verifyWebhookDelivery || this.defaultOptions.verifyWebhookDelivery;
        if (!verify) throw new Error('Webhook delivery has not been observed. Local HMAC validation does not prove provider delivery.');
        const ids = [createdAction?.id, createdAction?.externalActionId, createdAction?.publicId].filter(Boolean);
        const evidence = await verify(ids, startedAt);
        if (!evidence?.eventId || !ids.includes(evidence.actionId) || !Object.values(ActionStatus).includes(evidence.status as ActionStatus)) {
          throw new Error('No verified action status webhook was received for the current certification action.');
        }
      }, ['action-create', 'webhook'], 'LIFECYCLE_E2E');
    }

    const passedCount = results.filter(r => r.status === 'PASS').length;
    const failedCount = results.filter(r => r.status === 'FAIL').length;
    const skippedCount = results.filter(r => r.status === 'SKIPPED').length;
    const hasBlockingResult = results.some(r => r.status === 'FAIL' || (r.status === 'SKIPPED' && r.isMandatory));
    const isCertified = results.length > 0 && !hasBlockingResult;
    const isProductionReady = strict && isCertified && missingMandatoryCapabilities.length === 0;
    const discoveryReasons: string[] = [];
    if (missingMandatoryCapabilities.includes(ProviderCapability.LOCATIONS)) {
      discoveryReasons.push('MISSING_LOCATIONS_CAPABILITY');
    }
    const locationsTest = results.find(result => result.testId === 'locations' || result.testId === 'discovery-readiness');
    if (locationRequired && locationsTest?.status !== 'PASS') {
      discoveryReasons.push('NO_VERIFIED_ACTIVE_LOCATIONS');
    }

    return {
      certificationVersion: CERTIFICATION_VERSION,
      scope: strict ? 'AUTOMATED_INTEGRATION' : 'DIAGNOSTIC',
      operationalReviewRequired: profile === 'TRANSACTIONAL',
      operationalReviewRequirements: profile === 'TRANSACTIONAL'
        ? ['ACTION_VISIBLE_IN_PROVIDER_SYSTEM', 'STAFF_ORDER_ACKNOWLEDGEMENT']
        : [],
      providerSlug: this.adapter.providerSlug,
      mode,
      totalTests: results.length,
      passedCount,
      failedCount,
      skippedCount,
      isCertified,
      isProductionReady,
      missingMandatoryCapabilities,
      capabilitiesTested: [...new Set(results.filter(result => result.status === 'PASS').map(result => result.capability))],
      profile,
      providerType: effectiveType,
      fulfillmentMode,
      discoveryReadiness: {
        isReady: (strict ? isProductionReady : isCertified) && discoveryReasons.length === 0,
        reasons: [...new Set(discoveryReasons)]
      },
      tests: results
    };
  }

  private inferErrorCode(raw: string): string {
    const value = raw.toLowerCase();
    if (value.includes('401') || value.includes('api key') || value.includes('unauthorized')) return 'PROVIDER_AUTH_FAILED';
    if (value.includes('404') || value.includes('not found') || value.includes('cannot get') || value.includes('cannot post')) return 'PROVIDER_ENDPOINT_NOT_FOUND';
    if (value.includes('timeout') || value.includes('fetch failed') || value.includes('econn')) return 'PROVIDER_UNREACHABLE';
    if (value.includes('math') || value.includes('subtotal') || value.includes('total')) return 'QUOTE_MATH_INVALID';
    return 'CERTIFICATION_ASSERTION_FAILED';
  }
}
