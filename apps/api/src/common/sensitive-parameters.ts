const FORBIDDEN_PARAMETER_KEY = /^(passport|passportnumber|documentnumber|identitynumber|jshshir|pinfl|cardnumber|bankcard|cvv|cvc|cardexpiry|otp|bankpassword)$/i;

/**
 * Dynamic provider parameters are useful for preferences and inventory
 * context, but they are not a secure identity or payment channel. Keep these
 * values on a provider-owned HTTPS handoff instead of API logs or action JSON.
 */
export function findForbiddenParameterKey(value: unknown): string | undefined {
  const seen = new WeakSet<object>();
  const visit = (current: unknown, depth: number): string | undefined => {
    if (!current || typeof current !== 'object' || depth > 10) return undefined;
    if (seen.has(current as object)) return undefined;
    seen.add(current as object);
    if (Array.isArray(current)) {
      for (const item of current) {
        const found = visit(item, depth + 1);
        if (found) return found;
      }
      return undefined;
    }
    for (const [key, child] of Object.entries(current as Record<string, unknown>)) {
      const normalized = key.replace(/[_\-\s]/g, '');
      if (FORBIDDEN_PARAMETER_KEY.test(normalized)) return key;
      const found = visit(child, depth + 1);
      if (found) return found;
    }
    return undefined;
  };
  return visit(value, 0);
}
