import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('callService', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    window.history.replaceState({}, '', '/login')
  })

  it('retries auth requests when the first response is login html with an inline session token', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          '<html><body><form action="/Login"><input name="moquiSessionToken" value="inline-token-123" /></form></body></html>',
          {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            result: {
              ok: true,
              messages: [],
              errors: [],
              authState: 'AUTHENTICATED',
              authSource: 'PASSWORD_LOGIN',
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

    const { callService } = await import('../client')

    const result = await callService<{
      authState: 'AUTHENTICATED' | 'UNAUTHENTICATED'
      sessionInfo?: { userId: string }
    }>('facade.AuthFacadeServices.login#Session', {
      username: 'john.doe',
      password: 'secret',
    })

    expect(result.authState).toBe('AUTHENTICATED')
    expect(result.sessionInfo?.userId).toBe('john.doe')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const retryHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>
    expect(retryHeaders['X-CSRF-Token']).toBe('inline-token-123')
  })

  it('prefers the same-origin Vite proxy for configured loopback rpc targets in local dev', async () => {
    vi.stubEnv('VITE_DARPAN_API_BASE_URL', 'http://localhost:8080')
    vi.stubEnv('VITE_DARPAN_RPC_URL', 'http://localhost:8080/rpc/json')
    window.history.replaceState({}, '', '/login')

    const fetchMock = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
    vi.stubGlobal('fetch', fetchMock)

    const { callService, getRpcUrl } = await import('../client')

    let error: unknown
    try {
      await callService('facade.AuthFacadeServices.get#SessionInfo')
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).toMatchObject({
      name: 'ApiCallError',
      message: 'Unable to connect to Darpan right now. Try again in a moment.',
    })
    const expectedProxyUrl = `${window.location.origin}/rpc/json`
    expect(getRpcUrl()).toBe(expectedProxyUrl)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(expectedProxyUrl)
  })

  it('does not probe unrelated remote rpc urls when VITE_DARPAN_RPC_URL is explicitly configured', async () => {
    vi.stubEnv('VITE_DARPAN_API_BASE_URL', 'https://pilot.example.com')
    vi.stubEnv('VITE_DARPAN_RPC_URL', 'https://pilot.example.com/rpc/json')

    const fetchMock = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED'))
    vi.stubGlobal('fetch', fetchMock)

    const { callService } = await import('../client')

    let error: unknown
    try {
      await callService('facade.AuthFacadeServices.get#SessionInfo')
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).toMatchObject({
      name: 'ApiCallError',
      message: 'Unable to connect to Darpan right now. Try again in a moment.',
    })
    expect((error as { message: string }).message).not.toContain('facade.AuthFacadeServices')
    expect((error as { details?: unknown }).details).toMatchObject({
      method: 'facade.AuthFacadeServices.get#SessionInfo',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://pilot.example.com/rpc/json')
  })

  it('does not dispatch the global auth-required event for get#SessionInfo failures', async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response('<html><title>Login</title></html>', {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
        }),
    )
    const dispatchEvent = vi.spyOn(window, 'dispatchEvent')

    vi.stubGlobal('fetch', fetchMock)

    const { callService } = await import('../client')

    let error: unknown
    try {
      await callService('facade.AuthFacadeServices.get#SessionInfo')
    } catch (caughtError) {
      error = caughtError
    }

    expect(error).toMatchObject({
      name: 'ApiCallError',
      message: 'Your session has ended. Sign in again to continue.',
    })
    expect((error as { message: string }).message).not.toContain('facade.AuthFacadeServices')
    expect((error as { details?: unknown }).details).toMatchObject({
      method: 'facade.AuthFacadeServices.get#SessionInfo',
    })

    expect(dispatchEvent).not.toHaveBeenCalled()
  })
})
