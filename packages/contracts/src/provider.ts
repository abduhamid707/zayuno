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
  supportUrl: optionalNullable(z.string()),
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
    contact => Boolean(contact.phone?.trim() || contact.telegram?.trim() || contact.email?.trim()),
    { message: 'At least one customer support contact (phone, Telegram, or email) is required' }
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
  fulfillmentMode: optionalNullable(z.nativeEnum(ProviderFulfillmentMode)),
  category: z.string().default('general'),
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
  category: z.string().optional().describe('Filter by provider category (e.g. food_delivery, logistics, bookings)'),
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

export const RegisterProviderInputSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  type: z.nativeEnum(ProviderType).default(ProviderType.SERVICES),
  fulfillmentMode: z.nativeEnum(ProviderFulfillmentMode).optional(),
  category: z.string().default('general'),
  geography: z.array(z.string()).default(['UZ']),
  baseUrl: z.string().url().optional(),
  apiSecret: z.string().optional(),
  authMethod: z.nativeEnum(AuthMethod).default(AuthMethod.API_KEY),
  authConfig: z.record(z.any()).optional(),
  capabilities: z.array(z.nativeEnum(ProviderCapability)).min(1),
  webhookUrl: z.string().url().optional(),
  supportContact: RequiredSupportContactSchema
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
