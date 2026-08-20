import { z } from 'zod';
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
  options?: { isPhysical?: boolean; type?: ProviderType }
): ProviderCapability[] {
  const profile = Array.isArray(profileOrCapabilities)
    ? determineProviderCapabilityProfile(profileOrCapabilities)
    : profileOrCapabilities;

  const baseMandatory: ProviderCapability[] =
    profile === ProviderCapabilityProfile.DISCOVERY_READONLY
      ? [...READONLY_MANDATORY_CAPABILITIES]
      : [...TRANSACTIONAL_MANDATORY_CAPABILITIES];

  const isPhysical =
    options?.isPhysical ||
    options?.type === ProviderType.DELIVERY ||
    options?.type === ProviderType.RETAIL ||
    options?.type === ProviderType.BOOKINGS;

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
  phone: z.string().optional(),
  telegram: z.string().optional(),
  email: z.string().optional(),
  workingHours: z.string().optional(),
  supportUrl: z.string().optional(),
  locale: z.string().optional()
});
export type StructuredSupportContact = z.infer<typeof StructuredSupportContactSchema>;

export const SupportContactSchema = z.union([
  z.string(),
  StructuredSupportContactSchema
]);
export type SupportContact = z.infer<typeof SupportContactSchema>;

export const ProviderInfoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  status: z.nativeEnum(ProviderStatus),
  type: z.nativeEnum(ProviderType),
  category: z.string().default('general'),
  geography: z.array(z.string()).default(['UZ']),
  adapterType: z.string().default('sandbox'),
  authMethod: z.nativeEnum(AuthMethod).default(AuthMethod.API_KEY),
  capabilities: z.array(z.nativeEnum(ProviderCapability)),
  baseUrl: z.string().optional(),
  supportContact: z.union([z.string(), StructuredSupportContactSchema]).optional(),
  isCertified: z.boolean().default(false),
  isPublished: z.boolean().default(false),
  metadata: z.record(z.any()).optional().default({})
});
export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;

export const HealthCheckResultSchema = z.object({
  status: z.enum(['HEALTHY', 'DEGRADED', 'DOWN']),
  latencyMs: z.number().nonnegative(),
  message: z.string().optional(),
  timestamp: z.string().datetime()
});
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>;

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
  category: z.string().default('general'),
  geography: z.array(z.string()).default(['UZ']),
  baseUrl: z.string().url().optional(),
  authMethod: z.nativeEnum(AuthMethod).default(AuthMethod.API_KEY),
  authConfig: z.record(z.any()).optional(),
  capabilities: z.array(z.nativeEnum(ProviderCapability)).min(1),
  webhookUrl: z.string().url().optional(),
  supportContact: z.union([z.string(), StructuredSupportContactSchema]).optional()
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
