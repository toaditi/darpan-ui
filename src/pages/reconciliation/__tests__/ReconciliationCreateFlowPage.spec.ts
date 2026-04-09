import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const listSchemas = vi.hoisted(() => vi.fn())
const flattenSchema = vi.hoisted(() => vi.fn())
const createPilotMapping = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  },
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../../../lib/api/facade', () => ({
  jsonSchemaFacade: {
    list: listSchemas,
    flatten: flattenSchema,
  },
  reconciliationFacade: {
    createPilotMapping,
  },
}))

import ReconciliationCreateFlowPage from '../ReconciliationCreateFlowPage.vue'

async function chooseWorkflowOption(
  wrapper: ReturnType<typeof mount>,
  testId: string,
  value: string,
): Promise<void> {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
  await wrapper.get(`[data-testid="workflow-select-option"][data-option-value="${value}"]`).trigger('click')
}

async function chooseWorkflowOptionWithEnter(
  wrapper: ReturnType<typeof mount>,
  testId: string,
  value: string,
): Promise<void> {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
  await wrapper.get(`[data-testid="workflow-select-option"][data-option-value="${value}"]`).trigger('keydown.enter')
}

async function advanceToNameStep(wrapper: ReturnType<typeof mount>): Promise<void> {
  await chooseWorkflowOption(wrapper, 'schema-select', '100408')
  await wrapper.find('[data-testid="wizard-next"]').trigger('click')
  await flushPromises()

  await chooseWorkflowOption(wrapper, 'primary-field', '$.return_id')
  await wrapper.find('[data-testid="wizard-next"]').trigger('click')
  await flushPromises()

  await chooseWorkflowOption(wrapper, 'schema-select', '100409')
  await wrapper.find('[data-testid="wizard-next"]').trigger('click')
  await flushPromises()

  await chooseWorkflowOption(wrapper, 'primary-field', '$.id')
  await wrapper.find('[data-testid="wizard-next"]').trigger('click')
  await flushPromises()
}

