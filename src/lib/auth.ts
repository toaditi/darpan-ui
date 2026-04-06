import { reactive } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ApiCallError } from './api/client'
import { authFacade } from './api/facade'
import type { AuthContractResponse, SessionInfo } from './api/types'
import { resolveInternalRedirectTarget } from './navigation'

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'verification-failed'

interface AuthState {
  checked: boolean
  error: string | null
  status: AuthStatus
  sessionInfo: SessionInfo | null
  readonly authenticated: boolean
  readonly userId: string | null
  readonly username: string | null
}

const authState = reactive({
  checked: false,
  error: null as string | null,
  status: 'unauthenticated' as AuthStatus,
  sessionInfo: null as SessionInfo | null,
  get authenticated() {
    return this.status === 'authenticated'
  },
  get userId() {
    return this.sessionInfo?.userId ?? null
  },
  get username() {
    return this.sessionInfo?.username ?? this.sessionInfo?.userId ?? null
  },
}) as AuthState

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

function normalizeUserId(value: unknown): string | null {
  const normalized = value?.toString()?.trim()
  return normalized ? normalized : null
}

function normalizeSessionInfo(sessionInfo: SessionInfo): SessionInfo {
  const normalizedUserId = normalizeUserId(sessionInfo.userId)
  if (!normalizedUserId) {
    throw new Error('Auth contract violation: authenticated response missing sessionInfo.userId')
  }

  return {
    ...sessionInfo,
    userId: normalizedUserId,
    username: sessionInfo.username?.toString()?.trim() || normalizedUserId,
    customerScopeId: sessionInfo.customerScopeId?.toString()?.trim() || null,
  }
}

function resolveAuthenticatedSession(response: AuthContractResponse): SessionInfo | null {
  if (response.authState === 'AUTHENTICATED') {
    if (response.authSource === 'NONE') {
      throw new Error('Auth contract violation: authenticated response used authSource NONE')
    }
    return normalizeSessionInfo(response.sessionInfo ?? ({} as SessionInfo))
  }

  if (response.authSource !== 'NONE') {
    throw new Error('Auth contract violation: unauthenticated response used authenticated authSource')
  }
  if (response.sessionInfo != null) {
    throw new Error('Auth contract violation: unauthenticated response included sessionInfo')
  }
  return null
}

function applyAuthState(nextState: {
  status: AuthStatus
  error?: string | null
  sessionInfo?: SessionInfo | null
}): void {
  authState.checked = true
  authState.status = nextState.status
  authState.error = nextState.error ?? null
  authState.sessionInfo = nextState.sessionInfo ?? null
}

function setError(error: string): void {
  authState.checked = true
  authState.error = error
}

function buildContractViolationError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Invalid auth contract'
  return `Unable to verify authentication. ${message}`
}

function applyAuthResponse(response: AuthContractResponse, unauthenticatedMessage: string): boolean {
  const sessionInfo = resolveAuthenticatedSession(response)
  if (sessionInfo) {
    applyAuthState({
      status: 'authenticated',
      sessionInfo,
    })
    return true
  }

  applyAuthState({
    status: 'unauthenticated',
    error: response.errors?.[0] ?? unauthenticatedMessage,
  })
  return false
}

export function buildAuthRedirect(redirectTarget: unknown): RouteLocationRaw {
  const redirect = resolveInternalRedirectTarget(redirectTarget)
  if (authState.status === 'verification-failed') {
    return {
      name: 'auth-required',
      query: { redirect },
    }
  }
  return {
    name: 'login',
    query: { redirect },
  }
}

export async function ensureAuthenticated(force = false): Promise<boolean> {
  if (authBypass) {
    applyAuthState({
      status: 'authenticated',
      sessionInfo: { userId: 'local-dev', username: 'local-dev' },
    })
    return true
  }

  if (authState.checked && !force) {
    return authState.authenticated
  }

  try {
    const response = await authFacade.getSessionInfo()
    return applyAuthResponse(response, 'No active authenticated session detected.')
  } catch (error) {
    const formattedError =
      error instanceof ApiCallError ? formatApiError(error) : buildContractViolationError(error)
    applyAuthState({
      status: 'verification-failed',
      error: formattedError,
    })
    return false
  }
}

export async function loginWithCredentials(username: string, password: string): Promise<boolean> {
  if (authBypass) {
    applyAuthState({
      status: 'authenticated',
      sessionInfo: { userId: 'local-dev', username: 'local-dev' },
    })
    return true
  }

  try {
    const response = await authFacade.loginSession(username, password)
    return applyAuthResponse(response, 'Login failed')
  } catch (error) {
    applyAuthState({
      status: 'unauthenticated',
      error: error instanceof ApiCallError ? formatApiError(error) : 'Login failed',
    })
    return false
  }
}

export async function logoutSession(): Promise<boolean> {
  if (authBypass) {
    applyAuthState({
      status: 'unauthenticated',
    })
    return true
  }

  try {
    const response = await authFacade.logoutSession()
    if (response.authState === 'UNAUTHENTICATED' && response.authSource === 'NONE') {
      applyAuthState({
        status: 'unauthenticated',
      })
      return true
    }

    setError(response.errors?.[0] ?? 'Logout failed')
    return false
  } catch (error) {
    setError(error instanceof ApiCallError ? formatApiError(error) : 'Logout failed')
    return false
  }
}

export function useAuthState() {
  return authState
}
