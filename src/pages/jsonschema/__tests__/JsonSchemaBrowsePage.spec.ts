import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const list = vi.hoisted(() => vi.fn())
const saveText = vi.hoisted(() => vi.fn())
const listEnumOptions = vi.hoisted(() => vi.fn())
const route = vi.hoisted(() => ({
  query: {},
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('../../../lib/api/facade', () => ({
  jsonSchemaFacade: {
    list,
    saveText,
    get: vi.fn(),
    delete: vi.fn(),
    validateText: vi.fn(),
  },
  settingsFacade: {
    listEnumOptions,
  },
}))

import JsonSchemaBrowsePage from '../JsonSchemaBrowsePage.vue'

function stubFileReader(fileText = '{"type":"object"}'): void {
  class MockFileReader {
    result: string | ArrayBuffer | null = null
    onload: null | (() => void) = null
    onerror: null | (() => void) = null

    readAsText(): void {
      this.result = fileText
      this.onload?.()
    }
  }

  vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader)
}

describe('JsonSchemaBrowsePage', () => {
  beforeEach(() => {
    route.query = {}
    list.mockReset()
    saveText.mockReset()
    listEnumOptions.mockReset()

    list.mockResolvedValue({
      schemas: [],
      pagination: { pageIndex: 0, pageSize: 10, totalCount: 0, pageCount: 1 },
    })
    listEnumOptions.mockResolvedValue({
      options: [
        { enumId: 'DarSysOms', label: 'OMS' },
        { enumId: 'DarSysShopify', label: 'SHOPIFY' },
      ],
    })
    saveText.mockResolvedValue({
      ok: true,
      messages: ['Uploaded schema inventory-schema.'],
      errors: [],
    })
    stubFileReader()
  })

  it('uploads schemas with the selected system', async () => {
    const wrapper = mount(JsonSchemaBrowsePage)
    await flushPromises()

    const textInput = wrapper.find('input[placeholder="inventory-schema"]')
    await textInput.setValue('inventory-schema')
    await wrapper.find('select').setValue('DarSysOms')

    const fileInput = wrapper.find('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [new File(['{"type":"object"}'], 'inventory-schema.json', { type: 'application/json' })],
      configurable: true,
    })
    await fileInput.trigger('change')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(saveText).toHaveBeenCalledWith({
      schemaName: 'inventory-schema',
      description: '',
      systemEnumId: 'DarSysOms',
      schemaText: '{"type":"object"}',
      overwrite: false,
    })
  })
})
