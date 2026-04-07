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
      },
    })

    const { ensureAuthenticated, useAuthState } = await import('../auth')

    await expect(ensureAuthenticated()).resolves.toBe(true)
    expect(getSessionInfo).toHaveBeenCalledTimes(1)
    expect(useAuthState().authenticated).toBe(true)
    expect(useAuthState().userId).toBe('backend-user')
    expect(useAuthState().username).toBe('backend')
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
    expect(useAuthState().error).toBeNull()
  })

  it('clears stale auth tokens when session verification returns 401', async () => {
    window.localStorage.setItem('darpan.authToken', 'expired-token')
    const { ApiCallError, getAuthToken } = await import('../api/client')
    getSessionInfo.mockRejectedValue(new ApiCallError('Login key expired', 401))

    const { ensureAuthenticated, useAuthState } = await import('../auth')

    await expect(ensureAuthenticated(true)).resolves.toBe(false)
    expect(getAuthToken()).toBeNull()
    expect(useAuthState().authenticated).toBe(false)
    expect(useAuthState().error).toBe('Login key expired')
  })
})
