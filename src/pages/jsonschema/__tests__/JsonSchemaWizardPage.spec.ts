import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const inferFromText = vi.hoisted(() => vi.fn())
const saveText = vi.hoisted(() => vi.fn())
const listEnumOptions = vi.hoisted(() => vi.fn())

vi.mock('../../../lib/api/facade', () => ({
  jsonSchemaFacade: {
    inferFromText,
    saveText,
  },
  settingsFacade: {
    listEnumOptions,
  },
}))

import JsonSchemaWizardPage from '../JsonSchemaWizardPage.vue'

describe('JsonSchemaWizardPage', () => {
  beforeEach(() => {
    inferFromText.mockReset()
    saveText.mockReset()
    listEnumOptions.mockReset()

    listEnumOptions.mockResolvedValue({
      options: [
        { enumId: 'DarSysOms', label: 'OMS' },
        { enumId: 'DarSysShopify', label: 'SHOPIFY' },
      ],
    })
    inferFromText.mockResolvedValue({
      jsonSchemaString: '{"type":"object"}',
      fieldList: [],
    })
    saveText.mockResolvedValue({
      ok: true,
      messages: ['Saved schema generated-schema.'],
      errors: [],
    })
  })

  it('saves inferred schemas with the selected system', async () => {
    const wrapper = mount(JsonSchemaWizardPage)
    await flushPromises()

    await wrapper.find('textarea').setValue('{"id":"1001"}')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    await wrapper.find('select').setValue('DarSysOms')
    await wrapper.findAll('form')[1]!.trigger('submit')
    await flushPromises()

    expect(saveText).toHaveBeenCalledWith({
      schemaName: 'schema',
      description: '',
      systemEnumId: 'DarSysOms',
      schemaText: '{"type":"object"}',
      overwrite: false,
    })
  })
})
