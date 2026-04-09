import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const route = vi.hoisted(() => ({
  params: {
    reconciliationMappingId: 'OrderIdMap',
    outputFileName: 'Order-ID-diff-20260331-063304.json',
  },
  query: {
    runName: 'Order ID',
    file1SystemLabel: 'OMS',
    file2SystemLabel: 'SHOPIFY',
  },
  fullPath:
    '/reconciliation/run-result/OrderIdMap/Order-ID-diff-20260331-063304.json?runName=Order%20ID&file1SystemLabel=OMS&file2SystemLabel=SHOPIFY',
}))
const getPilotGeneratedOutput = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  },
  useRoute: () => route,
}))

vi.mock('../../../lib/api/facade', () => ({
  reconciliationFacade: {
    getPilotGeneratedOutput,
  },
}))

import ReconciliationRunResultPage from '../ReconciliationRunResultPage.vue'

function buildGeneratedOutputFile(contentText: string) {
  return {
    ok: true,
    messages: [],
    errors: [],
    outputFile: {
      fileName: 'Order-ID-diff-20260331-063304.json',
      downloadFileName: 'Order-ID-diff-20260331-063304.json',
      sourceFormat: 'json',
      format: 'json',
      contentType: 'application/json',
      contentText,
    },
  }
}

const defaultDiffDetails = {
  metadata: {
    timestamp: '2026-03-31 08:11:06.134',
    file1Label: 'OMS',
    file2Label: 'SHOPIFY',
    reconciliationMappingId: 'OrderIdMap',
    reconciliationMappingName: 'Order ID',
  },
  summary: {
    totalDifferences: 2,
    onlyInFile1Count: 1,
    onlyInFile2Count: 1,
  },
  differences: [
    {
      type: 'missing_in_SHOPIFY',
      id: '1001',
      presentIn: 'OMS',
      missingIn: 'SHOPIFY',
      data: '{"order_id":"1001"}',
    },
    {
      type: 'missing_in_OMS',
      id: '1003',
      presentIn: 'SHOPIFY',
      missingIn: 'OMS',
      data: '{"order_id":"1003"}',
    },
  ],
}

