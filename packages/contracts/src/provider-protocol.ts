/**
 * Provider Contract v1 manifest and tooling definitions.
 *
 * This is the canonical source of truth for endpoint names,
 * capability requirements, dependencies, JSON schemas and canonical wire examples.
 * Runtime validation is owned by the Zod schemas exported by @zayuno/contracts.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ProviderInfoSchema, HealthCheckResultSchema } from './provider';
import {
  CatalogSchema,
  CatalogCategorySchema,
  OfferingSchema,
  OfferingVariantSchema,
  OptionGroupSchema,
  OptionItemSchema
} from './catalog';
import { LocationSchema } from './location';
import { RequestQuoteInputSchema, NormalizedQuoteSchema } from './quote';
import {
  CreateActionInputSchema,
  NormalizedActionSchema,
  GetActionInputSchema,
  CancelActionInputSchema,
  CancelActionResultSchema
} from './action';
import { PaymentOptionSchema } from './payment';
import { NormalizedWebhookEventSchema } from './webhook';
import { DynamicServiceContextSchema } from './dynamic-service';
import { DynamicParameterDeclarationSchema } from './dynamic-parameters';

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
  requestSchemaName?: string;
  responseSchemaName: string;
  requiredFields: string[];
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

/**
 * Extracts required field names automatically from a ZodObject schema.
 * This guarantees 100% single-source-of-truth parity between Zod models and protocol manifest.
 */
export function extractRequiredFieldsFromZod(schema: z.ZodTypeAny): string[] {
  if (!schema) return [];
  // Unwrap lazy or effects if necessary
  let unwrapped: any = schema;
  if (unwrapped._def && unwrapped._def.schema) {
    unwrapped = unwrapped._def.schema;
  }
  if (!(unwrapped instanceof z.ZodObject)) {
    return [];
  }

  const shape = unwrapped.shape;
  const required: string[] = [];

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const s = fieldSchema as any;
    if (s && typeof s._def === 'object') {
      const typeName = s._def.typeName;
      // ZodOptional and ZodDefault do not require input from caller
      if (typeName !== 'ZodOptional' && typeName !== 'ZodDefault') {
        required.push(key);
      }
    }
  }

  return required;
}

/** Canonical fully-valid Offering instance used across catalog, offering, and quote examples */
export const CANONICAL_OFFERING_EXAMPLE = {
  id: 'item_coffee_latte',
  providerId: 'provider_shopla',
  offeringCode: 'COFFEE-LATTE',
  title: 'Latte',
  description: 'Freshly brewed espresso with velvety steamed milk',
  categorySlug: 'drinks',
  categoryTitle: 'Ichimliklar',
  basePrice: 30000,
  currency: 'UZS',
  isAvailable: true,
  variants: [
    { id: 'var_standard', name: 'Standard (300ml)', basePrice: 30000, isAvailable: true, metadata: {} },
    { id: 'var_large', name: 'Large (450ml)', basePrice: 38000, isAvailable: true, metadata: {} }
  ],
  optionGroups: [
    {
      id: 'grp_milk',
      name: 'Sut turi',
      isRequired: false,
      minSelections: 0,
      maxSelections: 1,
      options: [
        { id: 'opt_whole', name: 'Oddiy sut', priceDelta: 0, isDefault: true, isAvailable: true, metadata: {} },
        { id: 'opt_oat', name: 'Suli suti (Oat milk)', priceDelta: 6000, isDefault: false, isAvailable: true, metadata: {} }
      ]
    }
  ],
  tags: ['coffee', 'hot-drinks'],
  metadata: {}
} as const;

export const CANONICAL_CATEGORY_EXAMPLE = {
  id: 'cat_drinks',
  slug: 'drinks',
  title: 'Ichimliklar',
  description: 'Issiq va sovuq ichimliklar',
  displayOrder: 1,
  offeringsCount: 1
} as const;

export const CANONICAL_LOCATION_EXAMPLE = {
  id: 'loc_main',
  providerId: 'provider_shopla',
  providerLocationId: 'branch_1',
  name: 'Main Branch',
  address: 'Tashkent, Amir Temur 1',
  latitude: 41.311081,
  longitude: 69.240562,
  serviceRadiusKm: 10,
  isActive: true,
  metadata: {}
} as const;

