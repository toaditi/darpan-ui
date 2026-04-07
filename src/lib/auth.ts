import { reactive } from 'vue'
import { ApiCallError, clearAuthToken, setAuthTokenContract } from './api/client'
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

function setUnauthenticated(error: string | null): void {
  authState.checked = true
  authState.authenticated = false
  authState.userId = null
  authState.username = null
  authState.error = error
}

function normalizeAuthenticatedUser(response: { sessionInfo?: { userId?: string; username?: string } }): { userId: string; username: string } {
  const userId = response.sessionInfo?.userId?.toString()?.trim()
  if (!userId) {
    throw new Error('Authenticated response missing sessionInfo.userId')
  }

  return {
    userId,
    username: response.sessionInfo?.username?.toString()?.trim() || userId,
  }
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
      const sessionUser = normalizeAuthenticatedUser(response)
      setAuthenticated(sessionUser.userId, sessionUser.username)
    } else {
      clearAuthToken()
      setUnauthenticated('No active authenticated session detected.')
    }
    return authState.authenticated
  } catch (error) {
    if (error instanceof ApiCallError && error.status === 401) {
      clearAuthToken()
      setUnauthenticated(error.message)
      return false
    }

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
      const authToken = response.authToken?.toString()?.trim()
      if (!authToken) {
        throw new Error('Authenticated login response missing authToken')
      }

      const sessionUser = normalizeAuthenticatedUser(response)
      setAuthTokenContract(response)
      setAuthenticated(sessionUser.userId, sessionUser.username)
      return true
    }

    clearAuthToken()
    setUnauthenticated(response.errors?.[0] ?? 'Login failed')
    return false
  } catch (error) {
    clearAuthToken()
    setUnauthenticated(error instanceof ApiCallError ? formatApiError(error) : 'Login failed')
    return false
  }
}

export async function logoutSession(): Promise<boolean> {
  if (authBypass) {
    clearAuthToken()
    setUnauthenticated(null)
    return true
  }

  try {
    await authFacade.logoutSession()
    clearAuthToken()
    setUnauthenticated(null)
    return true
  } catch (error) {
    clearAuthToken()
    setUnauthenticated(error instanceof ApiCallError ? formatApiError(error) : 'Logout failed')
    return false
  }
}

export function useAuthState() {
  return authState
}
