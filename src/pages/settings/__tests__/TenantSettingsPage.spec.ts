import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const getLlmSettings = vi.hoisted(() => vi.fn())
const saveLlmSettings = vi.hoisted(() => vi.fn())
const getTenantSettings = vi.hoisted(() => vi.fn())
const saveTenantSettings = vi.hoisted(() => vi.fn())
const getTenantNotificationSettings = vi.hoisted(() => vi.fn())
const saveTenantNotificationSettings = vi.hoisted(() => vi.fn())
const listSftpServers = vi.hoisted(() => vi.fn())
const listNsAuthConfigs = vi.hoisted(() => vi.fn())
const listNsRestletConfigs = vi.hoisted(() => vi.fn())
const listShopifyAuthConfigs = vi.hoisted(() => vi.fn())
const listOmsRestSourceConfigs = vi.hoisted(() => vi.fn())
const push = vi.hoisted(() => vi.fn())
const replace = vi.hoisted(() => vi.fn())
const route = vi.hoisted(() => ({
  fullPath: '/settings/tenant',
  query: {} as Record<string, unknown>,
}))
const authState = vi.hoisted(() => ({
  sessionInfo: {
    userId: 'admin',
    activeTenantUserGroupId: 'KREWE',
    activeTenantLabel: 'Krewe',
    timeZone: 'America/Los_Angeles',
    availableTenants: [
      { userGroupId: 'KREWE', label: 'Krewe' },
      { userGroupId: 'GORJANA', label: 'Gorjana' },
    ],
    canEditActiveTenantData: true,
    isSuperAdmin: true,
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    push,
    replace,
  }),
}))

vi.mock('../../../lib/api/facade', () => ({
  settingsFacade: {
    getLlmSettings,
    saveLlmSettings,
    getTenantSettings,
    getTenantNotificationSettings,
    saveTenantNotificationSettings,
    listSftpServers,
    listNsAuthConfigs,
    listNsRestletConfigs,
    listShopifyAuthConfigs,
    listOmsRestSourceConfigs,
  },
}))

vi.mock('../../../lib/auth', () => ({
  saveTenantSettings,
  useAuthState: () => authState,
  useUiPermissions: () => ({
    get canEditTenantSettings() {
      return authState.sessionInfo.canEditActiveTenantData === true || authState.sessionInfo.isSuperAdmin === true
    },
    get canManageGlobalSettings() {
      return authState.sessionInfo.isSuperAdmin === true
    },
    get canViewTenantSettings() {
      return Boolean(authState.sessionInfo.userId)
    },
  }),
}))

import TenantSettingsPage from '../TenantSettingsPage.vue'