export const PROVIDER_PROTOCOL_ENDPOINTS: readonly ProviderProtocolEndpoint[] = [
  {
    id: 'metadata',
    capability: 'METADATA',
    method: 'GET',
    path: '/provider-info',
    summary: 'Provider metadata, advertised capabilities, geography and supported verticals',
    profiles: readonly,
    required: true,
    docsAnchor: 'contract-metadata',
    responseSchemaName: 'ProviderInfo',
    requiredFields: extractRequiredFieldsFromZod(ProviderInfoSchema),
    responseExample: {
      id: 'provider_shopla',
      slug: 'shopla',
      name: 'Shopla Online Mart',
      status: 'ACTIVE',
      type: 'RETAIL',
      category: 'retail',
      geography: ['UZ'],
      adapterType: 'remote-http',
      authMethod: 'API_KEY',
      capabilities: [
        'METADATA',
        'HEALTH',
        'LOCATIONS',
        'CATALOG',
        'SEARCH',
        'QUOTE',
        'ACTION_CREATE',
        'ACTION_STATUS',
        'PAYMENT_OPTIONS',
        'ACTION_CANCEL',
        'WEBHOOK'
      ],
      support: {
        email: 'support@shopla.uz',
        phone: '+998712000000',
        telegram: '@shoplasupport'
      },
      metadata: {}
    },
    legacyAliases: ['/metadata (deprecated)']
  },
  {
    id: 'health',
    capability: 'HEALTH',
    method: 'GET',
    path: '/health',
    summary: 'Deterministic health check protocol with latency and system status',
    profiles: readonly,
    required: true,
    docsAnchor: 'contract-health',
    responseSchemaName: 'HealthCheckResult',
    requiredFields: extractRequiredFieldsFromZod(HealthCheckResultSchema),
    responseExample: {
      status: 'HEALTHY',
      latencyMs: 18,
      timestamp: '2026-08-24T10:00:00.000Z',
      details: { uptimeSeconds: 86400 }
    },
    legacyAliases: ['/healthz (deprecated)']
  },
  {
    id: 'locations',
    capability: 'LOCATIONS',
    method: 'GET',
    path: '/locations',
    summary: 'Physical branches, warehouses, pickup locations, or fulfillment centers',
    profiles: readonly,
    required: false,
    docsAnchor: 'contract-locations',
    responseSchemaName: 'Location[]',
    requiredFields: extractRequiredFieldsFromZod(LocationSchema),
    responseExample: [CANONICAL_LOCATION_EXAMPLE]
  },
  {
    id: 'catalog',
    capability: 'CATALOG',
    method: 'GET',
    path: '/catalog',
    summary: 'Full catalog hierarchy with categories, offerings, variants, and option groups',
    profiles: readonly,
    required: true,
    dependsOn: ['metadata', 'health'],
    docsAnchor: 'contract-catalog',
    responseSchemaName: 'Catalog',
    requiredFields: extractRequiredFieldsFromZod(CatalogSchema),
    responseExample: {
      providerSlug: 'shopla',
      categories: [CANONICAL_CATEGORY_EXAMPLE],
      offerings: [CANONICAL_OFFERING_EXAMPLE],
      version: '2026.1',
      updatedAt: '2026-08-24T10:00:00.000Z'
    },
    legacyAliases: ['/menu (deprecated alias)']
  },
  {
    id: 'offering',
    capability: 'CATALOG',
    method: 'GET',
    path: '/offerings/:id',
    summary: 'Single offering deep lookup by offering ID or offeringCode with option groups',
    profiles: readonly,
    required: true,
    dependsOn: ['catalog'],
    docsAnchor: 'contract-catalog',
    responseSchemaName: 'Offering',
    requiredFields: extractRequiredFieldsFromZod(OfferingSchema),
    responseExample: CANONICAL_OFFERING_EXAMPLE
  },
  {
    id: 'search',
    capability: 'SEARCH',
    method: 'GET',
    path: '/search',
    summary: 'Real-time keyword and parameter search over provider catalog items',
    profiles: readonly,
    required: false,
    dependsOn: ['catalog'],
    docsAnchor: 'contract-search',
    responseSchemaName: 'Offering[]',
    requiredFields: extractRequiredFieldsFromZod(OfferingSchema),
    responseExample: [CANONICAL_OFFERING_EXAMPLE]
  },
  {
    id: 'quote',
    capability: 'QUOTE',
    method: 'POST',
    path: '/quote',
    summary: 'Itemized price calculation with binding total, subtotal, fees and expiration',
    profiles: transactional,
    required: true,
    dependsOn: ['catalog'],
    docsAnchor: 'contract-quote',
    requestSchemaName: 'RequestQuoteInput',
    responseSchemaName: 'NormalizedQuote',
    requiredFields: extractRequiredFieldsFromZod(NormalizedQuoteSchema),
    requestExample: {
      providerSlug: 'shopla',
      locationId: 'loc_main',
      items: [
        {
          offeringId: 'item_coffee_latte',
          variantId: 'var_standard',
          quantity: 2,
          selectedOptions: [
            {
              groupId: 'grp_milk',
              optionId: 'opt_whole',
              quantity: 1
            }
          ]
        }
      ]
    },
    responseExample: {
      id: 'quote_123',
      providerSlug: 'shopla',
      locationId: 'loc_main',
      currency: 'UZS',
      subtotal: 60000,
      totalFees: 10000,
      totalDiscount: 0,
      total: 70000,
      lines: [
        {
          offeringId: 'item_coffee_latte',
          offeringTitle: 'Latte',
          variantId: 'var_standard',
          quantity: 2,
          unitPrice: 30000,
          optionsTotal: 0,
          lineTotal: 60000,
          selectedOptions: [
            {
              groupId: 'grp_milk',
              optionId: 'opt_whole',
              name: 'Oddiy sut',
              priceDelta: 0
            }
          ]
        }
      ],
      fees: [
        {
          name: 'Yetkazib berish xizmati',
          amount: 10000
        }
      ],
      discounts: [],
      expiresAt: '2026-08-24T10:15:00.000Z',
      metadata: {}
    },
    legacyAliases: ['quoteId -> id', 'items -> lines']
  },
  {
    id: 'action-create',
    capability: 'ACTION_CREATE',
    method: 'POST',
    path: '/actions',
    summary: 'Order/booking creation with idempotency and provider payment checkout handoff',
    profiles: transactional,
    required: true,
    dependsOn: ['quote'],
    docsAnchor: 'contract-actions',
    requestSchemaName: 'CreateActionInput',
    responseSchemaName: 'NormalizedAction',
    requiredFields: extractRequiredFieldsFromZod(CreateActionInputSchema),
    requestExample: {
      idempotencyKey: 'idemp_unique_98765',
      providerSlug: 'shopla',
      quoteId: 'quote_123',
      customer: {
        name: 'Ali Valiyev',
        phone: '+998901234567'
      },
      destination: {
        raw: 'Tashkent, Amir Temur 1'
      },
      items: [
        {
          offeringId: 'item_coffee_latte',
          quantity: 2
        }
      ],
      userConfirmed: true
    },
    responseExample: {
      id: 'act_12345',
      externalActionId: 'ord_provider_999',
      providerSlug: 'shopla',
      quoteId: 'quote_123',
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'PENDING',
      subtotal: 60000,
      total: 70000,
      currency: 'UZS',
      customer: {
        name: 'Ali Valiyev',
        phone: '+998901234567'
      },
      items: [
        {
          offeringId: 'item_coffee_latte',
          title: 'Latte',
          quantity: 2,
          unitPrice: 30000,
          lineTotal: 60000
        }
      ],
      nextAction: {
        type: 'OPEN_URL',
        url: 'https://checkout.shopla.uz/pay/act_12345',
        description: 'Shopla xavfsiz to‘lov sahifasiga o‘tish'
      },
      createdAt: '2026-08-24T10:00:00.000Z',
      updatedAt: '2026-08-24T10:00:00.000Z',
      metadata: {}
    },
    legacyAliases: ['/orders (deprecated alias)']
  },
  {
    id: 'action-status',
    capability: 'ACTION_STATUS',
    method: 'GET',
    path: '/actions/:id',
    summary: 'Polling and real-time status inquiry for created action/order',
    profiles: transactional,
    required: true,
    dependsOn: ['action-create'],
    docsAnchor: 'contract-actions',
    responseSchemaName: 'NormalizedAction',
    requiredFields: extractRequiredFieldsFromZod(NormalizedActionSchema),
    responseExample: {
      id: 'act_12345',
      externalActionId: 'ord_provider_999',
      providerSlug: 'shopla',
      quoteId: 'quote_123',
      status: 'PROCESSING',
      paymentStatus: 'PAID',
      subtotal: 60000,
      total: 70000,
      currency: 'UZS',
      customer: {
        name: 'Ali Valiyev',
        phone: '+998901234567'
      },
      items: [
        {
          offeringId: 'item_coffee_latte',
          title: 'Latte',
          quantity: 2,
          unitPrice: 30000,
          lineTotal: 60000
        }
      ],
      createdAt: '2026-08-24T10:00:00.000Z',
      updatedAt: '2026-08-24T10:05:00.000Z',
      metadata: {}
    },
    legacyAliases: ['/orders/:id (deprecated alias)']
  },
  {
    id: 'payment-options',
    capability: 'PAYMENT_OPTIONS',
    method: 'GET',
    path: '/actions/:id/payment-options',
    summary: 'Available payment methods discovery for a pending action',
    profiles: transactional,
    required: false,
    dependsOn: ['action-create'],
    docsAnchor: 'contract-payment-options',
    responseSchemaName: 'PaymentOption[]',
    requiredFields: extractRequiredFieldsFromZod(PaymentOptionSchema),
    responseExample: [
      {
        id: 'pay_click',
        name: 'Click',
        type: 'CLICK',
        providerActionUrl: 'https://checkout.shopla.uz/pay/act_12345?method=click',
        isAvailable: true
      },
      {
        id: 'pay_payme',
        name: 'Payme',
        type: 'PAYME',
        providerActionUrl: 'https://checkout.shopla.uz/pay/act_12345?method=payme',
        isAvailable: true
      }
    ],
    legacyAliases: ['{ options: [...] } -> top-level array']
  },
  {
    id: 'action-cancel',
    capability: 'ACTION_CANCEL',
    method: 'POST',
    path: '/actions/:id/cancel',
    summary: 'Action/order cancellation lifecycle with reason description',
    profiles: transactional,
    required: false,
    dependsOn: ['action-create'],
    docsAnchor: 'contract-cancellation',
    requestSchemaName: 'CancelActionInput',
    responseSchemaName: 'CancelActionResult',
    requiredFields: extractRequiredFieldsFromZod(CancelActionResultSchema),
    requestExample: {
      reason: 'Foydalanuvchi buyurtmani bekor qildi'
    },
    responseExample: {
      success: true,
      actionId: 'act_12345',
      status: 'CANCELLED',
      cancellationReason: 'Foydalanuvchi buyurtmani bekor qildi',
      metadata: {}
    }
  },
  {
    id: 'webhook',
    capability: 'WEBHOOK',
    method: 'POST',
    path: '/api/v1/webhooks/:providerSlug',
    summary: 'Provider status update delivery to Zayuno signed with HMAC-SHA256',
    profiles: transactional,
    required: true,
    docsAnchor: 'contract-webhooks',
    requestSchemaName: 'NormalizedWebhookEvent',
    responseSchemaName: 'WebhookIngestionResponse',
    requiredFields: extractRequiredFieldsFromZod(NormalizedWebhookEventSchema),
    requestExample: {
      eventId: 'evt_123',
      eventType: 'action.status_updated',
      providerSlug: 'shopla',
      actionId: 'act_12345',
      status: 'COMPLETED',
      timestamp: '2026-08-24T10:00:00.000Z'
    },
    responseExample: { success: true },
    direction: 'PROVIDER_TO_ZAYUNO',
    legacyAliases: ['/api/v1/webhook (deprecated alias)']
  }
];

