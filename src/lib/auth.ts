import { reactive } from 'vue'
import { ApiCallError } from './api/client'
import { authFacade } from './api/facade'

interface AuthState {
  checked: boolean
  authenticated: boolean
  userId: string | null
  username: string | null
  error: string | null
}

const authState = reactive<AuthState>({
  checked: false,
  authenticated: false,
  userId: null,
  username: null,
  error: null,
})

const authBypass = (import.meta.env.VITE_DARPAN_AUTH_BYPASS ?? '').toLowerCase() === 'true'
const AUTH_CACHE_KEY = 'darpan-ui-auth-cache'

function clearLegacyAuthState(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(AUTH_CACHE_KEY)
  } catch {
    // ignore storage cleanup failures
  }
}

function formatApiError(error: ApiCallError): string {
  const details = (error.details ?? {}) as {
    attemptedUrls?: string[]
    failures?: Array<{ status?: number; raw?: string }>
  }

  if (error.message.includes('Invalid JSON response') && Array.isArray(details.attemptedUrls) && details.attemptedUrls.length > 0) {
    const preview = details.attemptedUrls.slice(0, 3).join(', ')
    const firstFailure = Array.isArray(details.failures) ? details.failures[0] : undefined
    const statusHint = firstFailure?.status ? ` First status: ${firstFailure.status}.` : ''
    const rawHint = firstFailure?.raw ? ` First body: ${firstFailure.raw.slice(0, 120)}.` : ''
    return `${error.message}. Tried: ${preview}${details.attemptedUrls.length > 3 ? ', ...' : ''}.${statusHint}${rawHint}`
  }

  return error.message
}

function setAuthenticated(userId: string | null, username: string | null): void {
  authState.checked = true
  authState.authenticated = !!userId
  authState.userId = userId
  authState.username = username
  authState.error = null
  clearLegacyAuthState()
}

function setUnauthenticated(error: string): void {
  authState.checked = true
  authState.authenticated = false
  authState.userId = null
  authState.username = null
  authState.error = error
  clearLegacyAuthState()
}

export async function ensureAuthenticated(force = false): Promise<boolean> {
  if (authBypass) {
    setAuthenticated('local-dev', 'local-dev')
    return true
  }

  if (authState.checked && !force) {
    return authState.authenticated
  }

  try {
    const response = await authFacade.getSessionInfo()
    if (response.authenticated) {
      setAuthenticated(response.sessionInfo?.userId ?? null, response.sessionInfo?.username ?? null)
    } else {
      setUnauthenticated('No active authenticated session detected.')
    }
    return authState.authenticated
  } catch (error) {
    const formattedError = error instanceof ApiCallError ? formatApiError(error) : 'Unable to verify authentication'
    setUnauthenticated(formattedError)
    return false
  }
}

export async function loginWithCredentials(username: string, password: string): Promise<boolean> {
  if (authBypass) {
    setAuthenticated('local-dev', 'local-dev')
    return true
  }

  try {
    const response = await authFacade.loginSession(username, password)
    if (response.authenticated) {
      setAuthenticated(response.sessionInfo?.userId ?? null, response.sessionInfo?.username ?? null)
      return true
    }

    setUnauthenticated(response.errors?.[0] ?? 'Login failed')
    return false
  } catch (error) {
    setUnauthenticated(error instanceof ApiCallError ? formatApiError(error) : 'Login failed')
    return false
  }
}

export function useAuthState() {
  return authState
}
