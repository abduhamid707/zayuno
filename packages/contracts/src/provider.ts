import { z } from 'zod';
import { IsoDateTimeSchema, optionalNullable } from './common';
import { Location, GetLocationsInput } from './location';
import {
  Catalog,
  Offering,
  GetCatalogInput,
  GetOfferingInput,
  SearchCatalogInput,
  CheckAvailabilityInput,
  AvailabilityResult
} from './catalog';
import { RequestQuoteInput, NormalizedQuote } from './quote';
import {
  CreateActionInput,
  NormalizedAction,
  GetActionInput,
  CancelActionInput,
  CancelActionResult
} from './action';
import { GetPaymentOptionsInput, PaymentOption } from './payment';
import { NormalizedWebhookEvent } from './webhook';

export enum ProviderStatus {
  DRAFT = 'DRAFT',
  SANDBOX = 'SANDBOX',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED'
}

export enum ProviderType {
  RETAIL = 'RETAIL',
  DELIVERY = 'DELIVERY',
  SERVICES = 'SERVICES',
  BOOKINGS = 'BOOKINGS',
  TICKETING = 'TICKETING',
  DIGITAL = 'DIGITAL',
  COMMERCE = 'COMMERCE',
  OTHER = 'OTHER'
}

/**
 * Deployment environment is independent from a provider's operational state.
 * An ACTIVE sandbox is healthy and usable for tests, but it must never be
 * mistaken for a live provider that can fulfil a real customer request.
 */
export enum ProviderEnvironment {
  LIVE = 'LIVE',
  SANDBOX = 'SANDBOX',
  STAGING = 'STAGING'
}

/**
 * Provider-level commercial verticals. Product/catalog categories and
 * fulfilment mode intentionally remain separate dimensions.
 */
export enum ProviderCategory {
  FOOD_AND_DRINK = 'FOOD_AND_DRINK',
  RETAIL = 'RETAIL',
  TRANSPORT = 'TRANSPORT',
  TICKETING = 'TICKETING',
  TRAVEL = 'TRAVEL',
  ACCOMMODATION = 'ACCOMMODATION',
  RECRUITMENT = 'RECRUITMENT',
  LOGISTICS = 'LOGISTICS',
  HEALTHCARE = 'HEALTHCARE',
  HOME_SERVICES = 'HOME_SERVICES',
  PROFESSIONAL_SERVICES = 'PROFESSIONAL_SERVICES',
  DIGITAL_SERVICES = 'DIGITAL_SERVICES',
  OTHER = 'OTHER'
}

const PROVIDER_CATEGORY_ALIASES: Record<string, ProviderCategory> = {
  food: ProviderCategory.FOOD_AND_DRINK,
  food_and_drink: ProviderCategory.FOOD_AND_DRINK,
  food_delivery: ProviderCategory.FOOD_AND_DRINK,
  food_dining: ProviderCategory.FOOD_AND_DRINK,
  restaurant: ProviderCategory.FOOD_AND_DRINK,
  restaurants: ProviderCategory.FOOD_AND_DRINK,
  fast_food: ProviderCategory.FOOD_AND_DRINK,
  cafe: ProviderCategory.FOOD_AND_DRINK,
  coffee: ProviderCategory.FOOD_AND_DRINK,
  coffee_shop: ProviderCategory.FOOD_AND_DRINK,
  pizza: ProviderCategory.FOOD_AND_DRINK,
  sushi: ProviderCategory.FOOD_AND_DRINK,
  retail: ProviderCategory.RETAIL,
  commerce: ProviderCategory.RETAIL,
  ecommerce: ProviderCategory.RETAIL,
  marketplace: ProviderCategory.RETAIL,
  shop: ProviderCategory.RETAIL,
  transport: ProviderCategory.TRANSPORT,
  mobility: ProviderCategory.TRANSPORT,
  taxi: ProviderCategory.TRANSPORT,
  ride_hailing: ProviderCategory.TRANSPORT,
  ticket: ProviderCategory.TICKETING,
  tickets: ProviderCategory.TICKETING,
  ticketing: ProviderCategory.TICKETING,
  events: ProviderCategory.TICKETING,
  travel: ProviderCategory.TRAVEL,
  tourism: ProviderCategory.TRAVEL,
  flights: ProviderCategory.TRAVEL,
  accommodation: ProviderCategory.ACCOMMODATION,
  hotel: ProviderCategory.ACCOMMODATION,
  hotels: ProviderCategory.ACCOMMODATION,
  lodging: ProviderCategory.ACCOMMODATION,
  recruitment: ProviderCategory.RECRUITMENT,
  jobs: ProviderCategory.RECRUITMENT,
  job_board: ProviderCategory.RECRUITMENT,
  hiring: ProviderCategory.RECRUITMENT,
  employment: ProviderCategory.RECRUITMENT,
  logistics: ProviderCategory.LOGISTICS,
  delivery: ProviderCategory.LOGISTICS,
  parcel: ProviderCategory.LOGISTICS,
  courier: ProviderCategory.LOGISTICS,
  shipping: ProviderCategory.LOGISTICS,
  healthcare: ProviderCategory.HEALTHCARE,
  health: ProviderCategory.HEALTHCARE,
  medical: ProviderCategory.HEALTHCARE,
  pharmacy: ProviderCategory.HEALTHCARE,
  home_services: ProviderCategory.HOME_SERVICES,
  home_service: ProviderCategory.HOME_SERVICES,
  professional_services: ProviderCategory.PROFESSIONAL_SERVICES,
  general_services: ProviderCategory.PROFESSIONAL_SERVICES,
  services: ProviderCategory.PROFESSIONAL_SERVICES,
  digital_services: ProviderCategory.DIGITAL_SERVICES,
  online_services: ProviderCategory.DIGITAL_SERVICES,
  digital: ProviderCategory.DIGITAL_SERVICES,
  general: ProviderCategory.OTHER,
  other: ProviderCategory.OTHER,
  misc: ProviderCategory.OTHER
};

function normalizeTaxonomyKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/** Accepts legacy spellings at the boundary and returns only the canonical enum. */
export function normalizeProviderCategory(value: unknown): ProviderCategory | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const key = normalizeTaxonomyKey(value);
  const direct = Object.values(ProviderCategory).find((category) => category.toLowerCase() === key);
  return direct || PROVIDER_CATEGORY_ALIASES[key];
}

/** Maps historic `PRODUCTION` metadata to the canonical `LIVE` environment. */
export function normalizeProviderEnvironment(value: unknown): ProviderEnvironment | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const key = normalizeTaxonomyKey(value);
  if (key === 'live' || key === 'production' || key === 'prod') return ProviderEnvironment.LIVE;
  if (key === 'sandbox' || key === 'test') return ProviderEnvironment.SANDBOX;
  if (key === 'staging' || key === 'preproduction' || key === 'preprod') return ProviderEnvironment.STAGING;
  return undefined;
}

const CanonicalProviderCategorySchema = z.nativeEnum(ProviderCategory);
const CanonicalProviderEnvironmentSchema = z.nativeEnum(ProviderEnvironment);

export const ProviderCategorySchema = z.preprocess(
  (value) => value === undefined || value === null ? value : normalizeProviderCategory(value) ?? value,
  CanonicalProviderCategorySchema
);

export const ProviderEnvironmentSchema = z.preprocess(
  (value) => value === undefined || value === null ? value : normalizeProviderEnvironment(value) ?? value,
  CanonicalProviderEnvironmentSchema
);

/**
 * Describes where a provider fulfils the service. Provider type/category alone
 * is not enough: a booking can be an on-site restaurant table or a remote
 * consultation. This value is the canonical source for location readiness.
 */
export enum ProviderFulfillmentMode {
  ONSITE = 'ONSITE',
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
  REMOTE = 'REMOTE',
  HYBRID = 'HYBRID'
}

export function defaultFulfillmentModeForProviderType(type?: ProviderType): ProviderFulfillmentMode {
  if (type === ProviderType.DELIVERY) return ProviderFulfillmentMode.DELIVERY;
  if (type === ProviderType.RETAIL || type === ProviderType.BOOKINGS) return ProviderFulfillmentMode.ONSITE;
  return ProviderFulfillmentMode.REMOTE;
}

export function defaultProviderCategoryForType(type?: ProviderType): ProviderCategory {
  if (type === ProviderType.RETAIL || type === ProviderType.COMMERCE) return ProviderCategory.RETAIL;
  if (type === ProviderType.TICKETING) return ProviderCategory.TICKETING;
  if (type === ProviderType.DIGITAL) return ProviderCategory.DIGITAL_SERVICES;
  if (type === ProviderType.SERVICES) return ProviderCategory.PROFESSIONAL_SERVICES;
  return ProviderCategory.OTHER;
}

