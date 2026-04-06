import { beforeEach, describe, expect, it, vi } from 'vitest'

const ensureAuthenticated = vi.hoisted(() => vi.fn())
const authState = vi.hoisted(() => ({
  checked: true,
  error: null as string | null,
  status: 'unauthenticated' as 'authenticated' | 'unauthenticated' | 'verification-failed',
  sessionInfo: null as { userId: string; username?: string } | null,
  get authenticated() {
    return this.status === 'authenticated'
  },
  get userId() {
    return this.sessionInfo?.userId ?? null
  },
  get username() {
    return this.sessionInfo?.username ?? this.sessionInfo?.userId ?? null
  },
}))

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
})

vi.mock('../../lib/auth', () => ({
  buildAuthRedirect: (redirect: string) =>
    authState.status === 'verification-failed'
      ? { name: 'auth-required', query: { redirect } }
      : { name: 'login', query: { redirect } },
  ensureAuthenticated,
  useAuthState: () => authState,
}))

import router from '../index'

describe('router auth guard', () => {
  beforeEach(async () => {
    ensureAuthenticated.mockReset()
    ensureAuthenticated.mockResolvedValue(true)
    authState.checked = true
    authState.error = null
    authState.status = 'unauthenticated'
    authState.sessionInfo = null
    await router.push('/login')
  })

  it('redirects unauthenticated users to login for protected routes', async () => {
    ensureAuthenticated.mockResolvedValue(false)
    authState.error = 'No active authenticated session detected.'
    authState.status = 'unauthenticated'
    await router.push('/connections/llm')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/connections/llm')
  })

  it('routes auth bootstrap failures to auth-required instead of login', async () => {
    ensureAuthenticated.mockResolvedValue(false)
    authState.error = 'Unable to verify authentication'
    authState.status = 'verification-failed'

    await router.push('/connections/llm')

    expect(router.currentRoute.value.name).toBe('auth-required')
    expect(router.currentRoute.value.query.redirect).toBe('/connections/llm')
  })

  it('allows authenticated users to open protected routes', async () => {
    ensureAuthenticated.mockResolvedValue(true)
    authState.status = 'authenticated'
    authState.sessionInfo = { userId: '100000', username: 'pilot.customer' }
    await router.push('/connections/llm')

    expect(router.currentRoute.value.name).toBe('connections-llm')
  })
})
