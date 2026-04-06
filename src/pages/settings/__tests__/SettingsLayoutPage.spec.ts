import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const route = vi.hoisted(() => ({
  name: 'connections-llm',
  path: '/connections/llm',
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

import SettingsLayoutPage from '../SettingsLayoutPage.vue'

describe('SettingsLayoutPage', () => {
  beforeEach(() => {
    route.name = 'connections-llm'
    route.path = '/connections/llm'
  })

  it('renders the connections layout inside the static page frame', () => {
    const wrapper = mount(SettingsLayoutPage)

    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.find('.static-page-hero').text()).toContain('Connections')
    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
  })

  it('keeps the netsuite auth tab active for its route', () => {
    route.name = 'connections-netsuite-auth'
    route.path = '/connections/netsuite/auth'

    const wrapper = mount(SettingsLayoutPage)
    const links = wrapper.findAll('a')
    const authLink = links.find((link) => link.text() === 'NetSuite Auth')

    expect(authLink).toBeDefined()
    expect(authLink!.classes()).toContain('router-link-active')
    expect(authLink!.classes()).toContain('router-link-exact-active')
    expect(authLink!.attributes('aria-current')).toBe('page')
  })
})
