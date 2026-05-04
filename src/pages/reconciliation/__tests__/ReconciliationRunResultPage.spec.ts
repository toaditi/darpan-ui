import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const route = vi.hoisted(() => ({
  params: {
    savedRunId: 'RS_ORDER_CSV',
    outputFileName: 'CSV-Order-Compare-diff-20260331-063304.json',
  },
  query: {
    runName: 'CSV Order Compare',
    file1SystemLabel: 'OMS',
    file2SystemLabel: 'SHOPIFY',
  },
  fullPath:
    '/reconciliation/run-result/RS_ORDER_CSV/CSV-Order-Compare-diff-20260331-063304.json?runName=CSV%20Order%20Compare&file1SystemLabel=OMS&file2SystemLabel=SHOPIFY',
}))
const getGeneratedOutput = vi.hoisted(() => vi.fn())
const saveSavedRunName = vi.hoisted(() => vi.fn())
const authState = vi.hoisted(() => ({
  sessionInfo: {
    userId: 'editor',
    canRunActiveTenantReconciliation: true,
    canEditActiveTenantData: true,
    isSuperAdmin: false,
  },
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  },
  useRoute: () => route,
}))

vi.mock('../../../lib/api/facade', () => ({
  reconciliationFacade: {
    getGeneratedOutput,
    saveSavedRunName,
  },
}))

vi.mock('../../../lib/auth', () => ({
  useUiPermissions: () => ({
    get canRunActiveTenantReconciliation() {
      return authState.sessionInfo.canRunActiveTenantReconciliation === true ||
        authState.sessionInfo.canEditActiveTenantData === true ||
        authState.sessionInfo.isSuperAdmin === true
    },
    get canEditTenantSettings() {
      return authState.sessionInfo.canEditActiveTenantData === true || authState.sessionInfo.isSuperAdmin === true
    },
    get canManageGlobalSettings() {
      return authState.sessionInfo.isSuperAdmin === true
    },
    get canViewTenantSettings() {
      return Boolean(authState.sessionInfo.userId)
    },
  }),
}))

import ReconciliationRunResultPage from '../ReconciliationRunResultPage.vue'

function buildGeneratedOutputFile(contentText: string, outputFileOverrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    messages: [],
    errors: [],
    outputFile: {
      fileName: 'CSV-Order-Compare-diff-20260331-063304.json',
      downloadFileName: 'CSV-Order-Compare-diff-20260331-063304.json',
      sourceFormat: 'json',
      format: 'json',
      contentType: 'application/json',
      contentText,
      ...outputFileOverrides,
    },
  }
}

