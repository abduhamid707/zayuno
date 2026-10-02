export interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp in ms
}

/**
 * Extracts expiration timestamp from JWT token if available.
 */
export function parseJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000;
    }
  } catch {
    // Ignore non-JWT tokens (e.g. v1 legacy tokens)
  }
  return null;
}

/**
 * Multi-tenant Token Manager for iikoCloud.
 * Manages token lifecycle, 1-hour expiration with 5-minute pre-emptive refresh buffer,
 * and maintains strict isolation across different restaurants.
 */
export class IikoTokenManager {
  private static instance: IikoTokenManager | null = null;
  private tokenCache = new Map<string, CachedToken>();

  /**
   * Buffer before actual expiry to refresh token pre-emptively (5 minutes in ms).
   */
  private readonly REFRESH_BUFFER_MS = 5 * 60 * 1000;

  /**
   * Default token TTL (55 minutes in ms) when JWT exp is not present.
   */
  private readonly DEFAULT_TTL_MS = 55 * 60 * 1000;

  static getInstance(): IikoTokenManager {
    if (!IikoTokenManager.instance) {
      IikoTokenManager.instance = new IikoTokenManager();
    }
    return IikoTokenManager.instance;
  }

  /**
   * Builds an isolated cache key for a restaurant.
   */
  buildCacheKey(providerSlug: string, credentialKey: string): string {
    const slug = (providerSlug || 'default').toLowerCase().trim();
    const key = (credentialKey || '').trim();
    return `${slug}:::${key}`;
  }

  /**
   * Retrieves a non-expired cached token for the given tenant cache key.
   * Returns null if token is missing or near expiration.
   */
  getValidToken(cacheKey: string): string | null {
    if (!cacheKey) return null;
    const cached = this.tokenCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    // Check if token has expired or is within the refresh buffer window
    if (now >= cached.expiresAt - this.REFRESH_BUFFER_MS) {
      this.tokenCache.delete(cacheKey);
      return null;
    }

    return cached.token;
  }

  /**
   * Caches a new token for the given tenant cache key.
   */
  setToken(cacheKey: string, token: string, customExpiresAt?: number): void {
    if (!cacheKey || !token) return;

    let expiresAt = customExpiresAt;
    if (!expiresAt) {
      const jwtExp = parseJwtExpiry(token);
      if (jwtExp && jwtExp > Date.now()) {
        expiresAt = jwtExp;
      } else {
        expiresAt = Date.now() + this.DEFAULT_TTL_MS;
      }
    }

    this.tokenCache.set(cacheKey, {
      token,
      expiresAt
    });
  }

  /**
   * Invalidates a cached token for a specific tenant (e.g. upon receiving 401 Unauthorized).
   */
  invalidateToken(cacheKey: string): void {
    if (cacheKey) {
      this.tokenCache.delete(cacheKey);
    }
  }

  /**
   * Checks whether a valid (non-expired) token exists in cache.
   */
  hasValidToken(cacheKey: string): boolean {
    return this.getValidToken(cacheKey) !== null;
  }

  /**
   * Clears the entire cache (useful for testing and teardown).
   */
  clearAll(): void {
    this.tokenCache.clear();
  }
}