describe('ReconciliationRunResultPage', () => {
  beforeEach(() => {
    route.params.reconciliationMappingId = 'OrderIdMap'
    route.params.outputFileName = 'Order-ID-diff-20260331-063304.json'
    route.query.runName = 'Order ID'
    route.query.file1SystemLabel = 'OMS'
    route.query.file2SystemLabel = 'SHOPIFY'
    route.fullPath =
      '/reconciliation/run-result/OrderIdMap/Order-ID-diff-20260331-063304.json?runName=Order%20ID&file1SystemLabel=OMS&file2SystemLabel=SHOPIFY'

    getPilotGeneratedOutput.mockReset()
    getPilotGeneratedOutput.mockResolvedValue(buildGeneratedOutputFile(JSON.stringify(defaultDiffDetails)))
  })

  it('loads saved result details on the static surface and links back to history and workflow', async () => {
    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(getPilotGeneratedOutput).toHaveBeenCalledWith({
      fileName: 'Order-ID-diff-20260331-063304.json',
      format: 'json',
    })
    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.find('.wizard-progress-track').exists()).toBe(false)
    expect(wrapper.text()).toContain('Order ID')
    expect(wrapper.text()).not.toContain('Saved result from')
    expect(wrapper.text()).toContain('Missing from OMS')
    expect(wrapper.text()).toContain('Missing from SHOPIFY')
    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('"order_id": "1001"')
    expect(wrapper.get('[data-testid="run-result-download"]').attributes('aria-label')).toBe('Download saved result')
    const tableColumns = wrapper.findAll('.app-table colgroup col')
    expect(tableColumns).toHaveLength(3)
    expect(tableColumns[0]?.attributes('style')).toContain('width: 13rem;')
    expect(tableColumns[2]?.classes()).toContain('app-table__action-column')
    expect(JSON.parse(wrapper.get('[data-testid="run-result-view-history"]').attributes('data-to') ?? '{}')).toEqual({
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
    expect(JSON.parse(wrapper.get('[data-testid="run-result-open-workflow"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-pilot-diff',
      query: {
        mappingId: 'OrderIdMap',
        runName: 'Order ID',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
      state: {
        workflowOriginLabel: 'Run Result',
        workflowOriginPath: route.fullPath,
      },
    })
  })

  it('filters and paginates saved diff details', async () => {
    getPilotGeneratedOutput.mockResolvedValue(
      buildGeneratedOutputFile(
        JSON.stringify({
          metadata: defaultDiffDetails.metadata,
          summary: {
            totalDifferences: 7,
            onlyInFile1Count: 4,
            onlyInFile2Count: 3,
          },
          differences: [
            { type: 'missing_in_OMS', id: '2001', presentIn: 'SHOPIFY', missingIn: 'OMS', data: '{"order_id":"2001"}' },
            { type: 'missing_in_OMS', id: '2002', presentIn: 'SHOPIFY', missingIn: 'OMS', data: '{"order_id":"2002"}' },
            { type: 'missing_in_OMS', id: '2003', presentIn: 'SHOPIFY', missingIn: 'OMS', data: '{"order_id":"2003"}' },
            { type: 'missing_in_SHOPIFY', id: '3001', presentIn: 'OMS', missingIn: 'SHOPIFY', data: '{"order_id":"3001"}' },
            { type: 'missing_in_SHOPIFY', id: '3002', presentIn: 'OMS', missingIn: 'SHOPIFY', data: '{"order_id":"3002"}' },
            { type: 'missing_in_SHOPIFY', id: '3003', presentIn: 'OMS', missingIn: 'SHOPIFY', data: '{"order_id":"3003"}' },
            { type: 'missing_in_SHOPIFY', id: '3004', presentIn: 'OMS', missingIn: 'SHOPIFY', data: '{"order_id":"3004"}' },
          ],
        }),
      ),
    )

    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(5)
    expect(wrapper.text()).toContain('Page 1 of 2')
    expect(wrapper.text()).not.toContain('3004')

    await wrapper.get('[data-testid="diff-page-next"]').trigger('click')

    expect(wrapper.text()).toContain('Page 2 of 2')
    expect(wrapper.text()).toContain('3004')

    await wrapper.get('[data-testid="diff-details-search"]').setValue('2002')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('2002')
    expect(wrapper.text()).toContain('Page 1 of 1')
    expect(wrapper.find('[data-testid="diff-details-search-clear"]').exists()).toBe(true)

    await wrapper.get('[data-testid="diff-details-search-clear"]').trigger('click')
    await flushPromises()

    expect((wrapper.get('[data-testid="diff-details-search"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(5)
    expect(wrapper.text()).toContain('Page 1 of 2')
  })

  it('shows an inline error when the saved result cannot be loaded', async () => {
    getPilotGeneratedOutput.mockRejectedValue(new ApiCallError('Unable to load saved result.', 503))

    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load saved result.')
  })

  it('renders diff details through the shared app table frame instead of a page-local table shell', () => {
    const source = readFileSync('src/pages/reconciliation/ReconciliationRunResultPage.vue', 'utf8')

    expect(source).toContain('.pilot-diff-details__toolbar')
    expect(source).toContain('justify-content: space-between;')
    expect(source).toContain('.pilot-diff-details__pagination')
    expect(source).toContain('justify-content: space-between;')
    expect(source).toContain("import AppTableFrame from '../../components/ui/AppTableFrame.vue'")
    expect(source).toContain('<AppTableFrame')
    expect(source).toContain("label: 'Record ID'")
    expect(source).toContain("label: 'Record JSON'")
    expect(source).not.toContain('class="pilot-diff-table"')
  })
})
