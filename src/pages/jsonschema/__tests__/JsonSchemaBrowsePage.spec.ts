import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const list = vi.hoisted(() => vi.fn())
const route = vi.hoisted(() => ({
  fullPath: '/schemas/library',
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)"><slot /></a>',
  },
  useRoute: () => route,
}))

vi.mock('../../../lib/api/facade', () => ({
  jsonSchemaFacade: {
    list,
  },
}))

import JsonSchemaBrowsePage from '../JsonSchemaBrowsePage.vue'

describe('JsonSchemaBrowsePage', () => {
  beforeEach(() => {
    route.fullPath = '/schemas/library'
    list.mockReset()
    list.mockResolvedValue({
      schemas: Array.from({ length: 7 }, (_, index) => ({
        jsonSchemaId: `schema-${index + 1}`,
        schemaName: `Schema ${index + 1}`,
        description: `Description ${index + 1}`,
        systemEnumId: index % 2 === 0 ? 'DarSysOms' : 'DarSysShopify',
        systemLabel: index % 2 === 0 ? 'OMS' : 'SHOPIFY',
        statusId: 'Active',
        lastUpdatedStamp: '2026-04-08T10:00:00Z',
      })),
      pagination: { pageIndex: 0, pageSize: 12, totalCount: 7, pageCount: 1 },
    })
  })

  it('renders a dashboard-style schema list with edit links and a create workflow entry', async () => {
    const wrapper = mount(JsonSchemaBrowsePage)
    await flushPromises()

    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.text()).toContain('Schema Library')
    expect(wrapper.text()).not.toContain('Review saved schemas and launch the guided flow for new schema uploads.')
    expect(wrapper.text()).not.toContain('Open an existing schema to refine its field list or start a new upload.')
    expect(wrapper.text()).toContain('Description 1')
    expect(wrapper.text()).toContain('Description 5')
    expect(wrapper.text()).not.toContain('Description 6')
    expect(wrapper.text()).not.toContain('Schema 1')
    expect(wrapper.text()).not.toContain('Active')
    expect(wrapper.text()).not.toContain('Unknown status')
    expect(wrapper.findAll('[data-testid="schema-library-tile"]')).toHaveLength(5)
    expect(wrapper.get('[data-testid="schema-library-more"]').text()).toBe('More...')
    expect(JSON.parse(wrapper.get('[data-testid="schema-library-create"]').attributes('data-to') ?? '{}')).toEqual({
      path: '/schemas/create',
      state: {
        workflowOriginLabel: 'Schema Library',
        workflowOriginPath: '/schemas/library',
      },
    })
    expect(JSON.parse(wrapper.get('[data-testid="schema-library-tile"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'schemas-editor',
      params: {
        jsonSchemaId: 'schema-1',
      },
    })

    await wrapper.get('[data-testid="schema-library-more"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Description 6')
    expect(wrapper.text()).toContain('Description 7')
    expect(wrapper.findAll('[data-testid="schema-library-tile"]')).toHaveLength(7)
  })

  it('falls back to schemaName when description is missing or blank', async () => {
    list.mockResolvedValueOnce({
      schemas: [
        {
          jsonSchemaId: 'schema-1',
          schemaName: 'Fallback Schema Name',
          description: '   ',
          systemEnumId: 'DarSysOms',
          systemLabel: 'OMS',
          statusId: 'Active',
          lastUpdatedStamp: '2026-04-08T10:00:00Z',
        },
      ],
      pagination: { pageIndex: 0, pageSize: 12, totalCount: 1, pageCount: 1 },
    })

    const wrapper = mount(JsonSchemaBrowsePage)
    await flushPromises()

    expect(wrapper.text()).toContain('Fallback Schema Name')
    expect(wrapper.text()).not.toContain('Active')
  })

  it('shows an inline create action when there are no saved schemas', async () => {
    list.mockResolvedValueOnce({
      schemas: [],
      pagination: { pageIndex: 0, pageSize: 12, totalCount: 0, pageCount: 1 },
    })

    const wrapper = mount(JsonSchemaBrowsePage)
    await flushPromises()

    expect(wrapper.text()).toContain('No schemas saved yet')
    expect(wrapper.find('[data-testid="schema-library-create"]').exists()).toBe(false)
    expect(JSON.parse(wrapper.get('[data-testid="schema-library-empty-create"]').attributes('data-to') ?? '{}')).toEqual({
      path: '/schemas/create',
      state: {
        workflowOriginLabel: 'Schema Library',
        workflowOriginPath: '/schemas/library',
      },
    })
  })
})
