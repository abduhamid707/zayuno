/**
 * Stable, provider-agnostic error codes exposed to API and MCP consumers.
 * Provider adapters may retain a providerReason internally, but core decisions
 * must be made from one of these codes rather than a vendor-specific message.
 */
export const ZAYUNO_ERROR_CODES = [
  'PROVIDER_NOT_FOUND',
  'ENVIRONMENT_NOT_ALLOWED',
  'RESOURCE_NOT_FOUND',
  'LOCATION_NOT_FOUND',
  'OFFERING_NOT_FOUND',
  'CAPABILITY_NOT_SUPPORTED',
  'INVALID_VARIANT',
  'INVALID_OPTION',
  'INVALID_QUANTITY',
  'INVALID_SELECTION',
  'RESOURCE_UNAVAILABLE',
  'CAPACITY_EXCEEDED',
  'UNSUPPORTED_PARAMETER',
  'INVALID_PARAMETER',
  'VALIDATION_ERROR',
  'QUOTE_EXPIRED',
  'QUOTE_MISMATCH',
  'AVAILABILITY_UNKNOWN',
  'PROVIDER_UNAVAILABLE',
  'PROVIDER_TIMEOUT',
  'PROVIDER_RESPONSE_INVALID',
  'PROVIDER_AUTHENTICATION_ERROR',
  'RATE_LIMITED',
  'CONFLICT',
  'IDEMPOTENCY_CONFLICT',
  'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
  'ACTION_NOT_CANCELLABLE',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INTERNAL_ERROR'
] as const;

export type ZayunoErrorCode = (typeof ZAYUNO_ERROR_CODES)[number];

export type AgentRecommendedAction =
  | 'DISCOVER_PROVIDER'
  | 'USE_CATALOG'
  | 'REFINE_SELECTION'
  | 'REQUEST_QUOTE'
  | 'CHECK_AVAILABILITY'
  | 'RETRY'
  | 'WAIT_AND_RETRY'
  | 'CONTACT_SUPPORT'
  | 'STOP';

export interface AgentErrorPresentation {
  errorCode: ZayunoErrorCode;
  retryable: boolean;
  customerMessage: string;
  agentMessage: string;
  recommendedAction: AgentRecommendedAction;
}

export interface AgentErrorEnvelope extends AgentErrorPresentation {
  isError: true;
}

const ERROR_CODE_SET = new Set<string>(ZAYUNO_ERROR_CODES);

const ERROR_CODE_ALIASES: Record<string, ZayunoErrorCode> = {
  NOT_FOUND_ERROR: 'RESOURCE_NOT_FOUND',
  CONFLICT_ERROR: 'CONFLICT',
  UNAUTHORIZED_ERROR: 'UNAUTHORIZED',
  FORBIDDEN_ERROR: 'FORBIDDEN',
  PROVIDER_INTEGRATION_ERROR: 'PROVIDER_UNAVAILABLE',
  PROVIDER_ERROR: 'PROVIDER_UNAVAILABLE',
  HTTP_ERROR: 'INTERNAL_ERROR',
  INVALID_ARGUMENT: 'VALIDATION_ERROR',
  BAD_REQUEST: 'VALIDATION_ERROR',
  'BAD REQUEST': 'VALIDATION_ERROR',
  UNPROCESSABLE_ENTITY: 'VALIDATION_ERROR',
  'UNPROCESSABLE ENTITY': 'VALIDATION_ERROR',
  TOO_MANY_REQUESTS: 'RATE_LIMITED',
  'TOO MANY REQUESTS': 'RATE_LIMITED',
  GATEWAY_TIMEOUT: 'PROVIDER_TIMEOUT',
  REQUEST_TIMEOUT: 'PROVIDER_TIMEOUT',
  OUT_OF_STOCK: 'RESOURCE_UNAVAILABLE',
  'OUT OF STOCK': 'RESOURCE_UNAVAILABLE',
  SOLD_OUT: 'RESOURCE_UNAVAILABLE',
  'SOLD OUT': 'RESOURCE_UNAVAILABLE',
  INSUFFICIENT_INVENTORY: 'RESOURCE_UNAVAILABLE',
  'INSUFFICIENT INVENTORY': 'RESOURCE_UNAVAILABLE',
  INSUFFICIENT_STOCK: 'RESOURCE_UNAVAILABLE',
  'INSUFFICIENT STOCK': 'RESOURCE_UNAVAILABLE',
  NOT_ENOUGH_SEATS: 'RESOURCE_UNAVAILABLE',
  'NOT ENOUGH SEATS': 'RESOURCE_UNAVAILABLE',
  NOT_ENOUGH_TICKETS: 'RESOURCE_UNAVAILABLE',
  'NOT ENOUGH TICKETS': 'RESOURCE_UNAVAILABLE',
  MAX_QUANTITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  'MAX QUANTITY EXCEEDED': 'CAPACITY_EXCEEDED',
  LIMIT_EXCEEDED: 'CAPACITY_EXCEEDED',
  'LIMIT EXCEEDED': 'CAPACITY_EXCEEDED',
  EXCEEDS_CAPACITY: 'CAPACITY_EXCEEDED',
  'EXCEEDS CAPACITY': 'CAPACITY_EXCEEDED'
};

