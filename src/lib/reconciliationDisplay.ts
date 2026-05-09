export function normalizeDisplayText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeDisplayToken(value: unknown): string {
  return normalizeDisplayText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function fileNameFromPath(value: unknown): string {
  const normalizedValue = normalizeDisplayText(value)
  if (!normalizedValue) return ''
  return normalizedValue.split(/[\\/]/).filter(Boolean).pop() ?? normalizedValue
}

export function humanizeToken(value: unknown): string {
  const normalizedValue = normalizeDisplayText(value)
  if (!normalizedValue) return ''

  return normalizedValue
    .replace(/^AUT_(IN|WIN)_/, '')
    .replace(/^API_/, 'API ')
    .replace(/^SFTP_/, 'SFTP ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b(api|sftp|utc)\b/g, (match) => match.toUpperCase())
    .replace(/\b\w/g, (match) => match.toUpperCase())
}
