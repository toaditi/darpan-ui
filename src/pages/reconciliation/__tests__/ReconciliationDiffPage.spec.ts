import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const route = vi.hoisted(() => ({
  query: {},
}))
const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const listSavedRuns = vi.hoisted(() => vi.fn())
const listGeneratedOutputs = vi.hoisted(() => vi.fn())
const runSavedRunDiff = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  },
  useRoute: () => route,
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../../../lib/api/facade', () => ({
  reconciliationFacade: {
    listSavedRuns,
    listGeneratedOutputs,
    runSavedRunDiff,
  },
}))

import ReconciliationDiffPage from '../ReconciliationDiffPage.vue'

const savedRunResponse = {
  ok: true,
  messages: [],
  errors: [],
  pagination: {
    pageIndex: 0,
    pageSize: 50,
    totalCount: 1,
    pageCount: 1,
  },
  savedRuns: [
    {
      savedRunId: 'RS_ORDER_CSV',
      runName: 'CSV Order Compare',
      description: 'CSV order comparison',
      runType: 'ruleset',
      ruleSetId: 'RS_ORDER_CSV',
      compareScopeId: 'CS_ORDER_CSV',
      requiresSystemSelection: false,
      defaultFile1SystemEnumId: 'OMS',
      defaultFile2SystemEnumId: 'SHOPIFY',
      systemOptions: [
        { enumId: 'OMS', label: 'OMS', fileSide: 'FILE_1', fileTypeEnumId: 'DftCsv', fileTypeLabel: 'CSV' },
        {
          enumId: 'SHOPIFY',
          label: 'SHOPIFY',
          fileSide: 'FILE_2',
          fileTypeEnumId: 'DftCsv',
          fileTypeLabel: 'CSV',
        },
      ],
    },
  ],
}

function stubFileReader(): void {
  class MockFileReader {
    result: string | ArrayBuffer | null = null
    onload: null | (() => void) = null
    onerror: null | (() => void) = null

    readAsText(file: File): void {
      this.result = file.name === 'oms-orders.csv' ? 'order_id\n1001\n1002\n' : 'order_id\n1002\n1003\n'
      this.onload?.()
    }
  }

  vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader)
}

async function chooseWorkflowOption(
  wrapper: ReturnType<typeof mount>,
  testId: string,
  value: string,
): Promise<void> {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
  await wrapper.get(`[data-testid="workflow-select-option"][data-option-value="${value}"]`).trigger('click')
}

