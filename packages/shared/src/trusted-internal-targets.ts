/**
 * Authoritative allowlist of operations-managed internal container provider targets.
 *
 * Security contract:
 * 1. Only exact entries defined here may use internal Docker hostnames or plain HTTP in production.
 * 2. User/tenant input can NEVER add arbitrary internal hostnames or bypass SSRF protections.
 * 3. Matching is performed on ALL of: slug, hostname, port, AND protocol — never partial.
 */

export interface TrustedInternalProviderTarget {
  readonly slug: string;
  readonly hostname: string;
  readonly port: string;
  readonly protocol: 'http:' | 'https:';
}

export const TRUSTED_INTERNAL_PROVIDER_TARGETS: ReadonlyArray<TrustedInternalProviderTarget> = Object.freeze([
  {
    slug: 'hh-uz',
    hostname: 'hh-recruitment',
    port: '4008',
    protocol: 'http:'
  },
  {
    slug: 'hh-recruitment',
    hostname: 'hh-recruitment',
    port: '4008',
    protocol: 'http:'
  }
]);

/**
 * Returns true only when (slug, targetUrl) exactly matches an allowlisted internal provider target.
 * All four attributes — slug, protocol, hostname, and port — must match precisely.
 */
export function isTrustedInternalProviderTarget(slug?: string | null, targetUrl?: string | null): boolean {
  if (!slug || !targetUrl) return false;
  const cleanSlug = slug.toLowerCase().trim();

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return false;
  }

  // Reject URLs containing userinfo (user:pass@host)
  if (parsed.username || parsed.password) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  const protocol = parsed.protocol.toLowerCase() as 'http:' | 'https:';
  // Explicit port, or infer from protocol
  const port = parsed.port || (protocol === 'https:' ? '443' : '80');

  return TRUSTED_INTERNAL_PROVIDER_TARGETS.some(
    target =>
      target.slug === cleanSlug &&
      target.hostname === hostname &&
      target.port === port &&
      target.protocol === protocol
  );
}
