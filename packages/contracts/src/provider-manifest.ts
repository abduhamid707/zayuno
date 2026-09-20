import { z } from 'zod';
import { DynamicParameterDeclarationSchema } from './dynamic-parameters';
import { CustomerContactSchema, ActionLocationSchema } from './common';

export const ProviderBrandingSchema = z.object({
  displayName: z.string().trim().min(1).max(160).optional(),
  logoUrl: z.string().max(96000).optional(),
  iconUrl: z.string().url().optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});
export const PresentationHintsSchema = z.object({
  title: z.string().max(200).optional(),
  actionLabel: z.string().max(100).optional(),
  fields: z.array(z.object({ path: z.string().max(160), label: z.string().max(100),
    format: z.enum(['text', 'date', 'money', 'link']).optional() })).max(30).optional(),
});
const requirement = z.enum(['OPTIONAL', 'REQUIRED', 'NOT_NEEDED']);
export const CustomerRequirementsSchema = z.object({
  name: requirement.optional(), phone: requirement.optional(), email: requirement.optional(),
});
export const CapabilityRequirementsSchema = z.object({
  inputMode: z.enum(['OFFERING', 'PARAMETERS', 'EITHER']).optional(),
  required: z.array(z.string().max(160)).max(100).optional(),
  parametersSchema: DynamicParameterDeclarationSchema.optional(),
  customerRequirements: CustomerRequirementsSchema.optional(),
});
export const ProviderManifestSchema = z.object({
  version: z.literal(1),
  certificationInput: z.object({
    parameters: z.record(z.any()).optional(),
    customer: CustomerContactSchema.optional(),
    locations: z.array(ActionLocationSchema).optional(),
    fulfillmentType: z.string().optional(),
  }).optional().describe('Non-production fixture inputs for capability certification; never real customer data'),
  capabilities: z.array(z.string()).optional(),
  requirements: z.record(CapabilityRequirementsSchema).optional(),
  customerRequirements: CustomerRequirementsSchema.optional(),
  parametersSchema: DynamicParameterDeclarationSchema.optional(),
  supportedFulfillmentModes: z.array(z.string()).optional(),
  fulfillmentRequirements: z.record(CapabilityRequirementsSchema).optional(),
  supportedLocationRoles: z.array(z.object({ role: z.string().min(1).max(80),
    required: z.boolean().optional(), title: z.string().max(100).optional() })).optional(),
  supportedPaymentMethods: z.array(z.string()).optional(),
  supportedCurrencies: z.array(z.string()).optional(),
  lifecycle: z.object({ status: z.boolean().optional(), cancel: z.boolean().optional(), webhook: z.boolean().optional() }).optional(),
  branding: ProviderBrandingSchema.optional(),
  presentationHints: PresentationHintsSchema.optional(),
});
export type ProviderManifest = z.infer<typeof ProviderManifestSchema>;
