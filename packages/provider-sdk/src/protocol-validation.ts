import { z } from 'zod';

export interface ProviderContractIssue {
  code: string;
  endpoint: string;
  path: string;
  expected: string;
  received: string;
  docsUrl: string;
  message: string;
  fixExample?: string;
}

export class ProviderContractValidationError extends Error {
  readonly issue: ProviderContractIssue;
  readonly issues: ProviderContractIssue[];

  constructor(issues: ProviderContractIssue[] | ProviderContractIssue) {
    const list = Array.isArray(issues) ? issues : [issues];
    const primary = list[0] || {
      code: 'PROVIDER_RESPONSE_SCHEMA_INVALID',
      endpoint: '',
      path: 'response',
      expected: 'Valid schema',
      received: 'invalid',
      docsUrl: '',
      message: 'Schema validation failed.'
    };
    const summary = list.length > 1
      ? `${primary.endpoint} javobida ${list.length} ta schema xatosi aniqlandi: ${list.map(i => `${i.path} (${i.expected})`).join('; ')}`
      : primary.message;
    super(summary);
    this.name = 'ProviderContractValidationError';
    this.issue = primary;
    this.issues = list;
  }
}

function valueKind(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
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

  const docsUrl = `https://developers.zayuno.uz/?doc=provider-integration#${docsAnchor}`;
  const issues: ProviderContractIssue[] = parsed.error.issues.map(err => {
    const path = err.path.length ? `response.${err.path.join('.')}` : 'response';
    const receivedValue = valueAtPath(value, err.path);
    const expected = err.message;
    return {
      code: 'PROVIDER_RESPONSE_SCHEMA_INVALID',
      endpoint,
      path,
      expected,
      received: valueKind(receivedValue),
      docsUrl,
      message: `${endpoint} javobi Provider Contract v1 ga mos emas: ${path} — ${expected}.`
    };
  });

  throw new ProviderContractValidationError(issues);
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
