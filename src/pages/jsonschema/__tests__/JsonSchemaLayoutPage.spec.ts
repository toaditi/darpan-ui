import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const route = vi.hoisted(() => ({
  name: 'schemas-library',
  path: '/schemas/library',
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :href="to" v-bind="$attrs"><slot /></a>',
  },
  RouterView: {
    template: '<div data-testid="router-view" />',
  },
  useRoute: () => route,
}))

import JsonSchemaLayoutPage from '../JsonSchemaLayoutPage.vue'

describe('JsonSchemaLayoutPage', () => {
  beforeEach(() => {
    route.name = 'schemas-library'
    route.path = '/schemas/library'
  })

  it('renders the selected schema module hero and tiles inside the static page frame', () => {
    const wrapper = mount(JsonSchemaLayoutPage)

    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.find('.module-nav').exists()).toBe(false)
    expect(wrapper.find('.static-page-hero').text()).toContain('Schema Library')
    expect(wrapper.findAll('.static-page-module-tile')).toHaveLength(3)
    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
  })

  it('keeps create schema highlighted on the workflow route used by the shared schema module shell', () => {
    route.name = 'schemas-create'
    route.path = '/schemas/create'

    const wrapper = mount(JsonSchemaLayoutPage)
    const links = wrapper.findAll('a')
    const createLink = links.find((link) => link.text().includes('Create Schema'))

    expect(createLink).toBeDefined()
    expect(wrapper.find('.static-page-hero').text()).toContain('Create Schema')
    expect(createLink!.classes()).toContain('static-page-module-tile--active')
    expect(createLink!.attributes('aria-current')).toBe('page')
  })

  it('keeps the editor tab active on parameterized editor routes', () => {
    route.name = 'schemas-editor'
    route.path = '/schemas/editor/test-schema'

    const wrapper = mount(JsonSchemaLayoutPage)
    const links = wrapper.findAll('a')
    const editorLink = links.find((link) => link.text().includes('Editor'))

    expect(editorLink).toBeDefined()
    expect(wrapper.find('.static-page-hero').text()).toContain('Schema Editor')
    expect(editorLink!.classes()).toContain('static-page-module-tile--active')
    expect(editorLink!.attributes('aria-current')).toBe('page')
  })

  it('keeps library highlighted on the library route', () => {
    const wrapper = mount(JsonSchemaLayoutPage)
    const links = wrapper.findAll('a')
    const libraryLink = links.find((link) => link.text().includes('Library'))

    expect(libraryLink).toBeDefined()
    expect(wrapper.find('.static-page-hero').text()).toContain('Schema Library')
    expect(libraryLink!.classes()).toContain('static-page-module-tile--active')
    expect(libraryLink!.attributes('aria-current')).toBe('page')
  })
})
