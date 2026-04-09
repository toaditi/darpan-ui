import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const get = vi.hoisted(() => vi.fn())
const flatten = vi.hoisted(() => vi.fn())
const saveRefined = vi.hoisted(() => vi.fn())
const deleteSchema = vi.hoisted(() => vi.fn())
const route = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  fullPath: '/schemas/editor',
}))

vi.mock('../../../lib/api/facade', () => ({
  jsonSchemaFacade: {
    get,
    flatten,
    saveRefined,
    delete: deleteSchema,
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    push,
  }),
  RouterLink: {
    props: ['to'],
    template: '<a v-bind="$attrs" :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  },
}))

import JsonSchemaEditorPage from '../JsonSchemaEditorPage.vue'

describe('JsonSchemaEditorPage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    route.params = {}
    route.fullPath = '/schemas/editor'
    push.mockClear()
    get.mockReset()
    flatten.mockReset()
    saveRefined.mockReset()
    deleteSchema.mockReset()
  })

  it('moves parameterized routes into a retry state until the initial load succeeds', async () => {
    route.params = { jsonSchemaId: 'test-schema' }
    route.fullPath = '/schemas/editor/test-schema'
    get.mockRejectedValue(new ApiCallError('Unable to connect to Darpan right now. Try again in a moment.', 503))

    const wrapper = mount(JsonSchemaEditorPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load this schema')
    expect(wrapper.text()).toContain('Retry Loading Schema')
    expect(wrapper.text()).toContain('Unable to connect to Darpan right now. Try again in a moment.')
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('renders static schema metadata, hides raw schema text, and saves refined fields only', async () => {
    const createObjectUrl = vi.fn(() => 'blob:mock')
    const revokeObjectUrl = vi.fn()
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal(
      'URL',
      {
        createObjectURL: createObjectUrl,
        revokeObjectURL: revokeObjectUrl,
      } as unknown as typeof URL,
    )

    route.params = { jsonSchemaId: 'test-schema' }
    route.fullPath = '/schemas/editor/test-schema'
    get.mockResolvedValue({
      schemaData: {
        jsonSchemaId: 'test-schema',
        schemaName: 'orders',
        description: 'Orders schema',
        systemEnumId: 'DarSysOms',
        systemLabel: 'OMS',
        statusId: 'Active',
        lastUpdatedStamp: '2026-04-08T10:00:00Z',
        schemaText: '{"type":"object"}',
      },
    })
    flatten.mockResolvedValue({
      fieldList: [
        { fieldPath: '$.orderId', type: 'string', required: true },
        { fieldPath: '$.status', type: 'string', required: false },
      ],
    })
    saveRefined.mockResolvedValue({
      ok: true,
      messages: ['Saved refined schema orders.'],
      errors: [],
    })

    const wrapper = mount(JsonSchemaEditorPage)
    await flushPromises()

    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.text()).toContain('Orders schema')
    expect(wrapper.find('.static-page-hero h1').text()).toBe('Orders schema')
    expect(wrapper.find('.static-page-hero .static-page-section-description').exists()).toBe(false)
    expect(wrapper.findAll('.static-page-summary-card')).toHaveLength(3)
    expect(wrapper.findAll('.static-page-summary-label').map((item) => item.text())).toEqual(['Schema ID', 'System', 'Updated'])
    expect(wrapper.text()).not.toContain('Status')
    expect(wrapper.text()).not.toContain('Active')
    expect(wrapper.text()).not.toContain('Update field paths, types, and required flags without exposing raw schema JSON.')
    expect(wrapper.text()).not.toContain('Refined fields are the only editable surface on this page.')
    expect(wrapper.find('.static-page-section-heading').exists()).toBe(false)
    expect(wrapper.find('.static-page-section-head').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Refresh')
    expect(wrapper.text()).not.toContain('Download')
    expect(wrapper.text()).not.toContain('Add Row')
    expect(wrapper.text()).not.toContain('Remove')
    expect(wrapper.text()).not.toContain('Yes')
    expect(wrapper.text()).not.toContain('No')
    expect(wrapper.text()).not.toContain('Save Refined Fields')
    expect(wrapper.text()).not.toContain('Back to Library')
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.find('.app-select-trigger').exists()).toBe(true)
    expect(wrapper.findAll('.app-table__header-slot').map((cell) => cell.text())).toEqual([
      'Field Path',
      'Type',
      'Required',
      '',
    ])
    const tableColumns = wrapper.findAll('.app-table colgroup col')
    expect(tableColumns[0]?.attributes('style') ?? '').toBe('')
    expect(tableColumns[1]?.attributes('style')).toContain('width: 10rem;')
    expect(tableColumns[2]?.attributes('style')).toContain('width: 6.5rem;')
    expect(tableColumns[3]?.classes()).toContain('app-table__action-column')
    expect(tableColumns[3]?.attributes('style')).toContain('width: 4rem;')
    expect(wrapper.get('[data-testid="schema-editor-download"]').attributes('aria-label')).toBe('Download schema JSON')
    expect(wrapper.get('[data-testid="schema-editor-add-row"]').attributes('aria-label')).toBe('Add field row')
    const saveRefinedButton = wrapper.get('[data-testid="save-refined-fields"]')
    expect(saveRefinedButton.attributes('aria-label')).toBe('Save refined fields')
    expect(saveRefinedButton.classes()).toContain('app-icon-action--large')
    expect(saveRefinedButton.element.closest('.schema-editor-footer-row')).not.toBeNull()
    const deleteButton = wrapper.get('[data-testid="delete-schema"]')
    expect(deleteButton.attributes('aria-label')).toBe('Delete schema')
    expect(deleteButton.classes()).toContain('app-icon-action')
    expect(deleteButton.classes()).toContain('app-icon-action--large')
    expect(deleteButton.classes()).toContain('app-icon-action--danger')
    expect(deleteButton.classes()).toContain('schema-editor-footer-action')
    expect(deleteButton.classes()).not.toContain('app-table__icon-action')
    expect(deleteButton.classes()).not.toContain('app-table__icon-action--danger')
    expect(deleteButton.element.closest('.schema-editor-footer-row')).not.toBeNull()
    const rowDeleteButton = wrapper.get('tbody button[aria-label="Remove field row"]')
    expect(rowDeleteButton.element.closest('.app-table__control-wrap--end')).not.toBeNull()
    expect(rowDeleteButton.classes()).toContain('app-table__icon-action')
    expect(rowDeleteButton.classes()).toContain('app-table__icon-action--danger')
    expect(rowDeleteButton.classes()).toContain('schema-editor-row-delete-action')
    expect(rowDeleteButton.classes()).not.toContain('app-icon-action')
    expect(deleteButton.attributes('class')).not.toBe(rowDeleteButton.attributes('class'))
    const rowDeleteIcon = rowDeleteButton.get('svg')
    const rowDeletePath = rowDeleteButton.get('path')
    const rowDeleteIconPath = rowDeletePath.attributes('d')
    const schemaDeleteIconPath = deleteButton.get('path').attributes('d')
    const rowDeleteIconStyle = rowDeleteIcon.attributes('style')
    const schemaDeleteIconTransform = deleteButton.get('path').attributes('transform')
    expect(schemaDeleteIconPath).toBe(rowDeleteIconPath)
    expect(rowDeleteIconStyle).toBeUndefined()
    expect(schemaDeleteIconTransform).toBe('translate(0 0.75)')
    expect(wrapper.find('[data-testid="schema-editor-back-link"]').exists()).toBe(false)
    const requiredFieldCheckbox = wrapper.find('tbody input[type="checkbox"]')
    expect(requiredFieldCheckbox.attributes('aria-label')).toBe('Required field')
    expect(requiredFieldCheckbox.classes()).toContain('app-table__checkbox')
    expect(requiredFieldCheckbox.element.closest('.app-table__control-wrap--start')).not.toBeNull()
    expect(requiredFieldCheckbox.element.closest('label')?.classList.contains('checkbox-inline--control-only')).toBe(true)
    expect(wrapper.findAll('tbody button[aria-label="Remove field row"]')).toHaveLength(2)
    expect(wrapper.find('input[value="orders"]').exists()).toBe(false)

    let fieldPathInputs = wrapper.findAll('tbody input[type="text"]')
    expect((fieldPathInputs[0]!.element as HTMLInputElement).value).toBe('$.orderId')
    await wrapper.get('[data-testid="schema-editor-download"]').trigger('click')
    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:mock')
    await wrapper.get('[data-testid="schema-editor-add-row"]').trigger('click')
    fieldPathInputs = wrapper.findAll('tbody input[type="text"]')
    expect(fieldPathInputs).toHaveLength(3)
    expect((fieldPathInputs[2]!.element as HTMLInputElement).value).toBe('')
    await fieldPathInputs[0]!.setValue('$.orderNumber')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(saveRefined).toHaveBeenCalledWith({
      jsonSchemaId: 'test-schema',
      schemaName: 'orders',
      description: 'Orders schema',
      systemEnumId: 'DarSysOms',
      fieldList: [
        { fieldPath: '$.orderNumber', type: 'string', required: true },
        { fieldPath: '$.status', type: 'string', required: false },
        { fieldPath: '', type: 'string', required: false },
      ],
    })
    expect(push).toHaveBeenCalledWith({ name: 'schemas-library' })
  })

  it('deletes the current schema and returns to the library after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    route.params = { jsonSchemaId: 'test-schema' }
    route.fullPath = '/schemas/editor/test-schema'
    get.mockResolvedValue({
      schemaData: {
        jsonSchemaId: 'test-schema',
        schemaName: 'orders',
        description: 'Orders schema',
        systemEnumId: 'DarSysOms',
        systemLabel: 'OMS',
        statusId: 'Active',
        lastUpdatedStamp: '2026-04-08T10:00:00Z',
        schemaText: '{"type":"object"}',
      },
    })
    flatten.mockResolvedValue({
      fieldList: [{ fieldPath: '$.orderId', type: 'string', required: true }],
    })
    deleteSchema.mockResolvedValue({
      ok: true,
      messages: ['Deleted schema orders.'],
      errors: [],
      deleted: true,
    })

    const wrapper = mount(JsonSchemaEditorPage)
    await flushPromises()

    await wrapper.get('[data-testid="delete-schema"]').trigger('click')
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalledWith('Delete schema "Orders schema"?')
    expect(deleteSchema).toHaveBeenCalledWith({ jsonSchemaId: 'test-schema' })
    expect(push).toHaveBeenCalledWith({ name: 'schemas-library' })
  })

  it('does not delete the schema when the confirmation is cancelled', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    route.params = { jsonSchemaId: 'test-schema' }
    route.fullPath = '/schemas/editor/test-schema'
    get.mockResolvedValue({
      schemaData: {
        jsonSchemaId: 'test-schema',
        schemaName: 'orders',
        description: 'Orders schema',
        systemEnumId: 'DarSysOms',
        systemLabel: 'OMS',
        statusId: 'Active',
        lastUpdatedStamp: '2026-04-08T10:00:00Z',
        schemaText: '{"type":"object"}',
      },
    })
    flatten.mockResolvedValue({
      fieldList: [{ fieldPath: '$.orderId', type: 'string', required: true }],
    })

    const wrapper = mount(JsonSchemaEditorPage)
    await flushPromises()

    await wrapper.get('[data-testid="delete-schema"]').trigger('click')

    expect(confirmSpy).toHaveBeenCalledWith('Delete schema "Orders schema"?')
    expect(deleteSchema).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })
})
