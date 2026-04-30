import { reactive } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { ApiCallError, clearAuthToken, setAuthTokenContract } from './api/client'
import { authFacade } from './api/facade'
import type {
  LoginSessionResponse,
  SaveActiveTenantResponse,
  SessionTenantOption,
  SessionInfo,
  SessionInfoResponse,
} from './api/types'
import { resolveInternalRedirectTarget } from './navigation'

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'verification-failed'

export interface UiPermissionPolicy {
  canViewTenantSettings: boolean
  canEditTenantSettings: boolean
  canManageGlobalSettings: boolean
}

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

  if (Array.isArray(details.attemptedUrls) && details.attemptedUrls.length > 0) {
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

function normalizeTenantOption(value: unknown): SessionTenantOption | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  const userGroupId = normalizeUserId(candidate.userGroupId)
  if (!userGroupId) {
    return null
  }

  return {
    userGroupId,
    label: candidate.label?.toString()?.trim() || userGroupId,
  }
}

function normalizeSessionInfo(sessionInfo: SessionInfo | null | undefined): SessionInfo {
  const normalizedUserId = normalizeUserId(sessionInfo?.userId)
  if (!normalizedUserId) {
    throw new Error('Auth contract violation: authenticated response missing sessionInfo.userId')
  }

  const availableTenants = Array.isArray(sessionInfo?.availableTenants)
    ? sessionInfo.availableTenants
        .map((tenant) => normalizeTenantOption(tenant))
        .filter((tenant): tenant is SessionTenantOption => tenant !== null)
    : []
  const activeTenantUserGroupId = normalizeUserId(sessionInfo?.activeTenantUserGroupId)
  const activeTenant = activeTenantUserGroupId
    ? availableTenants.find((tenant) => tenant.userGroupId === activeTenantUserGroupId) ?? null
    : null

  return {
    ...sessionInfo,
    userId: normalizedUserId,
    username: sessionInfo?.username?.toString()?.trim() || normalizedUserId,
    customerScopeId: sessionInfo?.customerScopeId?.toString()?.trim() || null,
    activeTenantUserGroupId,
    activeTenantLabel:
      sessionInfo?.activeTenantLabel?.toString()?.trim() ||
      activeTenant?.label ||
      (activeTenantUserGroupId ? activeTenantUserGroupId : null),
    availableTenants,
  }
}

export function buildUiPermissionPolicy(sessionInfo: SessionInfo | null | undefined): UiPermissionPolicy {
  const isAuthenticated = Boolean(sessionInfo?.userId)
  const isSuperAdmin = sessionInfo?.isSuperAdmin === true
  const canEditActiveTenantData = sessionInfo?.canEditActiveTenantData === true

  return {
    canViewTenantSettings: isAuthenticated,
    canEditTenantSettings: canEditActiveTenantData || isSuperAdmin,
    canManageGlobalSettings: isSuperAdmin,
  }
}

function applyAuthenticatedSession(sessionInfo: SessionInfo | null | undefined, error: string | null = null): void {
  applyAuthState({
    status: 'authenticated',
    error,
    sessionInfo: normalizeSessionInfo(sessionInfo),
  })
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

function buildContractViolationError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Invalid auth contract'
  return `Unable to verify authentication. ${message}`
}

function applyAuthResponse(response: SessionInfoResponse | LoginSessionResponse, unauthenticatedMessage: string): boolean {
  if (response.authenticated) {
    applyAuthenticatedSession(response.sessionInfo)
    return true
  }

  clearAuthToken()
  applyAuthState({
    status: 'unauthenticated',
    error: response.errors?.[0] ?? unauthenticatedMessage,
  })
  return false
}

export function buildAuthRedirect(redirectTarget: unknown): RouteLocationRaw {
  const redirect = resolveInternalRedirectTarget(redirectTarget)
  if (redirect === '/') {
    return { name: 'login' }
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
    if (error instanceof ApiCallError && error.status === 401) {
      clearAuthToken()
      applyAuthState({
        status: 'unauthenticated',
        error: error.message,
      })
      return false
    }

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
    if (response.authenticated) {
      const authToken = response.authToken?.toString()?.trim()
      if (!authToken) {
        throw new Error('Authenticated login response missing authToken')
      }
      setAuthTokenContract(response)
    }

    return applyAuthResponse(response, 'Login failed')
  } catch (error) {
    clearAuthToken()
    applyAuthState({
      status: 'unauthenticated',
      error: error instanceof ApiCallError ? formatApiError(error) : buildContractViolationError(error),
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
    clearAuthToken()
    if (!response.authenticated) {
      applyAuthState({
        status: 'unauthenticated',
      })
      return true
    }

    applyAuthState({
      status: 'unauthenticated',
      error: response.errors?.[0] ?? 'Logout failed',
    })
    return false
  } catch (error) {
    clearAuthToken()
    applyAuthState({
      status: 'unauthenticated',
      error: error instanceof ApiCallError ? formatApiError(error) : 'Logout failed',
    })
    return false
  }
}

export async function saveActiveTenant(activeTenantUserGroupId: string): Promise<boolean> {
  if (authBypass) {
    return true
  }

  try {
    const response: SaveActiveTenantResponse = await authFacade.saveActiveTenant(activeTenantUserGroupId)
    if (response.authenticated) {
      const errorMessage = response.ok ? null : response.errors?.[0] ?? 'Unable to switch tenant.'
      applyAuthenticatedSession(response.sessionInfo, errorMessage)
      return response.ok
    }

    clearAuthToken()
    applyAuthState({
      status: 'unauthenticated',
      error: response.errors?.[0] ?? 'Authentication required to change the active tenant.',
    })
    return false
  } catch (error) {
    if (error instanceof ApiCallError && error.status === 401) {
      clearAuthToken()
      applyAuthState({
        status: 'unauthenticated',
        error: error.message,
      })
      return false
    }

    applyAuthState({
      status: authState.authenticated ? 'authenticated' : 'verification-failed',
      error: error instanceof ApiCallError ? formatApiError(error) : buildContractViolationError(error),
      sessionInfo: authState.sessionInfo,
    })
    return false
  }
}

export function useAuthState() {
  return authState
}

export function useUiPermissions(): UiPermissionPolicy {
  return {
    get canViewTenantSettings() {
      return buildUiPermissionPolicy(authState.sessionInfo).canViewTenantSettings
    },
    get canEditTenantSettings() {
      return buildUiPermissionPolicy(authState.sessionInfo).canEditTenantSettings
    },
    get canManageGlobalSettings() {
      return buildUiPermissionPolicy(authState.sessionInfo).canManageGlobalSettings
    },
  }
}
