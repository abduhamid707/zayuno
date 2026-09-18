import {
  ProviderAdapter,
  ProviderCapability,
  ProviderInfo,
  ProviderFulfillmentMode,
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
  AvailabilityStatus,
  RequestQuoteInput,
  NormalizedQuote,
  CreateActionInput,
  NormalizedAction,
  GetActionInput,
  CancelActionInput,
  CancelActionResult,
  GetPaymentOptionsInput,
  PaymentOption,
  NormalizedWebhookEvent,
  ProviderInfoSchema,
  HealthCheckResultSchema,
  LocationSchema,
  CatalogSchema,
  OfferingSchema,
  AvailabilityResultSchema,
  NormalizedQuoteSchema,
  NormalizedActionSchema,
  CancelActionResultSchema,
  PaymentOptionSchema,
  RequestQuoteInputSchema,
  CreateActionInputSchema,
  GetActionInputSchema,
  CancelActionInputSchema,
  findForbiddenParameterKey
} from '@zayuno/contracts';
import { BaseProviderAdapter, ProviderAdapterConfig } from './base-provider';
import {
  normalizeLegacyPaymentOptionsResponse,
  normalizeLegacyQuoteResponse,
  validateProviderResponse,
  ProviderContractValidationError
} from './protocol-validation';
import { z } from 'zod';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import crypto from 'node:crypto';
import { normalizeZayunoErrorCode } from '@zayuno/shared';
import { ProviderError } from './errors';

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
    try { url = new URL(normalized); } catch { throw new Error('Provider baseUrl must be a valid absolute URL.'); }
    const host = url.hostname.toLowerCase();
    const isPrivate = this.isPrivateAddress(host);
    const isInternalDockerHost = /^[a-z0-9-_]+$/i.test(host) && !host.includes('.');
    const allowInternal = process.env.ALLOW_INTERNAL_PROVIDERS === 'true' || isInternalDockerHost;

    if (process.env.NODE_ENV === 'production') {
      if (isInternalDockerHost && allowInternal) {
        return normalized;
      }
      if (url.protocol !== 'https:' || isPrivate) {
        throw new Error('Provider baseUrl must be public HTTPS and must not target private or loopback networks.');
      }
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
    const isInternalDockerHost = /^[a-z0-9-_]+$/i.test(host) && !host.includes('.');
    if (isInternalDockerHost) return;
    if (isIP(host)) return;
    const addresses = await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some(({ address }) => this.isPrivateAddress(address))) {
      throw new Error('Provider baseUrl resolves to a private, loopback, or link-local network address.');
    }
  }

  private requestTimeoutMs(): number {
    const configured = Number(this.config.timeoutMs ?? this.config.config?.timeoutMs ?? this.config.metadata?.timeoutMs ?? 15_000);
    if (!Number.isFinite(configured)) return 15_000;
    return Math.min(Math.max(Math.floor(configured), 1_000), 60_000);
  }

  private remoteFailure(
    endpoint: string,
    upstreamStatusCode: number,
    body?: unknown
  ): ProviderError {
    const parsed = body && typeof body === 'object' ? body as Record<string, any> : undefined;
    const providerCode = parsed?.errorCode || parsed?.code || parsed?.error;
    const providerMessage = typeof parsed?.message === 'string' ? parsed.message : undefined;
    let code = normalizeZayunoErrorCode(providerCode, upstreamStatusCode, providerMessage);
    const endpointPath = endpoint.split('?', 1)[0] || endpoint;
    const hasGenericProviderCode = !providerCode || [
      'RESOURCE_NOT_FOUND',
      'INTERNAL_ERROR',
      'UNAUTHORIZED',
      'FORBIDDEN'
    ].includes(code);

    // Remote APIs commonly include generic `Not Found` or `Unauthorized` JSON
    // labels. Preserve explicit canonical business codes, but let the endpoint
    // context classify generic transport failures at the Core boundary.
    if (upstreamStatusCode === 404 && (endpointPath === '/availability' || endpointPath === '/search')) {
      code = 'CAPABILITY_NOT_SUPPORTED';
    } else if (hasGenericProviderCode && upstreamStatusCode === 404 && endpointPath.startsWith('/offerings/')) {
      code = 'OFFERING_NOT_FOUND';
    } else if (hasGenericProviderCode && (upstreamStatusCode === 401 || upstreamStatusCode === 403)) {
      code = 'PROVIDER_AUTHENTICATION_ERROR';
    }

    // A remote upstream call can never mean the provider itself is missing from Zayuno
    if (code === 'PROVIDER_NOT_FOUND') {
      code = endpointPath === '/availability' || endpointPath === '/search'
        ? 'CAPABILITY_NOT_SUPPORTED'
        : endpointPath.startsWith('/offerings/')
          ? 'OFFERING_NOT_FOUND'
          : 'RESOURCE_NOT_FOUND';
    }

    const isCapacityOrInventory = code === 'RESOURCE_UNAVAILABLE' || code === 'CAPACITY_EXCEEDED' || code === 'INVALID_SELECTION';
    const retryable = !isCapacityOrInventory && (code === 'RATE_LIMITED' || code === 'PROVIDER_TIMEOUT' || code === 'PROVIDER_UNAVAILABLE');
    const statusCode = isCapacityOrInventory
      ? (code === 'CAPACITY_EXCEEDED' ? 422 : 409)
      : code === 'PROVIDER_AUTHENTICATION_ERROR'
        ? 502
        : upstreamStatusCode === 408
          ? 504
          : upstreamStatusCode >= 500
            ? 502
            : upstreamStatusCode;
    return new ProviderError(
      providerMessage || 'Provider request could not be completed.',
      statusCode,
      code,
      {
        providerSlug: this.providerSlug,
        endpoint,
        upstreamStatusCode,
        retryable
      }
    );
  }

  private async callRemote<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.targetUrl) {
      throw new ProviderError(
        'Provider integration is not configured.',
        502,
        'PROVIDER_UNAVAILABLE',
        { providerSlug: this.providerSlug, endpoint, retryable: false }
      );
    }

    const url = `${this.targetUrl}${endpoint}`;
    try {
      await this.assertResolvedAddressIsPublic();
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        'Provider target could not be reached.',
        502,
        'PROVIDER_UNAVAILABLE',
        { providerSlug: this.providerSlug, endpoint, retryable: true }
      );
    }

    const authMethod = this.config.authMethod || this.config.config?.authMethod || 'API_KEY';
    const secret = this.config.secret || '';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-provider-slug': this.providerSlug,
      ...(options.headers as any || {})
    };

    if (secret) {
      if (authMethod === 'BEARER_TOKEN') {
        headers['Authorization'] = `Bearer ${secret}`;
      } else if (authMethod === 'HMAC_SIGNATURE') {
        const bodyString = typeof options.body === 'string'
          ? options.body
          : options.body
            ? JSON.stringify(options.body)
            : '';
        const signature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
        headers['x-zayuno-signature'] = signature;
      } else {
        // Default API_KEY
        headers['x-provider-api-key'] = secret;
      }
    }

    const timeout = new AbortController();
    const timeoutId = setTimeout(() => timeout.abort(), this.requestTimeoutMs());
    let res: Response;
    let rawText: string;
    try {
      res = await fetch(url, {
        ...options,
        headers,
        signal: timeout.signal,
        // A public HTTPS endpoint must not be able to redirect this server to a
        // private address after the initial URL validation.
        redirect: 'error'
      });
      // Fetch resolves once response headers arrive. Keep the same deadline
      // while consuming the body so a provider cannot hold this request open
      // indefinitely by streaming or stalling after headers.
      rawText = await res.text();
    } catch (error) {
      if (timeout.signal.aborted) {
        throw new ProviderError(
          'Provider request timed out.',
          504,
          'PROVIDER_TIMEOUT',
          { providerSlug: this.providerSlug, endpoint, retryable: true }
        );
      }
      throw new ProviderError(
        'Provider target could not be reached.',
        502,
        'PROVIDER_UNAVAILABLE',
        { providerSlug: this.providerSlug, endpoint, retryable: true }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = rawText;
    }

    if (!res.ok) {
      throw this.remoteFailure(endpoint, res.status, parsedBody);
    }

    return parsedBody as T;
  }

  async getProviderInfo(): Promise<ProviderInfo> {
    const value = await this.callRemote<unknown>('/provider-info');
    const validated = validateProviderResponse('/provider-info', 'contract-provider-info', ProviderInfoSchema, value);
    if (!validated.fulfillmentMode) {
      const configuredMode = (this.config.metadata?.fulfillmentMode ||
        this.config.config?.fulfillmentMode ||
        (this.config as any)?.fulfillmentMode) as ProviderFulfillmentMode | undefined;
      if (configuredMode) {
        validated.fulfillmentMode = configuredMode;
      }
    }
    return validated;
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const value = await this.callRemote<unknown>('/health');
    return validateProviderResponse('/health', 'contract-health', HealthCheckResultSchema, value);
  }

  async getLocations(input?: GetLocationsInput): Promise<Location[]> {
    const query = input?.activeOnly !== undefined ? `?activeOnly=${input.activeOnly}` : '';
    const value = await this.callRemote<unknown>(`/locations${query}`);
    return validateProviderResponse('/locations', 'contract-locations', z.array(LocationSchema), value);
  }

  async getCatalog(input: GetCatalogInput): Promise<Catalog> {
    const params = new URLSearchParams();
    if (input.locationId) params.append('locationId', input.locationId);
    if (input.categorySlug) params.append('category', input.categorySlug);
    if (input.parameters) params.append('context', JSON.stringify(input.parameters));
    const query = params.toString() ? `?${params.toString()}` : '';
    const value = await this.callRemote<unknown>(`/catalog${query}`);
    return validateProviderResponse('/catalog', 'contract-catalog', CatalogSchema, value);
  }

  async getOffering(input: GetOfferingInput): Promise<Offering> {
    const params = new URLSearchParams();
    if (input.locationId) params.append('locationId', input.locationId);
    if (input.parameters) params.append('context', JSON.stringify(input.parameters));
    const query = params.toString() ? `?${params.toString()}` : '';
    const value = await this.callRemote<unknown>(`/offerings/${encodeURIComponent(input.offeringId)}${query}`);
    return validateProviderResponse('/offerings/:id', 'contract-catalog', OfferingSchema, value);
  }

  async searchOfferings(input: SearchCatalogInput): Promise<Offering[]> {
    const params = new URLSearchParams({ q: input.query });
    if (input.limit) params.append('limit', String(input.limit));
    if (input.categorySlug) params.append('category', input.categorySlug);
    if (input.locationId) params.append('locationId', input.locationId);
    if (input.parameters) params.append('context', JSON.stringify(input.parameters));
    const value = await this.callRemote<unknown>(`/search?${params.toString()}`);
    return validateProviderResponse('/search', 'contract-search', z.array(OfferingSchema), value);
  }

  async checkAvailability(input: CheckAvailabilityInput): Promise<AvailabilityResult> {
    try {
      const value = await this.callRemote<unknown>('/availability', {
        method: 'POST',
        body: JSON.stringify(input)
      });
      // A few early contract-v1 providers returned `available` instead of the
      // finalized `isAvailable`. Normalize that one known legacy shape while
      // keeping all other response validation strict.
      if (
        value &&
        typeof value === 'object' &&
        !('isAvailable' in value) &&
        typeof (value as any).available === 'boolean'
      ) {
        const legacy = value as any;
        return validateProviderResponse(
          '/availability',
          'contract-availability',
          AvailabilityResultSchema,
          {
            ...legacy,
            isAvailable: legacy.available,
            unavailableItems: legacy.unavailableItems || [],
            availableItems: legacy.availableItems || [],
            checkedAt: legacy.checkedAt || new Date().toISOString()
          }
        );
      }
      return validateProviderResponse('/availability', 'contract-availability', AvailabilityResultSchema, value);
    } catch (error) {
      // A missing endpoint is a lack of evidence, never evidence of stock.
      // Keep older providers usable by making quote the verification point.
      if (
        error instanceof ProviderError &&
        error.code === 'CAPABILITY_NOT_SUPPORTED' &&
        error.details?.upstreamStatusCode === 404
      ) {
        return {
          availabilityStatus: AvailabilityStatus.NOT_SUPPORTED,
          isAvailable: null,
          unavailableItems: [],
          availableItems: [],
          checkedAt: new Date().toISOString(),
          parameters: { availabilityEndpointImplemented: false }
        };
      }
      throw error;
    }
  }

  async requestQuote(input: RequestQuoteInput): Promise<NormalizedQuote> {
    const forbidden = findForbiddenParameterKey(input);
    if (forbidden) {
      throw new ProviderContractValidationError({
        code: 'FORBIDDEN_SENSITIVE_PARAMETER',
        endpoint: '/quote',
        path: forbidden,
        expected: 'Safe non-sensitive dynamic parameter',
        received: 'sensitive parameter key/value',
        docsUrl: 'https://partners.zayuno.uz/docs/contract-reference/#contract-parameters',
        message: `Sensitive identity or payment field "${forbidden}" is not allowed in dynamic parameters. Use the provider-owned secure handoff.`
      });
    }
    const canonicalInput = RequestQuoteInputSchema.parse(input);
    const value = await this.callRemote<unknown>('/quote', {
      method: 'POST',
      body: JSON.stringify(canonicalInput)
    });
    return validateProviderResponse('/quote', 'contract-quote', NormalizedQuoteSchema, normalizeLegacyQuoteResponse(value));
  }

  async createAction(input: CreateActionInput): Promise<NormalizedAction> {
    const forbidden = findForbiddenParameterKey(input);
    if (forbidden) {
      throw new ProviderContractValidationError({
        code: 'FORBIDDEN_SENSITIVE_PARAMETER',
        endpoint: '/actions',
        path: forbidden,
        expected: 'Safe non-sensitive dynamic parameter',
        received: 'sensitive parameter key/value',
        docsUrl: 'https://partners.zayuno.uz/docs/contract-reference/#contract-parameters',
        message: `Sensitive identity or payment field "${forbidden}" is not allowed in dynamic parameters. Use the provider-owned secure handoff.`
      });
    }
    const canonicalInput = CreateActionInputSchema.parse(input);
    const value = await this.callRemote<unknown>('/actions', {
      method: 'POST',
      headers: canonicalInput.idempotencyKey ? {
        'idempotency-key': canonicalInput.idempotencyKey
      } : undefined,
      body: JSON.stringify(canonicalInput)
    });
    return validateProviderResponse('/actions', 'contract-action-create', NormalizedActionSchema, value);
  }

  async getAction(input: GetActionInput): Promise<NormalizedAction> {
    const canonicalInput = GetActionInputSchema.parse(input);
    const value = await this.callRemote<unknown>(`/actions/${canonicalInput.actionId}`);
    return validateProviderResponse('/actions/:id', 'contract-action-status', NormalizedActionSchema, value);
  }

  async cancelAction(input: CancelActionInput): Promise<CancelActionResult> {
    const canonicalInput = CancelActionInputSchema.parse(input);
    const value = await this.callRemote<unknown>(`/actions/${canonicalInput.actionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(canonicalInput)
    });
    return validateProviderResponse('/actions/:id/cancel', 'contract-action-cancel', CancelActionResultSchema, value);
  }

  async getPaymentOptions(input: GetPaymentOptionsInput): Promise<PaymentOption[]> {
    const value = await this.callRemote<unknown>(`/actions/${input.actionId}/payment-options`);
    return validateProviderResponse(
      '/actions/:id/payment-options',
      'contract-payment-options',
      z.array(PaymentOptionSchema),
      normalizeLegacyPaymentOptionsResponse(value)
    );
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
