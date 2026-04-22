import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const route = vi.hoisted(() => ({
  current: null as {
    params: { runScopeId: string }
    query: Record<string, string>
    fullPath: string
  } | null,
}))
const listPilotGeneratedOutputs = vi.hoisted(() => vi.fn())

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  route.current = reactive({
    params: {
      runScopeId: 'ProductScope',
    },
    query: {
      runType: 'ruleset',
      ruleSetId: 'ProductCompareRS',
      compareScopeId: 'ProductScope',
      runName: 'Products',
      file1SystemLabel: 'SHOPIFY',
      file2SystemLabel: 'OMS',
    },
    fullPath: '/reconciliation/run-history/ProductScope?runType=ruleset&ruleSetId=ProductCompareRS&compareScopeId=ProductScope',
  }) as {
    params: { runScopeId: string }
    query: Record<string, string>
    fullPath: string
  }

  return {
    RouterLink: {
      props: ['to'],
      template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
    },
    useRoute: () => route.current,
  }
})

vi.mock('../../../lib/api/facade', () => ({
  reconciliationFacade: {
    listPilotGeneratedOutputs,
  },
}))

import ReconciliationRunHistoryPage from '../ReconciliationRunHistoryPage.vue'

enableAutoUnmount(afterEach)

function formatCreatedDateForExpectation(createdDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(createdDate))
}

