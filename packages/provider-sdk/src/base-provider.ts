import {
  ProviderAdapter,
  ProviderCapability,
  ProviderInfo,
  HealthCheckResult,
  Location,
  GetLocationsInput,
  Catalog,
  GetCatalogInput,
  Offering,
  GetOfferingInput,
  SearchCatalogInput,
  CheckAvailabilityInput,
  AvailabilityResult,
  RequestQuoteInput,
  NormalizedQuote,
  CreateActionInput,
  NormalizedAction,
  GetActionInput,
  CancelActionInput,
  CancelActionResult,
  GetPaymentOptionsInput,
  PaymentOption,
  NormalizedWebhookEvent
} from '@zayuno/contracts';
import { verifyHmacSignature } from '@zayuno/shared';
import { CapabilityNotSupportedError } from './errors';

export interface ProviderAdapterConfig {
  slug: string;
  baseUrl?: string;
  secret?: string;
  webhookSecret?: string;
  timeoutMs?: number;
  config?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Composable Base Provider Adapter.
 * External provider developers or internal integrations extend this class
 * and implement only the capabilities supported by their system.
 */
export abstract class BaseProviderAdapter implements ProviderAdapter {
  readonly providerSlug: string;
  protected readonly config: ProviderAdapterConfig;
  protected readonly capabilities: Set<ProviderCapability>;

  constructor(config: ProviderAdapterConfig, capabilities: ProviderCapability[] = []) {
    this.providerSlug = config.slug;
    this.config = config;
    this.capabilities = new Set(capabilities);
  }

  getCapabilities(): ProviderCapability[] {
    return Array.from(this.capabilities);
  }

  hasCapability(capability: ProviderCapability): boolean {
    return this.capabilities.has(capability);
  }

  protected assertCapability(capability: ProviderCapability): void {
    if (!this.hasCapability(capability)) {
      throw new CapabilityNotSupportedError(this.providerSlug, capability);
    }
  }

  // 1. Metadata Capability
  async getProviderInfo(): Promise<ProviderInfo> {
    this.assertCapability(ProviderCapability.METADATA);
    throw new Error('getProviderInfo not implemented');
  }

  // 2. Health Capability
  async checkHealth(): Promise<HealthCheckResult> {
    return {
      status: 'HEALTHY',
      latencyMs: 1,
      timestamp: new Date().toISOString()
    };
  }

  // 3. Locations Capability
  async getLocations(input?: GetLocationsInput): Promise<Location[]> {
    this.assertCapability(ProviderCapability.LOCATIONS);
    throw new Error('getLocations not implemented');
  }

  // 4. Catalog Capability
  async getCatalog(input: GetCatalogInput): Promise<Catalog> {
    this.assertCapability(ProviderCapability.CATALOG);
    throw new Error('getCatalog not implemented');
  }

  async getOffering(input: GetOfferingInput): Promise<Offering> {
    this.assertCapability(ProviderCapability.CATALOG);
    throw new Error('getOffering not implemented');
  }

  async checkAvailability(input: CheckAvailabilityInput): Promise<AvailabilityResult> {
    this.assertCapability(ProviderCapability.CATALOG);
    return {
      isAvailable: true,
      unavailableItems: [],
      availableItems: input.items.map(item => ({
        offeringId: item.offeringId,
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        metadata: {}
      })),
      parameters: input.parameters || {}
    };
  }

  // 5. Search Capability
  async searchOfferings(input: SearchCatalogInput): Promise<Offering[]> {
    this.assertCapability(ProviderCapability.SEARCH);
    throw new Error('searchOfferings not implemented');
  }

  // 6. Quote Capability
  async requestQuote(input: RequestQuoteInput): Promise<NormalizedQuote> {
    this.assertCapability(ProviderCapability.QUOTE);
    throw new Error('requestQuote not implemented');
  }

  // 7. Action Create Capability
  async createAction(input: CreateActionInput): Promise<NormalizedAction> {
    this.assertCapability(ProviderCapability.ACTION_CREATE);
    throw new Error('createAction not implemented');
  }

  // 8. Action Status Capability
  async getAction(input: GetActionInput): Promise<NormalizedAction> {
    this.assertCapability(ProviderCapability.ACTION_STATUS);
    throw new Error('getAction not implemented');
  }

  // 9. Action Cancel Capability
  async cancelAction(input: CancelActionInput): Promise<CancelActionResult> {
    this.assertCapability(ProviderCapability.ACTION_CANCEL);
    throw new Error('cancelAction not implemented');
  }

  // 10. Payment Options Capability
  async getPaymentOptions(input: GetPaymentOptionsInput): Promise<PaymentOption[]> {
    this.assertCapability(ProviderCapability.PAYMENT_OPTIONS);
    throw new Error('getPaymentOptions not implemented');
  }

  // 11. Webhook Capability
  async verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
    secret: string
  ): Promise<boolean> {
    const signature = (headers['x-signature'] || headers['x-zayuno-signature'] || headers['x-provider-signature'] || '') as string;
    if (!signature) return false;
    return verifyHmacSignature(rawBody, signature, secret || this.config.webhookSecret || '');
  }

  async parseWebhookEvent(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | any
  ): Promise<NormalizedWebhookEvent> {
    this.assertCapability(ProviderCapability.WEBHOOK);
    throw new Error('parseWebhookEvent not implemented');
  }
}
