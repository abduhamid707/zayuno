import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { scrubSensitiveString } from '@zayuno/shared';

const DEFAULT_POSTHOG_TOKEN = 'phc_zcCoK32AfWUoqbBLE63NHDrxycvKrtzKQFmsqECviw4G';
const BLOCKED_PROPERTY = /email|phone|telefon|address|manzil|password|parol|secret|token|card|cvv|otp|prompt|query|message|content|raw|name/i;

@Injectable()
export class ProductAnalyticsService {
  private readonly token = process.env.POSTHOG_PROJECT_TOKEN?.trim() || DEFAULT_POSTHOG_TOKEN;
  private readonly host = (process.env.POSTHOG_HOST?.trim() || 'https://us.i.posthog.com').replace(/\/$/, '');
  private readonly salt =
    process.env.ANALYTICS_PSEUDONYM_SALT?.trim() ||
    process.env.ENCRYPTION_KEY?.trim() ||
    'zayuno-analytics-v1';

  capture(event: string, userId?: string, properties: Record<string, unknown> = {}) {
    if (!this.token || process.env.POSTHOG_DISABLED === 'true') return;
    const safeEvent = event.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 80);
    if (!safeEvent) return;
    const payload = {
      api_key: this.token,
      event: safeEvent,
      properties: {
        distinct_id: userId ? this.pseudonym(userId) : 'zayuno-api',
        source: 'zayuno_api',
        ...this.safeProperties(properties),
      },
      timestamp: new Date().toISOString(),
    };
    void fetch(`${this.host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1_500),
    }).catch(() => undefined);
  }

  private pseudonym(userId: string) {
    return createHash('sha256')
      .update(`${this.salt}:${userId}`)
      .digest('hex');
  }

  private safeProperties(properties: Record<string, unknown>) {
    const result: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(properties).slice(0, 30)) {
      if (BLOCKED_PROPERTY.test(key) || value === undefined) continue;
      if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
        result[key] = value;
      } else if (typeof value === 'string') {
        result[key] = scrubSensitiveString(value, 120);
      }
    }
    return result;
  }
}
