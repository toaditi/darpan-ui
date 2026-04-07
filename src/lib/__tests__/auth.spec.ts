import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSessionInfo = vi.hoisted(() => vi.fn())
const loginSession = vi.hoisted(() => vi.fn())
const logoutSessionRpc = vi.hoisted(() => vi.fn())

function installLocalStorageStub(): void {
  const store = new Map<string, string>()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value))
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
    },
  })
}

vi.mock('../api/facade', () => ({
  authFacade: {
    getSessionInfo,
    loginSession,
    logoutSession: logoutSessionRpc,
  },
}))

describe('auth state', () => {
  beforeEach(() => {
    vi.resetModules()
    getSessionInfo.mockReset()
    loginSession.mockReset()
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
        scopeType: 'CUSTOMER',
        customerScopeId: 'backend-user',
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
    expect(useAuthState().sessionInfo?.scopeType).toBe('CUSTOMER')
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
        scopeType: 'CUSTOMER',
        customerScopeId: 'backend-user',
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

  it('marks the state as unauthenticated when login key verification returns 401', async () => {
    window.localStorage.setItem('darpan.authToken', 'expired-token')
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

  it('builds the auth-required redirect when the last auth check was a verification failure', async () => {
    getSessionInfo.mockRejectedValue(new Error('network failure'))

    const { buildAuthRedirect, ensureAuthenticated } = await import('../auth')

    await expect(ensureAuthenticated(true)).resolves.toBe(false)
    expect(buildAuthRedirect('/connections/llm')).toEqual({
      name: 'auth-required',
      query: { redirect: '/connections/llm' },
    })
  })
})
