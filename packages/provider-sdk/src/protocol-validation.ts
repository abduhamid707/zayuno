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

const MANDATORY_FIELD_NAMES = new Set([
  'id',
  'providerId',
  'providerSlug',
  'offeringCode',
  'title',
  'basePrice',
  'currency',
  'status',
  'type',
  'name',
  'address',
  'total',
  'subtotal',
  'lines',
  'items',
  'customer',
  'userConfirmed',
  'timestamp',
  'latencyMs',
  'categories',
  'offerings',
  'eventId',
  'eventType'
]);

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
    const received = valueKind(receivedValue);
    const rawExpected = err.message;

    let expected = rawExpected;
    let message = `${endpoint} javobi Provider Contract v1 ga mos emas: ${path} — ${rawExpected}.`;
    let fixExample: string | undefined;

    // Framework-aware actionable diagnosis when null is received
    if (received === 'null') {
      const fieldName = err.path.length ? String(err.path[err.path.length - 1]) : '';
      const isMandatory = MANDATORY_FIELD_NAMES.has(fieldName);

      if (isMandatory) {
        expected = `Majburiy maydon; real qiymat qaytarilishi shart (null yoki olib tashlash taqiqlanadi)`;
        message = `${endpoint} javobida majburiy '${path}' maydoni null qilib yuborilgan. Ushbu maydon platforma uchun majburiy bo‘lib, real qiymat qaytarishi shart.`;
        fixExample = `To‘g‘ri qiymat qaytaring: { "${fieldName}": <haqiqiy_qiymat> }`;
      } else {
        expected = `Optional maydon: to‘g‘ri tip yoki JSON’dan chiqarib tashlangan (undefined) bo‘lishi kerak`;
        message = `${endpoint} javobida '${path}' maydoni null bo‘lib keldi. Backend (FastAPI, Go, .NET, Laravel) response’dan optional null maydonlarni chiqarib tashlashi kerak.`;
        fixExample = `FastAPI: response_model_exclude_none=True | Go: json:"${fieldName},omitempty" | .NET: WhenWritingNull | PHP: array_filter`;
      }
    }

    return {
      code: 'PROVIDER_RESPONSE_SCHEMA_INVALID',
      endpoint,
      path,
      expected,
      received,
      docsUrl,
      message,
      fixExample
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
