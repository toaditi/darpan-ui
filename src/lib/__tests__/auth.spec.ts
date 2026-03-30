import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSessionInfo = vi.hoisted(() => vi.fn())
const loginSession = vi.hoisted(() => vi.fn())

vi.mock('../api/facade', () => ({
  authFacade: {
    getSessionInfo,
    loginSession,
  },
}))

describe('ensureAuthenticated', () => {
  beforeEach(() => {
    vi.resetModules()
    getSessionInfo.mockReset()
    loginSession.mockReset()
    window.sessionStorage.clear()
  })

  it('does not hydrate authenticated state from legacy session storage before backend verification', async () => {
    window.sessionStorage.setItem(
      'darpan-ui-auth-cache',
      JSON.stringify({
        userId: 'demo-user',
        username: 'demo',
      }),
    )

    const { useAuthState } = await import('../auth')

    expect(useAuthState().checked).toBe(false)
    expect(useAuthState().authenticated).toBe(false)
    expect(useAuthState().userId).toBeNull()
    expect(useAuthState().username).toBeNull()
  })

  it('treats backend session info as the source of truth on the first auth check', async () => {
    window.sessionStorage.setItem(
      'darpan-ui-auth-cache',
      JSON.stringify({
        userId: 'stale-user',
        username: 'stale',
      }),
    )
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

  it('fails closed when a forced session refresh errors after cache hydration', async () => {
    window.sessionStorage.setItem(
      'darpan-ui-auth-cache',
      JSON.stringify({
        userId: 'demo-user',
        username: 'demo',
      }),
    )
    getSessionInfo.mockRejectedValue(new Error('network failure'))

    const { ensureAuthenticated, useAuthState } = await import('../auth')

    await expect(ensureAuthenticated(true)).resolves.toBe(false)
    expect(useAuthState().authenticated).toBe(false)
    expect(useAuthState().error).toBe('Unable to verify authentication')
    expect(window.sessionStorage.getItem('darpan-ui-auth-cache')).toBeNull()
  })
})
