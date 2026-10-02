import { ProviderError, ProviderAuthenticationError } from '../../errors';
import { IikoTokenManager } from './iiko-token-manager';
import {
  IikoCredentials,
  AccessTokenResponse,
  IikoOrganization,
  IikoTerminalGroup,
  TerminalGroupAliveInfo,
  IikoNomenclatureResponse,
  IikoStopListsResponse,
  IikoCreateOrderRequest,
  IikoCreateDeliveryResponse,
  IikoOrdersResponse,
  IikoCancelOrderRequest,
  IikoCancelOrderResponse,
  IikoCommandStatusResponse
} from './iiko-types';

export interface IikoClientOptions {
  baseUrl?: string;
  providerSlug: string;
  credentials: IikoCredentials;
  timeoutMs?: number;
  tokenManager?: IikoTokenManager;
}

/**
 * Deeply scrubs secrets, API keys, tokens, passwords, and sensitive identifiers from error messages and logs.
 */
export function sanitizeErrorMessage(rawText: unknown, sensitiveStrings: Array<string | undefined | null> = []): string {
  if (rawText === null || rawText === undefined) return '';
  let text = typeof rawText === 'object' ? JSON.stringify(rawText) : String(rawText);

  // 1. Scrub explicit known secrets
  for (const s of sensitiveStrings) {
    if (s && typeof s === 'string' && s.length >= 3) {
      text = text.split(s).join('***REDACTED***');
    }
  }

  // 2. Scrub Bearer tokens
  text = text.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer ***REDACTED***');

  // 3. Scrub credentials in JSON or query or headers (quoted keys with quoted values)
  text = text.replace(
    /(["'])(apiKey|clientSecret|apiLogin|appId|password|pin|token|secret|accessToken|refreshToken)\1\s*:\s*(["'])(?:(?!\3)[^\\]|\\.)*\3/gi,
    '$1$2$1: $3***REDACTED***$3'
  );

  // 4. Scrub quoted keys with unquoted values (e.g. numeric pin or boolean in JSON)
  text = text.replace(
    /(["'])(apiKey|clientSecret|apiLogin|appId|password|pin|token|secret|accessToken|refreshToken)\1\s*:\s*([^"'\s,;{}]+)/gi,
    '$1$2$1: ***REDACTED***'
  );

  // 5. Scrub unquoted or query param credentials (e.g., password=... or apiKey: ...)
  text = text.replace(
    /(\b(?:apiKey|clientSecret|apiLogin|appId|password|pin|token|secret|accessToken|refreshToken)\b)\s*[:=]\s*(["']?)([^"'\s&,;{}]+)\2/gi,
    '$1=$2***REDACTED***$2'
  );

  return text;
}

export class IikoClient {
  readonly baseUrl: string;
  readonly providerSlug: string;
  private readonly credentials: IikoCredentials;
  private readonly timeoutMs: number;
  private readonly tokenManager: IikoTokenManager;

  constructor(options: IikoClientOptions) {
    this.baseUrl = (options.baseUrl || 'https://api-ru.iiko.services').replace(/\/+$/, '');
    this.providerSlug = options.providerSlug;
    this.credentials = { ...options.credentials };
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.tokenManager = options.tokenManager ?? IikoTokenManager.getInstance();
  }

  /**
   * Sanitizes text using this client's known credentials.
   */
  sanitize(rawText: unknown): string {
    const sensitive = [
      this.credentials.apiKey,
      this.credentials.clientSecret,
      this.credentials.apiLogin,
      this.credentials.appId
    ];
    return sanitizeErrorMessage(rawText, sensitive);
  }

  /**
   * Returns isolated cache key for this client instance.
   */
  getCacheKey(): string {
    const credKey = this.credentials.apiKey || this.credentials.apiLogin || '';
    return this.tokenManager.buildCacheKey(this.providerSlug, credKey);
  }

  /**
   * Retrieves an access token, reusing cached token or requesting a fresh one.
   */
  async getAccessToken(): Promise<string> {
    const cacheKey = this.getCacheKey();
    const cached = this.tokenManager.getValidToken(cacheKey);
    if (cached) {
      return cached;
    }

    const { appId, clientSecret, apiKey, apiLogin } = this.credentials;

    // 1. Try v2 authentication if appId, clientSecret, and apiKey are provided
    if (appId && clientSecret && apiKey) {
      const response = await this.postUnauthenticated<AccessTokenResponse>('/api/v2/access_token', {
        appId,
        clientSecret,
        apiKey
      });

      if (!response?.token) {
        throw new ProviderAuthenticationError(
          this.providerSlug,
          'iikoCloud auth v2 failed: empty token received.'
        );
      }

      this.tokenManager.setToken(cacheKey, response.token);
      return response.token;
    }

    // 2. Fallback to v1 authentication if apiLogin or apiKey is provided
    const effectiveLogin = apiLogin || apiKey;
    if (effectiveLogin) {
      const response = await this.postUnauthenticated<AccessTokenResponse>('/api/1/access_token', {
        apiLogin: effectiveLogin
      });

      if (!response?.token) {
        throw new ProviderAuthenticationError(
          this.providerSlug,
          'iikoCloud auth v1 failed: empty token received.'
        );
      }

      this.tokenManager.setToken(cacheKey, response.token);
      return response.token;
    }

    throw new ProviderAuthenticationError(
      this.providerSlug,
      'iikoCloud credentials incomplete: appId/clientSecret/apiKey (v2) or apiLogin (v1) required.'
    );
  }

  /**
   * Low-level unauthenticated POST request (used strictly for auth endpoint).
   */
  private async postUnauthenticated<T>(endpoint: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const raw = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }

      if (!res.ok) {
        const rawErrMsg = typeof parsed === 'object'
          ? (parsed.message || parsed.errorDescription || JSON.stringify(parsed))
          : parsed;
        const safeMsg = this.sanitize(rawErrMsg);

        if (res.status === 401 || res.status === 403) {
          throw new ProviderAuthenticationError(
            this.providerSlug,
            `iikoCloud authentication rejected (status ${res.status}): ${safeMsg}`
          );
        }
        if (res.status === 429) {
          throw new ProviderError(
            'iikoCloud rate limit reached.',
            429,
            'RATE_LIMIT_EXCEEDED',
            { providerSlug: this.providerSlug, retryable: true }
          );
        }
        throw new ProviderError(
          `iikoCloud auth error: ${safeMsg}`,
          res.status >= 500 ? 502 : res.status,
          'PROVIDER_UNAVAILABLE',
          { providerSlug: this.providerSlug, endpoint, retryable: res.status >= 500 }
        );
      }

      return parsed as T;
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      const safeErr = this.sanitize(err?.message || '');
      if (controller.signal.aborted) {
        throw new ProviderError(
          'iikoCloud auth request timed out.',
          504,
          'PROVIDER_TIMEOUT',
          { providerSlug: this.providerSlug, endpoint, retryable: true }
        );
      }
      throw new ProviderError(
        `Failed to connect to iikoCloud auth service: ${safeErr || 'Network error'}`,
        502,
        'PROVIDER_UNAVAILABLE',
        { providerSlug: this.providerSlug, endpoint, retryable: true }
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Authenticated API call with automatic 401 token invalidation and single retry.
   */
  async callApi<T>(endpoint: string, body: any = {}, retryOn401 = true): Promise<T> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      const raw = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }

      if (!res.ok) {
        // Handle 401: invalidate cached token and retry once
        if (res.status === 401) {
          this.tokenManager.invalidateToken(this.getCacheKey());
          if (retryOn401) {
            return this.callApi<T>(endpoint, body, false);
          }
          throw new ProviderAuthenticationError(
            this.providerSlug,
            'iikoCloud authorization rejected after token refresh.'
          );
        }

        if (res.status === 403) {
          throw new ProviderError(
            'iikoCloud access forbidden for requested resource.',
            403,
            'FORBIDDEN',
            { providerSlug: this.providerSlug, endpoint, retryable: false }
          );
        }

        if (res.status === 429) {
          throw new ProviderError(
            'iikoCloud rate limit reached.',
            429,
            'RATE_LIMIT_EXCEEDED',
            { providerSlug: this.providerSlug, endpoint, retryable: true }
          );
        }

        const rawErrMsg = typeof parsed === 'object'
          ? (parsed.message || parsed.errorDescription || JSON.stringify(parsed))
          : parsed;
        const safeMsg = this.sanitize(rawErrMsg);
        throw new ProviderError(
          `iikoCloud request failed (${res.status}): ${safeMsg}`,
          res.status >= 500 ? 502 : res.status,
          'PROVIDER_UNAVAILABLE',
          { providerSlug: this.providerSlug, endpoint, retryable: res.status >= 500 }
        );
      }

      return parsed as T;
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      const safeErr = this.sanitize(err?.message || '');
      if (controller.signal.aborted) {
        throw new ProviderError(
          `iikoCloud request to ${endpoint} timed out.`,
          504,
          'PROVIDER_TIMEOUT',
          { providerSlug: this.providerSlug, endpoint, retryable: true }
        );
      }
      throw new ProviderError(
        `Failed to communicate with iikoCloud endpoint "${endpoint}": ${safeErr || 'Network error'}`,
        502,
        'PROVIDER_UNAVAILABLE',
        { providerSlug: this.providerSlug, endpoint, retryable: true }
      );
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Retrieves organizations associated with current credentials.
   */
  async getOrganizations(): Promise<IikoOrganization[]> {
    const data = await this.callApi<{ organizations: IikoOrganization[] }>('/api/1/organizations', {
      organizationIds: null,
      returnAdditionalInfo: true,
      includeDisabled: false
    });
    return data?.organizations || [];
  }

  /**
   * Retrieves delivery terminal groups for specified organizations.
   */
  async getTerminalGroups(organizationIds: string[]): Promise<IikoTerminalGroup[]> {
    const data = await this.callApi<{
      terminalGroups: Array<{
        organizationId: string;
        items: IikoTerminalGroup[];
      }>;
    }>('/api/1/terminal_groups', {
      organizationIds,
      includeDisabled: false
    });

    const results: IikoTerminalGroup[] = [];
    if (data?.terminalGroups && Array.isArray(data.terminalGroups)) {
      for (const group of data.terminalGroups) {
        if (group.items && Array.isArray(group.items)) {
          for (const item of group.items) {
            results.push({
              ...item,
              organizationId: item.organizationId || group.organizationId
            });
          }
        }
      }
    }
    return results;
  }

  /**
   * Checks if specified terminal groups are alive and ready to process requests.
   */
  async checkTerminalGroupsAlive(
    terminalGroupIds: string[],
    organizationIds?: string[]
  ): Promise<TerminalGroupAliveInfo[]> {
    const data = await this.callApi<{
      isAliveStatus: TerminalGroupAliveInfo[];
    }>('/api/1/terminal_groups/is_alive', {
      terminalGroupIds,
      organizationIds: organizationIds || []
    });
    return data?.isAliveStatus || [];
  }

  /**
   * Fetches full menu nomenclature for an organization.
   */
  async getNomenclature(organizationId: string, startRevision = 0): Promise<IikoNomenclatureResponse> {
    return this.callApi<IikoNomenclatureResponse>('/api/1/nomenclature', {
      organizationId,
      startRevision
    });
  }

  /** Lists iikoWeb external menus available to this integration. */
  async getExternalMenus(): Promise<Array<{ id: string; name: string }>> {
    const data = await this.callApi<{ externalMenus?: Array<{ id?: string | number; name?: string }> }>(
      '/api/2/menu', {}
    );
    return (data?.externalMenus || [])
      .filter((menu) => menu.id !== undefined && menu.id !== null)
      .map((menu) => ({ id: String(menu.id), name: menu.name || String(menu.id) }));
  }

  /** Reads the iikoWeb external menu and normalizes its visible items for the catalog adapter. */
  async getExternalMenuNomenclature(organizationId: string, externalMenuId: string): Promise<IikoNomenclatureResponse> {
    type MenuItem = {
      productId?: string | null; name: string; description?: string | null; isHidden?: boolean;
      tags?: string[]; sizePrices?: Array<{ sizeId?: string | null; sizeName?: string | null;
        price?: number | null; sku?: string | null; isHidden?: boolean; image?: { url?: string | null } }>;
      modifierGroups?: Array<{ id?: string | null; name: string; isHidden?: boolean;
        restrictions?: { minQuantity?: number; maxQuantity?: number };
        items?: Array<{ id: string; isHidden?: boolean; restrictions?: {
          minQuantity?: number; maxQuantity?: number; defaultQuantity?: number; freeQuantity?: number
        } }> }>;
    };
    type Menu = {
      itemsGroups?: Array<{ id: string; name: string; description?: string | null; isHidden?: boolean; items?: MenuItem[] }>;
      products?: Array<{ id: string; sku?: string; type?: string; orderItemType?: string }>;
      modifiers?: Array<{ id: string; name?: string; sizePrices?: Array<{ sizeId?: string | null; price?: number | null }> }>;
    };
    const menu = await this.callApi<Menu>('/api/menu/v3/by_id', { externalMenuId, organizationId });
    const productDetails = new Map((menu.products || []).map((product) => [product.id, product]));
    const groups = (menu.itemsGroups || []).filter((group) => !group.isHidden);
    const products: IikoNomenclatureResponse['products'] = [];
    for (const group of groups) {
      for (const item of group.items || []) {
        if (!item.productId || item.isHidden) continue;
        const details = productDetails.get(item.productId);
        products.push({
          id: item.productId,
          name: item.name,
          description: item.description,
          code: details?.sku || item.sizePrices?.[0]?.sku,
          groupId: group.id,
          type: details?.type,
          orderItemType: details?.orderItemType,
          sizePrices: (item.sizePrices || []).filter((size) => !size.isHidden).map((size) => ({
            sizeId: size.sizeId,
            price: { currentPrice: size.price ?? 0, isIncludedInMenu: true }
          })),
          groupModifiers: (item.modifierGroups || []).filter((modifierGroup) => !modifierGroup.isHidden).map((modifierGroup) => ({
            id: modifierGroup.id || modifierGroup.name,
            minAmount: modifierGroup.restrictions?.minQuantity ?? 0,
            maxAmount: modifierGroup.restrictions?.maxQuantity ?? 1,
            required: (modifierGroup.restrictions?.minQuantity ?? 0) > 0,
            childModifiers: (modifierGroup.items || []).filter((modifier) => !modifier.isHidden).map((modifier) => ({
              id: modifier.id,
              minAmount: modifier.restrictions?.minQuantity,
              maxAmount: modifier.restrictions?.maxQuantity,
              defaultAmount: modifier.restrictions?.defaultQuantity,
              freeOfChargeAmount: modifier.restrictions?.freeQuantity
            }))
          })),
          imageLinks: (item.sizePrices || []).map((size) => size.image?.url).filter((url): url is string => !!url),
          tags: item.tags || []
        });
      }
    }
    for (const modifier of menu.modifiers || []) {
      products.push({
        id: modifier.id, name: modifier.name || 'Modifier', type: 'modifier',
        sizePrices: (modifier.sizePrices || []).map((size) => ({
          sizeId: size.sizeId,
          price: { currentPrice: size.price ?? 0, isIncludedInMenu: true }
        }))
      });
    }
    return { groups: groups.map(({ id, name, description }) => ({ id, name, description })), products };
  }

  /**
   * Fetches stop lists (out-of-stock items) for specified organizations.
   */
  async getStopLists(organizationIds: string[]): Promise<IikoStopListsResponse> {
    return this.callApi<IikoStopListsResponse>('/api/1/stop_lists', {
      organizationIds
    });
  }

  /**
   * Creates a delivery order in iiko.
   */
  async createDeliveryOrder(request: IikoCreateOrderRequest): Promise<IikoCreateDeliveryResponse> {
    return this.callApi<IikoCreateDeliveryResponse>('/api/1/deliveries/create', request);
  }

  /**
   * Retrieves order details by order IDs.
   */
  async getOrderById(organizationId: string, orderIds: string[]): Promise<IikoOrdersResponse> {
    return this.callApi<IikoOrdersResponse>('/api/1/deliveries/by_id', {
      organizationId,
      orderIds
    });
  }

  /**
   * Cancels a delivery order in iiko. Returns correlationId for tracking command status.
   */
  async cancelDeliveryOrder(request: IikoCancelOrderRequest): Promise<IikoCancelOrderResponse> {
    return this.callApi<IikoCancelOrderResponse>('/api/1/deliveries/cancel', request);
  }

  /**
   * Checks status of an asynchronous command in iiko.
   */
  async getCommandStatus(organizationId: string, correlationId: string): Promise<IikoCommandStatusResponse> {
    return this.callApi<IikoCommandStatusResponse>('/api/1/commands/status', {
      organizationId,
      correlationId
    });
  }
}
