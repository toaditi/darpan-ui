import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const ensureAuthenticated = vi.hoisted(() => vi.fn().mockResolvedValue(true))
const replace = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const listPilotMappings = vi.hoisted(() => vi.fn())
const listPinnedRunIds = vi.hoisted(() => vi.fn())
const savePinnedRunIds = vi.hoisted(() => vi.fn())
const route = vi.hoisted(() => ({
  name: 'hub',
  path: '/',
  fullPath: '/',
  query: {},
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  },
  useRoute: () => route,
  useRouter: () => ({
    replace,
  }),
}))

vi.mock('../../lib/auth', () => ({
  buildAuthRedirect: vi.fn((redirect: unknown) => ({
    name: 'login',
    query: { redirect },
  })),
  ensureAuthenticated,
  useAuthState: () => ({
    username: 'john.doe',
    userId: 'aditi',
  }),
}))

vi.mock('../../lib/api/facade', () => ({
  reconciliationFacade: {
    listPilotMappings,
  },
}))

vi.mock('../../lib/pinnedRuns', () => ({
  listPinnedRunIds,
  savePinnedRunIds,
}))

import HomePage from '../HomePage.vue'

describe('HomePage', () => {
  beforeEach(() => {
    ensureAuthenticated.mockClear()
    replace.mockClear()
    listPilotMappings.mockReset()
    listPinnedRunIds.mockReset()
    savePinnedRunIds.mockReset()

    listPilotMappings.mockResolvedValue({
      mappings: Array.from({ length: 8 }, (_, index) => ({
        reconciliationMappingId: `Map${index + 1}`,
        mappingName: `Reconciliation ${index + 1}`,
        description: `Mapping ${index + 1}.`,
        requiresSystemSelection: false,
        defaultFile1SystemEnumId: 'DarSysOms',
        defaultFile2SystemEnumId: 'DarSysShopify',
        systemOptions: [
          { enumId: 'DarSysOms', label: 'OMS' },
          { enumId: 'DarSysShopify', label: 'SHOPIFY' },
        ],
      })),
    })
    listPinnedRunIds.mockReturnValue(['mapping:Map8'])
  })

  it('shows mapping runs with pagination for the other runs list', async () => {
    const wrapper = mount(HomePage)
    await flushPromises()

    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.findAll('.static-page-section')).toHaveLength(2)
    expect(wrapper.text()).toContain("Let's Investigate")
    expect(wrapper.text()).toContain('Pinned Runs')
    expect(wrapper.text()).toContain('Other Runs')
    expect(wrapper.text()).toContain('Reconciliation 1')
    expect(wrapper.text()).toContain('Reconciliation 5')
    expect(wrapper.text()).not.toContain('Reconciliation 6')
    expect(wrapper.text()).toContain('Reconciliation 8')
    expect(wrapper.text()).toContain('Create New')
    expect(wrapper.find('[data-testid="pinned-runs"]').text()).toContain('Reconciliation 8')
    expect(wrapper.find('[data-testid="pinned-empty-state"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="other-runs"] .static-page-tile')).toHaveLength(5)
    expect(wrapper.find('[data-testid="other-runs-empty-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="dashboard-create-action"]').exists()).toBe(true)
    expect(JSON.parse(wrapper.find('[data-flow-id="mapping:Map1"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'reconciliation-pilot-diff',
      query: {
        mappingId: 'Map1',
        runName: 'Reconciliation 1',
        file1SystemLabel: 'OMS',
        file2SystemLabel: 'SHOPIFY',
      },
      state: {
        workflowOriginLabel: 'Dashboard',
        workflowOriginPath: '/',
      },
    })
    expect(JSON.parse(wrapper.get('[data-testid="dashboard-create-action"]').attributes('data-to') ?? '{}')).toEqual({
      path: '/reconciliation/create',
      state: {
        workflowOriginLabel: 'Dashboard',
        workflowOriginPath: '/',
      },
    })
    expect(wrapper.get('[data-testid="other-runs-more"]').text()).toBe('More...')

    expect(listPilotMappings).toHaveBeenCalledWith({
      pageIndex: 0,
      pageSize: 12,
      query: '',
    })
    expect(listPinnedRunIds).toHaveBeenCalled()

    await wrapper.get('[data-testid="other-runs-more"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="other-runs"]').text()).toContain('Reconciliation 6')
    expect(wrapper.find('[data-testid="other-runs"]').text()).toContain('Reconciliation 7')
    expect(wrapper.findAll('[data-testid="other-runs"] .static-page-tile')).toHaveLength(7)
    expect(wrapper.find('[data-testid="other-runs-more"]').exists()).toBe(false)
  })

  it('supports pinning by drag and drop', async () => {
    const wrapper = mount(HomePage)
    await flushPromises()

    const transferStore = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: 'move',
      setData: (type: string, value: string) => {
        transferStore.set(type, value)
      },
      getData: (type: string) => transferStore.get(type) ?? '',
    }

    await wrapper.find('[data-flow-id="mapping:Map1"]').trigger('dragstart', { dataTransfer })
    await wrapper.find('[data-testid="pinned-runs"]').trigger('drop', { dataTransfer })
    await flushPromises()

    expect(savePinnedRunIds).toHaveBeenLastCalledWith(['mapping:Map8', 'mapping:Map1'])
    expect(wrapper.find('[data-testid="pinned-runs"]').text()).toContain('Reconciliation 1')
    expect(wrapper.find('[data-testid="other-runs"]').text()).not.toContain('Reconciliation 1')
  })

  it('shows the pinned drop hint and in-section create action when there are no runs', async () => {
    listPilotMappings.mockResolvedValue({
      mappings: [],
    })
    listPinnedRunIds.mockReturnValue([])

    const wrapper = mount(HomePage)
    await flushPromises()

    expect(wrapper.get('[data-testid="pinned-empty-state"]').text()).toBe('drag and drop runs to pin')
    expect(wrapper.find('[data-testid="dashboard-create-action"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="other-runs-more"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="other-runs-empty-action"]').text()).toBe('Create New')
    expect(JSON.parse(wrapper.get('[data-testid="other-runs-empty-action"]').attributes('data-to') ?? '{}')).toEqual({
      path: '/reconciliation/create',
      state: {
        workflowOriginLabel: 'Dashboard',
        workflowOriginPath: '/',
      },
    })
    expect(wrapper.findAll('[data-testid="other-runs"] .static-page-tile')).toHaveLength(0)
  })
})
