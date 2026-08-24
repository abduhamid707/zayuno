/**
 * Provider Contract v1 manifest.
 *
 * This is the human/tooling-facing source of truth for endpoint names,
 * capability requirements, dependencies and canonical wire examples. Runtime
 * validation continues to be owned by the Zod schemas exported by this package.
 */
export type ProviderProtocolProfile = 'DISCOVERY_READONLY' | 'TRANSACTIONAL';

export interface ProviderProtocolEndpoint {
  id: string;
  capability: string;
  method: 'GET' | 'POST';
  path: string;
  summary: string;
  profiles: ProviderProtocolProfile[];
  required: boolean;
  dependsOn?: string[];
  docsAnchor: string;
  requestExample?: unknown;
  responseExample: unknown;
  legacyAliases?: string[];
  direction?: 'ZAYUNO_TO_PROVIDER' | 'PROVIDER_TO_ZAYUNO';
}

export const PROVIDER_CONTRACT_VERSION = '1.0.0';
export const PROVIDER_WEBHOOK_PATH = '/webhooks';
export const ZAYUNO_WEBHOOK_INGESTION_PATH = '/api/v1/webhooks/:providerSlug';

const readonly: ProviderProtocolProfile[] = ['DISCOVERY_READONLY', 'TRANSACTIONAL'];
const transactional: ProviderProtocolProfile[] = ['TRANSACTIONAL'];

