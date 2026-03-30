import { beforeEach, describe, expect, it, vi } from 'vitest'

const ensureAuthenticated = vi.hoisted(() => vi.fn())

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  writable: true,
})

vi.mock('../../lib/auth', () => ({
  ensureAuthenticated,
}))

import router from '../index'

describe('router auth guard', () => {
  beforeEach(async () => {
    ensureAuthenticated.mockReset()
    ensureAuthenticated.mockResolvedValue(true)
    await router.push('/login')
  })

  it('redirects unauthenticated users to login for protected routes', async () => {
    ensureAuthenticated.mockResolvedValue(false)
    await router.push('/connections/llm')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/connections/llm')
  })

  it('allows authenticated users to open protected routes', async () => {
    ensureAuthenticated.mockResolvedValue(true)
    await router.push('/connections/llm')

    expect(router.currentRoute.value.name).toBe('connections-llm')
  })
})
