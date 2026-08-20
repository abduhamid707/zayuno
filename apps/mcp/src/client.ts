import { WelcomeInfo } from '@zayuno/contracts';

export class ZayunoApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    const rawUrl = baseUrl || process.env.API_BASE_URL || process.env.PUBLIC_API_URL || 'http://localhost:4000';
    this.baseUrl = rawUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    const configuredApiKey = apiKey || process.env.ZAYUNO_API_KEY;
    if (!configuredApiKey) {
      throw new Error('ZAYUNO_API_KEY is required for MCP-to-API authentication.');
    }
    this.apiKey = configuredApiKey;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      ...(options.headers as any || {})
    };

    const res = await fetch(url, { ...options, headers });
    const rawText = await res.text();
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = rawText;
    }

    if (!res.ok) {
      const message = typeof parsedBody === 'object' && parsedBody !== null
        ? parsedBody.message || JSON.stringify(parsedBody)
        : String(parsedBody || `HTTP ${res.status}`);
      throw new Error(`Zayuno API [${res.status}]: ${message}`);
    }

    return parsedBody as T;
  }

  // 1. Providers & Discovery
  async getWelcome(): Promise<WelcomeInfo> {
    return this.request<WelcomeInfo>('/api/v1/providers/welcome');
  }

  async listProviders(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/api/v1/providers${query}`);
  }

  async findProviders(filter: { category?: string; capability?: string; geography?: string; query?: string; limit?: number; offset?: number }) {
    const params = new URLSearchParams();
    if (filter.category) params.append('category', filter.category);
    if (filter.capability) params.append('capability', filter.capability);
    if (filter.geography) params.append('geography', filter.geography);
    if (filter.query) params.append('query', filter.query);
    if (filter.limit) params.append('limit', String(filter.limit));
    if (filter.offset) params.append('offset', String(filter.offset));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/v1/providers/find${query}`);
  }

  async getProvider(slug: string) {
    return this.request(`/api/v1/providers/${slug}`);
  }

  async getProviderCapabilities(slug: string) {
    return this.request(`/api/v1/providers/${slug}/capabilities`);
  }

  async getLocations(slug: string, activeOnly?: boolean) {
    const query = activeOnly !== undefined ? `?activeOnly=${activeOnly}` : '';
    return this.request(`/api/v1/providers/${slug}/locations${query}`);
  }

  // 2. Catalog & Offerings
  async getCatalog(slug: string, locationId?: string, category?: string, parameters?: Record<string, any>) {
    const params = new URLSearchParams();
    if (locationId) params.append('locationId', locationId);
    if (category) params.append('category', category);
    if (parameters) params.append('context', JSON.stringify(parameters));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/v1/providers/${slug}/catalog${query}`);
  }

  async searchCatalog(providerSlug: string, query: string, category?: string, locationId?: string, limit?: number, parameters?: Record<string, any>) {
    if (parameters && Object.keys(parameters).length > 0) {
      return this.request('/api/v1/search', {
        method: 'POST',
        body: JSON.stringify({ providerSlug, query: query || '', categorySlug: category, locationId, limit: limit || 20, parameters })
      });
    }
    const params = new URLSearchParams({ provider: providerSlug, q: query });
    if (category) params.append('category', category);
    if (locationId) params.append('locationId', locationId);
    if (limit) params.append('limit', String(limit));
    return this.request(`/api/v1/search?${params.toString()}`);
  }

  async getOffering(slug: string, offeringId: string, locationId?: string, parameters?: Record<string, any>) {
    const params = new URLSearchParams();
    if (locationId) params.append('locationId', locationId);
    if (parameters) params.append('context', JSON.stringify(parameters));
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/v1/providers/${slug}/offerings/${encodeURIComponent(offeringId)}${query}`);
  }

  async checkAvailability(body: any) {
    return this.request('/api/v1/availability', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // 3. Quotes
  async requestQuote(body: any) {
    return this.request('/api/v1/quotes', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  // 4. Actions & Execution
  async createAction(body: any) {
    return this.request('/api/v1/actions', {
      method: 'POST',
      headers: {
        'idempotency-key': body.idempotencyKey || `zy_idemp_${Date.now()}`
      },
      body: JSON.stringify(body)
    });
  }

  async getAction(actionId: string) {
    return this.request(`/api/v1/actions/${actionId}`);
  }

  async cancelAction(actionId: string, reason?: string, reasonCode = 'CUSTOMER_CANCELLED') {
    return this.request(`/api/v1/actions/${actionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode, reason })
    });
  }

  async getPaymentOptions(actionId: string) {
    return this.request(`/api/v1/actions/${actionId}/payment-options`);
  }
}
