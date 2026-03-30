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

    const { callService } = await import('../client')

    const result = await callService<{
      authenticated: boolean
      sessionInfo?: { userId: string }
    }>('facade.AuthFacadeServices.login#Session', {
      username: 'john.doe',
      password: 'secret',
    })

    expect(result.authenticated).toBe(true)
    expect(result.sessionInfo?.userId).toBe('john.doe')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    const retryHeaders = fetchMock.mock.calls[1]?.[1]?.headers as Record<string, string>
    expect(retryHeaders['X-CSRF-Token']).toBe('inline-token-123')
  })
})
