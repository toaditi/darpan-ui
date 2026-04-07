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
    template: '<div />',
  },
  useRoute: () => route,
}))

import JsonSchemaLayoutPage from '../JsonSchemaLayoutPage.vue'

describe('JsonSchemaLayoutPage', () => {
  beforeEach(() => {
    route.name = 'schemas-library'
    route.path = '/schemas/library'
  })

  it('keeps the editor tab active on parameterized editor routes', () => {
    route.name = 'schemas-editor'
    route.path = '/schemas/editor/test-schema'

    const wrapper = mount(JsonSchemaLayoutPage)
    const links = wrapper.findAll('a')
    const editorLink = links.find((link) => link.text() === 'Editor')

    expect(editorLink).toBeDefined()
    expect(editorLink!.classes()).toContain('router-link-active')
    expect(editorLink!.classes()).toContain('router-link-exact-active')
    expect(editorLink!.attributes('aria-current')).toBe('page')
  })

  it('keeps library highlighted on the library route', () => {
    const wrapper = mount(JsonSchemaLayoutPage)
    const links = wrapper.findAll('a')
    const libraryLink = links.find((link) => link.text() === 'Library')

    expect(libraryLink).toBeDefined()
    expect(libraryLink!.classes()).toContain('router-link-active')
    expect(libraryLink!.attributes('aria-current')).toBe('page')
  })
})
