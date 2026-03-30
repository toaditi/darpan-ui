export interface LinearPortalConfig {
  roadmapUrl: string | null
  requestUrl: string | null
  embedEnabled: boolean
}

export function normalizeLinearPortalUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function parseLinearEmbedEnabled(value: unknown): boolean {
  if (typeof value !== 'string') return true

  const normalized = value.trim().toLowerCase()
  if (!normalized) return true

  return !['0', 'false', 'no', 'off'].includes(normalized)
}

export function getLinearPortalConfig(env: {
  VITE_DARPAN_LINEAR_ROADMAP_URL?: unknown
  VITE_DARPAN_LINEAR_REQUEST_URL?: unknown
  VITE_DARPAN_LINEAR_EMBED_ENABLED?: unknown
}): LinearPortalConfig {
  return {
    roadmapUrl: normalizeLinearPortalUrl(env.VITE_DARPAN_LINEAR_ROADMAP_URL),
    requestUrl: normalizeLinearPortalUrl(env.VITE_DARPAN_LINEAR_REQUEST_URL),
    embedEnabled: parseLinearEmbedEnabled(env.VITE_DARPAN_LINEAR_EMBED_ENABLED),
  }
}