const ERROR_PRESENTATIONS: Record<ZayunoErrorCode, Omit<AgentErrorPresentation, 'errorCode'>> = {
  PROVIDER_NOT_FOUND: {
    retryable: false,
    customerMessage: 'Bu xizmat hamkori topilmadi. Boshqa hamkorni tanlaymiz.',
    agentMessage: 'Provider was not found. Discover a provider or correct providerSlug.',
    recommendedAction: 'DISCOVER_PROVIDER'
  },
  ENVIRONMENT_NOT_ALLOWED: {
    retryable: false,
    customerMessage: 'Bu xizmat joriy muhitda mavjud emas.',
    agentMessage: 'Provider is not accessible in the current execution environment context. Switch to the matching environment (e.g. SANDBOX) or select a LIVE provider.',
    recommendedAction: 'DISCOVER_PROVIDER'
  },
  RESOURCE_NOT_FOUND: {
    retryable: false,
    customerMessage: 'So‘ralgan ma’lumot topilmadi. Kerakli variantni qayta tanlaymiz.',
    agentMessage: 'Requested resource was not found. Refresh the relevant catalog or identifier.',
    recommendedAction: 'REFINE_SELECTION'
  },
  LOCATION_NOT_FOUND: {
    retryable: false,
    customerMessage: 'So‘ralgan filial yoki manzil topilmadi. Boshqa manzilni tanlaymiz.',
    agentMessage: 'Location was not found for this provider. Refresh provider locations.',
    recommendedAction: 'REFINE_SELECTION'
  },
  OFFERING_NOT_FOUND: {
    retryable: false,
    customerMessage: 'Tanlangan variant katalogda topilmadi. Boshqa variantni tanlaymiz.',
    agentMessage: 'Offering was not found. Refresh the provider catalog and ask the user to select again.',
    recommendedAction: 'USE_CATALOG'
  },
  CAPABILITY_NOT_SUPPORTED: {
    retryable: false,
    customerMessage: 'Bu xizmatda so‘ralgan amal mavjud emas. Katalogdan mos variantni topaman.',
    agentMessage: 'Requested capability is not supported. Fallback: use CATALOG and local filtering when CATALOG is available.',
    recommendedAction: 'USE_CATALOG'
  },
  INVALID_VARIANT: {
    retryable: false,
    customerMessage: 'Tanlangan variant mavjud emas. To‘g‘ri variantni tanlab olamiz.',
    agentMessage: 'Variant is invalid. Refresh offering details and collect a valid variantId.',
    recommendedAction: 'REFINE_SELECTION'
  },
  INVALID_OPTION: {
    retryable: false,
    customerMessage: 'Tanlangan qo‘shimcha mos kelmadi. Variantlarni qayta tanlaymiz.',
    agentMessage: 'Option selection is invalid. Refresh offering option groups and collect a valid selection.',
    recommendedAction: 'REFINE_SELECTION'
  },
  INVALID_QUANTITY: {
    retryable: false,
    customerMessage: 'Miqdor qabul qilinmadi. Kerakli miqdorni aniqlashtirib olamiz.',
    agentMessage: 'Quantity is invalid. Ask for a positive, provider-allowed quantity and request a new quote.',
    recommendedAction: 'REFINE_SELECTION'
  },
  INVALID_SELECTION: {
    retryable: false,
    customerMessage: 'Tanlangan o‘rindiq yoki kombinatsiya mos kelmadi. Boshqa qulay variantni tanlab ko‘ramiz.',
    agentMessage: 'The selected item, seat, or configuration is invalid. Refresh available options and refine selection.',
    recommendedAction: 'REFINE_SELECTION'
  },
  RESOURCE_UNAVAILABLE: {
    retryable: false,
    customerMessage: 'Afsuski, so‘ralgan mahsulot yoki xizmat hozirda tugagan yoki yetarli emas. Boshqa variantni tanlaymiz.',
    agentMessage: 'Requested resource is out of stock or unavailable. Suggest alternative offerings or different quantities.',
    recommendedAction: 'REFINE_SELECTION'
  },
  CAPACITY_EXCEEDED: {
    retryable: false,
    customerMessage: 'So‘ralgan miqdor mavjud chegaradan ortiq. Miqdorni kamaytirib ko‘ramiz.',
    agentMessage: 'Requested capacity or quantity exceeds available limit. Ask user to reduce quantity or choose another variant.',
    recommendedAction: 'REFINE_SELECTION'
  },
  UNSUPPORTED_PARAMETER: {
    retryable: false,
    customerMessage: 'Bu xizmat uchun kiritilgan qo‘shimcha ma’lumot qo‘llab-quvvatlanmaydi.',
    agentMessage: 'A dynamic parameter is not declared by this provider. Remove it or use the declared parameter schema.',
    recommendedAction: 'REFINE_SELECTION'
  },
  INVALID_PARAMETER: {
    retryable: false,
    customerMessage: 'Kiritilgan qo‘shimcha ma’lumot formatini aniqlashtirish kerak.',
    agentMessage: 'A dynamic parameter has an invalid value or type. Correct it against the provider declaration.',
    recommendedAction: 'REFINE_SELECTION'
  },
  VALIDATION_ERROR: {
    retryable: false,
    customerMessage: 'Kiritilgan ma’lumotlarni aniqlashtirish kerak. To‘g‘ri ma’lumot bilan davom etaman.',
    agentMessage: 'Request validation failed. Correct only the indicated input and retry the operation.',
    recommendedAction: 'REFINE_SELECTION'
  },
  QUOTE_EXPIRED: {
    retryable: false,
    customerMessage: 'Hisob-kitob muddati tugagan. Yangisini hisoblab beraman.',
    agentMessage: 'Quote expired. Request a fresh quote and obtain confirmation again before creating an action.',
    recommendedAction: 'REQUEST_QUOTE'
  },
  QUOTE_MISMATCH: {
    retryable: false,
    customerMessage: 'Tanlangan buyurtma hisob-kitob bilan mos kelmadi. Yangisini hisoblab beraman.',
    agentMessage: 'Action no longer matches the verified quote. Request a fresh quote and obtain confirmation again.',
    recommendedAction: 'REQUEST_QUOTE'
  },
  AVAILABILITY_UNKNOWN: {
    retryable: false,
    customerMessage: 'Jonli mavjudlikni hozir aniq tekshirib bo‘lmadi. Yakuniy holat hisob-kitobda tasdiqlanadi.',
    agentMessage: 'Availability is unknown. Do not claim stock; request a quote as the verification point.',
    recommendedAction: 'REQUEST_QUOTE'
  },
  PROVIDER_UNAVAILABLE: {
    retryable: true,
    customerMessage: 'Hamkor xizmat hozir javob bermayapti. Birozdan so‘ng qayta urinaman.',
    agentMessage: 'Provider is unavailable. Retry a read operation; for transactional retries verify quote/action state first.',
    recommendedAction: 'RETRY'
  },
  PROVIDER_TIMEOUT: {
    retryable: true,
    customerMessage: 'Hamkor xizmatdan javob olish cho‘zildi. Birozdan so‘ng qayta urinaman.',
    agentMessage: 'Provider request timed out. Retry a read operation; request fresh state before repeating a transaction.',
    recommendedAction: 'RETRY'
  },
  PROVIDER_RESPONSE_INVALID: {
    retryable: false,
    customerMessage: 'Hamkor xizmatidan to‘g‘ri javob olinmadi. Boshqa variantni topishga yordam beraman.',
    agentMessage: 'Provider returned a response that violates the canonical contract. Do not retry blindly; use another provider or escalate.',
    recommendedAction: 'CONTACT_SUPPORT'
  },
  PROVIDER_AUTHENTICATION_ERROR: {
    retryable: false,
    customerMessage: 'Bu hamkor bilan aloqa vaqtincha sozlanmagan. Boshqa variantni tanlaymiz.',
    agentMessage: 'Provider authentication failed. This requires provider-owner remediation, not a customer retry.',
    recommendedAction: 'CONTACT_SUPPORT'
  },
  RATE_LIMITED: {
    retryable: true,
    customerMessage: 'So‘rovlar soni vaqtincha cheklangan. Biroz kutib davom etaman.',
    agentMessage: 'Rate limit reached. Wait before retrying and avoid parallel duplicate requests.',
    recommendedAction: 'WAIT_AND_RETRY'
  },
  CONFLICT: {
    retryable: false,
    customerMessage: 'Bu amal hozirgi holat bilan mos kelmadi. Ma’lumotlarni yangilab davom etaman.',
    agentMessage: 'Request conflicts with current state. Refresh state before attempting a new operation.',
    recommendedAction: 'REFINE_SELECTION'
  },
  IDEMPOTENCY_CONFLICT: {
    retryable: true,
    customerMessage: 'Buyurtma hozir qayta ishlanmoqda. Bir ozdan keyin holatini tekshiraman.',
    agentMessage: 'An operation with this idempotency key is in flight. Wait, then read action state before retrying.',
    recommendedAction: 'WAIT_AND_RETRY'
  },
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: {
    retryable: false,
    customerMessage: 'Bu so‘rov kaliti avval boshqa buyurtma uchun ishlatilgan. Yangilangan buyurtma uchun qayta hisob-kitob qilaman.',
    agentMessage: 'Idempotency key belongs to a different payload. Request a fresh quote and use a new idempotency key.',
    recommendedAction: 'REQUEST_QUOTE'
  },
  ACTION_NOT_CANCELLABLE: {
    retryable: false,
    customerMessage: 'Bu buyurtmani hozir bekor qilib bo‘lmaydi.',
    agentMessage: 'Action is past its cancellation boundary. Do not retry cancellation; explain the current status.',
    recommendedAction: 'STOP'
  },
  UNAUTHORIZED: {
    retryable: false,
    customerMessage: 'Bu amal uchun ruxsat kerak.',
    agentMessage: 'Authentication is required or expired. Refresh credentials before retrying.',
    recommendedAction: 'CONTACT_SUPPORT'
  },
  FORBIDDEN: {
    retryable: false,
    customerMessage: 'Bu amalni bajarish uchun ruxsat yo‘q.',
    agentMessage: 'Caller is not permitted to perform this operation. Do not retry with the same credentials.',
    recommendedAction: 'STOP'
  },
  INTERNAL_ERROR: {
    retryable: true,
    customerMessage: 'Hozir buyurtmani yakunlay olmadim. Qayta urinib ko‘raymi?',
    agentMessage: 'The requested operation could not be completed. Review error code and state before retrying.',
    recommendedAction: 'RETRY'
  }
};

