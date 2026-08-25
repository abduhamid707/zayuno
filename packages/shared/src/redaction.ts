/**
 * Universal Data Sanitization & Log Redaction Utility.
 * Ensures no passwords, secrets, API keys, tokens, PII, card numbers,
 * or customer data leak into log stores, admin inspect views, or exports.
 */

export interface RedactionOptions {
  maxDepth?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
  maskEmail?: boolean;
  maskPhone?: boolean;
}

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|authorization|cookie|session|api.?key|key.?hash|private.?key|certificate|card|cvv|cvc|otp|passport|document|pin|pinfl|phone|email|customer|address|destination|latitude|longitude|coords|auth.?config|encrypted/i;

const STRING_SCRUBBERS: Array<{ pattern: RegExp; replacement: string }> = [
  // Bearer tokens & Authorization headers
  { pattern: /(?:Authorization:\s*)?Bearer\s+[A-Za-z0-9._~+\/-]+/gi, replacement: 'Bearer [REDACTED]' },
  { pattern: /Basic\s+[A-Za-z0-9+/=]+/gi, replacement: 'Basic [REDACTED]' },
  // API key / header credential lines
  { pattern: /(x-api-key|api-key|x-signature|webhook-secret|x-simulator-session):\s*["']?[A-Za-z0-9._~+\/-]+["']?/gi, replacement: '$1: [REDACTED]' },
  // Cookie and Set-Cookie headers
  { pattern: /(?:Set-Cookie|Cookie):\s*["']?[A-Za-z0-9._~+\/-]+(?:=[^;\r\n\s]+)?["']?/gi, replacement: 'Cookie: [REDACTED]' },
  // JWT tokens (3-part base64)
  { pattern: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+\b/g, replacement: '[REDACTED_JWT]' },
  // Zayuno API keys and secrets
  { pattern: /\bzy_(?:live|test|sb|sec)_[A-Za-z0-9_-]+\b/gi, replacement: '[REDACTED_CREDENTIAL]' },
  // Sensitive query parameter / key-value assignments
  { pattern: /(?<=[?&]|\b)(apiKey|api_key|secret|webhookSecret|webhook_secret|password|token|sessionToken|auth)=[^&\s"'`]+/gi, replacement: '$1=[REDACTED]' },
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi, replacement: '[REDACTED_EMAIL]' },
  // Phone numbers (Uzbekistan / International / E.164)
  { pattern: /(?:\+?998|\b998)?\s*(?:\(?\d{2}\)?[\s-]?)?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b|(?:\+\d{9,15}\b)|(?:\b\d{9,15}\b)/g, replacement: '[REDACTED_PHONE]' },
  // Credit card 13-19 digit patterns
  { pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, replacement: '[REDACTED_CARD]' }
];

export function scrubSensitiveString(text: string, maxLength = 2000): string {
  if (!text || typeof text !== 'string') return '';
  let scrubbed = text;
  for (const { pattern, replacement } of STRING_SCRUBBERS) {
    scrubbed = scrubbed.replace(pattern, replacement);
  }
  if (scrubbed.length > maxLength) {
    return `${scrubbed.slice(0, maxLength)}…[TRUNCATED]`;
  }
  return scrubbed;
}

export function redactForLogs<T = unknown>(value: T, options?: RedactionOptions): T {
  const maxDepth = options?.maxDepth ?? 6;
  const maxArrayLength = options?.maxArrayLength ?? 50;
  const maxStringLength = options?.maxStringLength ?? 2000;

  const walk = (current: unknown, depth: number): unknown => {
    if (current === null || current === undefined) return current;
    if (depth > maxDepth) return '[TRUNCATED_DEPTH]';

    if (typeof current === 'string') {
      return scrubSensitiveString(current, maxStringLength);
    }

    if (typeof current === 'number' || typeof current === 'boolean') {
      return current;
    }

    if (Array.isArray(current)) {
      const slice = current.slice(0, maxArrayLength);
      const mapped = slice.map(item => walk(item, depth + 1));
      if (current.length > maxArrayLength) {
        mapped.push(`[+${current.length - maxArrayLength} more items truncated]`);
      }
      return mapped;
    }

    if (typeof current === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(current as Record<string, unknown>)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
          result[key] = '[REDACTED]';
        } else {
          result[key] = walk(val, depth + 1);
        }
      }
      return result;
    }

    return String(current);
  };

  return walk(value, 0) as T;
}

export function sanitizeHeaders(headers: Record<string, any> | undefined): Record<string, string> {
  if (!headers || typeof headers !== 'object') return {};
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEY_PATTERN.test(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = typeof value === 'string' ? scrubSensitiveString(value, 500) : String(value);
    }
  }
  return sanitized;
}

const STRICT_SECRET_KEY_PATTERN =
  /password|secret|encrypted|key.?hash|token|authorization|cookie|session|api.?key|database.?url|salt|raw.?secrets?|private.?key|ssn|cvv/i;

export function stripSensitiveSecrets<T = unknown>(value: T): T {
  const walk = (current: unknown): unknown => {
    if (current === null || current === undefined) return current;
    if (typeof current === 'string') {
      return scrubSensitiveString(current);
    }
    if (typeof current === 'number' || typeof current === 'boolean') {
      return current;
    }
    if (Array.isArray(current)) {
      return current.map(item => walk(item));
    }
    if (typeof current === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(current as Record<string, unknown>)) {
        if (STRICT_SECRET_KEY_PATTERN.test(key)) {
          continue;
        }
        result[key] = walk(val);
      }
      return result;
    }
    return current;
  };
  return walk(value) as T;
}