describe('TenantSettingsPage', () => {
  beforeEach(() => {
    route.fullPath = '/settings/tenant'
    route.query = {}
    authState.sessionInfo = {
      userId: 'admin',
      activeTenantUserGroupId: 'KREWE',
      activeTenantLabel: 'Krewe',
      timeZone: 'America/Los_Angeles',
      availableTenants: [
        { userGroupId: 'KREWE', label: 'Krewe' },
        { userGroupId: 'GORJANA', label: 'Gorjana' },
      ],
      canEditActiveTenantData: true,
      isSuperAdmin: true,
    }
    push.mockReset()
    push.mockResolvedValue(undefined)
    replace.mockReset()
    replace.mockResolvedValue(undefined)
    getLlmSettings.mockReset()
    saveLlmSettings.mockReset()
    getTenantSettings.mockReset()
    saveTenantSettings.mockReset()
    getTenantNotificationSettings.mockReset()
    saveTenantNotificationSettings.mockReset()
    listSftpServers.mockReset()
    listNsAuthConfigs.mockReset()
    listNsRestletConfigs.mockReset()
    listShopifyAuthConfigs.mockReset()
    listOmsRestSourceConfigs.mockReset()

    getLlmSettings.mockImplementation(async (payload?: { llmProvider?: string }) => ({
      ok: true,
      messages: [],
      errors: [],
      llmSettings: {
        activeProvider: 'GEMINI',
        llmProvider: payload?.llmProvider ?? 'OPENAI',
        llmModel: payload?.llmProvider === 'GEMINI' ? 'gemini-2.5-flash' : 'gpt-4.1-mini',
        llmBaseUrl: payload?.llmProvider === 'GEMINI'
          ? 'https://generativelanguage.googleapis.com'
          : 'https://api.openai.com',
        llmTimeoutSeconds: '45',
        llmEnabled: 'Y',
        hasStoredLlmApiKey: true,
      },
    }))
    getTenantSettings.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      tenantSettings: {
        companyUserGroupId: 'KREWE',
        companyLabel: 'Krewe',
        timeZone: 'America/Los_Angeles',
      },
    })
    saveTenantSettings.mockResolvedValue({
      ok: true,
      messages: ['Saved tenant settings.'],
      errors: [],
      tenantSettings: {
        companyUserGroupId: 'KREWE',
        companyLabel: 'Krewe',
        timeZone: 'Europe/London',
      },
    })
    listSftpServers.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: { pageIndex: 0, pageSize: 200, totalCount: 1, pageCount: 1 },
      servers: [{ sftpServerId: 'SFTP_KREWE', companyUserGroupId: 'KREWE', description: 'Warehouse' }],
    })
    listNsAuthConfigs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: { pageIndex: 0, pageSize: 200, totalCount: 1, pageCount: 1 },
      authConfigs: [{ nsAuthConfigId: 'NS_AUTH', companyUserGroupId: 'KREWE' }],
    })
    listNsRestletConfigs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: { pageIndex: 0, pageSize: 200, totalCount: 1, pageCount: 1 },
      restletConfigs: [{ nsRestletConfigId: 'NS_ENDPOINT', companyUserGroupId: 'KREWE' }],
    })
    listShopifyAuthConfigs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: { pageIndex: 0, pageSize: 200, totalCount: 1, pageCount: 1 },
      shopifyAuthConfigs: [{ shopifyAuthConfigId: 'SHOPIFY', companyUserGroupId: 'KREWE' }],
    })
    listOmsRestSourceConfigs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: { pageIndex: 0, pageSize: 200, totalCount: 1, pageCount: 1 },
      omsRestSourceConfigs: [{ omsRestSourceConfigId: 'OMS', companyUserGroupId: 'KREWE' }],
    })
    getTenantNotificationSettings.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      tenantNotificationSettings: {
        companyUserGroupId: 'KREWE',
        companyLabel: 'Krewe',
        googleChatConfigured: true,
        googleChatWebhookUrlMasked: 'https://chat.googleapis.com/***',
        isActive: 'Y',
      },
    })
    saveTenantNotificationSettings.mockResolvedValue({
      ok: true,
      messages: ['Saved notification settings.'],
      errors: [],
      tenantNotificationSettings: {
        companyUserGroupId: 'KREWE',
        companyLabel: 'Krewe',
        googleChatConfigured: true,
        googleChatWebhookUrlMasked: 'https://chat.googleapis.com/***',
        isActive: 'Y',
      },
    })
  })

  it('renders one tenant settings surface with AI moved into the page', async () => {
    const wrapper = mount(TenantSettingsPage)
    await flushPromises()

    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.find('h1').text()).toBe('Krewe Settings')
    expect(wrapper.text()).not.toContain('Active Tenant')
    expect(wrapper.find('.tenant-settings-summary-grid').exists()).toBe(false)
    expect(wrapper.text()).toContain('AI Configuration')
    expect(wrapper.text()).toContain('Gemini')
    expect(wrapper.text()).not.toContain('OpenAI')
    expect(wrapper.get('[data-testid="tenant-ai-providers"]').classes()).toContain('tenant-settings-list-grid')
    expect(wrapper.findAll('[data-testid="tenant-ai-provider-tile"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="tenant-ai-provider-tile"]').classes()).toContain('static-page-list-tile')
    expect(wrapper.get('[data-testid="tenant-ai-provider-tile"]').text()).toContain('Primary · Enabled · Key stored')
    expect(wrapper.text()).toContain('Localization')
    expect(wrapper.text()).toContain('Timezone')
    expect(wrapper.get('[data-testid="tenant-module-timezone"]').text()).toContain('America/Los_Angeles')
    expect(wrapper.text()).toContain('Operations')
    expect(wrapper.text()).not.toContain('Connections')
    expect(wrapper.find('[data-testid="tenant-module-sftp"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tenant-module-netsuite"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tenant-module-shopify"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tenant-module-oms"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="tenant-module-runs"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Run Editor')
    expect(wrapper.text()).toContain('Notifications')
    expect(wrapper.find('.static-page-module-grid').exists()).toBe(false)
    expect(getLlmSettings).toHaveBeenNthCalledWith(1, { llmProvider: 'OPENAI' })
    expect(getLlmSettings).toHaveBeenNthCalledWith(2, { llmProvider: 'GEMINI' })
    expect(getTenantSettings).toHaveBeenCalledTimes(1)
    expect(listSftpServers).not.toHaveBeenCalled()
    expect(listNsAuthConfigs).not.toHaveBeenCalled()
    expect(listNsRestletConfigs).not.toHaveBeenCalled()
    expect(listShopifyAuthConfigs).not.toHaveBeenCalled()
    expect(listOmsRestSourceConfigs).not.toHaveBeenCalled()
    expect(wrapper.html()).not.toContain('/settings/ai')
  })

  it('edits tenant timezone from the Tenant Settings popup', async () => {
    const wrapper = mount(TenantSettingsPage)
    await flushPromises()

    await wrapper.get('[data-testid="tenant-module-timezone"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('Set the tenant timezone.')
    expect(wrapper.get('[data-testid="tenant-timezone-select"]').text()).toContain('America/Los_Angeles')
    await wrapper.get('[data-testid="tenant-timezone-select"]').trigger('click')
    await wrapper.get('[data-testid="app-select-search"]').setValue('Europe/London')
    await wrapper.get('[data-testid="app-select-option"][data-option-value="Europe/London"]').trigger('click')
    await wrapper.get('[data-testid="save-tenant-timezone"]').trigger('click')
    await flushPromises()

    expect(saveTenantSettings).toHaveBeenCalledWith({ timeZone: 'Europe/London' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Saved tenant settings.')
    expect(wrapper.get('[data-testid="tenant-module-timezone"]').text()).toContain('Europe/London')
  })

  it('opens AI edits as a popup workflow and saves through the settings facade', async () => {
    saveLlmSettings.mockResolvedValue({
      ok: true,
      messages: ['Saved LLM settings.'],
      errors: [],
      llmSettings: {
        activeProvider: 'OPENAI',
        llmProvider: 'OPENAI',
        llmModel: 'gpt-4.1-mini',
        llmBaseUrl: 'https://api.openai.com',
        llmTimeoutSeconds: '45',
        llmEnabled: 'Y',
      },
    })

    const wrapper = mount(TenantSettingsPage)
    await flushPromises()

    await wrapper.get('[data-testid="tenant-ai-provider-tile"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('What do you want to do with the AI provider?')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Update Gemini')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Change selected provider')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Add provider settings')
    await wrapper.get('[data-testid="tenant-ai-provider-workflow-update"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('Update the AI provider settings.')
    expect(wrapper.get('.static-page-frame').classes()).toContain('static-page-frame--popup-open')
    await wrapper.get('input[name="llmModel"]').setValue('gemini-2.5-pro')
    await wrapper.get('[data-testid="save-tenant-llm-settings"]').trigger('click')
    await flushPromises()

    expect(saveLlmSettings).toHaveBeenCalledWith({
      llmProvider: 'GEMINI',
      llmModel: 'gemini-2.5-pro',
      llmBaseUrl: 'https://generativelanguage.googleapis.com',
      llmTimeoutSeconds: '45',
      llmEnabled: 'Y',
      llmApiKey: '',
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Saved LLM settings.')
  })

  it('starts add/change provider setup from the selected AI provider workflow', async () => {
    const wrapper = mount(TenantSettingsPage)
    await flushPromises()

    await wrapper.get('[data-testid="tenant-ai-provider-tile"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="tenant-ai-provider-workflow-change"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('Which AI provider should Darpan configure?')
    expect(wrapper.find('[data-testid="tenant-llm-provider"]').exists()).toBe(true)
  })

  it('configures notifications through a popup workflow instead of routing to a page', async () => {
    const webhookUrl = 'https://chat.googleapis.com/v1/spaces/KREWE_SPACE/messages?key=test-key&token=test-token'
    const wrapper = mount(TenantSettingsPage)
    await flushPromises()

    await wrapper.get('[data-testid="tenant-module-notifications"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('What do you want to do with Google Chat notifications?')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Edit Google Chat webhook')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Disable notifications')
    await wrapper.get('[data-testid="tenant-notification-workflow-edit"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('Configure Google Chat notifications.')
    expect(wrapper.get('[role="dialog"] form').classes()).toContain('workflow-form--dense-popup')
    expect(wrapper.find('[role="dialog"] .workflow-form-grid--notification').exists()).toBe(true)
    expect(wrapper.find('[role="dialog"] .wizard-enter-hint').exists()).toBe(false)
    expect(wrapper.get('[data-testid="google-chat-webhook-status"]').text()).toContain('Current webhook: https://chat.googleapis.com/***')
    await wrapper.get('input[name="googleChatWebhookUrl"]').setValue(webhookUrl)
    await wrapper.get('[data-testid="save-tenant-notification-settings"]').trigger('click')
    await flushPromises()

    expect(saveTenantNotificationSettings).toHaveBeenCalledWith({
      googleChatWebhookUrl: webhookUrl,
      isActive: 'Y',
    })
    expect(push).not.toHaveBeenCalledWith('/settings/notifications')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Saved notification settings.')
    expect(wrapper.text()).not.toContain(webhookUrl)
  })

  it('disables notifications from the Tenant Settings popup without re-entering the webhook', async () => {
    saveTenantNotificationSettings.mockResolvedValue({
      ok: true,
      messages: ['Saved notification settings.'],
      errors: [],
      tenantNotificationSettings: {
        companyUserGroupId: 'KREWE',
        companyLabel: 'Krewe',
        googleChatConfigured: true,
        googleChatWebhookUrlMasked: 'https://chat.googleapis.com/***',
        isActive: 'N',
      },
    })
    const wrapper = mount(TenantSettingsPage)
    await flushPromises()

    await wrapper.get('[data-testid="tenant-module-notifications"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="tenant-notification-workflow-disable"]').trigger('click')
    await flushPromises()

    expect(saveTenantNotificationSettings).toHaveBeenCalledWith({
      googleChatWebhookUrl: '',
      isActive: 'N',
    })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Configured, disabled')
  })

  it('opens the notifications popup when old notification routes redirect with workflow state', async () => {
    route.query = { workflow: 'notifications' }

    const wrapper = mount(TenantSettingsPage)
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').text()).toContain('What do you want to do with Google Chat notifications?')
  })

  it('keeps AI settings visible but locked for non-super-admin tenant users', async () => {
    authState.sessionInfo = {
      userId: 'editor',
      activeTenantUserGroupId: 'KREWE',
      activeTenantLabel: 'Krewe',
      timeZone: 'America/Los_Angeles',
      availableTenants: [{ userGroupId: 'KREWE', label: 'Krewe' }],
      canEditActiveTenantData: true,
      isSuperAdmin: false,
    }

    const wrapper = mount(TenantSettingsPage)
    await flushPromises()

    expect(getLlmSettings).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Super admin only')
    expect(wrapper.find('[data-testid="tenant-ai-create-action"]').exists()).toBe(false)
  })
})
