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
      authState.checked = true
      authState.authenticated = false
      authState.userId = null
      authState.username = null
      authState.error = 'No active authenticated session detected.'
    }
    return authState.authenticated
  } catch (error) {
    authState.checked = true
    authState.authenticated = false
    authState.userId = null
    authState.username = null

    if (error instanceof ApiCallError) {
      authState.error = formatApiError(error)
    } else {
      authState.error = 'Unable to verify authentication'
    }

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

    authState.checked = true
    authState.authenticated = false
    authState.userId = null
    authState.username = null
    authState.error = response.errors?.[0] ?? 'Login failed'
    return false
  } catch (error) {
    authState.checked = true
    authState.authenticated = false
    authState.userId = null
    authState.username = null
    authState.error = error instanceof ApiCallError ? formatApiError(error) : 'Login failed'
    return false
  }
}

export function useAuthState() {
  return authState
}
