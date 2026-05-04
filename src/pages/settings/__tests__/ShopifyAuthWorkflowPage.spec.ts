import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { WORKFLOW_CANCEL_REQUEST_EVENT } from '../../../lib/uiEvents'

const route = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  name: 'settings-shopify-create',
  fullPath: '/settings/shopify/create',
}))
const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const getShopifyAuthConfig = vi.hoisted(() => vi.fn())
const saveShopifyAuthConfig = vi.hoisted(() => vi.fn())
const authState = vi.hoisted(() => ({
  sessionInfo: {
    userId: 'john.doe',
    activeTenantUserGroupId: 'KREWE',
    canEditActiveTenantData: true,
    isSuperAdmin: false,
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../../../lib/api/facade', () => ({
  settingsFacade: {
    getShopifyAuthConfig,
    saveShopifyAuthConfig,
  },
}))

vi.mock('../../../lib/auth', () => ({
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

import ShopifyAuthWorkflowPage from '../ShopifyAuthWorkflowPage.vue'

describe('ShopifyAuthWorkflowPage', () => {
  beforeEach(() => {
    route.params = {}
    route.name = 'settings-shopify-create'
    route.fullPath = '/settings/shopify/create'
    push.mockReset()
    getShopifyAuthConfig.mockReset()
    saveShopifyAuthConfig.mockReset()
    authState.sessionInfo = {
      userId: 'john.doe',
      activeTenantUserGroupId: 'KREWE',
      canEditActiveTenantData: true,
      isSuperAdmin: false,
    }
  })

  it('returns to the selected Shopify config dashboard when canceling an edit', async () => {
    route.params = { shopifyAuthConfigId: 'dev_shopify' }
    route.name = 'settings-shopify-edit'
    route.fullPath = '/settings/shopify/edit/dev_shopify'
    getShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      shopifyAuthConfig: {
        shopifyAuthConfigId: 'dev_shopify',
        description: 'Dev Shopify',
        companyUserGroupId: 'KREWE',
        shopApiUrl: 'https://hotwax-sandbox.myshopify.com',
        apiVersion: '2026-01',
        timeZone: 'America/Chicago',
        isActive: 'Y',
        canReadOrders: true,
        hasAccessToken: true,
      },
    })

    const wrapper = mount(ShopifyAuthWorkflowPage)
    await flushPromises()

    await wrapper.get('[data-testid="cancel-shopify-auth"]').trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith({
      name: 'settings-shopify-auth',
      params: { shopifyAuthConfigId: 'dev_shopify' },
    })
  })

  it('returns to the selected Shopify config dashboard when Escape aborts an edit', async () => {
    route.params = { shopifyAuthConfigId: 'dev_shopify' }
    route.name = 'settings-shopify-edit'
    route.fullPath = '/settings/shopify/edit/dev_shopify'
    getShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      shopifyAuthConfig: {
        shopifyAuthConfigId: 'dev_shopify',
        description: 'Dev Shopify',
        companyUserGroupId: 'KREWE',
        shopApiUrl: 'https://hotwax-sandbox.myshopify.com',
        apiVersion: '2026-01',
        timeZone: 'America/Chicago',
        isActive: 'Y',
        canReadOrders: true,
        hasAccessToken: true,
      },
    })

    const wrapper = mount(ShopifyAuthWorkflowPage)
    await flushPromises()

    const cancelRequest = new Event(WORKFLOW_CANCEL_REQUEST_EVENT, { cancelable: true })
    document.dispatchEvent(cancelRequest)
    await flushPromises()
    wrapper.unmount()

    expect(cancelRequest.defaultPrevented).toBe(true)
    expect(push).toHaveBeenCalledWith({
      name: 'settings-shopify-auth',
      params: { shopifyAuthConfigId: 'dev_shopify' },
    })
  })

  it('saves a new Shopify auth config with the orders endpoint available by default', async () => {
    saveShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: ['Saved Shopify auth config.'],
      errors: [],
    })

    const wrapper = mount(ShopifyAuthWorkflowPage)
    await flushPromises()

    await wrapper.get('input[name="shopApiUrl"]').setValue('https://krewe.myshopify.com')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('input[name="apiVersion"]').setValue('2026-01')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('input[name="timeZone"]').setValue('America/Chicago')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('input[name="accessToken"]').setValue('shpat_secret')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    expect(wrapper.find('input[name="canReadOrders"]').exists()).toBe(false)
    expect(wrapper.find('input[name="isActive"]').exists()).toBe(false)
    expect(wrapper.find('input[name="shopifyAuthConfigId"]').exists()).toBe(false)
    await wrapper.get('input[name="description"]').setValue('Krewe Shopify')
    await wrapper.get('[data-testid="save-shopify-auth"]').trigger('click')
    await flushPromises()

    expect(saveShopifyAuthConfig).toHaveBeenCalledWith({
      shopifyAuthConfigId: 'krewe_shopify',
      description: 'Krewe Shopify',
      shopApiUrl: 'https://krewe.myshopify.com',
      apiVersion: '2026-01',
      timeZone: 'America/Chicago',
      accessToken: 'shpat_secret',
      isActive: 'Y',
      canReadOrders: true,
    })
    expect(saveShopifyAuthConfig.mock.calls[0]?.[0]).not.toHaveProperty('endpointUrl')
    expect(push).toHaveBeenCalledWith('/settings/shopify')
  })

  it('loads an existing Shopify config with the token input blank for replacement only', async () => {
    route.params = { shopifyAuthConfigId: 'krewe-shopify' }
    route.name = 'settings-shopify-edit'
    route.fullPath = '/settings/shopify/edit/krewe-shopify'
    getShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      shopifyAuthConfig: {
        shopifyAuthConfigId: 'krewe-shopify',
        description: 'Krewe Shopify',
        companyUserGroupId: 'KREWE',
        shopApiUrl: 'https://krewe.myshopify.com',
        apiVersion: '2026-01',
        timeZone: 'America/Chicago',
        isActive: 'Y',
        canReadOrders: true,
        hasAccessToken: true,
      },
    })

    const wrapper = mount(ShopifyAuthWorkflowPage)
    await flushPromises()

    expect(getShopifyAuthConfig).toHaveBeenCalledWith({ shopifyAuthConfigId: 'krewe-shopify' })
    expect(wrapper.get('input[name="shopifyAuthConfigId"]').element).toHaveProperty('value', 'krewe-shopify')
    expect(wrapper.get('input[name="timeZone"]').element).toHaveProperty('value', 'America/Chicago')
    expect(wrapper.get('input[name="accessToken"]').element).toHaveProperty('value', '')
    expect(wrapper.get('input[name="accessToken"]').attributes('autocomplete')).toBe('off')
    const orderEndpointCheckbox = wrapper.get('[data-testid="shopify-endpoint-SHOPIFY_ORDERS"]')
    expect(orderEndpointCheckbox.attributes('name')).toBe('canReadOrders')
    expect((orderEndpointCheckbox.element as HTMLInputElement).checked).toBe(true)
    expect(wrapper.get('[data-testid="shopify-endpoint-options"]').text()).toContain('Admin GraphQL Orders')
    expect(wrapper.get('input[name="isActive"]').attributes('type')).toBe('checkbox')
    expect(wrapper.get('input[name="isActive"]').classes()).toContain('app-table__checkbox')
    expect((wrapper.get('input[name="isActive"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('returns to the selected Shopify config dashboard after saving an edit', async () => {
    route.params = { shopifyAuthConfigId: 'dev_shopify' }
    route.name = 'settings-shopify-edit'
    route.fullPath = '/settings/shopify/edit/dev_shopify'
    getShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      shopifyAuthConfig: {
        shopifyAuthConfigId: 'dev_shopify',
        description: 'Dev Shopify',
        companyUserGroupId: 'KREWE',
        shopApiUrl: 'https://hotwax-sandbox.myshopify.com',
        apiVersion: '2026-01',
        timeZone: 'America/Chicago',
        isActive: 'Y',
        canReadOrders: true,
        hasAccessToken: true,
      },
    })
    saveShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: ['Saved Shopify auth config.'],
      errors: [],
      savedShopifyAuthConfig: {
        shopifyAuthConfigId: 'dev_shopify',
        description: 'Dev Shopify',
        companyUserGroupId: 'KREWE',
        shopApiUrl: 'https://hotwax-sandbox.myshopify.com',
        apiVersion: '2026-01',
        timeZone: 'America/Chicago',
        isActive: 'Y',
        canReadOrders: true,
        hasAccessToken: true,
      },
    })

    const wrapper = mount(ShopifyAuthWorkflowPage)
    await flushPromises()

    await wrapper.get('[data-testid="save-shopify-auth"]').trigger('click')
    await flushPromises()

    expect(saveShopifyAuthConfig).toHaveBeenCalledWith({
      shopifyAuthConfigId: 'dev_shopify',
      description: 'Dev Shopify',
      shopApiUrl: 'https://hotwax-sandbox.myshopify.com',
      apiVersion: '2026-01',
      timeZone: 'America/Chicago',
      accessToken: '',
      isActive: 'Y',
      canReadOrders: true,
    })
    expect(push).toHaveBeenCalledWith({
      name: 'settings-shopify-auth',
      params: { shopifyAuthConfigId: 'dev_shopify' },
    })
  })

  it('saves disabled Shopify endpoint availability from the edit workflow', async () => {
    route.params = { shopifyAuthConfigId: 'dev_shopify' }
    route.name = 'settings-shopify-edit'
    route.fullPath = '/settings/shopify/edit/dev_shopify'
    getShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      shopifyAuthConfig: {
        shopifyAuthConfigId: 'dev_shopify',
        description: 'Dev Shopify',
        companyUserGroupId: 'KREWE',
        shopApiUrl: 'https://hotwax-sandbox.myshopify.com',
        apiVersion: '2026-01',
        timeZone: 'America/Chicago',
        isActive: 'Y',
        canReadOrders: true,
        hasAccessToken: true,
      },
    })
    saveShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: ['Saved Shopify auth config.'],
      errors: [],
      savedShopifyAuthConfig: {
        shopifyAuthConfigId: 'dev_shopify',
        description: 'Dev Shopify',
        companyUserGroupId: 'KREWE',
        shopApiUrl: 'https://hotwax-sandbox.myshopify.com',
        apiVersion: '2026-01',
        timeZone: 'America/Chicago',
        isActive: 'Y',
        canReadOrders: false,
        hasAccessToken: true,
      },
    })

    const wrapper = mount(ShopifyAuthWorkflowPage)
    await flushPromises()

    await wrapper.get('[data-testid="shopify-endpoint-SHOPIFY_ORDERS"]').setValue(false)
    await wrapper.get('[data-testid="save-shopify-auth"]').trigger('click')
    await flushPromises()

    expect(saveShopifyAuthConfig).toHaveBeenCalledWith(expect.objectContaining({
      shopifyAuthConfigId: 'dev_shopify',
      canReadOrders: false,
    }))
  })

  it('derives a capped config ID from the create label', async () => {
    saveShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: ['Saved Shopify auth config.'],
      errors: [],
    })

    const wrapper = mount(ShopifyAuthWorkflowPage)
    await flushPromises()

    await wrapper.get('input[name="shopApiUrl"]').setValue('https://krewe.myshopify.com')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('input[name="apiVersion"]').setValue('2026-01')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('input[name="timeZone"]').setValue('America/Chicago')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('input[name="accessToken"]').setValue('shpat_secret')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('input[name="description"]').setValue('Long Shopify Config Name')
    await wrapper.get('[data-testid="save-shopify-auth"]').trigger('click')
    await flushPromises()

    expect(saveShopifyAuthConfig).toHaveBeenCalledWith(expect.objectContaining({
      shopifyAuthConfigId: 'long_shopify_config',
      description: 'Long Shopify Config Name',
      timeZone: 'America/Chicago',
      isActive: 'Y',
    }))
  })

  it('enforces the shared 20 character config-id cap on edit', async () => {
    route.params = { shopifyAuthConfigId: 'krewe-shopify' }
    route.name = 'settings-shopify-edit'
    route.fullPath = '/settings/shopify/edit/krewe-shopify'
    getShopifyAuthConfig.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      shopifyAuthConfig: {
        shopifyAuthConfigId: 'krewe-shopify',
        description: 'Krewe Shopify',
        companyUserGroupId: 'KREWE',
        shopApiUrl: 'https://krewe.myshopify.com',
        apiVersion: '2026-01',
        isActive: 'Y',
        canReadOrders: true,
        hasAccessToken: true,
      },
    })

    const wrapper = mount(ShopifyAuthWorkflowPage)
    await flushPromises()

    const idInput = wrapper.get('input[name="shopifyAuthConfigId"]')
    expect(idInput.attributes('maxlength')).toBe('20')

    await idInput.setValue('a'.repeat(21))
    await wrapper.get('[data-testid="save-shopify-auth"]').trigger('click')
    await flushPromises()

    expect(saveShopifyAuthConfig).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Shopify Config ID must be 20 characters or fewer.')
  })
})
