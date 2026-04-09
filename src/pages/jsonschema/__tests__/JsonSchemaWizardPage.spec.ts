import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const inferFromText = vi.hoisted(() => vi.fn())
const saveText = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../../../lib/api/facade', () => ({
  jsonSchemaFacade: {
    inferFromText,
    saveText,
  },
}))

import JsonSchemaWizardPage from '../JsonSchemaWizardPage.vue'

function stubFileReader(fileText = '{"orderId":"1001"}'): void {
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

describe('JsonSchemaWizardPage', () => {
  beforeEach(() => {
    push.mockClear()
    inferFromText.mockReset()
    saveText.mockReset()

    stubFileReader()
    inferFromText.mockResolvedValue({
      jsonSchemaString: '{"type":"object"}',
      fieldList: [
        { fieldPath: '$.orderId', type: 'string', required: true },
        { fieldPath: '$.status', type: 'string', required: false },
      ],
    })
    saveText.mockResolvedValue({
      ok: true,
      messages: ['Saved schema orders.'],
      errors: [],
      savedSchema: {
        jsonSchemaId: 'schema-1',
        schemaName: 'orders',
      },
    })
  })

  it('creates a schema from a sample file through the workflow steps and saves it on Enter from the final naming step', async () => {
    const wrapper = mount(JsonSchemaWizardPage)
    await flushPromises()

    expect(wrapper.find('.workflow-page').exists()).toBe(true)
    expect(wrapper.text()).toContain('Are you uploading a schema file or a sample file?')
    expect(wrapper.text()).toContain('Sample file')
    expect(wrapper.find('[data-testid="wizard-next"]').exists()).toBe(false)
    expect(wrapper.find('.wizard-enter-hint').exists()).toBe(false)
    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('B')
    expect(wrapper.text()).not.toContain('Selected upload:')
    expect(wrapper.text()).not.toContain('Uploaded file:')
    expect(wrapper.text()).not.toContain('Upload an existing JSON schema file and save it directly.')
    expect(wrapper.text()).not.toContain('Upload sample JSON and infer a schema before saving.')

    await wrapper.get('[data-testid="upload-intent-sample"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the sample file')
    expect(wrapper.text()).not.toContain('Selected upload:')
    expect(wrapper.text()).not.toContain('Uploaded file:')
    expect(wrapper.get('.wizard-file-answer').classes()).toContain('empty')

    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [new File(['{"orderId":"1001"}'], 'orders.json', { type: 'application/json' })],
      configurable: true,
    })
    await fileInput.trigger('change')
    expect(wrapper.get('.wizard-file-answer').classes()).not.toContain('empty')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    expect(inferFromText).toHaveBeenCalledTimes(1)
    expect(inferFromText).toHaveBeenCalledWith({
      jsonText: '{"orderId":"1001"}',
    })
    expect(wrapper.text()).toContain('Verify the schema')
    expect(wrapper.text()).toContain('$.orderId')
    expect(wrapper.text()).not.toContain('Uploaded file:')

    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Name the schema')

    const nameInput = wrapper.get('input[name="schemaName"]')
    expect((nameInput.element as HTMLInputElement).value).toBe('orders')
    await nameInput.trigger('keydown.enter')
    await flushPromises()

    expect(saveText).toHaveBeenCalledWith({
      schemaName: 'orders',
      schemaText: '{"type":"object"}',
      overwrite: false,
    })
    expect(push).toHaveBeenCalledWith({ name: 'schemas-library' })
    wrapper.unmount()
  })

  it('accepts keyboard shortcuts on the choice step and saves an uploaded schema file without running sample-file inference', async () => {
    const wrapper = mount(JsonSchemaWizardPage)
    await flushPromises()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the schema file')
    expect(wrapper.text()).not.toContain('Selected upload:')
    expect(wrapper.text()).not.toContain('Uploaded file:')
    expect(wrapper.get('.wizard-file-answer').classes()).toContain('empty')

    stubFileReader('{"type":"object","properties":{"orderId":{"type":"string"}}}')

    const fileInput = wrapper.get('input[type="file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [new File(['{"type":"object","properties":{"orderId":{"type":"string"}}}'], 'orders-schema.json', { type: 'application/json' })],
      configurable: true,
    })
    await fileInput.trigger('change')
    expect(wrapper.get('.wizard-file-answer').classes()).not.toContain('empty')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    expect(inferFromText).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Name the schema')
    expect(wrapper.text()).not.toContain('Uploaded file:')

    const nameInput = wrapper.get('input[name="schemaName"]')
    expect((nameInput.element as HTMLInputElement).value).toBe('orders-schema')
    await nameInput.trigger('keydown.enter')
    await flushPromises()

    expect(saveText).toHaveBeenCalledWith({
      schemaName: 'orders-schema',
      schemaText: '{"type":"object","properties":{"orderId":{"type":"string"}}}',
      overwrite: false,
    })
    expect(push).toHaveBeenCalledWith({ name: 'schemas-library' })
    wrapper.unmount()
  })
})
