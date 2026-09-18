import { ProviderCapability } from '@zayuno/contracts';
import { ZayunoError } from '@zayuno/shared';

/**
 * Provider SDK failures use the same base class as core failures so the API
 * exception filter can preserve their semantic code and retry policy.
 */
export class ProviderError extends ZayunoError {
  constructor(message: string, statusCode = 502, code = 'PROVIDER_UNAVAILABLE', details?: any) {
    super(message, statusCode, code, details);
    this.name = 'ProviderError';
  }
}

export class CapabilityNotSupportedError extends ProviderError {
  constructor(providerSlug: string, capability: ProviderCapability) {
    super(
      `Provider "${providerSlug}" does not support capability "${capability}".`,
      400,
      'CAPABILITY_NOT_SUPPORTED',
      { providerSlug, capability, retryable: false }
    );
    this.name = 'CapabilityNotSupportedError';
  }
}

export class ProviderAuthenticationError extends ProviderError {
  constructor(providerSlug: string, message = 'Invalid or expired provider credentials.') {
    super(message, 502, 'PROVIDER_AUTHENTICATION_ERROR', { providerSlug, retryable: false });
    this.name = 'ProviderAuthenticationError';
  }
}

export class QuoteExpiredError extends ProviderError {
  constructor(quoteId: string) {
    super(`Quote "${quoteId}" has expired. Please request a fresh quote before creating an action.`, 400, 'QUOTE_EXPIRED', { quoteId, retryable: false });
    this.name = 'QuoteExpiredError';
  }
}

export class QuoteMismatchError extends ProviderError {
  constructor(quoteId: string, reason: string) {
    super(`Action payload does not match verified quote "${quoteId}": ${reason}`, 400, 'QUOTE_MISMATCH', { quoteId, reason, retryable: false });
    this.name = 'QuoteMismatchError';
  }
}

export class ActionCancellationError extends ProviderError {
  constructor(actionId: string, reason: string) {
    super(`Action "${actionId}" cannot be cancelled: ${reason}`, 400, 'ACTION_NOT_CANCELLABLE', { actionId, reason, retryable: false });
    this.name = 'ActionCancellationError';
  }
}
