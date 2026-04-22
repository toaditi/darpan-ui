import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const route = vi.hoisted(() => ({
  current: null as { query: Record<string, unknown> } | null,
}))
const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const listPilotMappings = vi.hoisted(() => vi.fn())
const listPilotRuleSetCompareScopes = vi.hoisted(() => vi.fn())
const listPilotGeneratedOutputs = vi.hoisted(() => vi.fn())
const runPilotGenericDiff = vi.hoisted(() => vi.fn())

vi.mock('vue-router', async () => {
  const { reactive } = await import('vue')
  route.current = reactive({
    query: {},
  }) as { query: Record<string, unknown> }

  return {
    RouterLink: {
      props: ['to'],
      template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
    },
    useRoute: () => route.current,
    useRouter: () => ({
      push,
    }),
  }
})

vi.mock('../../../lib/api/facade', () => ({
  reconciliationFacade: {
    listPilotMappings,
    listPilotRuleSetCompareScopes,
    listPilotGeneratedOutputs,
    runPilotGenericDiff,
  },
}))

import PilotGenericDiffPage from '../PilotGenericDiffPage.vue'

enableAutoUnmount(afterEach)

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

const compareScopeResponse = {
  ok: true,
  messages: [],
  errors: [],
  pagination: {
    pageIndex: 0,
    pageSize: 100,
    totalCount: 2,
    pageCount: 1,
  },
  compareScopes: [
    {
      ruleSetId: 'ProductCompareRS',
      ruleSetName: 'Product Compare',
      compareScopeId: 'ProductScope',
      compareScopeDescription: 'Products',
      objectType: 'PRODUCT',
      file1SystemEnumId: 'SHOPIFY',
      file1SystemLabel: 'SHOPIFY',
      file1PrimaryIdExpression: 'productId',
      file2SystemEnumId: 'OMS',
      file2SystemLabel: 'OMS',
      file2PrimaryIdExpression: 'productId',
    },
    {
      ruleSetId: 'OrderCompareRS',
      ruleSetName: 'Order Compare',
      compareScopeId: 'OrderScope',
      compareScopeDescription: 'Orders',
      objectType: 'ORDER',
      file1SystemEnumId: 'SHOPIFY',
      file1SystemLabel: 'SHOPIFY',
      file1PrimaryIdExpression: 'orderId',
      file2SystemEnumId: 'OMS',
      file2SystemLabel: 'OMS',
      file2PrimaryIdExpression: 'orderId',
    },
  ],
}

function stubFileReader(): void {
  class MockFileReader {
    result: string | ArrayBuffer | null = null
    onload: null | (() => void) = null
    onerror: null | (() => void) = null

    readAsText(file: File): void {
      this.result = file.name === 'products-1.json' ? '{"data":{"products":[]}}' : '{"data":{"products":[]}}'
      this.onload?.()
    }
  }

  vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader)
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