export function requiresActiveLocations(
  type?: ProviderType,
  fulfillmentMode?: ProviderFulfillmentMode
): boolean {
  const mode = fulfillmentMode || defaultFulfillmentModeForProviderType(type);
  return mode === ProviderFulfillmentMode.ONSITE ||
    mode === ProviderFulfillmentMode.DELIVERY ||
    mode === ProviderFulfillmentMode.PICKUP ||
    mode === ProviderFulfillmentMode.HYBRID;
}

export enum ProviderCapability {
  METADATA = 'METADATA',
  HEALTH = 'HEALTH',
  LOCATIONS = 'LOCATIONS',
  CATALOG = 'CATALOG',
  SEARCH = 'SEARCH',
  QUOTE = 'QUOTE',
  ACTION_CREATE = 'ACTION_CREATE',
  ACTION_STATUS = 'ACTION_STATUS',
  ACTION_CANCEL = 'ACTION_CANCEL',
  PAYMENT_OPTIONS = 'PAYMENT_OPTIONS',
  WEBHOOK = 'WEBHOOK'
}

/**
 * Explicit categorization of capabilities.
 * Mandatory capabilities MUST be implemented and certified before a provider can be published.
 */
export const MANDATORY_CAPABILITIES: readonly ProviderCapability[] = [
  ProviderCapability.METADATA,
  ProviderCapability.HEALTH,
  ProviderCapability.CATALOG,
  ProviderCapability.QUOTE,
  ProviderCapability.ACTION_CREATE,
  ProviderCapability.ACTION_STATUS,
  ProviderCapability.WEBHOOK
] as const;

export const READONLY_MANDATORY_CAPABILITIES: readonly ProviderCapability[] = [
  ProviderCapability.METADATA,
  ProviderCapability.HEALTH,
  ProviderCapability.CATALOG
] as const;

export const TRANSACTIONAL_MANDATORY_CAPABILITIES: readonly ProviderCapability[] = [
  ProviderCapability.METADATA,
  ProviderCapability.HEALTH,
  ProviderCapability.CATALOG,
  ProviderCapability.QUOTE,
  ProviderCapability.ACTION_CREATE,
  ProviderCapability.ACTION_STATUS,
  ProviderCapability.WEBHOOK
] as const;

export enum ProviderCapabilityProfile {
  DISCOVERY_READONLY = 'DISCOVERY_READONLY',
  TRANSACTIONAL = 'TRANSACTIONAL'
}

export function determineProviderCapabilityProfile(
  capabilities: ProviderCapability[] = []
): ProviderCapabilityProfile {
  const isTransactional = capabilities.some(c =>
    c === ProviderCapability.QUOTE ||
    c === ProviderCapability.ACTION_CREATE ||
    c === ProviderCapability.ACTION_STATUS ||
    c === ProviderCapability.WEBHOOK
  );
  return isTransactional
    ? ProviderCapabilityProfile.TRANSACTIONAL
    : ProviderCapabilityProfile.DISCOVERY_READONLY;
}

export function getMandatoryCapabilitiesForProfile(
  profileOrCapabilities: ProviderCapabilityProfile | ProviderCapability[],
  options?: { isPhysical?: boolean; type?: ProviderType; fulfillmentMode?: ProviderFulfillmentMode }
): ProviderCapability[] {
  const profile = Array.isArray(profileOrCapabilities)
    ? determineProviderCapabilityProfile(profileOrCapabilities)
    : profileOrCapabilities;

  const baseMandatory: ProviderCapability[] =
    profile === ProviderCapabilityProfile.DISCOVERY_READONLY
      ? [...READONLY_MANDATORY_CAPABILITIES]
      : [...TRANSACTIONAL_MANDATORY_CAPABILITIES];

  const isPhysical = options?.isPhysical || requiresActiveLocations(options?.type, options?.fulfillmentMode);

  if (isPhysical && !baseMandatory.includes(ProviderCapability.LOCATIONS)) {
    baseMandatory.push(ProviderCapability.LOCATIONS);
  }

  return baseMandatory;
}

export const OPTIONAL_CAPABILITIES: readonly ProviderCapability[] = [
  ProviderCapability.LOCATIONS,
  ProviderCapability.SEARCH,
  ProviderCapability.ACTION_CANCEL,
  ProviderCapability.PAYMENT_OPTIONS
] as const;

export enum AuthMethod {
  API_KEY = 'API_KEY',
  BEARER_TOKEN = 'BEARER_TOKEN',
  HMAC_SIGNATURE = 'HMAC_SIGNATURE',
  OAUTH2_CLIENT_CREDENTIALS = 'OAUTH2_CLIENT_CREDENTIALS',
  NONE = 'NONE'
}