const defaultDiffDetails = {
  metadata: {
    timestamp: '2026-03-31 08:11:06.134',
    file1Label: 'OMS',
    file2Label: 'SHOPIFY',
    savedRunId: 'RS_ORDER_CSV',
    savedRunName: 'CSV Order Compare',
    savedRunType: 'ruleset',
    ruleSetId: 'RS_ORDER_CSV',
    compareScopeId: 'CS_ORDER_CSV',
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
    authState.sessionInfo = {
      userId: 'editor',
      canRunActiveTenantReconciliation: true,
      canEditActiveTenantData: true,
      isSuperAdmin: false,
    }
    route.params.savedRunId = 'RS_ORDER_CSV'
    route.params.outputFileName = 'CSV-Order-Compare-diff-20260331-063304.json'
    route.query.runName = 'CSV Order Compare'
    route.query.file1SystemLabel = 'OMS'
    route.query.file2SystemLabel = 'SHOPIFY'
    route.fullPath =
      '/reconciliation/run-result/RS_ORDER_CSV/CSV-Order-Compare-diff-20260331-063304.json?runName=CSV%20Order%20Compare&file1SystemLabel=OMS&file2SystemLabel=SHOPIFY'

    getGeneratedOutput.mockReset()
    getGeneratedOutput.mockResolvedValue(buildGeneratedOutputFile(JSON.stringify(defaultDiffDetails), {
      sourceDetails: {
        mode: 'FILES',
        files: [
          {
            side: 'file1',
            label: 'OMS',
            fileName: 'orders-1.csv',
            filePath: 'reconciliation-runs/RS_ORDER_CSV/20260331-081106134/RS_ORDER_CSV_file1_orders-1.csv',
            downloadFileName: 'orders-1.csv',
            sourceFormat: 'csv',
            canDownload: true,
          },
          {
            side: 'file2',
            label: 'SHOPIFY',
            fileName: 'orders-2.csv',
            filePath: 'reconciliation-runs/RS_ORDER_CSV/20260331-081106134/RS_ORDER_CSV_file2_orders-2.csv',
            downloadFileName: 'orders-2.csv',
            sourceFormat: 'csv',
            canDownload: true,
          },
        ],
      },
    }))
    saveSavedRunName.mockReset()
    saveSavedRunName.mockResolvedValue({
      ok: true,
      messages: ['Saved run CSV Order Compare Revised.'],
      errors: [],
      savedRun: {
        savedRunId: 'RS_ORDER_CSV',
        runName: 'CSV Order Compare Revised',
        runType: 'ruleset',
        requiresSystemSelection: false,
        systemOptions: [],
      },
    })
  })

  it('loads saved result details on the static surface and links back to history and workflow', async () => {
    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(getGeneratedOutput).toHaveBeenCalledWith({
      fileName: 'CSV-Order-Compare-diff-20260331-063304.json',
      format: 'json',
    })
    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.find('.wizard-progress-track').exists()).toBe(false)
    expect(wrapper.text()).toContain('CSV Order Compare')
    const editableTitle = wrapper.get('[data-testid="run-result-title"]')
    expect(editableTitle.element.tagName).toBe('H1')
    expect(editableTitle.attributes('contenteditable')).toBe('plaintext-only')
    expect(editableTitle.attributes('aria-label')).toBe('Run name')
    expect(editableTitle.classes()).toContain('static-page-inline-edit-title')
    const sourceDetails = wrapper.get('[data-testid="run-result-source-details"]')
    expect(sourceDetails.text()).toContain('Source files')
    expect(sourceDetails.text()).toContain('OMS')
    expect(sourceDetails.text()).toContain('orders-1.csv')
    expect(sourceDetails.text()).toContain('SHOPIFY')
    expect(sourceDetails.text()).toContain('orders-2.csv')
    expect(sourceDetails.findAll('[data-testid="run-result-source-download"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Missing from OMS')
    expect(wrapper.text()).toContain('Missing from SHOPIFY')
    expect(wrapper.find('[data-testid="diff-bucket-rule"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Rule differences')
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
        savedRunId: 'RS_ORDER_CSV',
      },
      query: {
        runName: 'CSV Order Compare',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
    expect(wrapper.find('.static-page-board [data-testid="run-result-open-workflow"]').exists()).toBe(false)
    const openWorkflowAction = wrapper.get('.static-page-actions [data-testid="run-result-open-workflow"]')
    expect(openWorkflowAction.classes()).toContain('app-icon-action')
    expect(openWorkflowAction.classes()).toContain('app-icon-action--large')
    expect(openWorkflowAction.attributes('aria-label')).toBe('Open run')
    expect(openWorkflowAction.find('svg').exists()).toBe(true)
    expect(openWorkflowAction.text()).not.toContain('Open Run')
    expect(JSON.parse(openWorkflowAction.attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-diff',
      query: {
        savedRunId: 'RS_ORDER_CSV',
        runName: 'CSV Order Compare',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
      state: {
        workflowOriginLabel: 'Run Result',
        workflowOriginPath: route.fullPath,
      },
    })

    editableTitle.element.textContent = 'CSV Order Compare Revised'
    await editableTitle.trigger('input')
    await editableTitle.trigger('blur')
    await flushPromises()

    expect(saveSavedRunName).toHaveBeenCalledWith({
      savedRunId: 'RS_ORDER_CSV',
      runName: 'CSV Order Compare Revised',
    })
  })

  it('renders API date range source details and downloads compared source files', async () => {
    const createObjectUrl = vi.fn(() => 'blob:source')
    const revokeObjectUrl = vi.fn()
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.stubGlobal(
      'URL',
      {
        createObjectURL: createObjectUrl,
        revokeObjectURL: revokeObjectUrl,
      } as unknown as typeof URL,
    )
    getGeneratedOutput.mockResolvedValueOnce(buildGeneratedOutputFile(JSON.stringify(defaultDiffDetails), {
      sourceDetails: {
        mode: 'API',
        dateRange: {
          start: '2026-05-01T04:00:00Z',
          end: '2026-05-02T04:00:00Z',
        },
        files: [
          {
            side: 'file1',
            label: 'HotWax',
            fileName: 'HotWax-orders-api.json',
            filePath: 'reconciliation-runs/RS_API_ORDER_SYNC/20260502-054559147/RS_API_ORDER_SYNC_file1_HotWax-orders-api.json',
            downloadFileName: 'HotWax-orders-api.json',
            sourceFormat: 'json',
            canDownload: true,
          },
          {
            side: 'file2',
            label: 'SHOPIFY',
            fileName: 'SHOPIFY-orders-api.json',
            filePath: 'reconciliation-runs/RS_API_ORDER_SYNC/20260502-054559147/RS_API_ORDER_SYNC_file2_SHOPIFY-orders-api.json',
            downloadFileName: 'SHOPIFY-orders-api.json',
            sourceFormat: 'json',
            canDownload: true,
          },
        ],
      },
    }))
    getGeneratedOutput.mockResolvedValueOnce(buildGeneratedOutputFile('{"orders":[]}', {
      fileName: 'reconciliation-runs/RS_API_ORDER_SYNC/20260502-054559147/RS_API_ORDER_SYNC_file1_HotWax-orders-api.json',
      downloadFileName: 'HotWax-orders-api.json',
      sourceFormat: 'json',
      format: 'json',
    }))

    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    const sourceDetails = wrapper.get('[data-testid="run-result-source-details"]')
    expect(sourceDetails.text()).toContain('API date range')
    expect(sourceDetails.text()).toContain('May 1, 2026 to May 2, 2026')
    expect(sourceDetails.text()).toContain('Files compared')
    expect(sourceDetails.text()).toContain('HotWax')
    expect(sourceDetails.text()).toContain('HotWax-orders-api.json')
    expect(sourceDetails.text()).toContain('SHOPIFY-orders-api.json')

    await sourceDetails.findAll('[data-testid="run-result-source-download"]')[0]!.trigger('click')
    await flushPromises()

    expect(getGeneratedOutput).toHaveBeenLastCalledWith({
      fileName: 'reconciliation-runs/RS_API_ORDER_SYNC/20260502-054559147/RS_API_ORDER_SYNC_file1_HotWax-orders-api.json',
      format: 'json',
    })
    expect(createObjectUrl).toHaveBeenCalledTimes(1)
    expect(anchorClick).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:source')
  })

  it('filters and paginates saved diff details', async () => {
    getGeneratedOutput.mockResolvedValue(
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

  it('renders rule difference rows with primary ids and diff metadata instead of empty JSON objects', async () => {
    getGeneratedOutput.mockResolvedValue(
      buildGeneratedOutputFile(
        JSON.stringify({
          metadata: defaultDiffDetails.metadata,
          summary: {
            totalDifferences: 3,
            onlyInFile1Count: 1,
            onlyInFile2Count: 1,
            missingObjectDifferenceCount: 2,
            ruleDifferenceCount: 1,
          },
          differences: [
            defaultDiffDetails.differences[0],
            defaultDiffDetails.differences[1],
            {
              diffType: 'FIELD_MISMATCH',
              primaryId: '6678202450051',
              field: 'grand_total = total_amount',
              file1Value: '89.89',
              file2Value: '90.32',
              ruleId: 'FIELD_COMPARISON_1',
              severity: 'WARN',
              message: 'Field comparison failed: grand_total = total_amount',
            },
          ],
        }),
      ),
    )

    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Rule differences')
    expect(wrapper.text()).toContain('6678202450051')
    expect(wrapper.text()).toContain('"diffType": "FIELD_MISMATCH"')
    expect(wrapper.text()).toContain('"field": "grand_total = total_amount"')
    expect(wrapper.text()).toContain('"file1Value": "89.89"')
    expect(wrapper.text()).toContain('"file2Value": "90.32"')
    expect(wrapper.text()).not.toContain('row-3')
    expect(wrapper.text()).not.toContain('{}')
  })

  it('shows a collapsible rule selector that filters result rows by rule', async () => {
    getGeneratedOutput.mockResolvedValue(
      buildGeneratedOutputFile(
        JSON.stringify({
          metadata: defaultDiffDetails.metadata,
          summary: {
            totalDifferences: 4,
            onlyInFile1Count: 1,
            onlyInFile2Count: 1,
            missingObjectDifferenceCount: 2,
            ruleDifferenceCount: 2,
          },
          differences: [
            defaultDiffDetails.differences[0],
            defaultDiffDetails.differences[1],
            {
              diffType: 'FIELD_MISMATCH',
              primaryId: '1002',
              field: 'OMS order id = Shopify order id',
              file1Value: '1002',
              file2Value: 'gid://shopify/Order/1002',
              ruleId: 'ORDER_ID_MATCH',
              severity: 'WARN',
            },
            {
              diffType: 'FIELD_MISMATCH',
              primaryId: '1004',
              field: 'Payment total = Shopify total',
              file1Value: '40.00',
              file2Value: '42.00',
              ruleId: 'PAYMENT_TOTAL_MATCH',
              severity: 'WARN',
            },
          ],
        }),
      ),
    )

    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    const selector = wrapper.get('[data-testid="run-result-rule-selector"]')
    expect(selector.element.closest('.static-page-section')).toBeNull()
    expect(selector.element.closest('.static-page-frame')).toBeNull()
    expect(wrapper.get('[data-testid="run-result-rule-selector-toggle"]').text()).toBe('')
    expect(wrapper.find('[data-testid="run-result-rule-list"]').exists()).toBe(true)
    expect(selector.text()).not.toContain('Rule Selector')
    expect(selector.text()).toContain('Rule 0')
    expect(selector.text()).toContain('Base comparison')
    expect(selector.text()).toContain('Rule 1')
    expect(selector.text()).toContain('OMS order id = Shopify order id')
    expect(selector.text()).toContain('Rule 2')
    expect(selector.text()).toContain('Payment total = Shopify total')
    expect(wrapper.find('[data-testid="diff-bucket-file-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="diff-bucket-file-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="diff-bucket-rule"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(4)

    await selector.get('[data-rule-filter-key="order_id_match"]').trigger('click')

    const selectedRuleTotal = wrapper.get('[data-testid="diff-bucket-total-results"]')
    expect(selectedRuleTotal.element.tagName).toBe('DIV')
    expect(selectedRuleTotal.text()).toContain('Total results')
    expect(selectedRuleTotal.text()).toContain('1')
    expect(wrapper.find('[data-testid="diff-bucket-file-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="diff-bucket-file-2"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="diff-bucket-rule"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('1002')
    expect(wrapper.text()).not.toContain('1004')
    expect(wrapper.text()).not.toContain('"order_id": "1001"')
    expect(selector.get('[data-rule-filter-key="order_id_match"]').attributes('aria-pressed')).toBe('true')

    await selector.get('[data-rule-filter-key="base-diff"]').trigger('click')

    expect(wrapper.find('[data-testid="diff-bucket-total-results"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="diff-bucket-file-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="diff-bucket-file-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="diff-bucket-rule"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('"order_id": "1001"')
    expect(wrapper.text()).not.toContain('1002')

    await selector.get('[data-rule-filter-key="all"]').trigger('click')

    expect(wrapper.findAll('[data-testid="diff-details-row"]')).toHaveLength(4)

    await wrapper.get('[data-testid="run-result-rule-selector-toggle"]').trigger('click')

    expect(wrapper.get('[data-testid="run-result-rule-selector"]').classes()).toContain('run-result-rule-selector--collapsed')
    expect(wrapper.get('[data-testid="run-result-rule-selector-toggle"]').text()).toBe('')
    expect(wrapper.find('[data-testid="run-result-rule-list"]').exists()).toBe(false)
    expect(wrapper.find('[data-rule-filter-key="order_id_match"]').exists()).toBe(false)
  })

  it('shows an inline error when the saved result cannot be loaded', async () => {
    getGeneratedOutput.mockRejectedValue(new ApiCallError('Unable to load saved result.', 503))

    const wrapper = mount(ReconciliationRunResultPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load saved result.')
  })

  it('renders diff details through the shared app table frame instead of a page-local table shell', () => {
    const source = readFileSync('src/pages/reconciliation/ReconciliationRunResultPage.vue', 'utf8')

    expect(source).toContain('.reconciliation-diff-details__toolbar')
    expect(source).toContain('justify-content: space-between;')
    expect(source).toMatch(/\.reconciliation-diff-details__search \{[^}]*width: 100%;[^}]*\}/)
    expect(source).toContain('.reconciliation-diff-details__pagination')
    expect(source).toContain('justify-content: space-between;')
    expect(source).toContain("import AppTableFrame from '../../components/ui/AppTableFrame.vue'")
    expect(source).toContain('<AppTableFrame')
    expect(source).toContain("label: 'Record ID'")
    expect(source).toContain("label: 'Diff Detail'")
    expect(source).toContain('run-result-rule-selector__panel')
    expect(source).toContain('run-result-rule-selector__option-count')
    expect(source).toContain('diff-bucket-total-results')
    expect(source).toContain('reconciliation-diff-bucket--static')
    expect(source).not.toContain('run-result-rule-selector__header')
    expect(source).not.toContain('<strong>{{ option.count }}</strong>')
    expect(source).not.toContain('<strong>{{ diffDetailRows.length }}</strong>')
    expect(source).not.toContain('.run-result-rule-selector__option-label {\n  font-weight: 700;')
    expect(source).toContain('position: fixed;')
    expect(source).toContain('left: max(0.5rem, env(safe-area-inset-left));')
    expect(source).toMatch(/\.run-result-rule-selector\s*\{[\s\S]*?align-items: center;/)
    expect(source).not.toContain('padding-left: clamp')
    expect(source).not.toContain('padding-left: 4rem')
    expect(source).not.toContain('class="reconciliation-diff-table"')
  })
})
