import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const route = vi.hoisted(() => ({
  current: null as {
    params: { runScopeId: string; outputFileName: string }
    query: Record<string, string>
    fullPath: string
  } | null,
}))
const getPilotGeneratedOutput = vi.hoisted(() => vi.fn())

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  route.current = reactive({
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
    fullPath:
      '/reconciliation/run-result/ProductScope/product-diff-20260422.json?runType=ruleset&ruleSetId=ProductCompareRS&compareScopeId=ProductScope',
  }) as {
    params: { runScopeId: string; outputFileName: string }
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
    getPilotGeneratedOutput,
  },
}))

import ReconciliationRunResultPage from '../ReconciliationRunResultPage.vue'

enableAutoUnmount(afterEach)

function buildGeneratedOutputFile(contentText: string, createdDate = '2026-04-22T08:11:06.134Z') {
  return {
    ok: true,
    messages: [],
    errors: [],
    outputFile: {
      fileName: 'product-diff-20260422.json',
      downloadFileName: 'product-diff-20260422.json',
      sourceFormat: 'json',
      format: 'json',
      contentType: 'application/json',
      createdDate,
      contentText,
    },
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

const defaultDiffDetails = {
  metadata: {
    timestamp: '2026-04-22 08:11:06.134',
    ruleSetId: 'ProductCompareRS',
    ruleSetName: 'Product Compare',
    compareScopeId: 'ProductScope',
    compareScopeDescription: 'Products',
    objectType: 'PRODUCT',
    file1Label: 'SHOPIFY',
    file2Label: 'OMS',
  },
  summary: {
    totalDifferences: 4,
    onlyInFile1Count: 1,
    onlyInFile2Count: 1,
    missingObjectDifferenceCount: 2,
    ruleDifferenceCount: 2,
  },
  differences: [
    {
      diffType: 'MISSING_IN_FILE_1',
      primaryId: 'P500',
      presentIn: 'OMS',
      missingIn: 'SHOPIFY',
      message: 'Present in OMS, missing in SHOPIFY',
      data: '{"productId":"P500"}',
    },
    {
      diffType: 'MISSING_IN_FILE_2',
      primaryId: 'P300',
      presentIn: 'SHOPIFY',
      missingIn: 'OMS',
      message: 'Present in SHOPIFY, missing in OMS',
      data: '{"productId":"P300"}',
    },
    {
      diffType: 'FIELD_MISMATCH',
      primaryId: 'P200',
      field: 'sku',
      file1Value: 'SKU-B',
      file2Value: 'SKU-B-ALT',
      ruleId: 'SKU_MISMATCH',
      severity: 'WARN',
      message: 'SKU mismatch',
    },
    {
      diffType: 'FIELD_MISMATCH',
      primaryId: 'P400',
      field: 'price',
      file1Value: '49.99',
      file2Value: '59.99',
      ruleId: 'PRICE_MISMATCH',
      severity: 'WARN',
      message: 'Price mismatch',
    },
  ],
}

describe('ReconciliationRunResultPage', () => {
  beforeEach(() => {
    route.current!.params.runScopeId = 'ProductScope'
    route.current!.params.outputFileName = 'product-diff-20260422.json'
    route.current!.query.runType = 'ruleset'
    route.current!.query.ruleSetId = 'ProductCompareRS'
    route.current!.query.compareScopeId = 'ProductScope'
    route.current!.query.runName = 'Products'
    route.current!.query.file1SystemLabel = 'SHOPIFY'
    route.current!.query.file2SystemLabel = 'OMS'
    route.current!.fullPath =
      '/reconciliation/run-result/ProductScope/product-diff-20260422.json?runType=ruleset&ruleSetId=ProductCompareRS&compareScopeId=ProductScope'

    getPilotGeneratedOutput.mockReset()
    getPilotGeneratedOutput.mockResolvedValue(buildGeneratedOutputFile(JSON.stringify(defaultDiffDetails)))
  })

  it('loads RuleSet saved result details and links back to history and workflow', async () => {
    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(getPilotGeneratedOutput).toHaveBeenCalledWith({
      fileName: 'product-diff-20260422.json',
      format: 'json',
    })
    expect(wrapper.text()).toContain('Products')
    expect(wrapper.text()).toContain('Field mismatches')
    expect(wrapper.text()).not.toContain('2026-04-22 08:11:06.134')
    expect(wrapper.get('[data-testid="diff-bucket-rule"]').text()).toContain('2')
    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('SKU mismatch')
    expect(wrapper.text()).toContain('"productId": "P500"')
    expect(JSON.parse(wrapper.get('[data-testid="run-result-view-history"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-history',
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
    })
    expect(JSON.parse(wrapper.get('[data-testid="run-result-open-workflow"]').attributes('data-to') ?? '{}')).toEqual({
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
        workflowOriginLabel: 'Run Result',
        workflowOriginPath: route.current!.fullPath,
      },
    })
  })

  it('filters and paginates mixed missing and field mismatch rows', async () => {
    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('Page 1 of 1')

    await wrapper.get('[data-testid="diff-details-search"]').setValue('price')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Price mismatch')

    await wrapper.get('[data-testid="diff-details-search-clear"]').trigger('click')
    await flushPromises()

    expect((wrapper.get('[data-testid="diff-details-search"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(4)
  })

  it('shows an inline error when the saved result cannot be loaded', async () => {
    getPilotGeneratedOutput.mockRejectedValue(new ApiCallError('Unable to load saved result.', 503))

    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load saved result.')
  })

  it('prefers file-backed createdDate over raw saved metadata timestamp', async () => {
    getPilotGeneratedOutput.mockResolvedValue(
      buildGeneratedOutputFile(
        JSON.stringify({
          ...defaultDiffDetails,
          metadata: {
            ...defaultDiffDetails.metadata,
            timestamp: 'legacy timestamp',
          },
        }),
        '2026-04-23T10:15:30.000Z',
      ),
    )

    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(wrapper.text()).not.toContain('legacy timestamp')
    expect(wrapper.text()).not.toContain('Review the saved reconciliation output for this run.')
  })

  it('ignores a stale saved-result response after the route switches outputs', async () => {
    const staleResponse = createDeferred<ReturnType<typeof buildGeneratedOutputFile>>()
    const orderDiffDetails = {
      metadata: {
        timestamp: '2026-04-23 08:11:06.134',
        ruleSetId: 'OrderCompareRS',
        ruleSetName: 'Order Compare',
        compareScopeId: 'OrderScope',
        compareScopeDescription: 'Orders',
        objectType: 'ORDER',
        file1Label: 'SHOPIFY',
        file2Label: 'OMS',
      },
      summary: {
        totalDifferences: 1,
        onlyInFile1Count: 0,
        onlyInFile2Count: 0,
        missingObjectDifferenceCount: 0,
        ruleDifferenceCount: 1,
      },
      differences: [
        {
          diffType: 'FIELD_MISMATCH',
          primaryId: 'O200',
          field: 'status',
          file1Value: 'OPEN',
          file2Value: 'CLOSED',
          ruleId: 'ORDER_STATUS_MISMATCH',
          severity: 'WARN',
          message: 'Order status mismatch',
        },
      ],
    }
    getPilotGeneratedOutput.mockImplementation((payload: { fileName: string }) =>
      payload.fileName === 'product-diff-20260422.json'
        ? staleResponse.promise
        : Promise.resolve(buildGeneratedOutputFile(JSON.stringify(orderDiffDetails))),
    )

    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    route.current!.params = {
      runScopeId: 'OrderScope',
      outputFileName: 'order-diff-20260423.json',
    }
    route.current!.query = {
      ...route.current!.query,
      ruleSetId: 'OrderCompareRS',
      compareScopeId: 'OrderScope',
      runName: 'Orders',
    }
    route.current!.fullPath =
      '/reconciliation/run-result/OrderScope/order-diff-20260423.json?runType=ruleset&ruleSetId=OrderCompareRS&compareScopeId=OrderScope'
    await flushPromises()

    expect(getPilotGeneratedOutput).toHaveBeenCalledWith({
      fileName: 'order-diff-20260423.json',
      format: 'json',
    })
    expect(wrapper.text()).toContain('Orders')

    staleResponse.resolve(buildGeneratedOutputFile(JSON.stringify(defaultDiffDetails)))
    await flushPromises()

    expect(wrapper.text()).toContain('Orders')
    expect(wrapper.text()).toContain('Order status mismatch')
    expect(wrapper.text()).not.toContain('Products')
  })

  it('renders diff details through the shared app table frame instead of a page-local table shell', () => {
    const source = readFileSync('src/pages/reconciliation/ReconciliationRunResultPage.vue', 'utf8')

    expect(source).toContain('.pilot-diff-details__toolbar')
    expect(source).toContain('justify-content: space-between;')
    expect(source).toContain('.pilot-diff-details__pagination')
    expect(source).toContain("import AppTableFrame from '../../components/ui/AppTableFrame.vue'")
    expect(source).toContain('<AppTableFrame')
    expect(source).toContain("label: 'Record ID'")
    expect(source).toContain("label: 'Difference'")
    expect(source).toContain("label: 'Details'")
    expect(source).not.toContain('class="pilot-diff-table"')
  })
})