describe('ReconciliationCreateFlowPage', () => {
  beforeEach(() => {
    push.mockClear()
    listSchemas.mockReset()
    flattenSchema.mockReset()
    createPilotMapping.mockReset()
    window.history.replaceState({}, '', '/')

    listSchemas.mockResolvedValue({
      schemas: [
        {
          jsonSchemaId: '100408',
          schemaName: 'Returns Feed',
          description: 'Return events exported from OMS.',
          systemEnumId: 'DarSysOms',
          systemLabel: 'OMS',
        },
        {
          jsonSchemaId: '100409',
          schemaName: 'Shopify Orders',
          description: 'Orders exported from Shopify.',
          systemEnumId: 'DarSysShopify',
          systemLabel: 'SHOPIFY',
        },
        {
          jsonSchemaId: '100410',
          schemaName: 'OMS Adjustments',
          description: 'Adjustment feed exported from OMS.',
          systemEnumId: 'DarSysOms',
          systemLabel: 'OMS',
        },
      ],
    })

    flattenSchema.mockImplementation(({ jsonSchemaId }: { jsonSchemaId: string }) => {
      if (jsonSchemaId === '100408') {
        return Promise.resolve({
          fieldList: [
            { fieldPath: '$.return_id', type: 'string', required: true },
            { fieldPath: '$.normalized.return_id', type: 'string', required: false },
          ],
        })
      }

      return Promise.resolve({
        fieldList: [
          { fieldPath: '$.id', type: 'string', required: true },
          { fieldPath: '$.normalized.id', type: 'string', required: false },
        ],
      })
    })

    createPilotMapping.mockResolvedValue({
      savedMapping: {
        reconciliationMappingId: 'MapNew',
        mappingName: 'Returns vs Shopify',
        file1SystemEnumId: 'DarSysOms',
        file2SystemEnumId: 'DarSysShopify',
        file1SchemaName: 'Returns Feed',
        file2SchemaName: 'Shopify Orders',
        file1FieldPath: '$.return_id',
        file2FieldPath: '$.id',
      },
      ok: true,
      messages: [],
      errors: [],
    })
  })

  it('collects schema data and creates a mapping', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    expect(wrapper.find('.workflow-page').exists()).toBe(true)
    expect(wrapper.find('.wizard-progress-track').exists()).toBe(true)
    expect(wrapper.find('.workflow-step-shell').exists()).toBe(true)
    expect(wrapper.text()).toContain('Select a JSON Schema')
    expect(wrapper.text()).toContain('Create a New Schema')

    await advanceToNameStep(wrapper)

    expect(wrapper.text()).toContain('Name this reconciliation flow')
    await wrapper.find('input[name="flowName"]').setValue('Returns vs Shopify')
    await wrapper.find('[data-testid="create-mapping"]').trigger('click')
    await flushPromises()

    expect(flattenSchema).toHaveBeenCalledWith({ jsonSchemaId: '100408' })
    expect(flattenSchema).toHaveBeenCalledWith({ jsonSchemaId: '100409' })
    expect(createPilotMapping).toHaveBeenCalledWith({
      mappingName: 'Returns vs Shopify',
      schema1Id: '100408',
      schema2Id: '100409',
      schema1FieldPath: '$.return_id',
      schema2FieldPath: '$.id',
    })
    expect(push).toHaveBeenCalledWith({ name: 'hub' })
  })

  it('blocks source 2 when it uses the same system as source 1', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await chooseWorkflowOption(wrapper, 'schema-select', '100408')
    await wrapper.find('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    await chooseWorkflowOption(wrapper, 'primary-field', '$.return_id')
    await wrapper.find('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    await chooseWorkflowOption(wrapper, 'schema-select', '100410')
    await flushPromises()

    expect(wrapper.text()).toContain('Source 2 must use a schema with a different system than source 1.')
    expect(wrapper.find('[data-testid="wizard-next"]').attributes('disabled')).toBeDefined()
  })

  it('does not show a separate selected-schema system summary after schema selection', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await chooseWorkflowOption(wrapper, 'schema-select', '100408')
    await flushPromises()

    expect(wrapper.text()).not.toContain('System: OMS')
  })

  it('advances when Enter selects a schema from the open workflow dropdown', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await chooseWorkflowOptionWithEnter(wrapper, 'schema-select', '100408')
    await flushPromises()

    expect(wrapper.text()).toContain('Select a field from OMS')
    expect(flattenSchema).toHaveBeenCalledWith({ jsonSchemaId: '100408' })
  })

  it('advances when Enter is pressed on the schema trigger after selection', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await chooseWorkflowOption(wrapper, 'schema-select', '100408')
    await wrapper.get('[data-testid="schema-select"]').trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('Select a field from OMS')
    expect(flattenSchema).toHaveBeenCalledWith({ jsonSchemaId: '100408' })
  })

  it('shows the selected schema system during field selection for both sources', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await chooseWorkflowOption(wrapper, 'schema-select', '100408')
    await wrapper.find('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Select a field from OMS')

    await chooseWorkflowOption(wrapper, 'primary-field', '$.return_id')
    await wrapper.find('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    await chooseWorkflowOption(wrapper, 'schema-select', '100409')
    await wrapper.find('[data-testid="wizard-next"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Select a field from SHOPIFY')
  })

  it('creates the mapping and returns to the dashboard when Enter is pressed on the final name input', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await advanceToNameStep(wrapper)

    await wrapper.find('input[name="flowName"]').setValue('Returns vs Shopify')
    await wrapper.find('input[name="flowName"]').trigger('keydown.enter')
    await flushPromises()

    expect(createPilotMapping).toHaveBeenCalledWith({
      mappingName: 'Returns vs Shopify',
      schema1Id: '100408',
      schema2Id: '100409',
      schema1FieldPath: '$.return_id',
      schema2FieldPath: '$.id',
    })
    expect(push).toHaveBeenCalledWith({ name: 'hub' })
  })

  it('returns to the workflow origin after creating a mapping when a static page launched the flow', async () => {
    window.history.replaceState(
      {
        workflowOriginLabel: 'Runs',
        workflowOriginPath: '/settings/runs',
      },
      '',
      '/reconciliation/create',
    )

    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await advanceToNameStep(wrapper)

    await wrapper.find('input[name="flowName"]').setValue('Returns vs Shopify')
    await wrapper.find('[data-testid="create-mapping"]').trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/settings/runs')
  })
})
