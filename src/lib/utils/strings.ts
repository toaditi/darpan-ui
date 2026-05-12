/**
 * Trim an unknown value to a string. Returns `null` when the value is null,
 * undefined, not a string, or trims to the empty string.
 */
export function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Convenience wrapper for call sites that always need a string. Behaves like
 * {@link normalizeString} but returns `''` instead of `null`.
 */
export function normalizeStringOrEmpty(value: unknown): string {
  return normalizeString(value) ?? ''
}
