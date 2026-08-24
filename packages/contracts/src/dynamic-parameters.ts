import { z } from 'zod';

export const FORBIDDEN_DYNAMIC_PARAM_KEY_REGEX =
  /(passport|documentnumber|identitynumber|jshshir|pinfl|cardnumber|bankcard|cvv|cvc|cardexpiry|otp|bankpassword|apikey|apisecret|token|secret|webhooksecret|password)/i;

/**
 * Checks whether an object, array, or key string contains any forbidden / sensitive parameter keys recursively.
 */
export function findForbiddenParameterKey(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const normalized = value.replace(/[_\-\s]/g, '');
    return FORBIDDEN_DYNAMIC_PARAM_KEY_REGEX.test(normalized) ? value : undefined;
  }

  const seen = new WeakSet<object>();

  const visit = (current: unknown, depth: number): string | undefined => {
    if (!current || typeof current !== 'object' || depth > 10) return undefined;
    if (seen.has(current as object)) return undefined;
    seen.add(current as object);

    if (Array.isArray(current)) {
      for (const item of current) {
        if (typeof item === 'string') {
          const normalized = item.replace(/[_\-\s]/g, '');
          if (FORBIDDEN_DYNAMIC_PARAM_KEY_REGEX.test(normalized)) return item;
        } else {
          const found = visit(item, depth + 1);
          if (found) return found;
        }
      }
      return undefined;
    }

    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      const normalized = key.replace(/[_\-\s]/g, '');
      if (FORBIDDEN_DYNAMIC_PARAM_KEY_REGEX.test(normalized)) return key;
      const found = visit(child, depth + 1);
      if (found) return found;
    }

    return undefined;
  };

  return visit(value, 0);
}

export function containsForbiddenSensitiveKey(value: unknown): boolean {
  if (typeof value === 'string') {
    const normalized = value.replace(/[_\-\s]/g, '');
    return FORBIDDEN_DYNAMIC_PARAM_KEY_REGEX.test(normalized);
  }
  return findForbiddenParameterKey(value) !== undefined;
}

export const DynamicParameterPropertyTypeSchema = z.enum([
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object'
]);
export type DynamicParameterPropertyType = z.infer<typeof DynamicParameterPropertyTypeSchema>;

export const DynamicParameterPropertySchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: DynamicParameterPropertyTypeSchema,
    title: z.string().max(100).optional(),
    description: z.string().max(500).optional(),
    enum: z.array(z.union([z.string(), z.number(), z.boolean()])).max(50).optional(),
    format: z.enum(['date', 'date-time', 'email', 'uri', 'uuid']).optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().positive().optional(),
    minItems: z.number().int().nonnegative().optional(),
    maxItems: z.number().int().positive().optional(),
    default: z.any().optional(),
    examples: z.array(z.any()).max(10).optional(),
    items: z.lazy(() => DynamicParameterPropertySchema).optional(),
    properties: z.record(z.lazy(() => DynamicParameterPropertySchema)).optional(),
    required: z.array(z.string()).optional(),
    additionalProperties: z.boolean().optional()
  })
);
export type DynamicParameterProperty = z.infer<typeof DynamicParameterPropertySchema>;

export const DynamicParameterDeclarationSchema = z.object({
  type: z.literal('object').default('object'),
  title: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  properties: z.record(DynamicParameterPropertySchema).default({}),
  required: z.array(z.string()).default([]),
  additionalProperties: z.boolean().default(true)
});
export type DynamicParameterDeclaration = z.infer<typeof DynamicParameterDeclarationSchema>;

/**
 * Validates a dynamic parameter declaration against depth, property count, size and sensitive key rules.
 */