function asRecord(value: unknown): Record<string, any> | undefined {
  return value && typeof value === 'object' ? value as Record<string, any> : undefined;
}

/** Converts legacy, Nest, and provider error labels into one stable code. */
export function normalizeZayunoErrorCode(
  code?: unknown,
  statusCode?: unknown,
  message?: unknown
): ZayunoErrorCode {
  const normalizedCode = typeof code === 'string'
    ? code.trim().toUpperCase().replace(/[\s-]+/g, '_')
    : '';

  if (ERROR_CODE_SET.has(normalizedCode)) return normalizedCode as ZayunoErrorCode;
  if (normalizedCode && ERROR_CODE_ALIASES[normalizedCode]) return ERROR_CODE_ALIASES[normalizedCode];

  const text = `${normalizedCode} ${typeof message === 'string' ? message : ''}`.toUpperCase();
  if (text.includes('CAPABILITY') && (text.includes('NOT_SUPPORTED') || text.includes('DOES NOT SUPPORT'))) {
    return 'CAPABILITY_NOT_SUPPORTED';
  }
  if (text.includes('QUOTE') && text.includes('EXPIRED')) return 'QUOTE_EXPIRED';
  if (text.includes('QUOTE') && (text.includes('MISMATCH') || text.includes('DOES NOT BELONG'))) return 'QUOTE_MISMATCH';
  if (text.includes('INVALID_VARIANT')) return 'INVALID_VARIANT';
  if (text.includes('INVALID_OPTION')) return 'INVALID_OPTION';
  if (text.includes('INVALID_QUANTITY')) return 'INVALID_QUANTITY';
  if (text.includes('AVAILABILITY') && text.includes('UNKNOWN')) return 'AVAILABILITY_UNKNOWN';

  if (
    normalizedCode === 'ENVIRONMENT_NOT_ALLOWED' ||
    text.includes('ENVIRONMENT_NOT_ALLOWED') ||
    text.includes('ENVIRONMENT NOT ALLOWED') ||
    text.includes('ENVIRONMENT MISMATCH')
  ) {
    return 'ENVIRONMENT_NOT_ALLOWED';
  }

  // Specific Provider / Location / Offering not found heuristics
  if (
    normalizedCode === 'PROVIDER_NOT_FOUND' ||
    normalizedCode === 'NO_SUCH_PROVIDER' ||
    text.includes('PROVIDER NOT FOUND') ||
    text.includes('PROVIDER DOES NOT EXIST') ||
    text.includes('NO PROVIDER FOUND')
  ) {
    return 'PROVIDER_NOT_FOUND';
  }
  if (
    normalizedCode === 'LOCATION_NOT_FOUND' ||
    text.includes('LOCATION NOT FOUND') ||
    text.includes('LOCATION DOES NOT EXIST')
  ) {
    return 'LOCATION_NOT_FOUND';
  }
  if (
    normalizedCode === 'OFFERING_NOT_FOUND' ||
    text.includes('OFFERING NOT FOUND') ||
    text.includes('OFFERING DOES NOT EXIST') ||
    text.includes('NO OFFERING FOUND')
  ) {
    return 'OFFERING_NOT_FOUND';
  }

  // Capacity and Inventory Exhaustion
  if (
    normalizedCode === 'RESOURCE_UNAVAILABLE' ||
    normalizedCode === 'OUT_OF_STOCK' ||
    normalizedCode === 'SOLD_OUT' ||
    normalizedCode === 'INSUFFICIENT_INVENTORY' ||
    normalizedCode === 'NOT_ENOUGH_SEATS' ||
    normalizedCode === 'NOT_ENOUGH_TICKETS' ||
    text.includes('OUT OF STOCK') ||
    text.includes('SOLD OUT') ||
    text.includes('NOT ENOUGH SEATS') ||
    text.includes('NOT ENOUGH TICKETS') ||
    text.includes('INSUFFICIENT INVENTORY') ||
    text.includes('INSUFFICIENT STOCK') ||
    text.includes('NO AVAILABLE SEATS') ||
    text.includes('NO AVAILABLE TICKETS')
  ) {
    return 'RESOURCE_UNAVAILABLE';
  }

  if (
    normalizedCode === 'CAPACITY_EXCEEDED' ||
    normalizedCode === 'MAX_QUANTITY_EXCEEDED' ||
    normalizedCode === 'LIMIT_EXCEEDED' ||
    text.includes('CAPACITY EXCEEDED') ||
    text.includes('MAXIMUM QUANTITY') ||
    text.includes('MAX QUANTITY') ||
    text.includes('LIMIT EXCEEDED') ||
    text.includes('EXCEEDS AVAILABLE') ||
    text.includes('EXCEEDS CAPACITY') ||
    text.includes('EXCEEDS LIMIT') ||
    text.includes('EXCEEDS MAXIMUM') ||
    (text.includes('EXCEEDS') && (text.includes('QUANTITY') || text.includes('ALLOWED') || text.includes('LIMIT') || text.includes('CAPACITY'))) ||
    (text.includes('MAXIMUM') && text.includes('QUANTITY')) ||
    text.includes('TOO MANY TICKETS') ||
    text.includes('TOO MANY SEATS') ||
    text.includes('TOO MANY ITEMS')
  ) {
    return 'CAPACITY_EXCEEDED';
  }

  if (
    normalizedCode === 'INVALID_SELECTION' ||
    text.includes('INVALID SELECTION') ||
    text.includes('SEAT NOT AVAILABLE') ||
    text.includes('SECTOR NOT AVAILABLE')
  ) {
    return 'INVALID_SELECTION';
  }

  const status = typeof statusCode === 'number' ? statusCode : Number(statusCode);
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'RESOURCE_NOT_FOUND';
  if (status === 408 || status === 504) return 'PROVIDER_TIMEOUT';
  if (status === 409) return 'CONFLICT';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status === 502 || status === 503) return 'PROVIDER_UNAVAILABLE';
  return 'INTERNAL_ERROR';
}

