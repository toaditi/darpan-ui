import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type TestAuthStatus = 'authenticated' | 'unauthenticated' | 'verification-failed'

interface TestAuthState {
  checked: boolean
  error: string | null
  status: TestAuthStatus
  sessionInfo: { userId: string; username?: string } | null
  readonly authenticated: boolean
  readonly userId: string | null
  readonly username: string | null
}

const replace = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const route = vi.hoisted(() => ({
  query: {
    redirect: '/connections/llm',
  },
}))
const authStore = vi.hoisted(() => ({
  state: null as TestAuthState | null,
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    replace,
  }),
}))

vi.mock('../../lib/auth', () => {
  authStore.state = reactive({
    checked: true,
    error: null as string | null,
    status: 'verification-failed' as TestAuthStatus,
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
  }) as TestAuthState

  return {
    useAuthState: () => authStore.state,
  }
})

import AuthRequiredPage from '../AuthRequiredPage.vue'

describe('AuthRequiredPage', () => {
  beforeEach(() => {
    replace.mockClear()
    route.query.redirect = '/connections/llm'
    if (!authStore.state) throw new Error('Auth test store was not initialized')

    authStore.state.checked = true
    authStore.state.error = 'Unable to verify authentication'
    authStore.state.status = 'verification-failed'
    authStore.state.sessionInfo = null
  })

  it('keeps the session-check-failed page visible for verification failures', async () => {
    const wrapper = mount(AuthRequiredPage)
    await flushPromises()

    expect(replace).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Session Check Failed')
    expect(wrapper.text()).toContain('Retry')
  })

  it('redirects immediately to login when the user is already unauthenticated', async () => {
    if (!authStore.state) throw new Error('Auth test store was not initialized')
    authStore.state.status = 'unauthenticated'
    authStore.state.error = 'No active authenticated session detected.'

    mount(AuthRequiredPage)
    await flushPromises()

    expect(replace).toHaveBeenCalledWith({
      name: 'login',
      query: {
        redirect: '/connections/llm',
      },
    })
  })

  it('redirects to login when auth state downgrades from verification failure to unauthenticated', async () => {
    mount(AuthRequiredPage)
    await flushPromises()

    if (!authStore.state) throw new Error('Auth test store was not initialized')
    authStore.state.status = 'unauthenticated'
    authStore.state.error = 'No active authenticated session detected.'

    await nextTick()
    await flushPromises()

    expect(replace).toHaveBeenCalledWith({
      name: 'login',
      query: {
        redirect: '/connections/llm',
      },
    })
  })
})
