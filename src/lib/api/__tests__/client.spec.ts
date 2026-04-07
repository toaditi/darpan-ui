import { beforeEach, describe, expect, it, vi } from 'vitest'

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

describe('callService', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/login')
    installLocalStorageStub()
  })

  it('sends the configured auth header and omits credentialed fetches', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            ok: true,
            messages: [],
            errors: [],
            authenticated: true,
            sessionInfo: {
              userId: 'john.doe',
              username: 'john.doe',
            },
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const { callService, setAuthTokenContract } = await import('../client')
    setAuthTokenContract({
      authToken: 'token-123',
      authTokenHeaderName: 'login_key',
      authTokenType: 'LOGIN_KEY',
      authTokenExpiresInSeconds: 3600,
    })

    const result = await callService<{
      authenticated: boolean
      sessionInfo?: { userId: string }
    }>('facade.AuthFacadeServices.get#SessionInfo')

    expect(result.authenticated).toBe(true)
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string> }
    expect(requestInit.credentials).toBe('omit')
    expect(requestInit.headers.login_key).toBe('token-123')
  })

  it('drops expired auth tokens before sending a request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            ok: true,
            messages: [],
            errors: [],
            authenticated: false,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    window.localStorage.setItem(
      'darpan.authToken',
      JSON.stringify({
        value: 'expired-token',
        headerName: 'login_key',
        tokenType: 'LOGIN_KEY',
        expiresAt: Date.now() - 1000,
      }),
    )

    vi.resetModules()
    const { callService: callWithExpiredToken, getAuthToken } = await import('../client')
    await callWithExpiredToken('facade.AuthFacadeServices.get#SessionInfo')

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit & { headers: Record<string, string> }
    expect(requestInit.headers.login_key).toBeUndefined()
    expect(getAuthToken()).toBeNull()
    expect(window.localStorage.getItem('darpan.authToken')).toBeNull()
  })

  it('clears the stored auth token when the backend rejects it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            ok: false,
            messages: [],
            errors: ['Login key expired'],
            authenticated: false,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    vi.stubGlobal('fetch', fetchMock)

    const { callService, getAuthToken, setAuthToken } = await import('../client')
    setAuthToken('expired-token')

    await expect(callService('facade.AuthFacadeServices.get#SessionInfo')).rejects.toMatchObject({
      name: 'ApiCallError',
      message: 'Login key expired',
      status: 401,
    })
    expect(getAuthToken()).toBeNull()
    expect(window.localStorage.getItem('darpan.authToken')).toBeNull()
  })

  it('returns a friendly unreachable message for a configured rpc endpoint', async () => {
    vi.stubEnv('VITE_DARPAN_API_BASE_URL', 'https://pilot.example.com')
    vi.stubEnv('VITE_DARPAN_RPC_URL', 'https://pilot.example.com/rpc/json')

    const fetchMock = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
    vi.stubGlobal('fetch', fetchMock)

    const { callService } = await import('../client')

    await expect(callService('facade.AuthFacadeServices.get#SessionInfo')).rejects.toMatchObject({
      name: 'ApiCallError',
      message: 'Unable to connect to Darpan right now. Try again in a moment.',
      status: 503,
    })
    expect(fetchMock).toHaveBeenCalled()
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://pilot.example.com/rpc/json')
  })
})
