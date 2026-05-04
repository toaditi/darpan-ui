import type { SessionInfo } from './api/types'

function normalizeDisplayName(value: unknown): string | null {
  const normalized = value?.toString().trim()
  return normalized ? normalized : null
}

export function resolveUserDisplayName(sessionInfo: SessionInfo | null | undefined): string {
  return normalizeDisplayName(sessionInfo?.displayName) || sessionInfo?.username || sessionInfo?.userId || 'Unknown user'
}

export function useUserDisplayNamePreference() {
  return {
    resolveUserDisplayName,
  }
}
