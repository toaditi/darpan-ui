/** Narrow an unknown value to a plain object (excludes arrays and null). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

/**
 * Return a shallow copy of `record` with entries whose values are `undefined`,
 * `null`, or `''` removed.
 */
export function removeEmpty<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ) as Partial<T>
}
