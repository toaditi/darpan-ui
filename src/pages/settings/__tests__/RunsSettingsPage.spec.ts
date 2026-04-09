import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const route = vi.hoisted(() => ({
  fullPath: '/settings/runs',
}))

const listPilotMappings = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)" v-bind="$attrs"><slot /></a>',
  },
  useRoute: () => route,
}))

vi.mock('../../../lib/api/facade', () => ({
  reconciliationFacade: {
    listPilotMappings,
  },
}))

import RunsSettingsPage from '../RunsSettingsPage.vue'

describe('RunsSettingsPage', () => {
  beforeEach(() => {
    route.fullPath = '/settings/runs'
    listPilotMappings.mockReset()
  })

  it('renders saved runs as dashboard tiles and launches the existing create workflow with runs origin state', async () => {
    listPilotMappings.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      mappings: [
        {
          reconciliationMappingId: 'OrderIdMap',
          mappingName: 'Order ID',
          description: 'Order ID',
          requiresSystemSelection: false,
          defaultFile1SystemEnumId: 'OMS',
          defaultFile2SystemEnumId: 'SHOPIFY',
          systemOptions: [],
        },
      ],
      pagination: { pageIndex: 0, pageSize: 12, totalCount: 1, pageCount: 1 },
    })

    const wrapper = mount(RunsSettingsPage)
    await flushPromises()

    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="run-tile"]')).toHaveLength(1)
    expect(wrapper.get('[data-testid="saved-runs"]').classes()).toContain('static-page-record-grid')
    expect(wrapper.get('[data-testid="saved-runs"]').classes()).toContain('static-page-record-grid--fixed')
    expect(wrapper.get('[data-testid="run-tile"]').text()).toBe('Order ID')
    expect(wrapper.find('h1').text()).toBe('Run Editor')
    expect(JSON.parse(wrapper.get('[data-testid="run-tile"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'settings-runs-edit',
      params: { reconciliationMappingId: 'OrderIdMap' },
      state: {
        workflowOriginLabel: 'Run Editor',
        workflowOriginPath: '/settings/runs',
      },
    })
    expect(JSON.parse(wrapper.get('[data-testid="runs-create-action"]').attributes('data-to') ?? '{}')).toEqual({
      path: '/reconciliation/create',
      state: {
        workflowOriginLabel: 'Run Editor',
        workflowOriginPath: '/settings/runs',
      },
    })
  })

  it('shows an inline create action when no runs exist', async () => {
    listPilotMappings.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      mappings: [],
      pagination: { pageIndex: 0, pageSize: 12, totalCount: 0, pageCount: 1 },
    })

    const wrapper = mount(RunsSettingsPage)
    await flushPromises()

    expect(wrapper.text()).toContain('No runs')
    expect(wrapper.find('[data-testid="runs-create-action"]').exists()).toBe(false)
    expect(JSON.parse(wrapper.get('[data-testid="runs-empty-create-action"]').attributes('data-to') ?? '{}')).toEqual({
      path: '/reconciliation/create',
      state: {
        workflowOriginLabel: 'Run Editor',
        workflowOriginPath: '/settings/runs',
      },
    })
  })

  it('keeps the runs page on the shared static dashboard contract without page-local styling', () => {
    const pageSource = readFileSync('src/pages/settings/RunsSettingsPage.vue', 'utf8')

    expect(pageSource).toContain('<StaticPageFrame>')
    expect(pageSource).toContain('title="Saved Runs"')
    expect(pageSource).toContain('static-page-record-grid static-page-record-grid--fixed')
    expect(pageSource).toContain('class="static-page-tile static-page-record-tile"')
    expect(pageSource).toContain('class="static-page-action-tile static-page-create-action"')
    expect(pageSource).not.toContain('<style scoped>')
  })
})
