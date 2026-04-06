import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const route = vi.hoisted(() => ({
  query: {},
}))
const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const listPilotMappings = vi.hoisted(() => vi.fn())
const listPilotGeneratedOutputs = vi.hoisted(() => vi.fn())
const runPilotGenericDiff = vi.hoisted(() => vi.fn())

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
    listPilotMappings,
    listPilotGeneratedOutputs,
    runPilotGenericDiff,
  },
}))

import PilotGenericDiffPage from '../PilotGenericDiffPage.vue'

const mappingResponse = {
  ok: true,
  messages: [],
  errors: [],
  pagination: {
    pageIndex: 0,
    pageSize: 50,
    totalCount: 1,
    pageCount: 1,
  },
  mappings: [
    {
      reconciliationMappingId: 'OrderIdMap',
      mappingName: 'Order ID',
      description: 'Order ID field mapping',
      requiresSystemSelection: false,
      defaultFile1SystemEnumId: 'DarSysOms',
      defaultFile2SystemEnumId: 'DarSysShopify',
      systemOptions: [
        { enumId: 'DarSysOms', label: 'OMS' },
        { enumId: 'DarSysShopify', label: 'SHOPIFY' },
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

describe('PilotGenericDiffPage', () => {
  beforeEach(() => {
    route.query = {}
    push.mockClear()
    listPilotMappings.mockReset()
    listPilotGeneratedOutputs.mockReset()
    runPilotGenericDiff.mockReset()
    listPilotMappings.mockResolvedValue(mappingResponse)
    listPilotGeneratedOutputs.mockResolvedValue({
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

  it('loads mappings and keeps the summary hidden before execution', async () => {
    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(listPilotMappings).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 50,
      query: '',
    })
    expect(wrapper.find('.workflow-page').exists()).toBe(true)
    expect(wrapper.find('.wizard-progress-track').exists()).toBe(true)
    expect(wrapper.find('.workflow-shell--center-stage').exists()).toBe(true)
    expect(wrapper.find('.pilot-diff-layout').exists()).toBe(true)
    expect(wrapper.find('.pilot-diff-main').exists()).toBe(true)
    expect(wrapper.find('.workflow-step-shell').exists()).toBe(true)
    expect(wrapper.text()).toContain('Select a Run')
    expect(wrapper.text()).toContain('Next')
    expect(wrapper.find('[data-testid="mapping-select"]').exists()).toBe(true)
    await wrapper.get('[data-testid="mapping-select"]').trigger('click')
    expect(wrapper.get('[data-testid="workflow-select-option"][data-option-value="OrderIdMap"]').text()).toBe('Order ID')
    expect(wrapper.find('[data-testid="file1-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="file2-input"]').exists()).toBe(false)
  })

  it('shows the API error when mapping lookup fails', async () => {
    listPilotMappings.mockRejectedValue(new ApiCallError('Unable to load mappings.', 503))

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load mappings.')
  })

  it('loads the latest saved result card with a static-result link and a separate history link', async () => {
    route.query = {
      mappingId: 'OrderIdMap',
      runName: 'Order ID',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }
    listPilotGeneratedOutputs.mockResolvedValue({
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
          fileName: 'Order-ID-diff-20260330-150000.json',
          sourceFormat: 'json',
          availableFormats: ['json', 'csv'],
          preferredDownloadFormat: 'csv',
          reconciliationMappingId: 'OrderIdMap',
          mappingName: 'Order ID',
          file1Label: 'OMS',
          file2Label: 'SHOPIFY',
          totalDifferences: 4,
          onlyInFile1Count: 1,
          onlyInFile2Count: 3,
          createdDate: '2026-03-30T15:00:00.000Z',
        },
      ],
    })

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(listPilotGeneratedOutputs).toHaveBeenCalledWith({
      reconciliationMappingId: 'OrderIdMap',
      pageIndex: 0,
      pageSize: 1,
      query: '',
    })
    expect(wrapper.find('.pilot-run-history-board').exists()).toBe(true)
    expect(wrapper.get('[data-testid="latest-run-result"]').text()).toContain('Mar')
    expect(wrapper.get('[data-testid="latest-run-result"]').text()).toContain('Total differences')
    expect(JSON.parse(wrapper.get('[data-testid="latest-run-result"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-result',
      params: {
        reconciliationMappingId: 'OrderIdMap',
        outputFileName: 'Order-ID-diff-20260330-150000.json',
      },
      query: {
        runName: 'Order ID',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
    expect(wrapper.text()).not.toContain('Order-ID-diff-20260330-150000.json')
    expect(JSON.parse(wrapper.get('[data-testid="view-all-run-results"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-history',
      params: {
        reconciliationMappingId: 'OrderIdMap',
      },
      query: {
        runName: 'Order ID',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
  })

  it('hides the previous-runs section entirely when the selected run has no saved results', async () => {
    route.query = {
      mappingId: 'OrderIdMap',
      runName: 'Order ID',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(listPilotGeneratedOutputs).toHaveBeenCalledWith({
      reconciliationMappingId: 'OrderIdMap',
      pageIndex: 0,
      pageSize: 1,
      query: '',
    })
    expect(wrapper.find('.pilot-run-history-board').exists()).toBe(false)
    expect(wrapper.find('[data-testid="latest-run-result-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="view-all-run-results"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('No saved results yet for this run.')
    expect(wrapper.text()).not.toContain('View all previous runs')
  })

  it('uses the two-step upload workflow and navigates to the static result page after a successful run', async () => {
    stubFileReader()
    route.query = {
      mappingId: 'OrderIdMap',
      runName: 'Order ID',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }
    runPilotGenericDiff.mockResolvedValue({
      ok: true,
      messages: ['Generated Order-ID-diff-20260331-063304.json.'],
      errors: [],
      runResult: {
        generatedOutput: {
          fileName: 'Order-ID-diff-20260331-063304.json',
          mappingName: 'Order ID',
          totalDifferences: 2,
          onlyInFile1Count: 1,
          onlyInFile2Count: 1,
        },
        validationErrors: [],
        processingWarnings: [],
      },
    })

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the OMS file for Order ID')
    expect(wrapper.find('[data-testid="mapping-select"]').exists()).toBe(false)

    const file1Input = wrapper.get('[data-testid="file1-input"]')
    Object.defineProperty(file1Input.element, 'files', {
      value: [new File(['order_id\n1001\n1002\n'], 'oms-orders.csv', { type: 'text/csv' })],
      configurable: true,
    })
    await file1Input.trigger('change')
    await wrapper.get('.workflow-step-shell').trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the SHOPIFY file for Order ID')

    const file2Input = wrapper.get('[data-testid="file2-input"]')
    Object.defineProperty(file2Input.element, 'files', {
      value: [new File(['order_id\n1002\n1003\n'], 'shopify-orders.csv', { type: 'text/csv' })],
      configurable: true,
    })
    await file2Input.trigger('change')
    expect(wrapper.get('.wizard-next').text()).toBe('Execute')

    await wrapper.get('.workflow-step-shell').trigger('keydown.enter')
    await flushPromises()

    expect(runPilotGenericDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        reconciliationMappingId: 'OrderIdMap',
        file1Name: 'oms-orders.csv',
        file2Name: 'shopify-orders.csv',
        file1SystemEnumId: 'DarSysOms',
        file2SystemEnumId: 'DarSysShopify',
      }),
    )
    expect(push).toHaveBeenCalledWith({
      name: 'reconciliation-run-result',
      params: {
        reconciliationMappingId: 'OrderIdMap',
        outputFileName: 'Order-ID-diff-20260331-063304.json',
      },
      query: {
        runName: 'Order ID',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
  })

  it('allows Enter from the focused file input once a file has been selected', async () => {
    route.query = {
      mappingId: 'OrderIdMap',
      runName: 'Order ID',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    const file1Input = wrapper.get('[data-testid="file1-input"]')
    Object.defineProperty(file1Input.element, 'files', {
      value: [new File(['order_id\n1001\n1002\n'], 'oms-orders.csv', { type: 'text/csv' })],
      configurable: true,
    })
    await file1Input.trigger('change')
    await file1Input.trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the SHOPIFY file for Order ID')
  })

  it('surfaces schema validation feedback when the backend blocks an invalid diff run', async () => {
    stubFileReader()
    route.query = {
      mappingId: 'OrderIdMap',
      runName: 'Order ID',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }
    runPilotGenericDiff.mockRejectedValue(
      new ApiCallError('Schema validation failed. OMS: missing required property order_id', 400, {
        result: {
          ok: false,
          errors: ['Schema validation failed. OMS: missing required property order_id'],
          validationErrors: ['OMS: missing required property order_id'],
          processingWarnings: [],
        },
      }),
    )

    const wrapper = mount(PilotGenericDiffPage)
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
})