export const PROVIDER_PROTOCOL_ENDPOINTS: readonly ProviderProtocolEndpoint[] = [
  {
    id: 'metadata', capability: 'METADATA', method: 'GET', path: '/provider-info',
    summary: 'Provider identity, publication state and declared capabilities.',
    profiles: readonly, required: true, docsAnchor: 'contract-provider-info',
    responseExample: {
      id: 'provider_shopla', slug: 'shopla', name: 'Shopla', status: 'ACTIVE',
      type: 'COMMERCE', category: 'retail', geography: ['UZ'], adapterType: 'remote-http',
      authMethod: 'API_KEY', capabilities: ['METADATA', 'HEALTH', 'CATALOG']
    }
  },
  {
    id: 'health', capability: 'HEALTH', method: 'GET', path: '/health',
    summary: 'Fast readiness response used by discovery and certification.',
    profiles: readonly, required: true, docsAnchor: 'contract-health',
    responseExample: { status: 'HEALTHY', latencyMs: 12, timestamp: '2026-08-24T10:00:00.000Z' }
  },
  {
    id: 'catalog', capability: 'CATALOG', method: 'GET', path: '/catalog',
    summary: 'Available categories and offerings.', profiles: readonly, required: true,
    docsAnchor: 'contract-catalog', responseExample: { providerSlug: 'shopla', categories: [], offerings: [] }
  },
  {
    id: 'search', capability: 'SEARCH', method: 'GET', path: '/search',
    summary: 'Optional filtered offering search.', profiles: readonly, required: false,
    dependsOn: ['catalog'], docsAnchor: 'contract-search', responseExample: []
  },
  {
    id: 'locations', capability: 'LOCATIONS', method: 'GET', path: '/locations',
    summary: 'Active physical branches or service locations.', profiles: readonly, required: false,
    docsAnchor: 'contract-locations', responseExample: []
  },
  {
    id: 'quote', capability: 'QUOTE', method: 'POST', path: '/quote',
    summary: 'Verified itemized price quote.', profiles: transactional, required: true,
    dependsOn: ['catalog'], docsAnchor: 'contract-quote',
    requestExample: { providerSlug: 'shopla', items: [{ offeringId: 'item_1', quantity: 1 }] },
    responseExample: {
      id: 'quote_123', providerSlug: 'shopla',
      lines: [{ offeringId: 'item_1', offeringTitle: 'Item', unitPrice: 50000, quantity: 1, optionsTotal: 0, lineTotal: 50000 }],
      subtotal: 50000, fees: [], totalFees: 0, discounts: [], totalDiscount: 0,
      total: 50000, currency: 'UZS', expiresAt: '2026-08-24T10:15:00.000Z'
    },
    legacyAliases: ['response.quoteId -> response.id', 'response.items -> response.lines']
  },
  {
    id: 'action-create', capability: 'ACTION_CREATE', method: 'POST', path: '/actions',
    summary: 'Create one confirmed action from a verified quote.', profiles: transactional,
    required: true, dependsOn: ['quote'], docsAnchor: 'contract-action-create',
    requestExample: {
      providerSlug: 'shopla', quoteId: 'quote_123', idempotencyKey: 'unique-secret-key',
      customer: { name: 'Customer', phone: '+998901234567' }, userConfirmed: true
    },
    responseExample: {
      id: 'action_123', publicId: 'ZY-ACT-123', providerSlug: 'shopla', status: 'AWAITING_PAYMENT',
      lines: [{ offeringId: 'item_1', offeringTitle: 'Item', unitPrice: 50000, quantity: 1, optionsTotal: 0, lineTotal: 50000 }],
      subtotal: 50000, fees: 0, discount: 0, total: 50000, currency: 'UZS',
      customer: { name: 'Customer', phone: '+998901234567' }, fulfillmentType: 'STANDARD', paymentStatus: 'PENDING',
      nextAction: { type: 'OPEN_URL', url: 'https://checkout.example.uz/action_123', label: 'Pay now' },
      createdAt: '2026-08-24T10:00:00.000Z', updatedAt: '2026-08-24T10:00:00.000Z'
    }
  },
  {
    id: 'action-status', capability: 'ACTION_STATUS', method: 'GET', path: '/actions/:id',
    summary: 'Read current action and payment state.', profiles: transactional, required: true,
    dependsOn: ['action-create'], docsAnchor: 'contract-action-status',
    responseExample: {
      id: 'action_123', publicId: 'ZY-ACT-123', providerSlug: 'shopla', status: 'CONFIRMED',
      lines: [{ offeringId: 'item_1', offeringTitle: 'Item', unitPrice: 50000, quantity: 1, optionsTotal: 0, lineTotal: 50000 }],
      subtotal: 50000, fees: 0, discount: 0, total: 50000, currency: 'UZS',
      customer: { name: 'Customer', phone: '+998901234567' }, fulfillmentType: 'STANDARD', paymentStatus: 'PAID',
      createdAt: '2026-08-24T10:00:00.000Z', updatedAt: '2026-08-24T10:01:00.000Z'
    }
  },
  {
    id: 'payment-options', capability: 'PAYMENT_OPTIONS', method: 'GET', path: '/actions/:id/payment-options',
    summary: 'Optional provider-owned checkout choices. Canonical response is a top-level array.',
    profiles: transactional, required: false, dependsOn: ['action-create'], docsAnchor: 'contract-payment-options',
    responseExample: [{ id: 'checkout', name: 'Provider checkout', type: 'EXTERNAL_PROVIDER', isOnline: true, supportedCurrencies: ['UZS'] }],
    legacyAliases: ['{ "options": [...] } -> [...]']
  },
  {
    id: 'action-cancel', capability: 'ACTION_CANCEL', method: 'POST', path: '/actions/:id/cancel',
    summary: 'Optional cancellation lifecycle.', profiles: transactional, required: false,
    dependsOn: ['action-create'], docsAnchor: 'contract-action-cancel',
    requestExample: { providerSlug: 'shopla', actionId: 'action_123', reason: 'Customer requested cancellation' },
    responseExample: { success: true, actionId: 'action_123', previousStatus: 'CONFIRMED', newStatus: 'CANCELLED', message: 'Cancelled', refundInitiated: false }
  },
  {
    id: 'webhook', capability: 'WEBHOOK', method: 'POST', path: ZAYUNO_WEBHOOK_INGESTION_PATH,
    summary: 'Provider sends signed lifecycle events to Zayuno. This is not an endpoint the provider must host.',
    profiles: transactional, required: true, dependsOn: ['action-create'], docsAnchor: 'contract-webhook',
    requestExample: { eventId: 'evt_123', eventType: 'action.status_updated', providerSlug: 'shopla', actionId: 'action_123', timestamp: '2026-08-24T10:00:00.000Z' },
    responseExample: { success: true }, direction: 'PROVIDER_TO_ZAYUNO', legacyAliases: ['/api/v1/webhook (deprecated alias)']
  }
] as const;

