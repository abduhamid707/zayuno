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
import { BaseProviderAdapter, ProviderAdapterConfig } from './base-provider';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Universal Remote HTTP Provider Adapter.
 * Connects Zayuno Core to any external third-party provider's HTTPS backend.
 */
export class RemoteHttpProviderAdapter extends BaseProviderAdapter {
  private targetUrl: string;

  constructor(config: ProviderAdapterConfig) {
    const declaredCaps = (config.metadata?.capabilities || config.config?.capabilities || [
      ProviderCapability.METADATA,
      ProviderCapability.HEALTH,
      ProviderCapability.CATALOG,
      ProviderCapability.QUOTE,
      ProviderCapability.ACTION_CREATE,
      ProviderCapability.ACTION_STATUS,
      ProviderCapability.WEBHOOK
    ]) as ProviderCapability[];

    super(config, declaredCaps);
    this.targetUrl = this.validateBaseUrl(config.baseUrl || '');
  }

  private validateBaseUrl(value: string): string {
    const normalized = value.replace(/\/+$/, '');
    if (!normalized) return normalized;
    let url: URL;
    try { url = new URL(normalized); } catch { throw new Error('Provider baseUrl must be a valid absolute HTTPS URL.'); }
    const host = url.hostname.toLowerCase();
    const isPrivate = this.isPrivateAddress(host);
    if (process.env.NODE_ENV === 'production' && (url.protocol !== 'https:' || isPrivate)) {
      throw new Error('Provider baseUrl must be public HTTPS and must not target private or loopback networks.');
    }
    return normalized;
  }

  private isPrivateAddress(address: string): boolean {
    const value = address.toLowerCase();
    return value === 'localhost' || value === '::1' || value === '0.0.0.0' ||
      /^127\./.test(value) || /^10\./.test(value) || /^192\.168\./.test(value) ||
      /^169\.254\./.test(value) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
      value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe80:') ||
      value.startsWith('::ffff:127.') || value.startsWith('::ffff:10.') ||
      value.startsWith('::ffff:192.168.') || value.startsWith('::ffff:169.254.') ||
      /^::ffff:172\.(1[6-9]|2\d|3[0-1])\./.test(value);
  }

  private async assertResolvedAddressIsPublic(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    const host = new URL(this.targetUrl).hostname;
    if (isIP(host)) return;
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => this.isPrivateAddress(address))) {
      throw new Error('Provider baseUrl resolves to a private, loopback, or link-local network address.');
    }
  }

  private async callRemote<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.targetUrl) {
      throw new Error(`Provider "${this.providerSlug}" has no baseUrl configured.`);
    }

    const url = `${this.targetUrl}${endpoint}`;
    await this.assertResolvedAddressIsPublic();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-provider-api-key': this.config.secret || '',
      ...(options.headers as any || {})
    };

    const res = await fetch(url, {
      ...options,
      headers,
      // A public HTTPS endpoint must not be able to redirect this server to a
      // private address after the initial URL validation.
      redirect: 'error'
    });

    if (!res.ok) {
      let errBody: any;
      try {
        errBody = await res.json();
      } catch {
        errBody = await res.text();
      }
      throw new Error(`Remote Provider HTTP [${res.status}]: ${typeof errBody === 'object' ? errBody.message || JSON.stringify(errBody) : errBody}`);
    }

    return (await res.json()) as T;
  }

  async getProviderInfo(): Promise<ProviderInfo> {
    return this.callRemote<ProviderInfo>('/provider-info');
  }

  async checkHealth(): Promise<HealthCheckResult> {
    return this.callRemote<HealthCheckResult>('/health');
  }

  async getLocations(input?: GetLocationsInput): Promise<Location[]> {
    const query = input?.activeOnly !== undefined ? `?activeOnly=${input.activeOnly}` : '';
    return this.callRemote<Location[]>(`/locations${query}`);
  }

  async getCatalog(input: GetCatalogInput): Promise<Catalog> {
    const params = new URLSearchParams();
    if (input.locationId) params.append('locationId', input.locationId);
    if (input.categorySlug) params.append('category', input.categorySlug);
    if (input.parameters) params.append('context', JSON.stringify(input.parameters));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.callRemote<Catalog>(`/catalog${query}`);
  }

  async getOffering(input: GetOfferingInput): Promise<Offering> {
    const params = new URLSearchParams();
    if (input.locationId) params.append('locationId', input.locationId);
    if (input.parameters) params.append('context', JSON.stringify(input.parameters));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.callRemote<Offering>(`/offerings/${encodeURIComponent(input.offeringId)}${query}`);
  }

  async searchOfferings(input: SearchCatalogInput): Promise<Offering[]> {
    const params = new URLSearchParams({ q: input.query });
    if (input.limit) params.append('limit', String(input.limit));
    if (input.categorySlug) params.append('category', input.categorySlug);
    if (input.locationId) params.append('locationId', input.locationId);
    if (input.parameters) params.append('context', JSON.stringify(input.parameters));
    return this.callRemote<Offering[]>(`/search?${params.toString()}`);
  }

  async checkAvailability(input: CheckAvailabilityInput): Promise<AvailabilityResult> {
    try {
      return await this.callRemote<AvailabilityResult>('/availability', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch (error) {
      // `/availability` predates some otherwise valid Provider Contract v1
      // implementations. Preserve their old optimistic behavior only for an
      // explicit 404; authentication, timeout, and provider errors still fail.
      if (error instanceof Error && error.message.includes('Remote Provider HTTP [404]')) {
        return {
          isAvailable: true,
          unavailableItems: [],
          availableItems: input.items.map(item => ({
            offeringId: item.offeringId,
            variantId: item.variantId,
            requestedQuantity: item.quantity,
            metadata: { availabilityEndpointImplemented: false }
          })),
          checkedAt: new Date().toISOString(),
          parameters: { availabilityEndpointImplemented: false }
        };
      }
      throw error;
    }
  }

  async requestQuote(input: RequestQuoteInput): Promise<NormalizedQuote> {
    return this.callRemote<NormalizedQuote>('/quote', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async createAction(input: CreateActionInput): Promise<NormalizedAction> {
    return this.callRemote<NormalizedAction>('/actions', {
      method: 'POST',
      headers: {
        'idempotency-key': input.idempotencyKey
      },
      body: JSON.stringify(input)
    });
  }

  async getAction(input: GetActionInput): Promise<NormalizedAction> {
    return this.callRemote<NormalizedAction>(`/actions/${input.actionId}`);
  }

  async cancelAction(input: CancelActionInput): Promise<CancelActionResult> {
    return this.callRemote<CancelActionResult>(`/actions/${input.actionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async getPaymentOptions(input: GetPaymentOptionsInput): Promise<PaymentOption[]> {
    return this.callRemote<PaymentOption[]>(`/actions/${input.actionId}/payment-options`);
  }

  async parseWebhookEvent(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string | any
  ): Promise<NormalizedWebhookEvent> {
    const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    return {
      eventId: body.eventId || `evt_${Date.now()}`,
      eventType: body.eventType || 'action.status_updated',
      providerSlug: this.providerSlug,
      actionId: body.actionId,
      externalActionId: body.externalActionId,
      newStatus: body.newStatus,
      newPaymentStatus: body.newPaymentStatus,
      timestamp: body.timestamp || new Date().toISOString(),
      description: body.description || 'Status update received from remote provider',
      payload: body.payload || body
    };
  }
}
