import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installLocalStorageStub } from '../../test/localStorage'

const getSessionInfo = vi.hoisted(() => vi.fn())
const loginSession = vi.hoisted(() => vi.fn())
const saveActiveTenantRpc = vi.hoisted(() => vi.fn())
const logoutSessionRpc = vi.hoisted(() => vi.fn())

vi.mock('../api/facade', () => ({
  authFacade: {
    getSessionInfo,
    loginSession,
    saveActiveTenant: saveActiveTenantRpc,
    logoutSession: logoutSessionRpc,
  },
}))

describe('auth state', () => {
  beforeEach(() => {
    vi.resetModules()
    getSessionInfo.mockReset()
    loginSession.mockReset()
    saveActiveTenantRpc.mockReset()
    logoutSessionRpc.mockReset()
    installLocalStorageStub()
  })

  it('starts unchecked before backend verification runs', async () => {
    const { useAuthState } = await import('../auth')

    expect(useAuthState().checked).toBe(false)
    expect(useAuthState().authenticated).toBe(false)
    expect(useAuthState().userId).toBeNull()
    expect(useAuthState().username).toBeNull()
  })

  it('treats backend session info as the source of truth on the first auth check', async () => {
    getSessionInfo.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authenticated: true,
      sessionInfo: {
        userId: 'backend-user',
        username: 'backend',
        scopeType: 'TENANT',
        customerScopeId: 'KREWE',
        activeTenantUserGroupId: 'KREWE',
        activeTenantLabel: 'Krewe',
        availableTenants: [{ userGroupId: 'KREWE', label: 'Krewe' }],
        isSuperAdmin: false,
      },
    })

    const { ensureAuthenticated, useAuthState } = await import('../auth')

    await expect(ensureAuthenticated()).resolves.toBe(true)
    expect(getSessionInfo).toHaveBeenCalledTimes(1)
    expect(useAuthState().authenticated).toBe(true)
    expect(useAuthState().status).toBe('authenticated')
    expect(useAuthState().userId).toBe('backend-user')
    expect(useAuthState().username).toBe('backend')
    expect(useAuthState().sessionInfo?.scopeType).toBe('TENANT')
    expect(useAuthState().sessionInfo?.activeTenantUserGroupId).toBe('KREWE')
  })

  it('stores the explicit auth token contract on login and clears it on logout', async () => {
    loginSession.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authenticated: true,
      authToken: 'login-token-123',
      authTokenType: 'LOGIN_KEY',
      authTokenHeaderName: 'login_key',
      authTokenExpiresInSeconds: 7200,
      sessionInfo: {
        userId: 'backend-user',
        username: 'backend',
        scopeType: 'TENANT',
        customerScopeId: 'KREWE',
        activeTenantUserGroupId: 'KREWE',
        activeTenantLabel: 'Krewe',
        availableTenants: [{ userGroupId: 'KREWE', label: 'Krewe' }],
        isSuperAdmin: false,
      },
    })
    logoutSessionRpc.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authenticated: false,
      authTokenRevoked: true,
    })

    const { getAuthToken } = await import('../api/client')
    const { loginWithCredentials, logoutSession, useAuthState } = await import('../auth')

    await expect(loginWithCredentials('backend', 'secret')).resolves.toBe(true)
    expect(getAuthToken()).toBe('login-token-123')
    expect(JSON.parse(window.localStorage.getItem('darpan.authToken') ?? '{}')).toMatchObject({
      value: 'login-token-123',
      headerName: 'login_key',
      tokenType: 'LOGIN_KEY',
    })

    await expect(logoutSession()).resolves.toBe(true)
    expect(logoutSessionRpc).toHaveBeenCalledTimes(1)
    expect(getAuthToken()).toBeNull()
    expect(useAuthState().authenticated).toBe(false)
    expect(useAuthState().status).toBe('unauthenticated')
    expect(useAuthState().error).toBeNull()
  })

  it('updates the authenticated session when the active tenant changes', async () => {
    saveActiveTenantRpc.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authenticated: true,
      sessionInfo: {
        userId: 'backend-user',
        username: 'backend',
        scopeType: 'TENANT',
        customerScopeId: 'GORJANA',
        activeTenantUserGroupId: 'GORJANA',
        activeTenantLabel: 'Gorjana',
        availableTenants: [
          { userGroupId: 'GORJANA', label: 'Gorjana' },
          { userGroupId: 'KREWE', label: 'Krewe' },
        ],
        isSuperAdmin: false,
      },
    })

    const { saveActiveTenant, useAuthState } = await import('../auth')

    await expect(saveActiveTenant('GORJANA')).resolves.toBe(true)
    expect(saveActiveTenantRpc).toHaveBeenCalledWith('GORJANA')
    expect(useAuthState().status).toBe('authenticated')
    expect(useAuthState().sessionInfo?.activeTenantUserGroupId).toBe('GORJANA')
    expect(useAuthState().sessionInfo?.activeTenantLabel).toBe('Gorjana')
    expect(useAuthState().error).toBeNull()
  })

  it('derives UI permissions for view-only, editor, and super-admin sessions', async () => {
    const { buildUiPermissionPolicy } = await import('../auth')

    expect(buildUiPermissionPolicy({
      userId: 'view-only',
      canEditActiveTenantData: false,
      isSuperAdmin: false,
    })).toEqual({
      canViewTenantSettings: true,
      canEditTenantSettings: false,
      canManageGlobalSettings: false,
    })

    expect(buildUiPermissionPolicy({
      userId: 'editor',
      canEditActiveTenantData: true,
      isSuperAdmin: false,
    })).toMatchObject({
      canViewTenantSettings: true,
      canEditTenantSettings: true,
      canManageGlobalSettings: false,
    })

    expect(buildUiPermissionPolicy({
      userId: 'super-admin',
      canEditActiveTenantData: false,
      isSuperAdmin: true,
    })).toMatchObject({
      canViewTenantSettings: true,
      canEditTenantSettings: true,
      canManageGlobalSettings: true,
    })
  })

  it('marks the state as unauthenticated when login key verification returns 401', async () => {
    window.localStorage.setItem(
      'darpan.authToken',
      JSON.stringify({
        value: 'expired-token',
        headerName: 'login_key',
        tokenType: 'LOGIN_KEY',
        expiresAt: null,
      }),
    )
    const { ApiCallError, getAuthToken } = await import('../api/client')
    getSessionInfo.mockRejectedValue(new ApiCallError('Login key expired', 401))

    const { ensureAuthenticated, useAuthState } = await import('../auth')

    await expect(ensureAuthenticated(true)).resolves.toBe(false)
    expect(getAuthToken()).toBeNull()
    expect(useAuthState().authenticated).toBe(false)
    expect(useAuthState().status).toBe('unauthenticated')
    expect(useAuthState().error).toBe('Login key expired')
  })

  it('fails closed when a forced session refresh errors', async () => {
    getSessionInfo.mockRejectedValue(new Error('network failure'))

    const { ensureAuthenticated, useAuthState } = await import('../auth')

    await expect(ensureAuthenticated(true)).resolves.toBe(false)
    expect(useAuthState().authenticated).toBe(false)
    expect(useAuthState().status).toBe('verification-failed')
    expect(useAuthState().error).toBe('Unable to verify authentication. network failure')
  })

  it('marks the state as unauthenticated when backend confirms there is no active session', async () => {
    getSessionInfo.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authenticated: false,
      sessionInfo: null,
    })

    const { ensureAuthenticated, useAuthState } = await import('../auth')

    await expect(ensureAuthenticated(true)).resolves.toBe(false)
    expect(useAuthState().authenticated).toBe(false)
    expect(useAuthState().status).toBe('unauthenticated')
    expect(useAuthState().error).toBe('No active authenticated session detected.')
  })

  it('fails verification when backend returns an authenticated response without sessionInfo.userId', async () => {
    getSessionInfo.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authenticated: true,
      sessionInfo: {
        username: 'backend',
      },
    })

    const { ensureAuthenticated, useAuthState } = await import('../auth')

    await expect(ensureAuthenticated(true)).resolves.toBe(false)
    expect(useAuthState().status).toBe('verification-failed')
    expect(useAuthState().error).toContain('Auth contract violation')
  })

  it('builds the login redirect when the last auth check was a verification failure', async () => {
    getSessionInfo.mockRejectedValue(new Error('network failure'))

    const { buildAuthRedirect, ensureAuthenticated } = await import('../auth')

    await expect(ensureAuthenticated(true)).resolves.toBe(false)
    expect(buildAuthRedirect('/connections/llm')).toEqual({
      name: 'login',
      query: { redirect: '/connections/llm' },
    })
  })

  it('does not build login redirects that point back to login', async () => {
    const { buildAuthRedirect } = await import('../auth')

    expect(buildAuthRedirect('/login')).toEqual({ name: 'login' })
    expect(buildAuthRedirect('/login?redirect=/login')).toEqual({ name: 'login' })
    expect(buildAuthRedirect('/')).toEqual({ name: 'login' })
  })
})
