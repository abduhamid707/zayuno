import { z } from 'zod';
import { ProviderCapability } from './provider';

export const ConnectorInstanceStatusSchema = z.enum([
  'CONNECTED',
  'SYNCING',
  'PAUSED',
  'ERROR',
  'DISCONNECTED'
]);
export type ConnectorInstanceStatus = z.infer<typeof ConnectorInstanceStatusSchema>;

export const ConnectorDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string().default('1.0.0'),
  description: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  status: z.string().default('ACTIVE'),
  authType: z.enum(['API_KEY', 'OAUTH2', 'BEARER']).default('API_KEY'),
  capabilities: z.array(z.nativeEnum(ProviderCapability)).default([
    ProviderCapability.METADATA,
    ProviderCapability.CATALOG,
    ProviderCapability.SEARCH
  ]),
  configSchema: z.record(z.any()).default({}),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
export type ConnectorDefinition = z.infer<typeof ConnectorDefinitionSchema>;

export const ConnectorShopSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().optional(),
  legalName: z.string().optional()
});
export type ConnectorShop = z.infer<typeof ConnectorShopSchema>;

export const ConnectorInstanceSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  connectorDefinitionId: z.string(),
  credentialId: z.string(),
  name: z.string(),
  status: ConnectorInstanceStatusSchema,
  selectedShopId: z.string().nullable().optional(),
  selectedShopName: z.string().nullable().optional(),
  autoSyncEnabled: z.boolean().default(true),
  syncIntervalHours: z.number().int().default(8),
  lastSyncAt: z.string().nullable().optional(),
  lastSyncStatus: z.string().nullable().optional(),
  lastSyncError: z.string().nullable().optional(),
  nextSyncAt: z.string().nullable().optional(),
  totalProducts: z.number().int().default(0),
  activeProducts: z.number().int().default(0),
  maskedSecret: z.string().optional(),
  config: z.record(z.any()).default({}),
  metadata: z.record(z.any()).default({}),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
export type ConnectorInstance = z.infer<typeof ConnectorInstanceSchema>;

export const ConnectorAuthTestInputSchema = z.object({
  connectorDefinitionId: z.string().min(1),
  apiKey: z.string().min(1),
  config: z.record(z.any()).optional()
});
export type ConnectorAuthTestInput = z.infer<typeof ConnectorAuthTestInputSchema>;

export const CreateConnectorInstanceInputSchema = z.object({
  providerSlug: z.string().min(1),
  connectorDefinitionId: z.string().min(1),
  apiKey: z.string().min(1),
  shopId: z.string().min(1),
  shopName: z.string().min(1),
  name: z.string().optional(),
  autoSyncEnabled: z.boolean().optional(),
  syncIntervalHours: z.number().int().min(1).max(24).optional()
});
export type CreateConnectorInstanceInput = z.infer<typeof CreateConnectorInstanceInputSchema>;

export const RotateConnectorCredentialInputSchema = z.object({
  apiKey: z.string().min(1)
});
export type RotateConnectorCredentialInput = z.infer<typeof RotateConnectorCredentialInputSchema>;

export const CompareOfferingsInputSchema = z.object({
  offeringIds: z.array(z.string().min(1)).min(2, 'Kamida 2 ta mahsulot tanlanishi kerak').max(4, 'Ko‘pi bilan 4 ta mahsulotni solishtirish mumkin')
});
export type CompareOfferingsInput = z.infer<typeof CompareOfferingsInputSchema>;

export const ComparisonItemSchema = z.object({
  offeringId: z.string(),
  title: z.string(),
  providerSlug: z.string(),
  providerName: z.string(),
  imageUrl: z.string().nullable(),
  basePrice: z.number(),
  currency: z.string().default('UZS'),
  productUrl: z.string(),
  rating: z.number().nullable().optional(),
  isAvailable: z.boolean(),
  lastUpdated: z.string(),
  variantsSummary: z.string().optional()
});
export type ComparisonItem = z.infer<typeof ComparisonItemSchema>;

export const ComparisonAttributeSchema = z.object({
  name: z.string(),
  values: z.record(z.string().nullable())
});
export type ComparisonAttribute = z.infer<typeof ComparisonAttributeSchema>;

export const CompareOfferingsResultSchema = z.object({
  items: z.array(ComparisonItemSchema),
  attributes: z.array(ComparisonAttributeSchema),
  notice: z.string().default('Narxlar oxirgi sinxronizatsiya vaqtiga tegishli. Yakuniy shartlar rasmiy do‘konda belgilanadi.')
});
export type CompareOfferingsResult = z.infer<typeof CompareOfferingsResultSchema>;
