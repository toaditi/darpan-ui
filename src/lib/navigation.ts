export function resolveInternalRedirectTarget(target: unknown, fallback = '/'): string {
  if (typeof target !== 'string') return fallback

  const trimmed = target.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return fallback
  }

  try {
    const url = new URL(trimmed, 'http://darpan.local')
    if (url.origin !== 'http://darpan.local') {
      return fallback
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
