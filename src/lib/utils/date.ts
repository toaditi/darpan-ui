export interface FormatDateTimeOptions {
  fallback?: string
  locale?: Intl.LocalesArgument
  timeZone?: string
}

export function formatDateTime(value: unknown, options: FormatDateTimeOptions = {}): string {
  const fallback = options.fallback ?? '-'
  let parsedDate: Date

  if (typeof value === 'string') {
    if (!value.trim()) return fallback
    parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) return value
  } else if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fallback
    parsedDate = new Date(value)
    if (Number.isNaN(parsedDate.getTime())) return fallback
  } else if (value instanceof Date) {
    parsedDate = value
    if (Number.isNaN(parsedDate.getTime())) return fallback
  } else {
    return fallback
  }

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: options.timeZone?.trim() || undefined,
  }).format(parsedDate)
}

export function formatSavedResultDateTime(value: unknown): string {
  return formatDateTime(value, { fallback: 'Saved result' })
}
