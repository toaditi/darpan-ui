export const CONFIG_ID_MAX_LENGTH = 20

export function exceedsConfigIdMaxLength(value: string): boolean {
  return value.trim().length > CONFIG_ID_MAX_LENGTH
}

export function deriveConfigIdFromName(name: string, fallback: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')

  const base = normalized || fallback
  const capped = base.slice(0, CONFIG_ID_MAX_LENGTH).replace(/_+$/g, '')
  return capped || fallback.slice(0, CONFIG_ID_MAX_LENGTH)
}
