export interface FormatDateTimeOptions {
  fallback?: string
  locale?: Intl.LocalesArgument
}

export function formatDateTime(value: unknown, options: FormatDateTimeOptions = {}): string {
  const fallback = options.fallback ?? '-'
  if (typeof value !== 'string' || !value.trim()) return fallback

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) return value

  return new Intl.DateTimeFormat(options.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

export function formatSavedResultDateTime(value: unknown): string {
  return formatDateTime(value, { fallback: 'Saved result' })
}
