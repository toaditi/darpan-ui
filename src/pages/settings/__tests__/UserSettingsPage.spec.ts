import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { WORKFLOW_CANCEL_REQUEST_EVENT, WORKFLOW_HINT_REQUEST_EVENT } from '../../../lib/uiEvents'

type TestSessionInfo = {
  userId: string
  username: string
  displayName: string
  timeZone: string
  lastLoginDate?: string
  lastRun?: {
    savedRunId?: string
    reconciliationRunId?: string
    reconciliationRunResultId?: string
    createdDate?: string
  } | null
  activeTenantUserGroupId: string
  activeTenantLabel: string
  availableTenants: Array<{ userGroupId: string; label: string }>
  canRunActiveTenantReconciliation?: boolean
  canEditActiveTenantData: boolean
  canManageDarpanCore?: boolean
  isSuperAdmin: boolean
}

const saveActiveTenant = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const verifyOwnPassword = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const changeOwnPassword = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const saveUserSettings = vi.hoisted(() => vi.fn(async ({ displayName }: { displayName?: string }) => {
  authState.sessionInfo = {
    ...authState.sessionInfo,
    displayName: displayName?.toString().trim() || authState.sessionInfo.username,
  }
  return true
}))
const authState = vi.hoisted<{ sessionInfo: TestSessionInfo }>(() => ({
  sessionInfo: {
    userId: 'M100000',
    username: 'john.doe',
    displayName: 'john.doe',
    timeZone: 'America/Los_Angeles',
    lastLoginDate: '2026-04-30T14:14:00Z',
    lastRun: {
      savedRunId: 'ORDER_SYNC',
      createdDate: '2026-04-30T14:44:00Z',
    },
    activeTenantUserGroupId: 'KREWE',
    activeTenantLabel: 'Krewe',
    availableTenants: [
      { userGroupId: 'KREWE', label: 'Krewe' },
      { userGroupId: 'GORJANA', label: 'Gorjana' },
    ],
    canEditActiveTenantData: true,
    isSuperAdmin: false,
  },
}))

vi.mock('../../../lib/auth', () => ({
  saveActiveTenant,
  verifyOwnPassword,
  changeOwnPassword,
  saveUserSettings,
  useAuthState: () => authState,
  useUiPermissions: () => ({
    canViewTenantSettings: true,
    canRunActiveTenantReconciliation: authState.sessionInfo.canRunActiveTenantReconciliation === true ||
      authState.sessionInfo.canEditActiveTenantData === true ||
      authState.sessionInfo.isSuperAdmin === true,
    canEditTenantSettings: authState.sessionInfo.canEditActiveTenantData === true,
    canManageGlobalSettings: authState.sessionInfo.canManageDarpanCore === true,
  }),
}))

import UserSettingsPage from '../UserSettingsPage.vue'

function mountPage() {
  return mount(UserSettingsPage)
}

