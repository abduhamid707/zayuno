import { ProviderCapability } from '@zayuno/contracts';

export class ProviderError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: any;

  constructor(message: string, statusCode = 500, code = 'PROVIDER_ERROR', details?: any) {
    super(message);
    this.name = 'ProviderError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class CapabilityNotSupportedError extends ProviderError {
  constructor(providerSlug: string, capability: ProviderCapability) {
    super(
      `Provider "${providerSlug}" does not support capability "${capability}".`,
      400,
      'CAPABILITY_NOT_SUPPORTED',
      { providerSlug, capability }
    );
    this.name = 'CapabilityNotSupportedError';
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(providerSlug: string, message = 'Invalid or expired provider credentials.') {
    super(message, 401, 'PROVIDER_AUTHENTICATION_ERROR', { providerSlug });
    this.name = 'ProviderAuthenticationError';
  }
}

export class QuoteExpiredError extends ProviderError {
  constructor(quoteId: string) {
    super(`Quote "${quoteId}" has expired. Please request a fresh quote before creating an action.`, 400, 'QUOTE_EXPIRED', { quoteId });
    this.name = 'QuoteExpiredError';
  }
}

export class ActionCancellationError extends ProviderError {
  constructor(actionId: string, reason: string) {
    super(`Action "${actionId}" cannot be cancelled: ${reason}`, 400, 'ACTION_NOT_CANCELLABLE', { actionId, reason });
    this.name = 'ActionCancellationError';
  }
}