export function getProviderProtocolEndpoints(profile: ProviderProtocolProfile): ProviderProtocolEndpoint[] {
  return PROVIDER_PROTOCOL_ENDPOINTS.filter(endpoint => endpoint.profiles.includes(profile));
}

export function createProviderOpenApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const endpoint of PROVIDER_PROTOCOL_ENDPOINTS) {
    if (endpoint.direction === 'PROVIDER_TO_ZAYUNO') continue;
    const openApiPath = endpoint.path.replace(':id', '{id}');
    paths[openApiPath] ||= {};
    paths[openApiPath][endpoint.method.toLowerCase()] = {
      operationId: endpoint.id.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
      summary: endpoint.summary,
      tags: [endpoint.capability],
      parameters: endpoint.path.includes(':id')
        ? [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }]
        : undefined,
      requestBody: endpoint.requestExample === undefined ? undefined : {
        required: true,
        content: { 'application/json': { example: endpoint.requestExample, schema: { type: 'object' } } }
      },
      responses: {
        '200': { description: 'Canonical Provider Contract v1 response', content: { 'application/json': { example: endpoint.responseExample } } },
        '400': { description: 'Invalid request or response contract' },
        '401': { description: 'Provider credential is missing or invalid' }
      },
      'x-zayuno-capability': endpoint.capability,
      'x-zayuno-required': endpoint.required,
      'x-zayuno-docs-anchor': endpoint.docsAnchor
    };
  }
  return {
    openapi: '3.1.0',
    info: { title: 'Zayuno Provider Contract', version: PROVIDER_CONTRACT_VERSION },
    servers: [{ url: 'https://api.yourbusiness.uz/zayuno' }],
    paths,
    'x-zayuno-webhook-ingestion': {
      method: 'POST', url: `https://api.zayuno.uz${ZAYUNO_WEBHOOK_INGESTION_PATH}`,
      description: 'Provider-to-Zayuno signed event destination.'
    }
  };
}

export function createProviderPostmanCollection() {
  return {
    info: {
      name: 'Zayuno Provider Contract v1',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    variable: [
      { key: 'baseUrl', value: 'https://api.yourbusiness.uz/zayuno' },
      { key: 'zayunoApiUrl', value: 'https://api.zayuno.uz' },
      { key: 'providerSlug', value: 'shopla' },
      { key: 'providerApiKey', value: '' }
    ],
    item: PROVIDER_PROTOCOL_ENDPOINTS.map(endpoint => ({
      name: `${endpoint.method} ${endpoint.path}`,
      request: {
        method: endpoint.method,
        header: [{ key: 'content-type', value: 'application/json' }, { key: 'x-provider-api-key', value: '{{providerApiKey}}' }],
        url: {
          raw: endpoint.direction === 'PROVIDER_TO_ZAYUNO'
            ? `{{zayunoApiUrl}}${endpoint.path.replace(':providerSlug', '{{providerSlug}}')}`
            : `{{baseUrl}}${endpoint.path}`,
          host: [endpoint.direction === 'PROVIDER_TO_ZAYUNO' ? '{{zayunoApiUrl}}' : '{{baseUrl}}'],
          path: endpoint.path.split('/').filter(Boolean)
        },
        body: endpoint.requestExample === undefined ? undefined : { mode: 'raw', raw: JSON.stringify(endpoint.requestExample, null, 2) }
      }
    }))
  };
}
