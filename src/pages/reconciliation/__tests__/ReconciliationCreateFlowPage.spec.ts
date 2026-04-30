import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { buildReconciliationRuleSetDraftState } from '../../../lib/reconciliationRuleSetDraft'
import { buildWorkflowOriginState } from '../../../lib/workflowOrigin'

const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const listEnumOptions = vi.hoisted(() => vi.fn())
const listJsonSchemas = vi.hoisted(() => vi.fn())
const flattenJsonSchema = vi.hoisted(() => vi.fn())
const createRuleSetRun = vi.hoisted(() => vi.fn())
const RULESET_MANAGER_HELPER_COPY =
  'Open the Ruleset Manager to pair fields and start with the sketched operator set: =, >, and <. Normalizers stay separate for now.'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../../../lib/api/facade', () => ({
  settingsFacade: {
    listEnumOptions,
  },
  jsonSchemaFacade: {
    list: listJsonSchemas,
    flatten: flattenJsonSchema,
  },
  reconciliationFacade: {
    createRuleSetRun,
  },
}))

import ReconciliationCreateFlowPage from '../ReconciliationCreateFlowPage.vue'

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function chooseWorkflowOption(
  wrapper: ReturnType<typeof mount>,
  testId: string,
  value: string,
): Promise<void> {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
  await wrapper.get(`[data-testid="workflow-select-option"][data-option-value="${value}"]`).trigger('click')
}

async function chooseWorkflowChoice(
  wrapper: ReturnType<typeof mount>,
  testId: string,
): Promise<void> {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
}

async function advanceToFinalPrimaryIdStep(wrapper: ReturnType<typeof mount>): Promise<void> {
  await wrapper.get('input[name="runName"]').setValue('JSON Order Compare')
  await wrapper.get('[data-testid="wizard-next"]').trigger('click')

  await wrapper.get('[data-testid="wizard-next"]').trigger('click')

  await chooseWorkflowOption(wrapper, 'file1-system-select', 'OMS')
  await wrapper.get('[data-testid="wizard-next"]').trigger('click')

  await chooseWorkflowChoice(wrapper, 'file1-filetype-choice-DftJson')

  await chooseWorkflowOption(wrapper, 'file1-schema-select', 'schema-oms-orders')
  await flushPromises()
  await wrapper.get('[data-testid="wizard-next"]').trigger('click')

  await chooseWorkflowOption(wrapper, 'file1-field-select', '$.orders[0].order_id')
  await wrapper.get('[data-testid="wizard-next"]').trigger('click')

  await chooseWorkflowOption(wrapper, 'file2-system-select', 'SHOPIFY')
  await wrapper.get('[data-testid="wizard-next"]').trigger('click')

  await chooseWorkflowChoice(wrapper, 'file2-filetype-choice-DftJson')

  await chooseWorkflowOption(wrapper, 'file2-schema-select', 'schema-shopify-orders')
  await flushPromises()
  await wrapper.get('[data-testid="wizard-next"]').trigger('click')
}

function createDraftState() {
  return buildReconciliationRuleSetDraftState(
    {
      runName: 'JSON Order Compare',
      file1SystemEnumId: 'OMS',
      file1SystemLabel: 'OMS',
      file1FileTypeEnumId: 'DftJson',
      file1JsonSchemaId: 'schema-oms-orders',
      file1SchemaFileName: 'test-oms-orders.schema.json',
      file1PrimaryIdExpression: '$.orders[0].order_id',
      file2SystemEnumId: 'SHOPIFY',
      file2SystemLabel: 'SHOPIFY',
      file2FileTypeEnumId: 'DftJson',
      file2JsonSchemaId: 'schema-shopify-orders',
      file2SchemaFileName: 'test-shopify-orders.schema.json',
      file2PrimaryIdExpression: '$.data.orders.edges[0].node.id',
    },
    'ruleset-manager',
  )
}

