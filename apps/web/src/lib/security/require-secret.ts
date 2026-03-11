/**
 * Fail-fast secret loader.
 *
 * In production: throws if the requested env var is missing.
 * In development: returns a clearly-marked insecure fallback and logs a warning.
 *
 * Eliminates all `|| 'dev-secret'` fallbacks that could silently
 * weaken authentication in a misconfigured production deployment.
 */
export function requireSecret(name: string): string {
  const value = process.env[name];
  if (value) return value;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `[SECURITY FATAL] Required secret "${name}" is not set. ` +
      `Refusing to proceed in production without it.`
    );
  }

  if (typeof console !== 'undefined') {
    console.warn(
      `[SECURITY] "${name}" is not set — using insecure development fallback. ` +
      `Set it in .env.local before testing auth flows.`
    );
  }

  return `INSECURE_DEV_ONLY_${name}_${Date.now()}`;
}
