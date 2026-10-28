/**
 * Centralized Cache Configuration
 * Supports toggling caching on/off via environment variables or request overrides.
 *
 * Environment variables supported:
 *   - CACHE_ENABLED (or ENABLE_CACHE)
 *   - NEXT_PUBLIC_CACHE_ENABLED (or NEXT_PUBLIC_ENABLE_CACHE)
 *
 * Values accepted:
 *   - 'true', '1', 'on', 'yes', 'enabled' -> true
 *   - 'false', '0', 'off', 'no', 'disabled' -> false
 */

export function parseBooleanFlag(value?: string | boolean | null, defaultValue: boolean = true): boolean {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const str = String(value).trim().toLowerCase();
  if (['false', '0', 'off', 'no', 'disabled'].includes(str)) {
    return false;
  }
  if (['true', '1', 'on', 'yes', 'enabled'].includes(str)) {
    return true;
  }
  return defaultValue;
}

/**
 * Returns whether cache is globally enabled via environment variables.
 * Default is `true`.
 */
export function isCacheGloballyEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env) {
    const envVal =
      process.env.CACHE_ENABLED ??
      process.env.ENABLE_CACHE ??
      process.env.NEXT_PUBLIC_CACHE_ENABLED ??
      process.env.NEXT_PUBLIC_ENABLE_CACHE ??
      process.env.USE_CACHE ??
      process.env.NEXT_PUBLIC_USE_CACHE;

    if (envVal !== undefined && envVal !== null && envVal !== '') {
      return parseBooleanFlag(envVal, true);
    }
  }
  return true;
}

/**
 * Resolves whether caching should be used for a given request or operation.
 * Hierarchy: explicit override > environment variable > default (true)
 */
export function isCacheEnabled(requestOverride?: boolean | string | null): boolean {
  if (requestOverride !== undefined && requestOverride !== null) {
    return parseBooleanFlag(requestOverride, true);
  }
  return isCacheGloballyEnabled();
}