/** Returns a safe customer/agent presentation without exposing raw provider errors. */
export function getAgentErrorPresentation(error?: unknown): AgentErrorPresentation {
  const candidate = asRecord(error);
  const details = asRecord(candidate?.details);
  const errorCode = normalizeZayunoErrorCode(
    candidate?.errorCode || candidate?.code,
    candidate?.statusCode || candidate?.status,
    candidate?.message
  );
  const base = ERROR_PRESENTATIONS[errorCode];
  const explicitRetryable = typeof candidate?.retryable === 'boolean'
    ? candidate.retryable
    : typeof details?.retryable === 'boolean'
      ? details.retryable
      : undefined;

  return {
    errorCode,
    retryable: explicitRetryable ?? base.retryable,
    customerMessage: base.customerMessage,
    agentMessage: base.agentMessage,
    recommendedAction: base.recommendedAction
  };
}

export function buildAgentErrorEnvelope(error?: unknown): AgentErrorEnvelope {
  return { isError: true, ...getAgentErrorPresentation(error) };
}

export class ZayunoError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;
  public readonly retryable?: boolean;

  constructor(message: string, statusCode = 500, code: ZayunoErrorCode | string = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = normalizeZayunoErrorCode(code, statusCode, message);
    this.details = details;
    this.retryable = typeof details?.retryable === 'boolean' ? details.retryable : undefined;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ZayunoError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', { ...(asRecord(details) || {}), retryable: false });
  }
}