export const StructuredSupportContactSchema = z.object({
  phone: optionalNullable(z.string()),
  telegram: optionalNullable(z.string()),
  email: optionalNullable(z.string()),
  workingHours: optionalNullable(z.string()),
  /** A public business website or dedicated customer-support page. */
  supportUrl: optionalNullable(z.string()),
  /** Short, customer-facing guidance shown with a completed action. */
  supportNote: optionalNullable(z.string().trim().max(500)),
  locale: optionalNullable(z.string())
});
export type StructuredSupportContact = z.infer<typeof StructuredSupportContactSchema>;

export const SupportContactSchema = z.union([
  z.string(),
  StructuredSupportContactSchema
]);
export type SupportContact = z.infer<typeof SupportContactSchema>;

export const RequiredSupportContactSchema = z.union([
  z.string().trim().min(1, 'At least one customer support contact is required'),
  StructuredSupportContactSchema.refine(
    contact => Boolean(contact.phone?.trim() || contact.telegram?.trim() || contact.email?.trim() || contact.supportUrl?.trim()),
    { message: 'At least one customer support contact (phone, Telegram, email, or official support URL) is required' }
  )
]);

export const ProviderInfoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: optionalNullable(z.string()),
  logoUrl: optionalNullable(z.string()),
  status: z.nativeEnum(ProviderStatus),
  type: z.nativeEnum(ProviderType),
  environment: ProviderEnvironmentSchema.default(ProviderEnvironment.LIVE),
  fulfillmentMode: optionalNullable(z.nativeEnum(ProviderFulfillmentMode)),
  category: ProviderCategorySchema.default(ProviderCategory.OTHER),
  subcategory: optionalNullable(z.string().trim().min(1).max(100)),
  geography: optionalNullable(z.array(z.string()), ['UZ']),
  adapterType: z.string().default('sandbox'),
  authMethod: z.nativeEnum(AuthMethod).default(AuthMethod.API_KEY),
  capabilities: z.array(z.nativeEnum(ProviderCapability)),
  baseUrl: optionalNullable(z.string()),
  supportContact: optionalNullable(z.union([z.string(), StructuredSupportContactSchema])),
  isCertified: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  metadata: optionalNullable(z.record(z.any()), {})
});
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;

/**
 * Stable allowlist for agent and customer-facing provider discovery. Provider
 * connection details, ownership, operational history and raw metadata remain
 * in the internal ProviderInfo contract.
 */
export const PublicProviderInfoSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: optionalNullable(z.string()),
  logoUrl: optionalNullable(z.string()),
  status: z.nativeEnum(ProviderStatus),
  type: z.nativeEnum(ProviderType),
  environment: ProviderEnvironmentSchema.default(ProviderEnvironment.LIVE),
  fulfillmentMode: optionalNullable(z.nativeEnum(ProviderFulfillmentMode)),
  category: ProviderCategorySchema.default(ProviderCategory.OTHER),
  subcategory: optionalNullable(z.string().trim().min(1).max(100)),
  geography: optionalNullable(z.array(z.string()), ['UZ']),
  capabilities: z.array(z.nativeEnum(ProviderCapability)),
  supportContact: optionalNullable(z.union([z.string(), StructuredSupportContactSchema]))
});
export type PublicProviderInfo = z.infer<typeof PublicProviderInfoSchema>;

export const HealthCheckResultSchema = z.object({
  status: z.enum(['HEALTHY', 'DEGRADED', 'DOWN']),
  latencyMs: z.number().nonnegative(),
  message: optionalNullable(z.string()),
  timestamp: IsoDateTimeSchema
});
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;

export enum ProviderHealthState {
  UNKNOWN = 'UNKNOWN',
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
  RECOVERING = 'RECOVERING'
}

export const ProviderHealthMonitoringDataSchema = z.object({
  state: z.nativeEnum(ProviderHealthState).default(ProviderHealthState.UNKNOWN),
  consecutiveFailures: z.number().int().nonnegative().default(0),
  consecutiveSuccesses: z.number().int().nonnegative().default(0),
  lastCheckedAt: optionalNullable(IsoDateTimeSchema),
  lastSuccessAt: optionalNullable(IsoDateTimeSchema),
  lastFailureAt: optionalNullable(IsoDateTimeSchema),
  lastLatencyMs: optionalNullable(z.number().nonnegative()),
  unavailableSince: optionalNullable(IsoDateTimeSchema),
  lastFailureCode: optionalNullable(z.string()),
  isTemporarilyUnavailable: z.boolean().default(false)
});
export type ProviderHealthMonitoringData = z.infer<typeof ProviderHealthMonitoringDataSchema>;