export function getProviderProtocolEndpoints(profile: ProviderProtocolProfile): ProviderProtocolEndpoint[] {
  return PROVIDER_PROTOCOL_ENDPOINTS.filter(endpoint => endpoint.profiles.includes(profile));
}

export function getProviderContractJsonSchemas(): Record<string, any> {
  const cleanSchema = (s: any): any => {
    if (!s || typeof s !== 'object') return s;
    const { $schema, ...rest } = s;
    return rest;
  };

  return {
    ProviderInfo: cleanSchema((zodToJsonSchema as any)(ProviderInfoSchema, { target: 'openApi3' })),
    HealthCheckResult: cleanSchema((zodToJsonSchema as any)(HealthCheckResultSchema, { target: 'openApi3' })),
    CatalogCategory: cleanSchema((zodToJsonSchema as any)(CatalogCategorySchema, { target: 'openApi3' })),
    OptionItem: cleanSchema((zodToJsonSchema as any)(OptionItemSchema, { target: 'openApi3' })),
    OptionGroup: cleanSchema((zodToJsonSchema as any)(OptionGroupSchema, { target: 'openApi3' })),
    OfferingVariant: cleanSchema((zodToJsonSchema as any)(OfferingVariantSchema, { target: 'openApi3' })),
    Offering: cleanSchema((zodToJsonSchema as any)(OfferingSchema, { target: 'openApi3' })),
    Catalog: cleanSchema((zodToJsonSchema as any)(CatalogSchema, { target: 'openApi3' })),
    Location: cleanSchema((zodToJsonSchema as any)(LocationSchema, { target: 'openApi3' })),
    RequestQuoteInput: cleanSchema((zodToJsonSchema as any)(RequestQuoteInputSchema, { target: 'openApi3' })),
    NormalizedQuote: cleanSchema((zodToJsonSchema as any)(NormalizedQuoteSchema, { target: 'openApi3' })),
    CreateActionInput: cleanSchema((zodToJsonSchema as any)(CreateActionInputSchema, { target: 'openApi3' })),
    NormalizedAction: cleanSchema((zodToJsonSchema as any)(NormalizedActionSchema, { target: 'openApi3' })),
    GetActionInput: cleanSchema((zodToJsonSchema as any)(GetActionInputSchema, { target: 'openApi3' })),
    CancelActionInput: cleanSchema((zodToJsonSchema as any)(CancelActionInputSchema, { target: 'openApi3' })),
    CancelActionResult: cleanSchema((zodToJsonSchema as any)(CancelActionResultSchema, { target: 'openApi3' })),
    PaymentOption: cleanSchema((zodToJsonSchema as any)(PaymentOptionSchema, { target: 'openApi3' })),
    NormalizedWebhookEvent: cleanSchema((zodToJsonSchema as any)(NormalizedWebhookEventSchema, { target: 'openApi3' })),
    DynamicServiceContext: cleanSchema((zodToJsonSchema as any)(DynamicServiceContextSchema, { target: 'openApi3' })),
    DynamicParameterDeclaration: cleanSchema((zodToJsonSchema as any)(DynamicParameterDeclarationSchema, { target: 'openApi3' })),
    ErrorResponse: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', description: 'Machine-readable error code' },
        message: { type: 'string', description: 'Human-readable error description' },
        details: { type: 'object', description: 'Optional structured diagnostic error details' }
      }
    }
  };
}

