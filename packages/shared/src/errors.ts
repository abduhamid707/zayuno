export class ZayunoError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ZayunoError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends ZayunoError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier ? `${resource} with identifier '${identifier}' was not found.` : `${resource} not found.`;
    super(msg, 404, 'NOT_FOUND_ERROR', { resource, identifier });
  }
}

export class UnauthorizedError extends ZayunoError {
  constructor(message = 'Unauthorized request. Valid API key or token required.') {
    super(message, 401, 'UNAUTHORIZED_ERROR');
  }
}

export class ForbiddenError extends ZayunoError {
  constructor(message = 'Forbidden action. Insufficient privileges.') {
    super(message, 403, 'FORBIDDEN_ERROR');
  }
}

export class ConflictError extends ZayunoError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

export class IdempotencyError extends ZayunoError {
  constructor(message = 'An operation with this idempotency key is already in flight.') {
    super(message, 409, 'IDEMPOTENCY_CONFLICT', { retryAfterSec: 2 });
  }
}

export class ProviderIntegrationError extends ZayunoError {
  public readonly providerSlug: string;
  public readonly externalStatusCode?: number;

  constructor(providerSlug: string, message: string, externalStatusCode?: number, details?: any) {
    super(`Provider [${providerSlug}] error: ${message}`, 502, 'PROVIDER_INTEGRATION_ERROR', details);
    this.providerSlug = providerSlug;
    this.externalStatusCode = externalStatusCode;
  }
}