export function validateDynamicParameterDeclaration(decl: unknown): { valid: boolean; success: boolean; error?: string } {
  if (!decl) return { valid: true, success: true };

  const parsed = DynamicParameterDeclarationSchema.safeParse(decl);
  if (!parsed.success) {
    return { valid: false, success: false, error: parsed.error.issues[0]?.message || 'Invalid declaration schema format.' };
  }

  const data = parsed.data;

  // Check forbidden sensitive fields anywhere in the entire declaration
  const forbiddenKey = findForbiddenParameterKey(data);
  if (forbiddenKey) {
    return {
      valid: false,
      success: false,
      error: `Forbidden sensitive parameter key "${forbiddenKey}" is not permitted in dynamic parameters.`
    };
  }

  let totalPropertyCount = 0;

  // Check maximum depth and property count
  const checkProperties = (props: Record<string, any>, currentDepth: number): string | undefined => {
    if (currentDepth > 3) {
      return 'Dynamic parameter schema nesting depth cannot exceed 3 levels.';
    }

    const keys = Object.keys(props || {});
    totalPropertyCount += keys.length;
    if (totalPropertyCount > 50) {
      return 'Dynamic parameter schema cannot exceed 50 total properties.';
    }

    for (const [_, prop] of Object.entries(props)) {
      if (prop && typeof prop === 'object') {
        if (prop.properties && typeof prop.properties === 'object') {
          const err = checkProperties(prop.properties, currentDepth + 1);
          if (err) return err;
        }
        if (prop.items && typeof prop.items === 'object' && prop.items.properties) {
          const err = checkProperties(prop.items.properties, currentDepth + 1);
          if (err) return err;
        }
      }
    }
    return undefined;
  };

  const depthError = checkProperties(data.properties, 1);
  if (depthError) {
    return { valid: false, success: false, error: depthError };
  }

  return { valid: true, success: true };
}

/**
 * Helper to recursively validate a value against a DynamicParameterProperty schema.
 */
function validatePropertyValue(
  val: unknown,
  schema: DynamicParameterProperty,
  path: string,
  rootAllowAdditional: boolean
): { valid: boolean; success: boolean; error?: string; missingRequired?: string[] } {
  if (val === undefined || val === null) {
    return { valid: true, success: true };
  }

  if (schema.enum && !schema.enum.includes(val as any)) {
    return {
      valid: false,
      success: false,
      error: `Invalid value for "${path}". Expected one of: ${schema.enum.join(', ')}`
    };
  }

  if (schema.type === 'string') {
    if (typeof val !== 'string') {
      return { valid: false, success: false, error: `Parameter "${path}" must be a string.` };
    }
    if (schema.minLength !== undefined && val.length < schema.minLength) {
      return { valid: false, success: false, error: `Parameter "${path}" length must be >= ${schema.minLength}.` };
    }
    if (schema.maxLength !== undefined && val.length > schema.maxLength) {
      return { valid: false, success: false, error: `Parameter "${path}" length must be <= ${schema.maxLength}.` };
    }
  } else if (schema.type === 'number') {
    if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
      return { valid: false, success: false, error: `Parameter "${path}" must be a valid number.` };
    }
    if (schema.minimum !== undefined && val < schema.minimum) {
      return { valid: false, success: false, error: `Parameter "${path}" must be >= ${schema.minimum}.` };
    }
    if (schema.maximum !== undefined && val > schema.maximum) {
      return { valid: false, success: false, error: `Parameter "${path}" must be <= ${schema.maximum}.` };
    }
  } else if (schema.type === 'integer') {
    if (typeof val !== 'number' || !Number.isInteger(val) || !isFinite(val)) {
      return { valid: false, success: false, error: `Parameter "${path}" must be an integer.` };
    }
    if (schema.minimum !== undefined && val < schema.minimum) {
      return { valid: false, success: false, error: `Parameter "${path}" must be >= ${schema.minimum}.` };
    }
    if (schema.maximum !== undefined && val > schema.maximum) {
      return { valid: false, success: false, error: `Parameter "${path}" must be <= ${schema.maximum}.` };
    }
  } else if (schema.type === 'boolean') {
    if (typeof val !== 'boolean') {
      return { valid: false, success: false, error: `Parameter "${path}" must be a boolean.` };
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(val)) {
      return { valid: false, success: false, error: `Parameter "${path}" must be an array.` };
    }
    if (schema.minItems !== undefined && val.length < schema.minItems) {
      return { valid: false, success: false, error: `Parameter "${path}" item count must be >= ${schema.minItems}.` };
    }
    if (schema.maxItems !== undefined && val.length > schema.maxItems) {
      return { valid: false, success: false, error: `Parameter "${path}" item count must be <= ${schema.maxItems}.` };
    }
    if (schema.items) {
      for (let i = 0; i < val.length; i++) {
        const itemRes = validatePropertyValue(val[i], schema.items, `${path}[${i}]`, rootAllowAdditional);
        if (!itemRes.success) return itemRes;
      }
    }
  } else if (schema.type === 'object') {
    if (typeof val !== 'object' || Array.isArray(val)) {
      return { valid: false, success: false, error: `Parameter "${path}" must be an object.` };
    }
    const obj = val as Record<string, unknown>;
    const required = schema.required || [];
    for (const req of required) {
      if (obj[req] === undefined || obj[req] === null || obj[req] === '') {
        return {
          valid: false,
          success: false,
          error: `Missing required parameter: ${path}.${req}`,
          missingRequired: [req]
        };
      }
    }
    const allowExtra = schema.additionalProperties !== undefined ? schema.additionalProperties : rootAllowAdditional;
    const knownProps = schema.properties || {};
    for (const [childKey, childVal] of Object.entries(obj)) {
      if (!knownProps[childKey]) {
        if (!allowExtra) {
          return {
            valid: false,
            success: false,
            error: `Property "${path}.${childKey}" is not allowed (additionalProperties: false).`
          };
        }
        continue;
      }
      const childRes = validatePropertyValue(childVal, knownProps[childKey], `${path}.${childKey}`, rootAllowAdditional);
      if (!childRes.success) return childRes;
    }
  }

  return { valid: true, success: true };
}