describe('ReconciliationCreateFlowPage', () => {
  beforeEach(() => {
    push.mockClear()
    listEnumOptions.mockReset()
    listJsonSchemas.mockReset()
    flattenJsonSchema.mockReset()
    createRuleSetRun.mockReset()
    window.history.replaceState({}, '', '/')

    listEnumOptions.mockImplementation(async (enumTypeId: string) => {
      if (enumTypeId === 'DarpanSystemSource') {
        return {
          ok: true,
          messages: [],
          errors: [],
          options: [
            { enumId: 'OMS', label: 'OMS' },
            { enumId: 'SHOPIFY', label: 'SHOPIFY' },
            { enumId: 'NETSUITE', label: 'NetSuite' },
          ],
        }
      }

      return {
        ok: true,
        messages: [],
        errors: [],
        options: [
          { enumId: 'DftCsv', label: 'CSV' },
          { enumId: 'DftJson', label: 'JSON' },
        ],
      }
    })

    listJsonSchemas.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: {
        pageIndex: 0,
        pageSize: 200,
        totalCount: 2,
        pageCount: 1,
      },
      schemas: [
        {
          jsonSchemaId: 'schema-oms-orders',
          schemaName: 'test-oms-orders.schema.json',
          description: 'OMS orders',
          systemEnumId: 'OMS',
          systemLabel: 'OMS',
        },
        {
          jsonSchemaId: 'schema-shopify-orders',
          schemaName: 'test-shopify-orders.schema.json',
          description: 'Shopify orders',
          systemEnumId: 'SHOPIFY',
          systemLabel: 'SHOPIFY',
        },
      ],
    })

    flattenJsonSchema.mockImplementation(async ({ jsonSchemaId }: { jsonSchemaId: string }) => {
      if (jsonSchemaId === 'schema-oms-orders') {
        return {
          ok: true,
          messages: [],
          errors: [],
          fieldList: [
            { fieldPath: '$.orders[0].order_id', type: 'string', required: true },
            { fieldPath: '$.orders[0].status', type: 'string', required: false },
          ],
        }
      }

      return {
        ok: true,
        messages: [],
        errors: [],
        fieldList: [
          { fieldPath: '$.data.orders.edges[0].node.id', type: 'string', required: true },
          { fieldPath: '$.data.orders.edges[0].node.status', type: 'string', required: false },
        ],
      }
    })

    createRuleSetRun.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      savedRun: {
        savedRunId: 'RS_JSON_ORDER_COMPARE',
        runName: 'JSON Order Compare',
        runType: 'ruleset',
        ruleSetId: 'RS_JSON_ORDER_COMPARE',
        compareScopeId: 'CS_RS_JSON_ORDER_COMPARE',
        requiresSystemSelection: false,
        defaultFile1SystemEnumId: 'OMS',
        defaultFile2SystemEnumId: 'SHOPIFY',
        systemOptions: [],
      },
    })
  })

  it('asks for one value per step and creates directly after the basics are defined', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    expect(wrapper.text()).toContain('What should this run be called?')
    expect(wrapper.findAll('input')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('record root')

    await advanceToFinalPrimaryIdStep(wrapper)

    expect(flattenJsonSchema).toHaveBeenCalledWith({ jsonSchemaId: 'schema-oms-orders' })
    expect(flattenJsonSchema).toHaveBeenCalledWith({ jsonSchemaId: 'schema-shopify-orders' })
    expect(wrapper.text()).toContain('Which field identifies each record in Shopify orders')
    expect(wrapper.text()).not.toContain('Create JSON Order Compare now, or open the Ruleset Manager first?')
    expect(wrapper.text()).not.toContain(RULESET_MANAGER_HELPER_COPY)
    expect(wrapper.text()).not.toContain('Open the Ruleset Manager')
    expect(wrapper.find('[data-testid="ruleset-manager-handoff"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="open-ruleset-manager"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('sketched operator set')
    expect(wrapper.text()).not.toContain('Normalizers stay separate for now.')
    expect(wrapper.findAll('textarea')).toHaveLength(0)
    await chooseWorkflowOption(wrapper, 'file2-field-select', '$.data.orders.edges[0].node.id')
    expect(wrapper.get('[data-testid="create-run"]').text()).toContain('Create')
  })

  it('creates a basic diff run from the final primary ID step', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await advanceToFinalPrimaryIdStep(wrapper)
    await chooseWorkflowOption(wrapper, 'file2-field-select', '$.data.orders.edges[0].node.id')
    await wrapper.get('[data-testid="create-run"]').trigger('click')
    await flushPromises()

    expect(listEnumOptions).toHaveBeenCalledWith('DarpanSystemSource')
    expect(listEnumOptions).toHaveBeenCalledWith('DarpanFileType')
    expect(listJsonSchemas).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 200,
      query: '',
    })
    expect(createRuleSetRun).toHaveBeenCalledWith({
      runName: 'JSON Order Compare',
      description: undefined,
      file1SystemEnumId: 'OMS',
      file1FileTypeEnumId: 'DftJson',
      file1SchemaFileName: 'test-oms-orders.schema.json',
      file1PrimaryIdExpression: '$.orders[0].order_id',
      file2SystemEnumId: 'SHOPIFY',
      file2FileTypeEnumId: 'DftJson',
      file2SchemaFileName: 'test-shopify-orders.schema.json',
      file2PrimaryIdExpression: '$.data.orders.edges[0].node.id',
    })
    expect(push).toHaveBeenCalledWith({ name: 'hub' })
  })

  it('renders file type selection with keyed choice cards and advances on keyboard shortcut', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage, { attachTo: document.body })
    await flushPromises()

    await wrapper.get('input[name="runName"]').setValue('JSON Order Compare')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowOption(wrapper, 'file1-system-select', 'OMS')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    expect(wrapper.find('[data-testid="file1-filetype-select"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('B')
    expect(wrapper.text()).not.toContain('press Enter')
    expect(wrapper.find('[data-testid="wizard-next"]').exists()).toBe(false)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))
    await flushPromises()

    expect(wrapper.text()).toContain('Which saved schema describes the OMS JSON?')

    wrapper.unmount()
  })

  it('restores schema trigger focus after schema fields load so Enter advances', async () => {
    const omsSchemaFields = createDeferredPromise<{
      ok: boolean
      messages: string[]
      errors: string[]
      fieldList: { fieldPath: string, type: string, required: boolean }[]
    }>()

    flattenJsonSchema.mockImplementation(async ({ jsonSchemaId }: { jsonSchemaId: string }) => {
      if (jsonSchemaId === 'schema-oms-orders') {
        return omsSchemaFields.promise
      }

      return {
        ok: true,
        messages: [],
        errors: [],
        fieldList: [
          { fieldPath: '$.data.orders.edges[0].node.id', type: 'string', required: true },
          { fieldPath: '$.data.orders.edges[0].node.status', type: 'string', required: false },
        ],
      }
    })

    const wrapper = mount(ReconciliationCreateFlowPage, { attachTo: document.body })
    await flushPromises()

    await wrapper.get('input[name="runName"]').setValue('JSON Order Compare')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowOption(wrapper, 'file1-system-select', 'OMS')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowChoice(wrapper, 'file1-filetype-choice-DftJson')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowOption(wrapper, 'file1-schema-select', 'schema-oms-orders')
    await flushPromises()

    omsSchemaFields.resolve({
      ok: true,
      messages: [],
      errors: [],
      fieldList: [
        { fieldPath: '$.orders[0].order_id', type: 'string', required: true },
        { fieldPath: '$.orders[0].status', type: 'string', required: false },
      ],
    })
    await flushPromises()

    expect((document.activeElement as HTMLElement | null)?.dataset.testid).toBe('file1-schema-select')

    await wrapper.get('[data-testid="file1-schema-select"]').trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('Which field identifies each record in OMS orders')

    wrapper.unmount()
  })

  it('places the create schema alternate path between the schema selector and action buttons', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await wrapper.get('input[name="runName"]').setValue('JSON Order Compare')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowOption(wrapper, 'file1-system-select', 'OMS')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowChoice(wrapper, 'file1-filetype-choice-DftJson')
    await flushPromises()

    const schemaSelect = wrapper.get('[data-testid="file1-schema-select"]')
    const createSchemaChoice = wrapper.get('.reconciliation-create-schema-choice')
    const divider = wrapper.get('[data-testid="create-schema-divider"]')
    const createSchemaAction = wrapper.get('[data-testid="create-schema-from-reconciliation"]')
    const actionRow = wrapper.get('.wizard-actions')

    expect(createSchemaChoice.text()).toBe('Or Create New Schema')
    expect(divider.text()).toBe('Or')
    expect(createSchemaAction.text()).toBe('Create New Schema')
    expect(actionRow.text()).toContain('OK')
    expect(actionRow.text()).not.toContain('Create New Schema')
    expect(actionRow.element.contains(createSchemaAction.element)).toBe(false)
    expect(schemaSelect.element.compareDocumentPosition(divider.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(createSchemaAction.element.compareDocumentPosition(actionRow.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('softens all-caps system labels in schema-selection headers while preserving acronyms', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await wrapper.get('input[name="runName"]').setValue('JSON Order Compare')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowOption(wrapper, 'file1-system-select', 'SHOPIFY')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await chooseWorkflowChoice(wrapper, 'file1-filetype-choice-DftJson')
    await flushPromises()

    expect(wrapper.text()).toContain('Which saved schema describes the Shopify JSON?')
    expect(wrapper.text()).not.toContain('Which saved schema describes the SHOPIFY JSON?')

    await wrapper.get('[data-testid="file1-schema-select"]').trigger('click')

    const shopifySchemaOption = wrapper.get('[data-testid="workflow-select-option"][data-option-value="schema-shopify-orders"]')
    expect(shopifySchemaOption.text()).toBe('Shopify orders - Shopify')

    await shopifySchemaOption.trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await chooseWorkflowOption(wrapper, 'file1-field-select', '$.data.orders.edges[0].node.id')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowOption(wrapper, 'file2-system-select', 'OMS')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await chooseWorkflowChoice(wrapper, 'file2-filetype-choice-DftJson')
    await flushPromises()

    expect(wrapper.text()).toContain('Which saved schema describes the OMS JSON?')
  })

  it('offers a text action to create a schema when no saved JSON schema exists for the selected system', async () => {
    listJsonSchemas.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: {
        pageIndex: 0,
        pageSize: 200,
        totalCount: 1,
        pageCount: 1,
      },
      schemas: [
        {
          jsonSchemaId: 'schema-shopify-orders',
          schemaName: 'test-shopify-orders.schema.json',
          description: 'Shopify orders',
          systemEnumId: 'SHOPIFY',
          systemLabel: 'SHOPIFY',
        },
      ],
    })

    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await wrapper.get('input[name="runName"]').setValue('JSON Order Compare')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowOption(wrapper, 'file1-system-select', 'OMS')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowChoice(wrapper, 'file1-filetype-choice-DftJson')
    await flushPromises()

    expect(wrapper.text()).toContain('No saved JSON schemas are available for OMS.')
    expect(wrapper.get('[data-testid="create-schema-from-reconciliation"]').text()).toBe('Create New Schema')

    await wrapper.get('[data-testid="create-schema-from-reconciliation"]').trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith({
      path: '/schemas/create',
      state: {
        workflowOriginLabel: 'Reconciliation Setup',
        workflowOriginPath: '/reconciliation/create',
      },
    })
  })

  it('blocks source 2 when it uses the same system as source 1', async () => {
    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    await wrapper.get('input[name="runName"]').setValue('Order Status Compare')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowOption(wrapper, 'file1-system-select', 'OMS')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowChoice(wrapper, 'file1-filetype-choice-DftCsv')

    await wrapper.get('input[name="file1PrimaryIdExpression"]').setValue('order_id')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    await chooseWorkflowOption(wrapper, 'file2-system-select', 'OMS')
    await flushPromises()

    expect(wrapper.text()).toContain('Source 2 must use a different system than source 1.')
    expect(wrapper.get('[data-testid="wizard-next"]').attributes('disabled')).toBeDefined()
  })

  it('restores the draft from history state and returns to the workflow origin after creating the run', async () => {
    window.history.replaceState(
      {
        ...buildWorkflowOriginState('Run Editor', '/settings/runs'),
        ...createDraftState(),
      },
      '',
      '/reconciliation/create',
    )

    const wrapper = mount(ReconciliationCreateFlowPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Which field identifies each record in Shopify orders')
    expect(wrapper.text()).not.toContain('Create JSON Order Compare now, or open the Ruleset Manager first?')
    expect(wrapper.text()).not.toContain(RULESET_MANAGER_HELPER_COPY)
    expect(wrapper.text()).not.toContain('Open the Ruleset Manager')
    expect(wrapper.find('[data-testid="ruleset-manager-handoff"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="open-ruleset-manager"]').exists()).toBe(false)

    await wrapper.get('[data-testid="create-run"]').trigger('click')
    await flushPromises()

    expect(push).toHaveBeenCalledWith('/settings/runs')
  })
})