/* -------------------------------------------------------------------------- */
/*                       DISCOVERY / SEARCH CAPABILITY                        */
/* -------------------------------------------------------------------------- */

export const FindProvidersInputSchema = z.object({
  category: z.string().trim().min(1).max(100).optional().describe('Canonical provider category (e.g. FOOD_AND_DRINK, LOGISTICS). Legacy aliases such as food_delivery are normalized at the boundary.'),
  environment: z.string().trim().min(1).max(32).optional().describe('Deployment environment. Public discovery defaults to LIVE; SANDBOX and STAGING are explicit non-production environments.'),
  capability: z.nativeEnum(ProviderCapability).optional().describe('Filter by required capability flag'),
  geography: z.string().optional().describe('Filter by geographic coverage (e.g. UZ, Tashkent, Samarkand)'),
  query: z.string().optional().describe('Search keyword matching provider name or description'),
  limit: z.number().int().positive().max(50).default(20),
  offset: z.number().int().nonnegative().default(0)
});
export type FindProvidersInput = z.infer<typeof FindProvidersInputSchema>;

export const FindProvidersResultSchema = z.object({
  total: z.number().int().nonnegative(),
  providers: z.array(ProviderInfoSchema)
});
export type FindProvidersResult = z.infer<typeof FindProvidersResultSchema>;

/* -------------------------------------------------------------------------- */
/*                       ONBOARDING & MANAGEMENT SCHEMAS                      */
/* -------------------------------------------------------------------------- */

// Uploaded logos are resized by the portal; bounded raster data URLs need no external storage service.
export const ProviderLogoSchema = z.string().max(96_000).refine(value => {
  if (value.startsWith('https://')) {
    try { const url = new URL(value); return !url.username && !url.password; } catch { return false; }
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return false;
  try {
    const bytes = atob(match[2]);
    return match[1] === 'png' ? bytes.startsWith('\x89PNG\r\n\x1a\n')
      : match[1] === 'jpeg' ? bytes.startsWith('\xff\xd8\xff')
      : bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP';
  } catch { return false; }
}, 'Logo must be a public HTTPS URL or a PNG/JPEG/WebP image under 96 KB');

export const RegisterProviderInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  logoUrl: ProviderLogoSchema.nullable().optional(),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  type: z.nativeEnum(ProviderType).default(ProviderType.SERVICES),
  environment: z.string().trim().min(1).max(32).optional()
    .refine((value) => value === undefined || normalizeProviderEnvironment(value) !== undefined, 'Environment must be LIVE, SANDBOX, or STAGING')
    .default(ProviderEnvironment.LIVE),
  fulfillmentMode: z.nativeEnum(ProviderFulfillmentMode).optional(),
  category: z.string().trim().min(1).max(100)
    .refine((value) => normalizeProviderCategory(value) !== undefined, 'Category must use a canonical category or supported legacy alias')
    .default(ProviderCategory.OTHER),
  subcategory: z.string().trim().min(1).max(100).optional(),
  geography: z.array(z.string()).default(['UZ']),
  baseUrl: z.string().url().optional(),
  apiSecret: z.string().optional(),
  authMethod: z.nativeEnum(AuthMethod).default(AuthMethod.API_KEY),
  authConfig: z.record(z.any()).optional(),
  capabilities: z.array(z.nativeEnum(ProviderCapability)).min(1),
  webhookUrl: z.string().url().optional(),
  supportContact: RequiredSupportContactSchema.superRefine((contact, context) => {
    if (typeof contact === 'string') return;
    const invalid = (field: string, message: string) => context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    if (contact.phone?.trim() && !/^\+?[\d\s()-]{7,22}$/.test(contact.phone.trim())) invalid('phone', 'Invalid support phone');
    if (contact.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) invalid('email', 'Invalid support email');
    if (contact.telegram?.trim() && !/^(?:@|https:\/\/t\.me\/)?[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(contact.telegram.trim())) invalid('telegram', 'Invalid Telegram username');
    if (contact.supportUrl?.trim()) {
      try {
        const url = new URL(contact.supportUrl.trim());
        if (url.protocol !== 'https:' || url.username || url.password) invalid('supportUrl', 'Support URL must be a public HTTPS URL');
      } catch { invalid('supportUrl', 'Invalid support URL'); }
    }
  })
});
export type RegisterProviderInput = z.infer<typeof RegisterProviderInputSchema>;