describe('PilotGenericDiffPage', () => {
  beforeEach(() => {
    route.current!.query = {}
    push.mockClear()
    listPilotMappings.mockReset()
    listPilotRuleSetCompareScopes.mockReset()
    listPilotGeneratedOutputs.mockReset()
    runPilotGenericDiff.mockReset()
    listPilotMappings.mockResolvedValue(mappingResponse)
    listPilotRuleSetCompareScopes.mockResolvedValue(compareScopeResponse)
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

  it('loads RuleSet compare scopes by default and starts on the RuleSet selector', async () => {
    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(listPilotRuleSetCompareScopes).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 100,
      query: '',
    })
    expect(listPilotMappings).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Select a RuleSet')
    expect(wrapper.find('[data-testid="rule-set-select"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="mapping-select"]').exists()).toBe(false)
  })

  it('shows the API error when RuleSet lookup fails', async () => {
    listPilotRuleSetCompareScopes.mockRejectedValue(new ApiCallError('Unable to load RuleSets.', 503))

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load RuleSets.')
  })

  it('loads the latest saved result card for a preselected compare scope', async () => {
    route.current!.query = {
      runType: 'ruleset',
      ruleSetId: 'ProductCompareRS',
      compareScopeId: 'ProductScope',
      runName: 'Products',
      file1SystemLabel: 'SHOPIFY',
      file2SystemLabel: 'OMS',
    }
    listPilotGeneratedOutputs.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      pagination: {
        pageIndex: 0,
        pageSize: 1,
        totalCount: 1,
        pageCount: 1,
      },
      generatedOutputs: [
        {
          fileName: 'product-diff-20260422.json',
          sourceFormat: 'json',
          availableFormats: ['json', 'csv'],
          preferredDownloadFormat: 'csv',
          runType: 'ruleset',
          runName: 'Products',
          ruleSetId: 'ProductCompareRS',
          compareScopeId: 'ProductScope',
          file1Label: 'SHOPIFY',
          file2Label: 'OMS',
          totalDifferences: 4,
          onlyInFile1Count: 1,
          onlyInFile2Count: 1,
          ruleDifferenceCount: 2,
          createdDate: '2026-04-22T10:00:00.000Z',
        },
      ],
    })

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(listPilotGeneratedOutputs).toHaveBeenCalledWith({
      ruleSetId: 'ProductCompareRS',
      compareScopeId: 'ProductScope',
      pageIndex: 0,
      pageSize: 1,
      query: '',
    })
    expect(wrapper.text()).toContain('Field mismatches')
    expect(JSON.parse(wrapper.get('[data-testid="latest-run-result"]').attributes('data-to') ?? '{}')).toEqual({
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
        objectType: 'PRODUCT',
        file1SystemLabel: 'SHOPIFY',
        file2SystemLabel: 'OMS',
      },
    })
  })

  it('runs a preselected RuleSet compare scope and navigates to the saved result page', async () => {
    stubFileReader()
    route.current!.query = {
      runType: 'ruleset',
      ruleSetId: 'ProductCompareRS',
      compareScopeId: 'ProductScope',
      runName: 'Products',
      file1SystemLabel: 'SHOPIFY',
      file2SystemLabel: 'OMS',
    }
    runPilotGenericDiff.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      runResult: {
        runType: 'ruleset',
        ruleSetId: 'ProductCompareRS',
        compareScopeId: 'ProductScope',
        generatedOutput: {
          fileName: 'product-diff-20260422.json',
          runType: 'ruleset',
          ruleSetId: 'ProductCompareRS',
          compareScopeId: 'ProductScope',
          totalDifferences: 4,
        },
        validationErrors: [],
        processingWarnings: [],
      },
    })

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the SHOPIFY file')
    const file1Input = wrapper.get<HTMLInputElement>('[data-testid="file1-input"]')
    Object.defineProperty(file1Input.element, 'files', {
      value: [new File(['{}'], 'products-1.json', { type: 'application/json' })],
    })
    await file1Input.trigger('change')
    await flushPromises()
    await wrapper.get('[data-testid="pilot-step-primary"]').trigger('submit')
    await flushPromises()
    const file2Input = wrapper.get<HTMLInputElement>('[data-testid="file2-input"]')
    Object.defineProperty(file2Input.element, 'files', {
      value: [new File(['{}'], 'products-2.json', { type: 'application/json' })],
    })
    await file2Input.trigger('change')
    await flushPromises()
    await wrapper.get('[data-testid="pilot-step-primary"]').trigger('submit')
    await flushPromises()

    expect(runPilotGenericDiff).toHaveBeenCalledWith({
      ruleSetId: 'ProductCompareRS',
      compareScopeId: 'ProductScope',
      file1Name: 'products-1.json',
      file1Text: '{"data":{"products":[]}}',
      file2Name: 'products-2.json',
      file2Text: '{"data":{"products":[]}}',
      hasHeader: true,
    })
    expect(push).toHaveBeenCalledWith({
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
        objectType: 'PRODUCT',
        file1SystemLabel: 'SHOPIFY',
        file2SystemLabel: 'OMS',
      },
    })
  })

  it('ignores a stale run-options response after the route switches modes', async () => {
    const mappingResponseDeferred = createDeferred<typeof mappingResponse>()
    listPilotMappings.mockReturnValueOnce(mappingResponseDeferred.promise)
    route.current!.query = {
      runType: 'mapping',
      mappingId: 'OrderIdMap',
      runName: 'Order ID',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    route.current!.query = {
      runType: 'ruleset',
      ruleSetId: 'ProductCompareRS',
      compareScopeId: 'ProductScope',
      runName: 'Products',
      file1SystemLabel: 'SHOPIFY',
      file2SystemLabel: 'OMS',
    }
    await flushPromises()

    expect(listPilotRuleSetCompareScopes).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 100,
      query: '',
    })
    expect(wrapper.text()).toContain('Upload the SHOPIFY file')
    expect(wrapper.find('[data-testid="mapping-select"]').exists()).toBe(false)

    mappingResponseDeferred.resolve(mappingResponse)
    await flushPromises()

    expect(wrapper.text()).toContain('Upload the SHOPIFY file')
    expect(wrapper.find('[data-testid="mapping-select"]').exists()).toBe(false)
  })

  it('keeps the legacy mapping launch path working when the route asks for mapping mode', async () => {
    route.current!.query = {
      runType: 'mapping',
      mappingId: 'OrderIdMap',
      runName: 'Order ID',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    }

    const wrapper = mount(PilotGenericDiffPage)
    await flushPromises()

    expect(listPilotMappings).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 50,
      query: '',
    })
    expect(wrapper.text()).toContain('Upload the OMS file')
    expect(wrapper.find('[data-testid="mapping-select"]').exists()).toBe(false)
  })
})
