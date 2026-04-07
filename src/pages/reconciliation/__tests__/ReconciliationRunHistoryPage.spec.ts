import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const route = vi.hoisted(() => ({
  params: {
    reconciliationMappingId: 'OrderIdMap',
  },
  query: {
    runName: 'Order ID',
    file1SystemLabel: 'OMS',
    file2SystemLabel: 'SHOPIFY',
  },
  fullPath: '/reconciliation/run-history/OrderIdMap?runName=Order%20ID&file1SystemLabel=OMS&file2SystemLabel=SHOPIFY',
}))
const listPilotGeneratedOutputs = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  },
  useRoute: () => route,
}))

vi.mock('../../../lib/api/facade', () => ({
  reconciliationFacade: {
    listPilotGeneratedOutputs,
  },
}))

import ReconciliationRunHistoryPage from '../ReconciliationRunHistoryPage.vue'

function formatCreatedDateForExpectation(createdDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(createdDate))
}

function buildGeneratedOutput(day: number) {
  const createdDate = `2026-03-${String(day).padStart(2, '0')}T09:00:00.000Z`
  const differenceSeed = 32 - day

  return {
    fileName: `Order-ID-diff-202603${String(day).padStart(2, '0')}-090000.json`,
    sourceFormat: 'json',
    availableFormats: ['json', 'csv'],
    preferredDownloadFormat: 'csv',
    reconciliationMappingId: 'OrderIdMap',
    mappingName: 'Order ID',
    file1Label: 'OMS',
    file2Label: 'SHOPIFY',
    totalDifferences: differenceSeed + 2,
    onlyInFile1Count: differenceSeed,
    onlyInFile2Count: differenceSeed + 1,
    createdDate,
  }
}

describe('ReconciliationRunHistoryPage', () => {
  beforeEach(() => {
    route.params.reconciliationMappingId = 'OrderIdMap'
    route.query.runName = 'Order ID'
    route.query.file1SystemLabel = 'OMS'
    route.query.file2SystemLabel = 'SHOPIFY'
    route.fullPath = '/reconciliation/run-history/OrderIdMap?runName=Order%20ID&file1SystemLabel=OMS&file2SystemLabel=SHOPIFY'

    listPilotGeneratedOutputs.mockReset()
    listPilotGeneratedOutputs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: {
        pageIndex: 0,
        pageSize: 6,
        totalCount: 7,
        pageCount: 2,
      },
      generatedOutputs: [
        buildGeneratedOutput(31),
        buildGeneratedOutput(30),
        buildGeneratedOutput(29),
        buildGeneratedOutput(28),
        buildGeneratedOutput(27),
        buildGeneratedOutput(26),
      ],
    })
  })

  it('loads mapping-scoped saved results and features the most recent output above the previous results list', async () => {
    const wrapper = mount(ReconciliationRunHistoryPage)
    await flushPromises()

    expect(listPilotGeneratedOutputs).toHaveBeenCalledWith({
      reconciliationMappingId: 'OrderIdMap',
      pageIndex: 0,
      pageSize: 6,
      query: '',
    })
    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.text()).toContain('Order ID')
    expect(wrapper.text()).not.toContain('Review the saved reconciliation outputs for this selected run.')
    expect(wrapper.text()).not.toContain('Saved outputs are listed newest first and filtered to this reconciliation run only.')
    expect(wrapper.findAll('.static-page-section-heading').map((node) => node.text())).toEqual(['Most Recent', 'Previous Results'])
    expect(wrapper.get('[data-testid="run-history-featured-tile"]').text()).toContain(formatCreatedDateForExpectation('2026-03-31T09:00:00.000Z'))
    expect(wrapper.findAll('[data-testid="run-history-result-tile"]')).toHaveLength(5)
    expect(wrapper.text()).not.toContain('Order-ID-diff-20260331-090000.json')
    expect(wrapper.text()).not.toContain('Order-ID-diff-20260330-090000.json')
    expect(wrapper.findAll('.static-page-tile-title').map((node) => node.text())).toEqual([
      formatCreatedDateForExpectation('2026-03-31T09:00:00.000Z'),
      formatCreatedDateForExpectation('2026-03-30T09:00:00.000Z'),
      formatCreatedDateForExpectation('2026-03-29T09:00:00.000Z'),
      formatCreatedDateForExpectation('2026-03-28T09:00:00.000Z'),
      formatCreatedDateForExpectation('2026-03-27T09:00:00.000Z'),
      formatCreatedDateForExpectation('2026-03-26T09:00:00.000Z'),
    ])
    expect(wrapper.get('[data-testid="run-history-more"]').text()).toContain('More...')
    expect(JSON.parse(wrapper.get('[data-testid="run-history-featured-tile"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-result',
      params: {
        reconciliationMappingId: 'OrderIdMap',
        outputFileName: 'Order-ID-diff-20260331-090000.json',
      },
      query: {
        runName: 'Order ID',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
    expect(JSON.parse(wrapper.findAll('[data-testid="run-history-result-tile"]')[0]!.attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-result',
      params: {
        reconciliationMappingId: 'OrderIdMap',
        outputFileName: 'Order-ID-diff-20260330-090000.json',
      },
      query: {
        runName: 'Order ID',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
    expect(JSON.parse(wrapper.get('[data-testid="run-history-open-workflow"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-pilot-diff',
      query: {
        mappingId: 'OrderIdMap',
        runName: 'Order ID',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
      state: {
        workflowOriginLabel: 'Run History',
        workflowOriginPath: route.fullPath,
      },
    })
  })

  it('reveals more previous results in five-at-a-time batches', async () => {
    listPilotGeneratedOutputs
      .mockResolvedValueOnce({
        ok: true,
        messages: [],
        errors: [],
        pagination: {
          pageIndex: 0,
          pageSize: 6,
          totalCount: 7,
          pageCount: 2,
        },
        generatedOutputs: [
          buildGeneratedOutput(31),
          buildGeneratedOutput(30),
          buildGeneratedOutput(29),
          buildGeneratedOutput(28),
          buildGeneratedOutput(27),
          buildGeneratedOutput(26),
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        messages: [],
        errors: [],
        pagination: {
          pageIndex: 1,
          pageSize: 6,
          totalCount: 7,
          pageCount: 2,
        },
        generatedOutputs: [buildGeneratedOutput(25)],
      })

    const wrapper = mount(ReconciliationRunHistoryPage)
    await flushPromises()

    await wrapper.get('[data-testid="run-history-more"]').trigger('click')
    await flushPromises()

    expect(listPilotGeneratedOutputs).toHaveBeenNthCalledWith(2, {
      reconciliationMappingId: 'OrderIdMap',
      pageIndex: 1,
      pageSize: 6,
      query: '',
    })
    expect(wrapper.findAll('[data-testid="run-history-result-tile"]')).toHaveLength(6)
    expect(wrapper.text()).toContain(formatCreatedDateForExpectation('2026-03-25T09:00:00.000Z'))
    expect(wrapper.find('[data-testid="run-history-more"]').exists()).toBe(false)
  })

  it('shows an inline error when the saved-result lookup fails', async () => {
    listPilotGeneratedOutputs.mockRejectedValue(new ApiCallError('Unable to load saved results.', 503))

    const wrapper = mount(ReconciliationRunHistoryPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load saved results.')
  })
})
