import crypto from 'node:crypto';
import {
  ProviderAdapter,
  ProviderCapability,
  MANDATORY_CAPABILITIES,
  OPTIONAL_CAPABILITIES,
  ProviderCapabilityProfile,
  ProviderFulfillmentMode,
  ProviderInfo,
  ProviderType,
  determineProviderCapabilityProfile,
  getMandatoryCapabilitiesForProfile,
  requiresActiveLocations,
  ActionStatus,
  PaymentMethodType,
  Offering,
  SelectedOption,
  PROVIDER_PROTOCOL_ENDPOINTS
} from '@zayuno/contracts';
import { ProviderContractValidationError } from './protocol-validation';

export type CertificationTestStatus = 'PASS' | 'FAIL' | 'SKIPPED';
export type CertificationTestStage = 'CONTRACT_READINESS' | 'LIFECYCLE_E2E';

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
  providerSlug: string;
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

  constructor(adapter: ProviderAdapter) {
    this.adapter = adapter;
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
      results.some(result => result.testId === dependency && result.status !== 'PASS')
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
        docsUrl: endpoint ? `https://developers.zayuno.uz/?doc=provider-integration#${endpoint.docsAnchor}` : undefined,
        blockedBy,
        error: `Oldingi asosiy test muvaffaqiyatsiz: ${blockedBy.join(', ')}`,
        issue: {
          code: 'DEPENDENCY_FAILED',
          endpoint: endpoint ? `${endpoint.method} ${endpoint.path}` : undefined,
          docsUrl: endpoint ? `https://developers.zayuno.uz/?doc=provider-integration#${endpoint.docsAnchor}` : undefined,
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
        docsUrl: endpoint ? `https://developers.zayuno.uz/?doc=provider-integration#${endpoint.docsAnchor}` : undefined,
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
            docsUrl: ci.docsUrl || (endpoint ? `https://developers.zayuno.uz/?doc=provider-integration#${endpoint.docsAnchor}` : undefined),
            rootCause: ci.message,
            fixExample: ci.fixExample
          }))
        : undefined;

      const primaryIssue: CertificationIssue = issues && issues.length
        ? issues[0]
        : {
            code: this.inferErrorCode(rawError),
            endpoint: endpoint ? `${endpoint.method} ${endpoint.path}` : undefined,
            docsUrl: endpoint ? `https://developers.zayuno.uz/?doc=provider-integration#${endpoint.docsAnchor}` : undefined,
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

  async runAllTests(): Promise<CertificationReport> {
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
      }, [], 'CONTRACT_READINESS');
    }

    const fulfillmentMode = providerInfo?.fulfillmentMode ||
      (providerInfo?.metadata?.fulfillmentMode as ProviderFulfillmentMode | undefined);
    mandatoryForProfile = getMandatoryCapabilitiesForProfile(declaredCaps, {
      type: providerInfo?.type,
      fulfillmentMode
    });
    const missingMandatoryCapabilities = mandatoryForProfile.filter(
      cap => !this.adapter.hasCapability(cap)
    );

    const locationRequired = requiresActiveLocations(providerInfo?.type, fulfillmentMode);
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
        docsUrl: 'https://developers.zayuno.uz/?doc=provider-integration#contract-locations',
        error: 'Jismoniy xizmat uchun LOCATIONS majburiy',
        issue: {
          code: 'MISSING_REQUIRED_LOCATIONS',
          endpoint: 'GET /locations',
          path: 'capabilities.LOCATIONS',
          expected: 'LOCATIONS capability and at least one active location',
          received: 'LOCATIONS capability is not declared',
          docsUrl: 'https://developers.zayuno.uz/?doc=provider-integration#contract-locations',
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
    let selectedTestOffering: Offering | undefined;
    let selectedTestVariantId: string | undefined;
    let selectedTestOptions: SelectedOption[] = [];

    if (this.adapter.hasCapability(ProviderCapability.CATALOG) && this.adapter.getCatalog) {
      await this.runTest(results, 'catalog', 'Catalog Structure & Offerings', ProviderCapability.CATALOG, true, async () => {
        const catalog = await this.adapter.getCatalog!({ providerSlug: this.adapter.providerSlug, locationId: testLocationId });
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
          const defaultVariant = availableVariants.find(v => (v as any).isDefault) || availableVariants[0] || selectedTestOffering.variants[0];
          selectedTestVariantId = defaultVariant.id;
        }

        // If offering has required option groups, deterministically select valid options
        selectedTestOptions = [];
        if (selectedTestOffering.optionGroups && selectedTestOffering.optionGroups.length > 0) {
          for (const group of selectedTestOffering.optionGroups) {
            if (group.isRequired || (group.minSelections && group.minSelections > 0)) {
              const availableOpts = group.options.filter(o => o.isAvailable !== false);
              const defaultOpt = availableOpts.find(o => (o as any).isDefault) || availableOpts[0] || group.options[0];
              if (defaultOpt) {
                selectedTestOptions.push({
                  groupId: group.id,
                  optionId: defaultOpt.id,
                  quantity: 1
                });
              }
            }
          }
        }
      }, [], 'CONTRACT_READINESS');
    }

    // 4b. Single Offering Lookup (MANDATORY with Catalog)
    if (this.adapter.hasCapability(ProviderCapability.CATALOG) && this.adapter.getOffering) {
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

    // 6. Quote Capability (MANDATORY)
    let testQuoteId: string | undefined;
    if (this.adapter.hasCapability(ProviderCapability.QUOTE) && this.adapter.requestQuote) {
      await this.runTest(results, 'quote', 'Verified Quote Pricing & Math', ProviderCapability.QUOTE, true, async () => {
        const testOfferingId = selectedTestOffering!.id || selectedTestOffering!.offeringCode;
        const quote = await this.adapter.requestQuote!({
          providerSlug: this.adapter.providerSlug,
          locationId: testLocationId,
          items: [{
            offeringId: testOfferingId,
            variantId: selectedTestVariantId,
            quantity: 2,
            selectedOptions: selectedTestOptions
          }]
        });

        if (quote.total <= 0) throw new Error('Quote total must be a positive number.');
        if (!quote.lines || quote.lines.length === 0) throw new Error('Quote must return itemized lines breakdown.');

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
        const calculatedLinesTotal = quote.lines.reduce((sum, line) => sum + Number(line.lineTotal || (line as any).total || 0), 0);
        if (Math.abs(calculatedLinesTotal - subtotal) > 0.01) {
          throw new Error(`Quote lines math mismatch: sum of line totals (${calculatedLinesTotal}) does not match subtotal (${subtotal}).`);
        }

        if (quote.expiresAt) {
          const exp = new Date(quote.expiresAt).getTime();
          if (isNaN(exp) || exp <= Date.now()) {
            throw new Error('Quote expiresAt must be a valid timestamp in the future.');
          }
        }

        testQuoteId = quote.id;
      }, ['catalog'], 'LIFECYCLE_E2E');
    }

    // 7. Action Create & Payment Handoff (MANDATORY)
    let createdActionId: string | undefined;
    const testIdempKey = `cert_idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (this.adapter.hasCapability(ProviderCapability.ACTION_CREATE) && this.adapter.createAction) {
      await this.runTest(results, 'action-create', 'Action Creation & Payment Handoff', ProviderCapability.ACTION_CREATE, true, async () => {
        const testOfferingId = selectedTestOffering!.id || selectedTestOffering!.offeringCode;
        const action = await this.adapter.createAction!({
          idempotencyKey: testIdempKey,
          providerSlug: this.adapter.providerSlug,
          quoteId: testQuoteId!,
          locationId: testLocationId,
          customer: {
            name: 'Certification Validator',
            phone: '+998901234567'
          },
          destination: {
            raw: 'Central Validation Zone, District 1'
          },
          items: [{
            offeringId: testOfferingId,
            variantId: selectedTestVariantId,
            quantity: 2,
            selectedOptions: selectedTestOptions
          }],
          userConfirmed: true
        });

        if (!action.id && !action.externalActionId) {
          throw new Error('Action creation must return a valid ID or externalActionId.');
        }
        createdActionId = action.id || action.externalActionId;

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
        const testOfferingId = selectedTestOffering!.id || selectedTestOffering!.offeringCode;
        const dupAction = await this.adapter.createAction!({
          idempotencyKey: testIdempKey,
          providerSlug: this.adapter.providerSlug,
          quoteId: testQuoteId!,
          customer: {
            name: 'Certification Validator',
            phone: '+998901234567'
          },
          items: [{
            offeringId: testOfferingId,
            variantId: selectedTestVariantId,
            quantity: 2,
            selectedOptions: selectedTestOptions
          }],
          userConfirmed: true
        });

        const originalId = createdActionId;
        const dupId = dupAction.id || dupAction.externalActionId;
        if (originalId !== dupId) {
          throw new Error(`Idempotency failure: duplicate creation generated new ID (${dupId}) instead of returning original (${originalId}).`);
        }
      }, ['action-create'], 'LIFECYCLE_E2E');
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
      }, [], 'LIFECYCLE_E2E');
    }

    const passedCount = results.filter(r => r.status === 'PASS').length;
    const failedCount = results.filter(r => r.status === 'FAIL').length;
    const skippedCount = results.filter(r => r.status === 'SKIPPED').length;
    const hasBlockingResult = results.some(r => r.status === 'FAIL' || (r.status === 'SKIPPED' && r.isMandatory));
    const isCertified = results.length > 0 && !hasBlockingResult;
    const isProductionReady = isCertified && missingMandatoryCapabilities.length === 0;
    const discoveryReasons: string[] = [];
    if (missingMandatoryCapabilities.includes(ProviderCapability.LOCATIONS)) {
      discoveryReasons.push('MISSING_LOCATIONS_CAPABILITY');
    }
    const locationsTest = results.find(result => result.testId === 'locations' || result.testId === 'discovery-readiness');
    if (locationRequired && locationsTest?.status !== 'PASS') {
      discoveryReasons.push('NO_VERIFIED_ACTIVE_LOCATIONS');
    }

    return {
      providerSlug: this.adapter.providerSlug,
      totalTests: results.length,
      passedCount,
      failedCount,
      skippedCount,
      isCertified,
      isProductionReady,
      missingMandatoryCapabilities,
      capabilitiesTested: declaredCaps,
      profile,
      providerType: providerInfo?.type,
      fulfillmentMode,
      discoveryReadiness: {
        isReady: isProductionReady && discoveryReasons.length === 0,
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
