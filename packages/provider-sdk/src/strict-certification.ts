import crypto from 'node:crypto';
import { emptyConversationState, ProviderManifestSchema, validateParametersAgainstDeclaration } from '@zayuno/contracts';
import { conversationRequirements, manifestOf, readField } from '@zayuno/shared';

export const CERTIFICATION_VERSION = 2;
export type ProbeEndpoint = '/provider-info' | '/quote' | '/actions' | '/actions/missing-certification-action';
export interface CertificationTransport {
  certificationProbe(endpoint: ProbeEndpoint, body?: unknown, auth?: 'valid' | 'missing' | 'invalid'): Promise<void>;
}
export interface WebhookDeliveryEvidence {
  eventId: string;
  actionId: string;
  status: string;
}

export function assertStrictManifest(info: any, capabilities: string[], transactional: boolean): void {
  const remote = new Set(info.capabilities || []);
  if (capabilities.some(capability => !remote.has(capability)) || [...remote].some(capability => !capabilities.includes(capability as string))) {
    throw new Error('Configured capabilities and /provider-info capabilities must match exactly.');
  }
  if (!transactional) return;
  const manifest = ProviderManifestSchema.parse(manifestOf(info));
  if (!manifest.certification?.safeTestEnvironment) {
    throw new Error('Declare manifest.certification.safeTestEnvironment=true and isolate certification traffic before running transactional tests.');
  }
  for (const capability of ['QUOTE', 'ACTION_CREATE']) {
    if (!manifest.requirements?.[capability]?.inputMode) {
      throw new Error(`Declare manifest.requirements.${capability}.inputMode explicitly.`);
    }
  }
  if (!manifest.customerRequirements && !manifest.requirements?.ACTION_CREATE?.customerRequirements) {
    throw new Error('Declare customerRequirements explicitly (use {} when no contact is needed).');
  }
}

function requirementState(info: any, input: any, offering: any, quote?: any) {
  return {
    ...emptyConversationState(),
    ...input,
    manifest: manifestOf(info),
    parameters: input.parameters || {},
    customer: input.customer || {},
    locations: input.locations || [],
    fulfillment: input.fulfillmentType,
    selectedOffering: offering,
    selectedVariant: input.items?.[0]?.variantId,
    selectedOptions: input.items?.[0]?.selectedOptions || [],
    quote
  } as any;
}

export function assertCertificationFixture(info: any, input: any, capability: string, offering?: any, quote?: any): void {
  const state = requirementState(info, input, offering, quote);
  const missing = conversationRequirements(state, capability);
  if (missing.length) {
    throw new Error(`Provide safe manifest.certificationInput values for: ${missing.map(field => field.path).join(', ')}.`);
  }
  const manifest = state.manifest;
  for (const schema of [
    manifest?.parametersSchema,
    manifest?.requirements?.[capability]?.parametersSchema,
    manifest?.fulfillmentRequirements?.[input.fulfillmentType]?.parametersSchema,
    offering?.parametersSchema,
    capability === 'ACTION_CREATE' ? quote?.requirements?.parametersSchema : undefined
  ]) {
    if (!schema) continue;
    const validation = validateParametersAgainstDeclaration(input.parameters || {}, { ...schema, additionalProperties: true });
    if (!validation.success) {
      throw new Error(`Invalid certification fixture: ${validation.error}`);
    }
  }
}

export interface ExpectRejectionOptions {
  auth?: 'valid' | 'missing' | 'invalid';
  disallowedCodes?: string[];
}

export async function expectRemoteRejection(
  adapter: any,
  endpoint: ProbeEndpoint,
  body: unknown,
  statuses: number[],
  authOrOptions: 'valid' | 'missing' | 'invalid' | ExpectRejectionOptions = 'valid',
  legacyDisallowedCodes?: string[]
): Promise<void> {
  const options: ExpectRejectionOptions = typeof authOrOptions === 'string'
    ? { auth: authOrOptions, disallowedCodes: legacyDisallowedCodes }
    : (authOrOptions || {});
  const auth = options.auth || 'valid';
  const disallowedCodes = options.disallowedCodes || [];

  if (typeof adapter.certificationProbe !== 'function') {
    throw new Error('No upstream transport probe available; local adapter validation is not evidence of provider rejection.');
  }
  try {
    await (adapter as CertificationTransport).certificationProbe(endpoint, body, auth);
  } catch (error: any) {
    const status = error?.details?.upstreamStatusCode ?? error?.status ?? error?.statusCode;
    const rawCode = String(error?.details?.rawCode || error?.details?.responseBody?.errorCode || error?.code || '').toUpperCase();
    const rawMessage = String(error?.details?.rawMessage || error?.details?.responseBody?.message || error?.message || '').toLowerCase();

    // 1. Upstream must not return authentication errors when auth is valid
    if (auth === 'valid' && (status === 401 || status === 403)) {
      throw new Error(`Upstream rejected with authentication error (${status}) instead of business rejection on ${endpoint}.`);
    }

    // 2. Server crashes or unhandled gateway failures (5xx) are NOT valid rejections
    if (typeof status === 'number' && status >= 500) {
      throw new Error(`Upstream server failed with HTTP ${status} on ${endpoint}; server crashes are not valid business rejections.`);
    }

    // 3. Rejection reason discrimination: disallow unrelated errors (e.g. QUOTE_EXPIRED when testing required fields)
    for (const disallowed of disallowedCodes) {
      const upperDisallowed = disallowed.toUpperCase();
      const messageTerm = disallowed.toLowerCase().replace(/_/g, ' ');
      if (rawCode.includes(upperDisallowed) || rawMessage.includes(messageTerm)) {
        throw new Error(`Upstream rejected for unrelated reason "${disallowed}" (code: ${rawCode || status}) instead of tested invariant on ${endpoint}: ${error.message}`);
      }
    }

    if (statuses.includes(status)) return;
    throw new Error(`Expected upstream rejection ${statuses.join('/')}; received ${status || 'no HTTP rejection'}.`);
  }
  throw new Error(`Provider accepted a request that must be rejected on ${endpoint}.`);
}