export const UpdateProviderIntegrationInputSchema = z.object({
  baseUrl: z.string().url(),
  apiSecret: z.string().min(12).max(512).optional(),
  webhookSecret: z.string().min(16).max(512).optional(),
  authMethod: z.nativeEnum(AuthMethod).default(AuthMethod.API_KEY),
  capabilities: z.array(z.nativeEnum(ProviderCapability)).min(1)
});
export type UpdateProviderIntegrationInput = z.infer<typeof UpdateProviderIntegrationInputSchema>;

export const ProviderCredentialsSchema = z.object({
  providerSlug: z.string(),
  sandboxApiKey: z.string(),
  sandboxWebhookSecret: z.string(),
  liveApiKey: z.string().optional(),
  liveWebhookSecret: z.string().optional()
});
export type ProviderCredentials = z.infer<typeof ProviderCredentialsSchema>;

/* -------------------------------------------------------------------------- */
/*                         COMPOSABLE CAPABILITY CONTRACTS                    */
/* -------------------------------------------------------------------------- */

export interface ProviderMetadataCapability {
  getProviderInfo(): Promise<ProviderInfo>;
}

export interface ProviderHealthCapability {
  checkHealth(): Promise<HealthCheckResult>;
}

export interface LocationsCapability {
  getLocations(input?: GetLocationsInput): Promise<Location[]>;
}

export interface CatalogCapability {
  getCatalog(input: GetCatalogInput): Promise<Catalog>;
  getOffering(input: GetOfferingInput): Promise<Offering>;
  checkAvailability?(input: CheckAvailabilityInput): Promise<AvailabilityResult>;
}

export interface SearchCapability {
  searchOfferings(input: SearchCatalogInput): Promise<Offering[]>;
}

export interface QuoteCapability {
  requestQuote(input: RequestQuoteInput): Promise<NormalizedQuote>;
}

export interface ActionCreateCapability {
  createAction(input: CreateActionInput): Promise<NormalizedAction>;
}

export interface ActionStatusCapability {
  getAction(input: GetActionInput): Promise<NormalizedAction>;
}

export interface ActionCancelCapability {
  cancelAction(input: CancelActionInput): Promise<CancelActionResult>;
}

export interface PaymentOptionsCapability {
  getPaymentOptions(input: GetPaymentOptionsInput): Promise<PaymentOption[]>;
}

export interface WebhookCapability {
  verifyWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string, secret: string): Promise<boolean>;
  parseWebhookEvent(headers: Record<string, string | string[] | undefined>, rawBody: string | any): Promise<NormalizedWebhookEvent>;
}

/**
 * Universal Provider Adapter Interface.
 * Every provider adapter must expose its providerSlug and list of supported capabilities.
 * Capabilities are implemented dynamically by the adapter.
 */
export interface ProviderAdapter {
  readonly providerSlug: string;
  getCapabilities(): ProviderCapability[];
  hasCapability(capability: ProviderCapability): boolean;

  // Optional Capability Implementations
  getProviderInfo?(): Promise<ProviderInfo>;
  checkHealth?(): Promise<HealthCheckResult>;
  getLocations?(input?: GetLocationsInput): Promise<Location[]>;
  getCatalog?(input: GetCatalogInput): Promise<Catalog>;
  getOffering?(input: GetOfferingInput): Promise<Offering>;
  checkAvailability?(input: CheckAvailabilityInput): Promise<AvailabilityResult>;
  searchOfferings?(input: SearchCatalogInput): Promise<Offering[]>;
  requestQuote?(input: RequestQuoteInput): Promise<NormalizedQuote>;
  createAction?(input: CreateActionInput): Promise<NormalizedAction>;
  getAction?(input: GetActionInput): Promise<NormalizedAction>;
  cancelAction?(input: CancelActionInput): Promise<CancelActionResult>;
  getPaymentOptions?(input: GetPaymentOptionsInput): Promise<PaymentOption[]>;
  verifyWebhook?(headers: Record<string, string | string[] | undefined>, rawBody: string, secret: string): Promise<boolean>;
  parseWebhookEvent?(headers: Record<string, string | string[] | undefined>, rawBody: string | any): Promise<NormalizedWebhookEvent>;
}

export interface WelcomeInfo {
  customerMessage: string;
  welcomeMessage: string;
  availableServiceCount: number | null;
  dynamicServiceMessage: string;
}
