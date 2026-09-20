import {
  type DynamicParameterDeclaration,
  DynamicParameterDeclarationSchema,
  type ProviderAdapter,
  ProviderCapability,
  validateParametersAgainstDeclaration
} from '@zayuno/contracts';
import { ZayunoError } from '@zayuno/shared';

type ParameterSchemaResolutionOptions = {
  locationId?: string;
  offeringIds?: string[];
  declarations?: unknown[];
};

function isParameterObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return isParameterObject(value) && Object.keys(value).length > 0;
}

function getDeclaredSchemas(config: any): unknown[] {
  return [
    config?.parametersSchema,
    config?.metadata?.parametersSchema,
    config?.metadata?.catalogParametersSchema,
    config?.config?.parametersSchema,
    config?.config?.catalogParametersSchema
  ];
}

/**
 * Merges catalog-level and selected-offering parameter declarations. A provider
 * can place common fields on the catalog and selection-specific fields on an
 * offering; required fields accumulate and a strict declaration remains strict.
 */
export function mergeDynamicParameterDeclarations(values: unknown[]): DynamicParameterDeclaration | undefined {
  const declarations = values
    .map(value => DynamicParameterDeclarationSchema.safeParse(value))
    .filter((result): result is { success: true; data: DynamicParameterDeclaration } => result.success)
    .map(result => result.data);

  if (declarations.length === 0) return undefined;

  return {
    type: 'object',
    properties: Object.assign({}, ...declarations.map(declaration => declaration.properties || {})),
    required: [...new Set(declarations.flatMap(declaration => declaration.required || []))],
    // If any participating declaration explicitly rejects unknown fields, do
    // not silently pass an unrecognized parameter to the adapter.
    additionalProperties: !declarations.some(declaration => declaration.additionalProperties === false)
  };
}

/**
 * Resolves the provider's published parameter declaration without making core
 * logic depend on a provider slug or domain. Adapter configuration is useful
 * for providers whose catalog is dynamic; catalog/offering declarations remain
 * the canonical discovery surface for all other providers.
 */
export async function resolveDynamicParameterDeclaration(
  adapter: ProviderAdapter,
  providerSlug: string,
  options: ParameterSchemaResolutionOptions = {}
): Promise<DynamicParameterDeclaration | undefined> {
  const config = typeof (adapter as any)?.getConfig === 'function'
    ? (adapter as any).getConfig()
    : (adapter as any)?.config;
  const declarations: unknown[] = [...getDeclaredSchemas(config), ...(options.declarations || [])];

  const supportsCatalog = typeof adapter.hasCapability === 'function'
    ? adapter.hasCapability(ProviderCapability.CATALOG)
    : typeof adapter.getCatalog === 'function';
  if (!supportsCatalog || !adapter.getCatalog) {
    return mergeDynamicParameterDeclarations(declarations);
  }

  try {
    // Do not pass user parameters while resolving the schema: a schema must be
    // knowable before an untrusted parameter can influence the provider call.
    const catalog = await adapter.getCatalog({
      providerSlug,
      locationId: options.locationId
    });
    declarations.push(catalog.parametersSchema);

    const requestedOfferingIds = new Set((options.offeringIds || []).filter(Boolean));
    if (requestedOfferingIds.size > 0) {
      for (const offering of catalog.offerings || []) {
        if (requestedOfferingIds.has(offering.id) || requestedOfferingIds.has(offering.offeringCode)) {
          declarations.push(offering.parametersSchema);
        }
      }
    }
  } catch {
    // A dynamic provider can require context merely to list its catalog. In
    // that case use its configuration declaration if one was supplied; do not
    // turn schema discovery failure into a false validation success below.
  }

  return mergeDynamicParameterDeclarations(declarations);
}

function unsupportedParameter(message: string, providerSlug: string): never {
  throw new ZayunoError(message, 400, 'UNSUPPORTED_PARAMETER', {
    retryable: false,
    providerSlug
  });
}

/**
 * Enforces a provider-published dynamic parameter declaration at every public
 * boundary. Empty parameters remain valid for static providers; non-empty
 * parameters require a declaration so no caller can mistake ignored context
 * for a supported filter, route, date, or preference.
 */
export async function assertDeclaredDynamicParameters(
  adapter: ProviderAdapter,
  providerSlug: string,
  parameters: Record<string, unknown> | undefined,
  options: ParameterSchemaResolutionOptions = {}
): Promise<void> {
  // TypeScript callers see Record<string, unknown>, but HTTP JSON bodies are
  // untrusted at runtime. Reject arrays and primitives before schema discovery
  // so a static provider cannot silently receive an invalid parameter shape.
  if (parameters !== undefined && parameters !== null && !isParameterObject(parameters)) {
    unsupportedParameter('Dynamic parameters must be an object.', providerSlug);
  }

  const declaration = await resolveDynamicParameterDeclaration(adapter, providerSlug, options);

  if (!declaration) {
    if (isNonEmptyObject(parameters)) {
      unsupportedParameter(
        `Provider "${providerSlug}" has not declared dynamic parameters for this operation. Remove unsupported parameters or use a provider-published parameter schema.`,
        providerSlug
      );
    }
    return;
  }

  const validation = validateParametersAgainstDeclaration(parameters || {}, declaration);
  if (!validation.success) {
    unsupportedParameter(validation.error || 'The supplied dynamic parameters are not supported by this provider.', providerSlug);
  }
}