function buildGeneratedOutput(day: number) {
  const createdDate = `2026-04-${String(day).padStart(2, '0')}T09:00:00.000Z`
  const differenceSeed = 30 - day

  return {
    fileName: `product-diff-202604${String(day).padStart(2, '0')}.json`,
    sourceFormat: 'json',
    availableFormats: ['json', 'csv'],
    preferredDownloadFormat: 'csv',
    runType: 'ruleset',
    runName: 'Products',
    ruleSetId: 'ProductCompareRS',
    compareScopeId: 'ProductScope',
    file1Label: 'SHOPIFY',
    file2Label: 'OMS',
    totalDifferences: differenceSeed + 4,
    onlyInFile1Count: 1,
    onlyInFile2Count: 1,
    ruleDifferenceCount: 2,
    createdDate,
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('ReconciliationRunHistoryPage', () => {
  beforeEach(() => {
    route.current!.params.runScopeId = 'ProductScope'
    route.current!.query.runType = 'ruleset'
    route.current!.query.ruleSetId = 'ProductCompareRS'
    route.current!.query.compareScopeId = 'ProductScope'
    route.current!.query.runName = 'Products'
    route.current!.query.file1SystemLabel = 'SHOPIFY'
    route.current!.query.file2SystemLabel = 'OMS'
    route.current!.fullPath = '/reconciliation/run-history/ProductScope?runType=ruleset&ruleSetId=ProductCompareRS&compareScopeId=ProductScope'

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
        buildGeneratedOutput(22),
        buildGeneratedOutput(21),
        buildGeneratedOutput(20),
        buildGeneratedOutput(19),
        buildGeneratedOutput(18),
        buildGeneratedOutput(17),
      ],
    })
  })

  it('loads compare-scope saved results and preserves ruleset workflow routing', async () => {
    const wrapper = mount(ReconciliationRunHistoryPage)
    await flushPromises()

    expect(listPilotGeneratedOutputs).toHaveBeenCalledWith({
      ruleSetId: 'ProductCompareRS',
      compareScopeId: 'ProductScope',
      pageIndex: 0,
      pageSize: 6,
      query: '',
    })
    expect(wrapper.text()).toContain('Products')
    expect(wrapper.text()).toContain('Field mismatches')
    expect(wrapper.findAll('.static-page-section-heading').map((node) => node.text())).toEqual(['Most Recent', 'Previous Results'])
    expect(wrapper.get('[data-testid="run-history-featured-tile"]').text()).toContain(formatCreatedDateForExpectation('2026-04-22T09:00:00.000Z'))
    expect(JSON.parse(wrapper.get('[data-testid="run-history-featured-tile"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-result',
      params: {
        runScopeId: 'ProductScope',
        outputFileName: 'product-diff-20260422.json',
      },
      query: {
        runType: 'ruleset',
        ruleSetId: 'ProductCompareRS',
        compareScopeId: 'ProductScope',
        runName: 'Products',
        file1SystemLabel: 'SHOPIFY',
        file2SystemLabel: 'OMS',
      },
    })
    expect(JSON.parse(wrapper.get('[data-testid="run-history-open-workflow"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-pilot-diff',
      query: {
        runType: 'ruleset',
        ruleSetId: 'ProductCompareRS',
        compareScopeId: 'ProductScope',
        runName: 'Products',
        file1SystemLabel: 'SHOPIFY',
        file2SystemLabel: 'OMS',
      },
      state: {
        workflowOriginLabel: 'Run History',
        workflowOriginPath: route.current!.fullPath,
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
          buildGeneratedOutput(22),
          buildGeneratedOutput(21),
          buildGeneratedOutput(20),
          buildGeneratedOutput(19),
          buildGeneratedOutput(18),
          buildGeneratedOutput(17),
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
        generatedOutputs: [buildGeneratedOutput(16)],
      })

    const wrapper = mount(ReconciliationRunHistoryPage)
    await flushPromises()

    await wrapper.get('[data-testid="run-history-more"]').trigger('click')
    await flushPromises()

    expect(listPilotGeneratedOutputs).toHaveBeenNthCalledWith(2, {
      ruleSetId: 'ProductCompareRS',
      compareScopeId: 'ProductScope',
      pageIndex: 1,
      pageSize: 6,
      query: '',
    })
    expect(wrapper.findAll('[data-testid="run-history-result-tile"]')).toHaveLength(6)
    expect(wrapper.text()).toContain(formatCreatedDateForExpectation('2026-04-16T09:00:00.000Z'))
    expect(wrapper.find('[data-testid="run-history-more"]').exists()).toBe(false)
  })

  it('shows an inline error when the saved-result lookup fails', async () => {
    listPilotGeneratedOutputs.mockRejectedValue(new ApiCallError('Unable to load saved results.', 503))

    const wrapper = mount(ReconciliationRunHistoryPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load saved results.')
  })

  it('ignores a stale history response after the route switches to a new compare scope', async () => {
    const staleResponse = createDeferred<{
      ok: boolean
      messages: never[]
      errors: never[]
      pagination: { pageIndex: number; pageSize: number; totalCount: number; pageCount: number }
      generatedOutputs: ReturnType<typeof buildGeneratedOutput>[]
    }>()
    const orderResponse = {
      ok: true,
      messages: [],
      errors: [],
      pagination: {
        pageIndex: 0,
        pageSize: 6,
        totalCount: 1,
        pageCount: 1,
      },
      generatedOutputs: [
        {
          ...buildGeneratedOutput(15),
          fileName: 'order-diff-20260415.json',
          runName: 'Orders',
          ruleSetId: 'OrderCompareRS',
          compareScopeId: 'OrderScope',
        },
      ],
    }
    listPilotGeneratedOutputs.mockImplementation((payload: { compareScopeId?: string }) =>
      payload.compareScopeId === 'ProductScope' ? staleResponse.promise : Promise.resolve(orderResponse),
    )

    const wrapper = mount(ReconciliationRunHistoryPage)
    await flushPromises()

    route.current!.params = {
      runScopeId: 'OrderScope',
    }
    route.current!.query = {
      ...route.current!.query,
      ruleSetId: 'OrderCompareRS',
      compareScopeId: 'OrderScope',
      runName: 'Orders',
    }
    route.current!.fullPath = '/reconciliation/run-history/OrderScope?runType=ruleset&ruleSetId=OrderCompareRS&compareScopeId=OrderScope'
    await flushPromises()

    expect(listPilotGeneratedOutputs).toHaveBeenCalledWith({
      ruleSetId: 'OrderCompareRS',
      compareScopeId: 'OrderScope',
      pageIndex: 0,
      pageSize: 6,
      query: '',
    })
    expect(wrapper.text()).toContain('Orders')

    staleResponse.resolve({
        ok: true,
        messages: [],
        errors: [],
        pagination: {
          pageIndex: 0,
          pageSize: 6,
          totalCount: 1,
          pageCount: 1,
        },
        generatedOutputs: [
          buildGeneratedOutput(22),
        ],
      })
    await flushPromises()

    expect(wrapper.text()).toContain('Orders')
    expect(wrapper.text()).not.toContain('Products')
    expect(JSON.parse(wrapper.get('[data-testid="run-history-featured-tile"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-result',
      params: {
        runScopeId: 'OrderScope',
        outputFileName: 'order-diff-20260415.json',
      },
      query: {
        runType: 'ruleset',
        ruleSetId: 'OrderCompareRS',
        compareScopeId: 'OrderScope',
        runName: 'Orders',
        file1SystemLabel: 'SHOPIFY',
        file2SystemLabel: 'OMS',
      },
    })
  })
})