describe('ReconciliationDiffPage', () => {
  beforeEach(() => {
    route.query = {}
    push.mockClear()
    listSavedRuns.mockReset()
    listGeneratedOutputs.mockReset()
    runSavedRunDiff.mockReset()
    listSavedRuns.mockResolvedValue(savedRunResponse)
    listGeneratedOutputs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: {
        pageIndex: 0,
        pageSize: 1,
        totalCount: 0,
        pageCount: 1,
      },
      generatedOutputs: [],
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads saved runs and keeps the summary hidden before selection', async () => {
    const wrapper = mount(ReconciliationDiffPage)
    await flushPromises()

    expect(listSavedRuns).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 50,
      query: '',
    })
    expect(wrapper.find('.workflow-page').exists()).toBe(true)
    expect(wrapper.find('.wizard-progress-track').exists()).toBe(true)
    expect(wrapper.find('.workflow-shell--center-stage').exists()).toBe(true)
    expect(wrapper.find('.reconciliation-diff-layout').exists()).toBe(true)
    expect(wrapper.find('.reconciliation-diff-main').exists()).toBe(true)
    expect(wrapper.find('.workflow-step-shell').exists()).toBe(true)
    expect(wrapper.text()).toContain('Select a Run')
    expect(wrapper.text()).toContain('Next')
    expect(wrapper.find('[data-testid="saved-run-select"]').exists()).toBe(true)
    await wrapper.get('[data-testid="saved-run-select"]').trigger('click')
    expect(wrapper.get('[data-testid="workflow-select-option"][data-option-value="RS_ORDER_CSV"]').text()).toBe(
      'CSV Order Compare',
    )
    expect(wrapper.find('[data-testid="file1-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="file2-input"]').exists()).toBe(false)
    expect(wrapper.find('.reconciliation-run-history-board').exists()).toBe(false)
  })

  it('shows the API error when saved-run lookup fails', async () => {
    listSavedRuns.mockRejectedValue(new ApiCallError('Unable to load saved runs.', 503))

    const wrapper = mount(ReconciliationDiffPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load saved runs.')
    expect(wrapper.find('.reconciliation-diff-layout').exists()).toBe(false)
    expect(wrapper.find('[data-testid="saved-run-select"]').exists()).toBe(false)
  })

  it('loads the latest saved result card with a static-result link and a separate history link', async () => {
    route.query = {
      savedRunId: 'RS_ORDER_CSV',
      runName: 'CSV Order Compare',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }
    listGeneratedOutputs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: {
        pageIndex: 0,
        pageSize: 1,
        totalCount: 2,
        pageCount: 2,
      },
      generatedOutputs: [
        {
          fileName: 'CSV-Order-Compare-diff-20260330-150000.json',
          sourceFormat: 'json',
          availableFormats: ['json', 'csv'],
          preferredDownloadFormat: 'csv',
          savedRunId: 'RS_ORDER_CSV',
          savedRunName: 'CSV Order Compare',
          savedRunType: 'ruleset',
          ruleSetId: 'RS_ORDER_CSV',
          compareScopeId: 'CS_ORDER_CSV',
          file1Label: 'OMS',
          file2Label: 'SHOPIFY',
          totalDifferences: 4,
          onlyInFile1Count: 1,
          onlyInFile2Count: 3,
          createdDate: '2026-03-30T15:00:00.000Z',
        },
      ],
    })

    const wrapper = mount(ReconciliationDiffPage)
    await flushPromises()

    expect(listGeneratedOutputs).toHaveBeenCalledWith({
      savedRunId: 'RS_ORDER_CSV',
      pageIndex: 0,
      pageSize: 1,
      query: '',
    })
    expect(wrapper.text()).toContain('Upload the OMS CSV file')
    expect(wrapper.find('.reconciliation-run-history-board').exists()).toBe(true)
    expect(wrapper.get('[data-testid="latest-run-result"]').text()).toContain('Mar')
    expect(wrapper.get('[data-testid="latest-run-result"]').text()).toContain('Total differences')
    expect(JSON.parse(wrapper.get('[data-testid="latest-run-result"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-result',
      params: {
        savedRunId: 'RS_ORDER_CSV',
        outputFileName: 'CSV-Order-Compare-diff-20260330-150000.json',
      },
      query: {
        runName: 'CSV Order Compare',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
    expect(JSON.parse(wrapper.get('[data-testid="view-all-run-results"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-history',
      params: {
        savedRunId: 'RS_ORDER_CSV',
      },
      query: {
        runName: 'CSV Order Compare',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
  })

  it('uses the two-step upload workflow and navigates to the static result page after a successful run', async () => {
    stubFileReader()
    route.query = {
      savedRunId: 'RS_ORDER_CSV',
      runName: 'CSV Order Compare',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }
    runSavedRunDiff.mockResolvedValue({
      ok: true,
      messages: ['Generated CSV-Order-Compare-diff-20260331-063304.json.'],
      errors: [],
      runResult: {
        savedRunId: 'RS_ORDER_CSV',
        runName: 'CSV Order Compare',
        runType: 'ruleset',
        ruleSetId: 'RS_ORDER_CSV',
        compareScopeId: 'CS_ORDER_CSV',
        file1SystemEnumId: 'OMS',
        file2SystemEnumId: 'SHOPIFY',
        validationErrors: [],
        processingWarnings: [],
        generatedOutput: {
          fileName: 'CSV-Order-Compare-diff-20260331-063304.json',
          savedRunId: 'RS_ORDER_CSV',
          savedRunType: 'ruleset',
          totalDifferences: 2,
          onlyInFile1Count: 1,
          onlyInFile2Count: 1,
        },
      },
    })

    const wrapper = mount(ReconciliationDiffPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the OMS CSV file')
    expect(wrapper.find('[data-testid="saved-run-select"]').exists()).toBe(false)

    const file1Input = wrapper.get('[data-testid="file1-input"]')
    Object.defineProperty(file1Input.element, 'files', {
      value: [new File(['order_id\n1001\n1002\n'], 'oms-orders.csv', { type: 'text/csv' })],
      configurable: true,
    })
    await file1Input.trigger('change')
    await wrapper.get('.workflow-step-shell').trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the SHOPIFY CSV file')
    expect(wrapper.text()).toContain('Choose the SHOPIFY CSV file to upload...')

    const file2Input = wrapper.get('[data-testid="file2-input"]')
    Object.defineProperty(file2Input.element, 'files', {
      value: [new File(['order_id\n1002\n1003\n'], 'shopify-orders.csv', { type: 'text/csv' })],
      configurable: true,
    })
    await file2Input.trigger('change')
    expect(wrapper.get('[data-testid="reconciliation-step-primary"]').text()).toBe('Execute')

    await wrapper.get('.workflow-step-shell').trigger('keydown.enter')
    await flushPromises()

    expect(runSavedRunDiff).toHaveBeenCalledWith({
      savedRunId: 'RS_ORDER_CSV',
      file1Name: 'oms-orders.csv',
      file1Text: 'order_id\n1001\n1002\n',
      file2Name: 'shopify-orders.csv',
      file2Text: 'order_id\n1002\n1003\n',
      file1SystemEnumId: 'OMS',
      file2SystemEnumId: 'SHOPIFY',
      hasHeader: true,
    })
    expect(push).toHaveBeenCalledWith({
      name: 'reconciliation-run-result',
      params: {
        savedRunId: 'RS_ORDER_CSV',
        outputFileName: 'CSV-Order-Compare-diff-20260331-063304.json',
      },
      query: {
        runName: 'CSV Order Compare',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
  })

  it('surfaces validation feedback when the backend blocks an invalid saved-run diff', async () => {
    stubFileReader()
    route.query = {
      savedRunId: 'RS_ORDER_CSV',
      runName: 'CSV Order Compare',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }
    runSavedRunDiff.mockRejectedValue(
      new ApiCallError('Schema validation failed. OMS: missing required property order_id', 400, {
        result: {
          ok: false,
          errors: ['Schema validation failed. OMS: missing required property order_id'],
          validationErrors: ['OMS: missing required property order_id'],
          processingWarnings: [],
        },
      }),
    )

    const wrapper = mount(ReconciliationDiffPage)
    await flushPromises()

    const file1Input = wrapper.get('[data-testid="file1-input"]')
    Object.defineProperty(file1Input.element, 'files', {
      value: [new File(['order_id\n1001\n1002\n'], 'oms-orders.csv', { type: 'text/csv' })],
      configurable: true,
    })
    await file1Input.trigger('change')
    await wrapper.get('.workflow-step-shell').trigger('keydown.enter')
    await flushPromises()

    const file2Input = wrapper.get('[data-testid="file2-input"]')
    Object.defineProperty(file2Input.element, 'files', {
      value: [new File(['order_id\n1002\n1003\n'], 'shopify-orders.csv', { type: 'text/csv' })],
      configurable: true,
    })
    await file2Input.trigger('change')
    await wrapper.get('.workflow-step-shell').trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('Schema validation failed. OMS: missing required property order_id')
    expect(wrapper.text()).toContain('OMS: missing required property order_id')
    expect(push).not.toHaveBeenCalled()
  })

  it('blocks schema json uploads before calling the saved-run diff API', async () => {
    class SchemaFileReader {
      result: string | ArrayBuffer | null = null
      onload: null | (() => void) = null
      onerror: null | (() => void) = null

      readAsText(): void {
        this.result = JSON.stringify({
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              orderId: { type: 'string' },
            },
          },
        })
        this.onload?.()
      }
    }

    vi.stubGlobal('FileReader', SchemaFileReader as unknown as typeof FileReader)
    route.query = {
      savedRunId: 'RS_ORDER_CSV',
      runName: 'CSV Order Compare',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }

    const wrapper = mount(ReconciliationDiffPage)
    await flushPromises()

    const file1Input = wrapper.get('[data-testid="file1-input"]')
    Object.defineProperty(file1Input.element, 'files', {
      value: [new File(['{}'], 'Gorjana-OMS-Order.json', { type: 'application/json' })],
      configurable: true,
    })
    await file1Input.trigger('change')
    await wrapper.get('.workflow-step-shell').trigger('keydown.enter')
    await flushPromises()

    const file2Input = wrapper.get('[data-testid="file2-input"]')
    Object.defineProperty(file2Input.element, 'files', {
      value: [new File(['{}'], 'Gorjana-Shopify-Orders.json', { type: 'application/json' })],
      configurable: true,
    })
    await file2Input.trigger('change')
    await wrapper.get('.workflow-step-shell').trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('OMS expects CSV data for this saved run.')
    expect(wrapper.text()).toContain('Gorjana-OMS-Order.json looks like a JSON Schema file.')
    expect(runSavedRunDiff).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })

  it('allows selecting a saved run from the workflow dropdown before upload', async () => {
    const wrapper = mount(ReconciliationDiffPage)
    await flushPromises()

    await chooseWorkflowOption(wrapper, 'saved-run-select', 'RS_ORDER_CSV')
    await wrapper.get('[data-testid="reconciliation-step-primary"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the OMS CSV file')
    expect(listGeneratedOutputs).toHaveBeenCalledWith({
      savedRunId: 'RS_ORDER_CSV',
      pageIndex: 0,
      pageSize: 1,
      query: '',
    })
  })
})