export class NotFoundError extends ZayunoError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier ? `${resource} with identifier '${identifier}' was not found.` : `${resource} not found.`;
    const resourceCode = resource.toLowerCase() === 'provider'
      ? 'PROVIDER_NOT_FOUND'
      : resource.toLowerCase() === 'offering'
        ? 'OFFERING_NOT_FOUND'
        : resource.toLowerCase() === 'location'
          ? 'LOCATION_NOT_FOUND'
          : 'RESOURCE_NOT_FOUND';
    super(msg, 404, resourceCode, { resource, identifier, retryable: false });
  }
}

export class EnvironmentNotAllowedError extends ZayunoError {
  constructor(providerSlug: string, actualEnvironment: string, requestedEnvironment: string) {
    super(
      `Provider "${providerSlug}" operates in environment "${actualEnvironment}" and cannot be accessed from "${requestedEnvironment}" execution context.`,
      403,
      'ENVIRONMENT_NOT_ALLOWED',
      { providerSlug, actualEnvironment, requestedEnvironment, retryable: false }
    );
  }
}

export class UnauthorizedError extends ZayunoError {
  constructor(message = 'Unauthorized request. Valid API key or token required.') {
    super(message, 401, 'UNAUTHORIZED', { retryable: false });
  }
}

export class ForbiddenError extends ZayunoError {
  constructor(message = 'Forbidden action. Insufficient privileges.') {
    super(message, 403, 'FORBIDDEN', { retryable: false });
  }
}

