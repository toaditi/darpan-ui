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
  buildAuthRedirect: (redirect: string) => ({ name: 'login', query: { redirect } }),
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
    await router.push('/settings/sftp')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/settings/sftp')
  })

  it('routes auth bootstrap failures to login', async () => {
    ensureAuthenticated.mockResolvedValue(false)
    authState.error = 'Unable to verify authentication'
    authState.status = 'verification-failed'

    await router.push('/settings/sftp')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/settings/sftp')
  })

  it('allows authenticated users to open the standalone SFTP dashboard', async () => {
    ensureAuthenticated.mockResolvedValue(true)
    authState.status = 'authenticated'
    authState.sessionInfo = { userId: '100000', username: 'pilot.customer' }
    await router.push('/settings/sftp')

    expect(router.currentRoute.value.name).toBe('settings-sftp')
  })

  it('redirects the legacy SFTP route to the standalone dashboard for authenticated users', async () => {
    ensureAuthenticated.mockResolvedValue(true)
    authState.status = 'authenticated'
    authState.sessionInfo = { userId: '100000', username: 'pilot.customer' }
    await router.push('/connections/sftp')

    expect(router.currentRoute.value.name).toBe('settings-sftp')
  })
})
