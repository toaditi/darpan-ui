const STORAGE_KEY = 'darpan-ui-pinned-runs'

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function safeParsePinnedRuns(rawValue: string | null): string[] {
  if (!rawValue) return []

  try {
    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))]
  } catch {
    return []
  }
}

export function listPinnedRunIds(): string[] {
  if (!canUseStorage()) return []
  return safeParsePinnedRuns(localStorage.getItem(STORAGE_KEY))
}

export function savePinnedRunIds(runIds: string[]): void {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(runIds.filter((runId) => runId.trim().length > 0))]))
}
