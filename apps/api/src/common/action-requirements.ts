import { CustomerContactSchema, emptyConversationState, ProviderManifestSchema, validateParametersAgainstDeclaration, ActionLocationSchema } from '@zayuno/contracts';
import { conversationRequirements, manifestOf, ZayunoError } from '@zayuno/shared';

export function assertActionRequirements(provider: any, input: any, capability: 'QUOTE' | 'ACTION_CREATE', quoteRequirements?: any): void {
  const raw = manifestOf(provider);
  const parsed = raw === undefined ? undefined : ProviderManifestSchema.safeParse(raw);
  if (parsed && !parsed.success) fail('Provider manifest is invalid.');
  const manifest = parsed?.success ? parsed.data : undefined;
  const mode = manifest?.requirements?.[capability]?.inputMode || manifest?.requirements?.QUOTE?.inputMode || 'OFFERING';
  if (!Array.isArray(input.items)) fail('items must be an array.');
  if (mode === 'OFFERING' && !input.items.length) fail('At least one item is required by the provider.');
  if (mode === 'PARAMETERS' && input.items.length) fail('This capability accepts parameter-based input only.');
  if (input.customer && !CustomerContactSchema.safeParse(input.customer).success) fail('Customer contact is invalid.');
  const roles = new Set<string>();
  for (const location of input.locations || []) {
    if (!ActionLocationSchema.safeParse(location).success) fail('Invalid location.');
    if (roles.has(location.role)) fail('Location roles must be unique.');
    roles.add(location.role);
    if (!manifest?.supportedLocationRoles?.some(role => role.role === location.role)) fail(`Undeclared location role: ${location.role}`);
  }
  const state = { ...emptyConversationState(), ...input, manifest, fulfillment: input.fulfillmentType,
    parameters: input.parameters || {}, customer: input.customer || {}, locations: input.locations || [],
    quote: quoteRequirements ? { requirements: quoteRequirements } : undefined };
  const missing = conversationRequirements(state as any, capability);
  if (missing.length) fail(`Missing required fields: ${missing.map(field => field.path).join(', ')}`, missing.map(field => field.path));
  for (const declaration of [manifest?.parametersSchema, manifest?.requirements?.[capability]?.parametersSchema,
    manifest?.fulfillmentRequirements?.[input.fulfillmentType]?.parametersSchema, quoteRequirements?.parametersSchema]) {
    if (!declaration) continue;
    // Per-declaration value validation; merged additionalProperties enforcement happens at the dynamic boundary.
    const result = validateParametersAgainstDeclaration(input.parameters || {}, { ...declaration, additionalProperties: true });
    if (!result.success) fail(result.error || 'Invalid parameters.');
  }
  if (input.fulfillmentType && manifest?.supportedFulfillmentModes && !manifest.supportedFulfillmentModes.includes(input.fulfillmentType)) fail('Unsupported fulfillment mode.');
  if (input.paymentMethod && manifest?.supportedPaymentMethods && !manifest.supportedPaymentMethods.includes(input.paymentMethod)) fail('Unsupported payment method.');
}
function fail(message: string, missingFields?: string[]): never {
  throw new ZayunoError(message, 400, 'VALIDATION_ERROR', { missingFields });
}
