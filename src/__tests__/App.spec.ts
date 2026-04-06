import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const ensureAuthenticated = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const logoutSession = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const replace = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const toggleTheme = vi.hoisted(() => vi.fn())
const authState = vi.hoisted(() => ({
  checked: true,
  error: null as string | null,
  status: 'authenticated' as 'authenticated' | 'unauthenticated' | 'verification-failed',
  sessionInfo: {
    userId: '100000',
    username: 'pilot.customer',
  } as { userId: string; username?: string } | null,
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
const authRequiredEvent = vi.hoisted(() => 'darpan:auth-required')
const route = vi.hoisted(() => ({
  name: 'hub',
  path: '/',
  fullPath: '/',
  query: {} as Record<string, unknown>,
  meta: {} as Record<string, unknown>,
}))
const mountedWrappers: Array<{ unmount: () => void }> = []

vi.mock('vue-router', () => ({
  RouterLink: {
    template: '<a><slot /></a>',
  },
  RouterView: {
    template: '<div />',
  },
  useRoute: () => route,
  useRouter: () => ({
    push,
    replace,
  }),
}))

vi.mock('../components/shell/CommandPalette.vue', () => ({
  default: {
    template: '<div />',
  },
}))

vi.mock('../lib/auth', () => ({
  buildAuthRedirect: vi.fn((redirect: unknown) => ({
    name: authState.status === 'verification-failed' ? 'auth-required' : 'login',
    query: { redirect },
  })),
  ensureAuthenticated,
  logoutSession,
  useAuthState: () => authState,
}))

vi.mock('../lib/api/client', () => ({
  AUTH_REQUIRED_EVENT: authRequiredEvent,
}))

vi.mock('../lib/theme', () => ({
  useTheme: () => ({
    theme: { value: 'light' },
    toggleTheme,
  }),
}))

import App from '../App.vue'

function mountApp() {
  const wrapper = mount(App, { attachTo: document.body })
  mountedWrappers.push(wrapper)
  return wrapper
}

describe('App shell logout', () => {
  beforeEach(() => {
    ensureAuthenticated.mockClear()
    logoutSession.mockClear()
    replace.mockClear()
    push.mockClear()
    toggleTheme.mockClear()
    route.name = 'hub'
    route.path = '/'
    route.fullPath = '/'
    route.query = {}
    route.meta = {}
    document.body.classList.remove('surface-mode-static', 'surface-mode-workflow')
    window.history.replaceState({}, '', '/')
    authState.checked = true
    authState.error = null
    authState.status = 'authenticated'
    authState.sessionInfo = {
      userId: '100000',
      username: 'pilot.customer',
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    mountedWrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  })

  it('shows a visible logout action that calls the facade logout flow', async () => {
    const wrapper = mountApp()
    await flushPromises()

    await wrapper.get('.user-fab').trigger('click')
    await flushPromises()

    const logoutButton = wrapper.get('.user-menu-logout')
    expect(logoutButton.text()).toContain('Sign Out')

    await logoutButton.trigger('click')
    await flushPromises()

    expect(logoutSession).toHaveBeenCalledTimes(1)
    expect(replace).toHaveBeenCalledWith({ name: 'login' })
  })

  it('keeps home and command controls in the floating action cluster', async () => {
    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.find('.utility-header').exists()).toBe(false)
    expect(wrapper.find('.floating-actions').exists()).toBe(true)
    expect(wrapper.find('.command-bubble').text()).toContain('Ask Darpan')
    expect(wrapper.find('.home-fab').exists()).toBe(true)
    expect(wrapper.find('.app-shell').classes()).toContain('app-shell--static')
    expect(document.body.classList.contains('surface-mode-static')).toBe(true)
  })

  it('shows only the theme toggle control inside the user menu', async () => {
    const wrapper = mountApp()
    await flushPromises()

    await wrapper.get('.user-fab').trigger('click')
    await flushPromises()

    expect(wrapper.text()).not.toContain('User details')
    expect(wrapper.text()).not.toContain('Theme')
    expect(wrapper.text()).not.toContain('Signed in')
    expect(wrapper.text()).not.toContain('Ask Darpan shortcut: Cmd/Ctrl+K')

    const themeToggle = wrapper.get('.theme-toggle')
    await themeToggle.trigger('click')

    expect(toggleTheme).toHaveBeenCalledTimes(1)
  })

  it('keeps the page visible by avoiding a full-screen user-menu backdrop', async () => {
    const wrapper = mountApp()
    await flushPromises()

    await wrapper.get('.user-fab').trigger('click')
    await flushPromises()

    expect(wrapper.find('.user-menu-backdrop').exists()).toBe(false)
    expect(wrapper.find('.user-menu-card').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await flushPromises()

    expect(wrapper.find('.user-menu-card').exists()).toBe(false)
  })

  it('switches the shell into workflow mode for workflow routes', async () => {
    route.name = 'reconciliation-create'
    route.path = '/reconciliation/create'
    route.fullPath = '/reconciliation/create'
    route.meta = { surfaceMode: 'workflow' }

    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.find('.app-shell').classes()).toContain('app-shell--workflow')
    expect(wrapper.find('.content-shell').classes()).toContain('content-shell--workflow')
    expect(document.body.classList.contains('surface-mode-workflow')).toBe(true)
  })

  it('routes the floating home action back to the hub on non-hub routes', async () => {
    route.name = 'connections-llm'
    route.path = '/connections/llm'
    route.fullPath = '/connections/llm'
    route.meta = {}

    const wrapper = mountApp()
    await flushPromises()

    await wrapper.get('.home-fab').trigger('click')

    expect(push).toHaveBeenCalledWith('/')
  })

  it('uses Escape to abort workflow routes back to the hub when no static origin is available', async () => {
    route.name = 'reconciliation-create'
    route.path = '/reconciliation/create'
    route.fullPath = '/reconciliation/create'
    route.meta = { surfaceMode: 'workflow' }

    mountApp()
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/')
  })

  it('shows a temporary Escape hint when a workflow route has static origin state', async () => {
    vi.useFakeTimers()
    route.name = 'reconciliation-create'
    route.path = '/reconciliation/create'
    route.fullPath = '/reconciliation/create'
    route.meta = { surfaceMode: 'workflow' }
    window.history.replaceState(
      {
        workflowOriginLabel: 'Dashboard',
        workflowOriginPath: '/',
      },
      '',
      '/reconciliation/create',
    )

    const wrapper = mountApp()
    await flushPromises()

    expect(wrapper.text()).toContain('Press Esc to go back to Dashboard')

    vi.advanceTimersByTime(2000)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Press Esc to go back to Dashboard')
  })

  it('uses Escape to return workflow routes to the static origin when provided', async () => {
    route.name = 'reconciliation-create'
    route.path = '/reconciliation/create'
    route.fullPath = '/reconciliation/create'
    route.meta = { surfaceMode: 'workflow' }
    window.history.replaceState(
      {
        workflowOriginLabel: 'Schema Library',
        workflowOriginPath: '/schemas/library',
      },
      '',
      '/reconciliation/create',
    )

    mountApp()
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/schemas/library')
  })

  it('clears retained focus after Escape aborts a workflow route', async () => {
    route.name = 'reconciliation-create'
    route.path = '/reconciliation/create'
    route.fullPath = '/reconciliation/create'
    route.meta = { surfaceMode: 'workflow' }

    const wrapper = mountApp()
    await flushPromises()

    const homeButton = wrapper.get('.home-fab').element as HTMLButtonElement
    homeButton.focus()
    expect(document.activeElement).toBe(homeButton)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flushPromises()

    expect(document.activeElement).not.toBe(homeButton)
  })

  it('does not navigate home on Escape for non-workflow routes', async () => {
    route.name = 'connections-llm'
    route.path = '/connections/llm'
    route.fullPath = '/connections/llm'
    route.meta = {}

    mountApp()
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flushPromises()

    expect(push).not.toHaveBeenCalled()
  })

  it('re-checks auth on auth-required events and routes verification failures to auth-required', async () => {
    ensureAuthenticated.mockResolvedValue(false)
    authState.error = 'Unable to verify authentication'
    authState.status = 'verification-failed'
    authState.sessionInfo = null

    mountApp()
    await flushPromises()

    window.dispatchEvent(new CustomEvent(authRequiredEvent))
    await flushPromises()

    expect(ensureAuthenticated).toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith({
      name: 'auth-required',
      query: { redirect: '/' },
    })
  })
})
