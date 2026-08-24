import { z } from 'zod';

export interface ProviderContractIssue {
  code: string;
  endpoint: string;
  path: string;
  expected: string;
  received: string;
  docsUrl: string;
  message: string;
}

export class ProviderContractValidationError extends Error {
  readonly issue: ProviderContractIssue;

  constructor(issue: ProviderContractIssue) {
    super(issue.message);
    this.name = 'ProviderContractValidationError';
    this.issue = issue;
  }
}

function valueKind(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function valueAtPath(value: unknown, path: Array<string | number>): unknown {
  let current: any = value;
  for (const segment of path) {
    if (current === null || current === undefined) return undefined;
    current = current[segment as any];
  }
  return current;
}

export function validateProviderResponse<S extends z.ZodTypeAny>(
  endpoint: string,
  docsAnchor: string,
  schema: S,
  value: unknown
): z.output<S> {
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data as z.output<S>;

  const first = parsed.error.issues[0];
  const path = first.path.length ? `response.${first.path.join('.')}` : 'response';
  const receivedValue = valueAtPath(value, first.path);
  throw new ProviderContractValidationError({
    code: 'PROVIDER_RESPONSE_SCHEMA_INVALID',
    endpoint,
    path,
    expected: first.message,
    received: valueKind(receivedValue),
    docsUrl: `https://developers.zayuno.uz/?doc=provider-integration#${docsAnchor}`,
    message: `${endpoint} javobi Provider Contract v1 ga mos emas: ${path} — ${first.message}.`
  });
}

/** One-version migration boundary. New providers must emit canonical fields. */
export function normalizeLegacyQuoteResponse(value: any): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const normalized = { ...value };
  if (!normalized.id && typeof normalized.quoteId === 'string') normalized.id = normalized.quoteId;
  if (!normalized.lines && Array.isArray(normalized.items)) normalized.lines = normalized.items;
  return normalized;
}

/** Canonical payment-options response is a top-level array. */
export function normalizeLegacyPaymentOptionsResponse(value: any): unknown {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.options)) return value.options;
  return value;
}
