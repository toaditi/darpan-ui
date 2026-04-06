import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const get = vi.hoisted(() => vi.fn())
const flatten = vi.hoisted(() => vi.fn())
const saveText = vi.hoisted(() => vi.fn())
const saveRefined = vi.hoisted(() => vi.fn())
const listEnumOptions = vi.hoisted(() => vi.fn())
const route = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  query: {} as Record<string, string>,
}))

vi.mock('../../../lib/api/facade', () => ({
  jsonSchemaFacade: {
    get,
    flatten,
    saveText,
    saveRefined,
  },
  settingsFacade: {
    listEnumOptions,
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
}))

import JsonSchemaEditorPage from '../JsonSchemaEditorPage.vue'

describe('JsonSchemaEditorPage', () => {
  beforeEach(() => {
    route.params = {}
    route.query = {}
    get.mockReset()
    flatten.mockReset()
    saveText.mockReset()
    saveRefined.mockReset()
    listEnumOptions.mockReset()
    listEnumOptions.mockResolvedValue({
      options: [
        { enumId: 'DarSysOms', label: 'OMS' },
        { enumId: 'DarSysShopify', label: 'SHOPIFY' },
      ],
    })
  })

  it('moves parameterized routes into a retry state until the initial load succeeds', async () => {
    route.params = { jsonSchemaId: 'test-schema' }
    get.mockRejectedValue(new ApiCallError('Unable to connect to Darpan right now. Try again in a moment.', 503))

    const wrapper = mount(JsonSchemaEditorPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load this schema')
    expect(wrapper.text()).toContain('Retry Loading Schema')
    expect(wrapper.text()).toContain('Unable to connect to Darpan right now. Try again in a moment.')
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text().includes('Save Raw Schema'))).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text().includes('Add Row'))).toBe(false)
    expect(saveText).not.toHaveBeenCalled()
    expect(saveRefined).not.toHaveBeenCalled()
  })

  it('restores the editor controls after a successful targeted load', async () => {
    route.params = { jsonSchemaId: 'test-schema' }
    get.mockResolvedValue({
      schemaData: {
        jsonSchemaId: 'test-schema',
        schemaName: 'orders',
        description: 'Orders schema',
        systemEnumId: 'DarSysOms',
        schemaText: '{"type":"object"}',
      },
    })
    flatten.mockResolvedValue({ fieldList: [] })
    saveText.mockResolvedValue({
      ok: true,
      messages: ['Saved schema orders.'],
      errors: [],
    })

    const wrapper = mount(JsonSchemaEditorPage)
    await flushPromises()

    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.text()).toContain('Schema ID: test-schema')
    expect(wrapper.findAll('button').some((button) => button.text().includes('Add Row'))).toBe(true)

    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('Save Raw Schema'))
    expect(saveButton).toBeDefined()
    expect(saveButton!.attributes('disabled')).toBeUndefined()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(saveText).toHaveBeenCalledWith({
      jsonSchemaId: 'test-schema',
      schemaName: 'orders',
      description: 'Orders schema',
      systemEnumId: 'DarSysOms',
      schemaText: '{"type":"object"}',
    })
  })
})