function removePath(input: any, path: string): void {
  if (path.startsWith('locations.')) {
    input.locations = (input.locations || []).filter((location: any) => location.role !== path.slice(10));
    return;
  }
  if (path === 'fulfillment') {
    delete input.fulfillmentType;
    return;
  }
  const parts = path.split('.');
  const parent = parts.slice(0, -1).reduce((value, key) => value?.[key], input);
  if (parent) delete parent[parts[parts.length - 1]];
}

export function requiredInputMutations(
  info: any,
  input: any,
  capability: string,
  offering?: any,
  quote?: any
): Array<{ path: string; input: any }> {
  const state = requirementState(info, input, offering, quote);
  // Keep the chosen offering/options, but clear user-supplied values to discover
  // required fields generically, including nested objects and location roles.
  const blank = { ...state, parameters: {}, customer: {}, locations: [], fulfillment: undefined };
  return conversationRequirements(blank, capability)
    .filter(field =>
      field.path.startsWith('parameters.') ||
      field.path.startsWith('customer.') ||
      field.path.startsWith('locations.') ||
      field.path === 'fulfillment'
    )
    .map(field => {
      const changed = structuredClone(input);
      removePath(changed, field.path);
      if (capability === 'ACTION_CREATE') changed.idempotencyKey = crypto.randomUUID();
      return { path: field.path, input: changed };
    });
}

export function invalidParameterMutations(info: any, input: any, capability: string): any[] {
  const manifest = manifestOf(info);
  const schemas = [
    manifest?.parametersSchema,
    manifest?.requirements?.[capability]?.parametersSchema,
    manifest?.fulfillmentRequirements?.[input.fulfillmentType]?.parametersSchema
  ];
  const paths = new Map<string, any>();
  const visit = (schema: any, prefix: string) => {
    for (const [key, value] of Object.entries(schema?.properties || {}) as any) {
      const path = `${prefix}.${key}`;
      if (value.type === 'object') visit(value, path);
      else paths.set(path, value);
    }
  };
  schemas.forEach(schema => visit(schema, 'parameters'));

  const mutations: any[] = [];
  for (const [path, schema] of paths) {
    if (readField(input, path) === undefined) continue;

    // Type mismatch mutation
    let invalidVal: any = schema.type === 'string' ? 12345 : 'invalid-certification-value';
    if (schema.type === 'number' || schema.type === 'integer') {
      invalidVal = 'not-a-number';
    } else if (schema.type === 'boolean') {
      invalidVal = 'not-a-boolean';
    }
    const typeMismatch = structuredClone(input);
    const parts = path.split('.');
    const parent = parts.slice(0, -1).reduce((value, key) => value[key], typeMismatch);
    parent[parts[parts.length - 1]] = invalidVal;
    if (capability === 'ACTION_CREATE') typeMismatch.idempotencyKey = crypto.randomUUID();
    mutations.push(typeMismatch);

    // Enum violation mutation if declared
    if (Array.isArray(schema.enum) && schema.enum.length > 0) {
      const enumMutation = structuredClone(input);
      const enumParent = parts.slice(0, -1).reduce((value, key) => value[key], enumMutation);
      enumParent[parts[parts.length - 1]] = '__INVALID_ENUM_OPTION_VAL__';
      if (capability === 'ACTION_CREATE') enumMutation.idempotencyKey = crypto.randomUUID();
      mutations.push(enumMutation);
    }

    // Number bound mutation if minimum declared
    if ((schema.type === 'number' || schema.type === 'integer') && typeof schema.minimum === 'number') {
      const minMutation = structuredClone(input);
      const minParent = parts.slice(0, -1).reduce((value, key) => value[key], minMutation);
      minParent[parts[parts.length - 1]] = schema.minimum - 1;
      if (capability === 'ACTION_CREATE') minMutation.idempotencyKey = crypto.randomUUID();
      mutations.push(minMutation);
    }
  }

  return mutations;
}

export function isCurrentCertification(report: any): boolean {
  return report?.certificationVersion === CERTIFICATION_VERSION && report?.mode === 'STRICT' && report?.isProductionReady === true;
}