/**
 * Creates a fully valid OpenAPI 3.1 specification document for the Provider Contract.
 * Includes query parameters, path parameters, standard webhooks object, and canonical security schemes.
 */
export function createProviderOpenApiDocument(): Record<string, any> {
  const schemas = getProviderContractJsonSchemas();
  const paths: Record<string, Record<string, unknown>> = {};

  const schemaRefMap: Record<string, { reqRef?: string; resRef: string; isArray?: boolean }> = {
    metadata: { resRef: '#/components/schemas/ProviderInfo' },
    health: { resRef: '#/components/schemas/HealthCheckResult' },
    catalog: { resRef: '#/components/schemas/Catalog' },
    offering: { resRef: '#/components/schemas/Offering' },
    search: { resRef: '#/components/schemas/Offering', isArray: true },
    locations: { resRef: '#/components/schemas/Location', isArray: true },
    quote: { reqRef: '#/components/schemas/RequestQuoteInput', resRef: '#/components/schemas/NormalizedQuote' },
    'action-create': { reqRef: '#/components/schemas/CreateActionInput', resRef: '#/components/schemas/NormalizedAction' },
    'action-status': { resRef: '#/components/schemas/NormalizedAction' },
    'payment-options': { resRef: '#/components/schemas/PaymentOption', isArray: true },
    'action-cancel': { reqRef: '#/components/schemas/CancelActionInput', resRef: '#/components/schemas/CancelActionResult' }
  };

  const queryParamsMap: Record<string, Array<{ name: string; required?: boolean; schema: Record<string, any>; description: string }>> = {
    '/catalog': [
      { name: 'locationId', required: false, schema: { type: 'string' }, description: 'Location / branch filter' },
      { name: 'category', required: false, schema: { type: 'string' }, description: 'Category slug filter' },
      { name: 'context', required: false, schema: { type: 'string' }, description: 'JSON string of dynamic context parameters' }
    ],
    '/search': [
      { name: 'q', required: true, schema: { type: 'string' }, description: 'Search keyword query' },
      { name: 'limit', required: false, schema: { type: 'integer', default: 20 }, description: 'Max items to return' },
      { name: 'category', required: false, schema: { type: 'string' }, description: 'Category slug filter' },
      { name: 'locationId', required: false, schema: { type: 'string' }, description: 'Location filter' },
      { name: 'context', required: false, schema: { type: 'string' }, description: 'JSON string of dynamic context parameters' }
    ],
    '/locations': [
      { name: 'activeOnly', required: false, schema: { type: 'boolean', default: true }, description: 'Filter only active locations' }
    ]
  };

  for (const endpoint of PROVIDER_PROTOCOL_ENDPOINTS) {
    if (endpoint.direction === 'PROVIDER_TO_ZAYUNO') continue;

    const openApiPath = endpoint.path.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
    const method = endpoint.method.toLowerCase();
    const refs = schemaRefMap[endpoint.id];

    const parameters: Array<Record<string, any>> = [];

    // Path parameters
    if (openApiPath.includes('{id}')) {
      const isOffering = endpoint.id === 'offering';
      parameters.push({
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: isOffering ? 'Offering ID or offeringCode' : 'Action ID'
      });
    }

    // Query parameters
    if (queryParamsMap[openApiPath]) {
      for (const q of queryParamsMap[openApiPath]) {
        parameters.push({
          name: q.name,
          in: 'query',
          required: Boolean(q.required),
          schema: q.schema,
          description: q.description
        });
      }
    }

    const responses: Record<string, unknown> = {
      '200': {
        description: 'Muvaffaqiyatli javob',
        content: {
          'application/json': {
            schema: refs
              ? refs.isArray
                ? { type: 'array', items: { $ref: refs.resRef } }
                : { $ref: refs.resRef }
              : { type: 'object' },
            example: endpoint.responseExample
          }
        }
      },
      '400': {
        description: 'Noto‘g‘ri so‘rov parametri yoki validation xatosi',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { code: 'INVALID_ARGUMENT', message: 'Kiritilgan parametrlar Zod schemaga mos emas.' }
          }
        }
      },
      '401': {
        description: 'Autentifikatsiya xatosi (API kalit yoki token noto‘g‘ri)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { code: 'UNAUTHORIZED', message: 'Provider API kaliti talab qilinadi.' }
          }
        }
      },
      '404': {
        description: 'Resurs topilmadi',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { code: 'NOT_FOUND', message: 'So‘ralgan endpoint yoki ID mavjud emas.' }
          }
        }
      },
      '422': {
        description: 'Semantik yoki moliyaviy biznes mantiq xatosi (masalan: quote expired yoki quote math invalid)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { code: 'QUOTE_MATH_INVALID', message: 'Total narx subtotal + fees - discount formulasiga mos kelmadi.' }
          }
        }
      },
      '500': {
        description: 'Provider ichki server xatosi',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
            example: { code: 'INTERNAL_ERROR', message: 'Provider serverida kutilmagan xatolik yuz berdi.' }
          }
        }
      }
    };

    const operation: Record<string, unknown> = {
      summary: endpoint.summary,
      operationId: `${endpoint.capability.toLowerCase()}_${endpoint.id.replace(/-/g, '_')}`,
      tags: [endpoint.capability],
      parameters: parameters.length ? parameters : undefined,
      security: [
        { apiKeyAuth: [] },
        { bearerAuth: [] },
        { hmacAuth: [] }
      ],
      responses
    };

    if (endpoint.method === 'POST' && refs?.reqRef) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: refs.reqRef },
            example: endpoint.requestExample
          }
        }
      };
    }

    if (!paths[openApiPath]) {
      paths[openApiPath] = {};
    }
    paths[openApiPath][method] = operation;
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Zayuno Provider Contract',
      version: PROVIDER_CONTRACT_VERSION,
      description: 'Canonical Provider Integration API contract for AI Agent action execution'
    },
    servers: [{ url: 'https://api.yourbusiness.uz/zayuno', description: 'Provider HTTPS Base URL' }],
    paths,
    webhooks: {
      providerStatusEvent: {
        post: {
          summary: 'Provider status update event delivery to Zayuno ingestion gateway',
          description: 'Signed with HMAC-SHA256 in x-zayuno-signature header over raw request body.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NormalizedWebhookEvent' },
                example: {
                  eventId: 'evt_123',
                  eventType: 'action.status_updated',
                  providerSlug: 'shopla',
                  actionId: 'act_12345',
                  status: 'COMPLETED',
                  timestamp: '2026-08-24T10:00:00.000Z'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Event accepted and processed',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { success: { type: 'boolean' } } }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas,
      securitySchemes: {
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-provider-api-key',
          description: 'Static secret key issued or configured by provider'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Bearer token issued by provider'
        },
        hmacAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-zayuno-signature',
          description: 'HMAC-SHA256 signature calculated over raw request body'
        }
      }
    },
    'x-zayuno-webhook-ingestion': {
      method: 'POST',
      url: `https://api.zayuno.uz${ZAYUNO_WEBHOOK_INGESTION_PATH}`,
      description: 'Provider-to-Zayuno signed event destination.'
    }
  };
}