export class ConflictError extends ZayunoError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', { ...(asRecord(details) || {}), retryable: false });
  }
}

export class IdempotencyError extends ZayunoError {
  constructor(message = 'An operation with this idempotency key is already in flight.') {
    super(message, 409, 'IDEMPOTENCY_CONFLICT', { retryAfterSec: 2, retryable: true });
  }
}

export class IdempotencyPayloadConflictError extends ZayunoError {
  constructor() {
    super(
      'This idempotency key was already used for a different action request. Use a new idempotency key.',
      409,
      'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
      { retryable: false }
    );
  }
}

export class ProviderIntegrationError extends ZayunoError {
  public readonly providerSlug: string;
  public readonly externalStatusCode?: number;

  constructor(providerSlug: string, message: string, externalStatusCode?: number, details?: any) {
    super(
      `Provider [${providerSlug}] error: ${message}`,
      502,
      'PROVIDER_UNAVAILABLE',
      { ...(asRecord(details) || {}), providerSlug, externalStatusCode, retryable: true }
    );
    this.providerSlug = providerSlug;
    this.externalStatusCode = externalStatusCode;
  }
}

export class ResourceUnavailableError extends ZayunoError {
  constructor(message = 'The requested resource or inventory is unavailable.', details?: any) {
    super(message, 409, 'RESOURCE_UNAVAILABLE', { ...(asRecord(details) || {}), retryable: false });
  }
}

export class CapacityExceededError extends ZayunoError {
  constructor(message = 'The requested quantity exceeds available capacity.', details?: any) {
    super(message, 422, 'CAPACITY_EXCEEDED', { ...(asRecord(details) || {}), retryable: false });
  }
}