/**
 * Validates dynamic parameter values against a declaration schema.
 */
export function validateParametersAgainstDeclaration(
  params: unknown,
  declaration?: DynamicParameterDeclaration
): { valid: boolean; success: boolean; error?: string; missingRequired?: string[] } {
  if (!params) {
    if (declaration && declaration.required && declaration.required.length > 0) {
      return {
        valid: false,
        success: false,
        error: `Missing required parameter(s): ${declaration.required.join(', ')}`,
        missingRequired: declaration.required
      };
    }
    return { valid: true, success: true };
  }

  // Check forbidden sensitive fields anywhere in the submitted parameters
  const forbiddenKey = findForbiddenParameterKey(params);
  if (forbiddenKey) {
    return {
      valid: false,
      success: false,
      error: `Forbidden sensitive parameter key "${forbiddenKey}" is not permitted in dynamic parameters.`
    };
  }

  if (!declaration || !declaration.properties) {
    return { valid: true, success: true };
  }

  if (typeof params !== 'object' || Array.isArray(params)) {
    return { valid: false, success: false, error: 'Parameters must be an object.' };
  }

  const p = params as Record<string, unknown>;
  const missingRequired: string[] = [];

  for (const req of declaration.required || []) {
    if (p[req] === undefined || p[req] === null || p[req] === '') {
      missingRequired.push(req);
    }
  }

  if (missingRequired.length > 0) {
    return {
      valid: false,
      success: false,
      error: `Missing required parameter(s): ${missingRequired.join(', ')}`,
      missingRequired
    };
  }

  const allowAdditional = declaration.additionalProperties !== false;

  for (const [key, val] of Object.entries(p)) {
    const propSchema = declaration.properties[key];
    if (!propSchema) {
      if (!allowAdditional) {
        return {
          valid: false,
          success: false,
          error: `Property "${key}" is not allowed (additionalProperties: false).`
        };
      }
      continue;
    }

    const res = validatePropertyValue(val, propSchema, key, allowAdditional);
    if (!res.success) return res;
  }

  return { valid: true, success: true };
}
