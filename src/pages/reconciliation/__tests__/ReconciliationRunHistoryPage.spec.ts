import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const route = vi.hoisted(() => ({
  params: {
    savedRunId: 'RS_ORDER_CSV',
  },
  query: {
    runName: 'CSV Order Compare',
    file1SystemLabel: 'OMS',
    file2SystemLabel: 'SHOPIFY',
  },
  fullPath: '/reconciliation/run-history/RS_ORDER_CSV?runName=CSV%20Order%20Compare&file1SystemLabel=OMS&file2SystemLabel=SHOPIFY',
}))
const listGeneratedOutputs = vi.hoisted(() => vi.fn())
const saveSavedRunName = vi.hoisted(() => vi.fn())
const authState = vi.hoisted(() => ({
  sessionInfo: {
    userId: 'editor',
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
    listGeneratedOutputs,
    saveSavedRunName,
  },
}))

vi.mock('../../../lib/auth', () => ({
  useUiPermissions: () => ({
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
    fileName: `CSV-Order-Compare-diff-202603${String(day).padStart(2, '0')}-090000.json`,
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
    totalDifferences: differenceSeed + 2,
    onlyInFile1Count: differenceSeed,
    onlyInFile2Count: differenceSeed + 1,
    createdDate,
  }
}

describe('ReconciliationRunHistoryPage', () => {
  beforeEach(() => {
    route.params.savedRunId = 'RS_ORDER_CSV'
    route.query.runName = 'CSV Order Compare'
    route.query.file1SystemLabel = 'OMS'
    route.query.file2SystemLabel = 'SHOPIFY'
    route.fullPath =
      '/reconciliation/run-history/RS_ORDER_CSV?runName=CSV%20Order%20Compare&file1SystemLabel=OMS&file2SystemLabel=SHOPIFY'

    listGeneratedOutputs.mockReset()
    listGeneratedOutputs.mockResolvedValue({
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
    saveSavedRunName.mockReset()
    authState.sessionInfo = {
      userId: 'editor',
      canEditActiveTenantData: true,
      isSuperAdmin: false,
    }
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

  it('loads saved-run scoped results and features the most recent output above the previous results list', async () => {
    const wrapper = mount(ReconciliationRunHistoryPage)
    await flushPromises()

    expect(listGeneratedOutputs).toHaveBeenCalledWith({
      savedRunId: 'RS_ORDER_CSV',
      pageIndex: 0,
      pageSize: 6,
      query: '',
    })
    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.text()).toContain('CSV Order Compare')
    const editableTitle = wrapper.get('[data-testid="run-history-title"]')
    expect(editableTitle.element.tagName).toBe('H1')
    expect(editableTitle.attributes('contenteditable')).toBe('plaintext-only')
    expect(editableTitle.attributes('aria-label')).toBe('Run name')
    expect(editableTitle.classes()).toContain('static-page-inline-edit-title')
    expect(wrapper.findAll('.static-page-section-heading').map((node) => node.text())).toEqual(['Most Recent', 'Previous Results'])
    expect(wrapper.get('[data-testid="run-history-featured-tile"]').text()).toContain(
      formatCreatedDateForExpectation('2026-03-31T09:00:00.000Z'),
    )
    expect(wrapper.findAll('[data-testid="run-history-result-tile"]')).toHaveLength(5)
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
        savedRunId: 'RS_ORDER_CSV',
        outputFileName: 'CSV-Order-Compare-diff-20260331-090000.json',
      },
      query: {
        runName: 'CSV Order Compare',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
    expect(JSON.parse(wrapper.findAll('[data-testid="run-history-result-tile"]')[0]!.attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-run-result',
      params: {
        savedRunId: 'RS_ORDER_CSV',
        outputFileName: 'CSV-Order-Compare-diff-20260330-090000.json',
      },
      query: {
        runName: 'CSV Order Compare',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
    })
    expect(JSON.parse(wrapper.get('[data-testid="run-history-open-workflow"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-diff',
      query: {
        savedRunId: 'RS_ORDER_CSV',
        runName: 'CSV Order Compare',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
      state: {
        workflowOriginLabel: 'Run History',
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

  it('reveals more previous results in five-at-a-time batches', async () => {
    listGeneratedOutputs
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

    expect(listGeneratedOutputs).toHaveBeenNthCalledWith(2, {
      savedRunId: 'RS_ORDER_CSV',
      pageIndex: 1,
      pageSize: 6,
      query: '',
    })
    expect(wrapper.findAll('[data-testid="run-history-result-tile"]')).toHaveLength(6)
    expect(wrapper.text()).toContain(formatCreatedDateForExpectation('2026-03-25T09:00:00.000Z'))
    expect(wrapper.find('[data-testid="run-history-more"]').exists()).toBe(false)
  })

  it('shows an inline error when the saved-result lookup fails', async () => {
    listGeneratedOutputs.mockRejectedValue(new ApiCallError('Unable to load saved results.', 503))

    const wrapper = mount(ReconciliationRunHistoryPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load saved results.')
  })
})