describe('UserSettingsPage', () => {
  beforeEach(() => {
    saveActiveTenant.mockClear()
    verifyOwnPassword.mockReset()
    verifyOwnPassword.mockResolvedValue(true)
    changeOwnPassword.mockClear()
    saveUserSettings.mockClear()
    authState.sessionInfo = {
      userId: 'M100000',
      username: 'john.doe',
      displayName: 'john.doe',
      timeZone: 'America/Los_Angeles',
      lastLoginDate: '2026-04-30T14:14:00Z',
      lastRun: {
        savedRunId: 'ORDER_SYNC',
        createdDate: '2026-04-30T14:44:00Z',
      },
      activeTenantUserGroupId: 'KREWE',
      activeTenantLabel: 'Krewe',
      availableTenants: [
        { userGroupId: 'KREWE', label: 'Krewe' },
        { userGroupId: 'GORJANA', label: 'Gorjana' },
      ],
      canEditActiveTenantData: true,
      isSuperAdmin: false,
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the shared static-page contracts for the user settings surface', () => {
    const wrapper = mountPage()
    const styleSource = readFileSync('src/style.css', 'utf8')

    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.find('.static-page-hero h1').text()).toBe('User Settings')
    expect(wrapper.find('.static-page-hero .static-page-section-description').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Manage account, tenant context, and personal execution settings')
    expect(wrapper.findAll('.static-page-section-heading').map((node) => node.text())).toEqual([
      'Account',
      'Tenant Context',
      'Preferences',
    ])
    expect(wrapper.findAll('.static-page-summary-card')).toHaveLength(6)
    expect(wrapper.findAll('.static-page-record-tile').map((node) => node.text())).toEqual(['Krewe', 'Gorjana'])
    expect(wrapper.findAll('.static-page-list-tile')).toHaveLength(0)
    expect(wrapper.find('.static-page-section-head .user-settings-password-trigger').exists()).toBe(false)
    expect(wrapper.find('.user-settings-summary-field .static-page-summary-label').text()).toBe('Display name')
    const accountActionStack = wrapper.get('.user-settings-account-action-stack')
    expect(accountActionStack.get('.static-page-summary-label').text()).toBe('User ID')
    expect(accountActionStack.text()).toContain('M100000')
    const passwordTrigger = accountActionStack.get('.user-settings-password-trigger')
    expect(passwordTrigger.text()).toBe('Change password')
    expect(passwordTrigger.find('svg').exists()).toBe(false)
    expect(passwordTrigger.classes()).not.toContain('static-page-summary-card')
    expect(wrapper.find('.static-page-actions [aria-label="Save user settings"]').exists()).toBe(true)
    expect(wrapper.get('.user-settings-preferences-grid').classes()).toContain('static-page-summary-grid')
    expect(wrapper.findAll('.user-settings-preference-card')).toHaveLength(3)
    expect(styleSource).toMatch(/\.static-page-summary-grid\s*\{[^}]*align-items: start;/)
    expect(styleSource).toMatch(/\.user-settings-preferences-grid\s*\{[^}]*align-items: stretch;/)
    expect(styleSource).toMatch(/\.user-settings-preference-card\s*\{[^}]*height: 100%;/)
    expect(wrapper.text()).toContain('ORDER_SYNC')
  })

  it('saves a display name preference from the shared page action', async () => {
    const wrapper = mountPage()
    const input = wrapper.get('input[name="displayName"]')

    expect((input.element as HTMLInputElement).value).toBe('john.doe')

    await input.setValue('Aditi')
    await wrapper.get('.static-page-actions [aria-label="Save user settings"]').trigger('click')
    await flushPromises()

    expect(saveUserSettings).toHaveBeenCalledWith({ displayName: 'Aditi' })
  })

  it('autosaves display name edits after one second without additional input', async () => {
    vi.useFakeTimers()
    const wrapper = mountPage()
    const input = wrapper.get('input[name="displayName"]')

    await input.setValue('Aditi')

    expect(saveUserSettings).not.toHaveBeenCalled()

    vi.advanceTimersByTime(999)
    expect(saveUserSettings).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    await flushPromises()

    expect(saveUserSettings).toHaveBeenCalledWith({ displayName: 'Aditi' })
  })

  it('switches tenant through the existing active tenant contract', async () => {
    const wrapper = mountPage()

    await wrapper.findAll('.static-page-record-tile')[1]?.trigger('click')
    await flushPromises()

    expect(saveActiveTenant).toHaveBeenCalledWith('GORJANA')
  })

  it('changes the current user password through the settings flow', async () => {
    const wrapper = mountPage()

    await wrapper.get('.user-settings-password-trigger').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Enter your current password.')
    expect(wrapper.get('.static-page-frame').classes()).toContain('user-settings-page--popup-open')
    expect(wrapper.get('form.wizard-question-shell').classes()).toContain('workflow-form--popup-compact')
    expect(wrapper.find('.popup-workflow-modal .workflow-panel-header button').exists()).toBe(false)
    expect(wrapper.get('.wizard-actions .wizard-enter-hint').text()).toContain('press Enter')
    await wrapper.get('input[name="currentPassword"]').setValue('old-password')
    await wrapper.get('form.wizard-question-shell').trigger('submit')
    await flushPromises()

    expect(verifyOwnPassword).toHaveBeenCalledWith('old-password')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Enter your new password.')
    await wrapper.get('input[name="newPassword"]').setValue('new-password')
    await wrapper.get('form.wizard-question-shell').trigger('submit')

    expect(wrapper.get('[role="dialog"]').text()).toContain('Enter your new password again.')
    await wrapper.get('input[name="newPasswordVerify"]').setValue('new-password')
    await wrapper.get('form.wizard-question-shell').trigger('submit')
    await flushPromises()

    expect(changeOwnPassword).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'new-password',
      newPasswordVerify: 'new-password',
    })
  })

  it('keeps the current password step open and shows a five-second warning when verification fails', async () => {
    verifyOwnPassword.mockResolvedValueOnce(false)
    const warningEvents: CustomEvent[] = []
    const handleWarning = (event: Event) => warningEvents.push(event as CustomEvent)
    document.addEventListener(WORKFLOW_HINT_REQUEST_EVENT, handleWarning)
    const wrapper = mountPage()

    try {
      await wrapper.get('.user-settings-password-trigger').trigger('click')
      await wrapper.get('input[name="currentPassword"]').setValue('wrong-password')
      await wrapper.get('form.wizard-question-shell').trigger('submit')
      await flushPromises()

      expect(verifyOwnPassword).toHaveBeenCalledWith('wrong-password')
      expect(wrapper.get('[role="dialog"]').text()).toContain('Enter your current password.')
      expect(wrapper.get('[role="dialog"]').text()).not.toContain('Enter your new password.')
      expect(warningEvents).toHaveLength(1)
      expect(warningEvents[0]?.detail).toMatchObject({
        message: 'Password incorrect.',
        tone: 'warning',
        durationMs: 5000,
      })
    } finally {
      document.removeEventListener(WORKFLOW_HINT_REQUEST_EVENT, handleWarning)
    }
  })

  it('closes the password workflow through the shared workflow cancel request', async () => {
    const wrapper = mountPage()

    await wrapper.get('.user-settings-password-trigger').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)

    const cancelRequest = new Event(WORKFLOW_CANCEL_REQUEST_EVENT, { cancelable: true })
    document.dispatchEvent(cancelRequest)
    await flushPromises()

    expect(cancelRequest.defaultPrevented).toBe(true)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('.static-page-frame').classes()).not.toContain('user-settings-page--popup-open')
  })

  it('does not render missing activity placeholders', () => {
    authState.sessionInfo = {
      ...authState.sessionInfo,
      lastLoginDate: undefined,
      lastRun: null,
    }

    const wrapper = mountPage()

    expect(wrapper.text()).not.toContain('Not available')
    expect(wrapper.text()).toContain('Permissions')
  })
})