/**
 * Creates Postman Collection v2.1.0 from canonical manifest.
 */
export function createProviderPostmanCollection(): Record<string, any> {
  return {
    info: {
      name: 'Zayuno Provider Contract v1',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    variable: [
      { key: 'baseUrl', value: 'https://api.yourbusiness.uz/zayuno' },
      { key: 'zayunoApiUrl', value: 'https://api.zayuno.uz' },
      { key: 'providerSlug', value: 'shopla' },
      { key: 'providerApiKey', value: '' },
      { key: 'offeringId', value: 'item_coffee_latte' },
      { key: 'actionId', value: 'act_12345' },
      { key: 'webhookSecret', value: 'zy_whsec_sample123' },
      { key: 'webhookHmacSignature', value: '' },
      { key: 'isoTimestamp', value: '2026-08-24T10:00:00.000Z' }
    ],
    item: PROVIDER_PROTOCOL_ENDPOINTS.map(endpoint => {
      const isWebhook = endpoint.direction === 'PROVIDER_TO_ZAYUNO';
      const headers = isWebhook
        ? [
            { key: 'content-type', value: 'application/json' },
            { key: 'x-zayuno-signature', value: '{{webhookHmacSignature}}' },
            { key: 'x-provider-slug', value: '{{providerSlug}}' },
            { key: 'x-timestamp', value: '{{isoTimestamp}}' }
          ]
        : [
            { key: 'content-type', value: 'application/json' },
            { key: 'x-provider-api-key', value: '{{providerApiKey}}' }
          ];

      let rawUrl = isWebhook
        ? `{{zayunoApiUrl}}${endpoint.path.replace(':providerSlug', '{{providerSlug}}')}`
        : endpoint.id === 'offering'
        ? `{{baseUrl}}${endpoint.path.replace(':id', '{{offeringId}}')}`
        : `{{baseUrl}}${endpoint.path.replace(':id', '{{actionId}}')}`;

      return {
        name: `${endpoint.method} ${endpoint.path}`,
        request: {
          method: endpoint.method,
          header: headers,
          url: {
            raw: rawUrl,
            host: [isWebhook ? '{{zayunoApiUrl}}' : '{{baseUrl}}'],
            path: endpoint.path.replace(':providerSlug', '{{providerSlug}}').replace(':id', endpoint.id === 'offering' ? '{{offeringId}}' : '{{actionId}}').split('/').filter(Boolean)
          },
          body:
            endpoint.requestExample === undefined
              ? undefined
              : { mode: 'raw', raw: JSON.stringify(endpoint.requestExample, null, 2) }
        }
      };
    })
  };
}
