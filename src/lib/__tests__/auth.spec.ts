import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSessionInfo = vi.hoisted(() => vi.fn())
const loginSession = vi.hoisted(() => vi.fn())
const logoutSessionRpc = vi.hoisted(() => vi.fn())

vi.mock('../api/facade', () => ({
  authFacade: {
    getSessionInfo,
    loginSession,
    logoutSession: logoutSessionRpc,
  },
}))

describe('ensureAuthenticated', () => {
  beforeEach(() => {
    vi.resetModules()
    getSessionInfo.mockReset()
    loginSession.mockReset()
    logoutSessionRpc.mockReset()
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
      authState: 'AUTHENTICATED',
      authSource: 'ACTIVE_SESSION',
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
      authState: 'UNAUTHENTICATED',
      authSource: 'NONE',
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
      authState: 'AUTHENTICATED',
      authSource: 'ACTIVE_SESSION',
      sessionInfo: {
        username: 'backend',
      },
    })

    const { ensureAuthenticated, useAuthState } = await import('../auth')

    await expect(ensureAuthenticated(true)).resolves.toBe(false)
    expect(useAuthState().status).toBe('verification-failed')
    expect(useAuthState().error).toContain('Auth contract violation')
  })

  it('clears authenticated state after explicit facade logout', async () => {
    loginSession.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authState: 'AUTHENTICATED',
      authSource: 'PASSWORD_LOGIN',
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
      authState: 'UNAUTHENTICATED',
      authSource: 'NONE',
    })

    const { loginWithCredentials, logoutSession, useAuthState } = await import('../auth')

    await expect(loginWithCredentials('backend', 'secret')).resolves.toBe(true)
    await expect(logoutSession()).resolves.toBe(true)

    expect(logoutSessionRpc).toHaveBeenCalledTimes(1)
    expect(useAuthState().authenticated).toBe(false)
    expect(useAuthState().userId).toBeNull()
    expect(useAuthState().username).toBeNull()
    expect(useAuthState().error).toBeNull()
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
