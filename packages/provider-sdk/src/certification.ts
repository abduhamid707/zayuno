import {
  ProviderAdapter,
  ProviderCapability,
  MANDATORY_CAPABILITIES,
  OPTIONAL_CAPABILITIES,
  ActionStatus,
  PaymentMethodType
} from '@zayuno/contracts';

export interface CertificationTestResult {
  name: string;
  capability: ProviderCapability;
  isMandatory: boolean;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: any;
}

export interface CertificationReport {
  providerSlug: string;
  totalTests: number;
  passedCount: number;
  failedCount: number;
  isCertified: boolean;
  isProductionReady: boolean;
  missingMandatoryCapabilities: ProviderCapability[];
  capabilitiesTested: ProviderCapability[];
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

  async runAllTests(): Promise<CertificationReport> {
    const results: CertificationTestResult[] = [];
    const declaredCaps = this.adapter.getCapabilities();

    // Check which mandatory capabilities are missing
    const missingMandatoryCapabilities = MANDATORY_CAPABILITIES.filter(
      cap => !this.adapter.hasCapability(cap)
    );

    // 1. Metadata Capability (MANDATORY)
    if (this.adapter.hasCapability(ProviderCapability.METADATA) && this.adapter.getProviderInfo) {
      await this.runTest(results, 'Provider Metadata Verification', ProviderCapability.METADATA, true, async () => {
        const info = await this.adapter.getProviderInfo!();
        if (!info.slug || !info.name) throw new Error('Invalid provider info: missing slug or name.');
        if (info.slug.toLowerCase().trim() !== this.adapter.providerSlug.toLowerCase().trim()) {
          throw new Error(`Provider slug mismatch: expected "${this.adapter.providerSlug}" but remote API returned "${info.slug}".`);
        }
        if (!info.capabilities || info.capabilities.length === 0) throw new Error('Provider must advertise at least one capability.');
        if (!info.status) throw new Error('Provider info missing status field.');
      });
    }

    // 2. Health Capability (MANDATORY)
    if (this.adapter.hasCapability(ProviderCapability.HEALTH) && this.adapter.checkHealth) {
      await this.runTest(results, 'Health Check Protocol', ProviderCapability.HEALTH, true, async () => {
        const health = await this.adapter.checkHealth!();
        if (!health.status || !['HEALTHY', 'DEGRADED', 'DOWN'].includes(health.status)) {
          throw new Error('Invalid health status response.');
        }
        if (typeof health.latencyMs !== 'number') {
          throw new Error('Health check must report latencyMs.');
        }
      });
    }

    // 3. Locations Capability (OPTIONAL)
    let testLocationId: string | undefined;
    if (this.adapter.hasCapability(ProviderCapability.LOCATIONS) && this.adapter.getLocations) {
      await this.runTest(results, 'Locations & Facilities Query', ProviderCapability.LOCATIONS, false, async () => {
        const locations = await this.adapter.getLocations!({ providerSlug: this.adapter.providerSlug });
        if (!Array.isArray(locations) || locations.length === 0) {
          throw new Error('Provider declared LOCATIONS but returned an empty list.');
        }
        testLocationId = locations[0].id || locations[0].providerLocationId;
        if (!locations[0].name || !locations[0].address) {
          throw new Error('Location object missing required name or address.');
        }
      });
    }

    // 4. Catalog Capability (MANDATORY)
    let testOfferingId: string | undefined;
    if (this.adapter.hasCapability(ProviderCapability.CATALOG) && this.adapter.getCatalog) {
      await this.runTest(results, 'Catalog Structure & Offerings', ProviderCapability.CATALOG, true, async () => {
        const catalog = await this.adapter.getCatalog!({ providerSlug: this.adapter.providerSlug, locationId: testLocationId });
        if (!catalog.offerings || catalog.offerings.length === 0) throw new Error('Catalog has no offerings.');
        testOfferingId = catalog.offerings[0].id || catalog.offerings[0].offeringCode;

        if (this.adapter.getOffering && testOfferingId) {
          const singleOffering = await this.adapter.getOffering({
            providerSlug: this.adapter.providerSlug,
            offeringId: testOfferingId
          });
          if (!singleOffering || singleOffering.basePrice < 0) {
            throw new Error('Failed to retrieve single offering by ID or basePrice is invalid.');
          }
        }
      });
    }

    // 5. Search Capability (OPTIONAL)
    if (this.adapter.hasCapability(ProviderCapability.SEARCH) && this.adapter.searchOfferings) {
      await this.runTest(results, 'Catalog Search Indexing', ProviderCapability.SEARCH, false, async () => {
        const searchRes = await this.adapter.searchOfferings!({
          providerSlug: this.adapter.providerSlug,
          query: 'standard',
          limit: 5
        });
        if (!Array.isArray(searchRes)) throw new Error('Search result must be an array of offerings.');
      });
    }

    // 6. Quote Capability (MANDATORY)
    let testQuoteId: string | undefined;
    if (this.adapter.hasCapability(ProviderCapability.QUOTE) && this.adapter.requestQuote && testOfferingId) {
      await this.runTest(results, 'Verified Quote Pricing', ProviderCapability.QUOTE, true, async () => {
        const quote = await this.adapter.requestQuote!({
          providerSlug: this.adapter.providerSlug,
          locationId: testLocationId,
          items: [{ offeringId: testOfferingId!, quantity: 2, selectedOptions: [] }]
        });
        if (quote.total <= 0) throw new Error('Quote total must be a positive number.');
        if (!quote.lines || quote.lines.length === 0) throw new Error('Quote must return itemized lines breakdown.');
        testQuoteId = quote.id;
      });
    }

    // 7. Action Create & Payment Handoff (MANDATORY)
    let createdActionId: string | undefined;
    const testIdempKey = `cert_idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (this.adapter.hasCapability(ProviderCapability.ACTION_CREATE) && this.adapter.createAction && testOfferingId) {
      await this.runTest(results, 'Action Creation & Payment Handoff', ProviderCapability.ACTION_CREATE, true, async () => {
        const quoteId = testQuoteId;
        if (!quoteId) throw new Error('Action certification requires a successfully verified quote.');
        const action = await this.adapter.createAction!({
          idempotencyKey: testIdempKey,
          providerSlug: this.adapter.providerSlug,
          quoteId,
          locationId: testLocationId,
          customer: {
            name: 'Certification Validator',
            phone: '+998901234567'
          },
          destination: {
            raw: 'Central Validation Zone, District 1'
          },
          items: [{ offeringId: testOfferingId!, quantity: 2, selectedOptions: [] }],
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
      });

      // 7b. Idempotency Validation (MANDATORY)
      await this.runTest(results, 'Action Idempotency Protection', ProviderCapability.ACTION_CREATE, true, async () => {
        const quoteId = testQuoteId;
        if (!quoteId) throw new Error('Idempotency certification requires a successfully verified quote.');
        const dupAction = await this.adapter.createAction!({
          idempotencyKey: testIdempKey,
          providerSlug: this.adapter.providerSlug,
          quoteId,
          customer: {
            name: 'Certification Validator',
            phone: '+998901234567'
          },
          items: [{ offeringId: testOfferingId!, quantity: 2, selectedOptions: [] }],
          userConfirmed: true
        });

        const originalId = createdActionId;
        const dupId = dupAction.id || dupAction.externalActionId;
        if (originalId !== dupId) {
          throw new Error(`Idempotency failure: duplicate creation generated new ID (${dupId}) instead of returning original (${originalId}).`);
        }
      });
    }

    // 8. Action Status Capability (MANDATORY)
    if (this.adapter.hasCapability(ProviderCapability.ACTION_STATUS) && this.adapter.getAction && createdActionId) {
      await this.runTest(results, 'Action Status Lookup', ProviderCapability.ACTION_STATUS, true, async () => {
        const fetched = await this.adapter.getAction!({
          providerSlug: this.adapter.providerSlug,
          actionId: createdActionId!
        });
        if (!fetched || !fetched.status) {
          throw new Error('Failed to retrieve action by ID or status field is missing.');
        }
      });
    }

    // 9. Payment Options Capability (OPTIONAL)
    if (this.adapter.hasCapability(ProviderCapability.PAYMENT_OPTIONS) && this.adapter.getPaymentOptions && createdActionId) {
      await this.runTest(results, 'Payment Options Discovery', ProviderCapability.PAYMENT_OPTIONS, false, async () => {
        const options = await this.adapter.getPaymentOptions!({
          providerSlug: this.adapter.providerSlug,
          actionId: createdActionId!
        });
        if (!Array.isArray(options) || options.length === 0) {
          throw new Error('Provider declared PAYMENT_OPTIONS but returned an empty array.');
        }
      });
    }

    // 10. Action Cancel Capability (OPTIONAL)
    if (this.adapter.hasCapability(ProviderCapability.ACTION_CANCEL) && this.adapter.cancelAction && createdActionId) {
      await this.runTest(results, 'Action Cancellation Lifecycle', ProviderCapability.ACTION_CANCEL, false, async () => {
        const cancelRes = await this.adapter.cancelAction!({
          providerSlug: this.adapter.providerSlug,
          actionId: createdActionId!,
          reason: 'Automated certification test run completion'
        });
        if (!cancelRes || typeof cancelRes.success !== 'boolean') {
          throw new Error('Cancel action returned invalid response format.');
        }
      });
    }

    // 11. Webhook Capability (MANDATORY)
    if (this.adapter.hasCapability(ProviderCapability.WEBHOOK)) {
      await this.runTest(results, 'Webhook HMAC Verification & Event Parsing', ProviderCapability.WEBHOOK, true, async () => {
        const testSecret = 'zy_test_webhook_secret_cert_123';
        const samplePayload = JSON.stringify({
          event: 'action.status_updated',
          actionId: createdActionId || 'ZY-CERT-12345',
          status: 'COMPLETED',
          timestamp: new Date().toISOString()
        });

        if (this.adapter.verifyWebhook) {
          // Valid signature test
          const crypto = await import('crypto');
          const validSig = crypto.createHmac('sha256', testSecret).update(samplePayload).digest('hex');
          const isValid = await this.adapter.verifyWebhook(
            { 'x-signature': validSig, 'x-provider': this.adapter.providerSlug },
            samplePayload,
            testSecret
          );
          if (!isValid) throw new Error('Webhook verification failed for a valid HMAC signature.');

          // Invalid signature rejection test
          const isInvalid = await this.adapter.verifyWebhook(
            { 'x-signature': 'invalid_hmac_sig', 'x-provider': this.adapter.providerSlug },
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
      });
    }

    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;
    const isCertified = results.length > 0 && failedCount === 0;
    const isProductionReady = isCertified && missingMandatoryCapabilities.length === 0;

    return {
      providerSlug: this.adapter.providerSlug,
      totalTests: results.length,
      passedCount,
      failedCount,
      isCertified,
      isProductionReady,
      missingMandatoryCapabilities,
      capabilitiesTested: declaredCaps,
      tests: results
    };
  }

  private async runTest(
    results: CertificationTestResult[],
    name: string,
    capability: ProviderCapability,
    isMandatory: boolean,
    testFn: () => Promise<void>
  ): Promise<void> {
    const start = Date.now();
    try {
      await testFn();
      results.push({
        name,
        capability,
        isMandatory,
        passed: true,
        durationMs: Date.now() - start
      });
    } catch (err: any) {
      results.push({
        name,
        capability,
        isMandatory,
        passed: false,
        durationMs: Date.now() - start,
        error: err.message || String(err),
        details: err
      });
    }
  }
}
