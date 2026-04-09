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

  it('renders the selected module hero and the remaining shared module tiles inside the static page frame', () => {
    const wrapper = mount(SettingsLayoutPage)

    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.find('.module-nav').exists()).toBe(false)
    expect(wrapper.find('.static-page-hero').text()).toContain('LLM Settings')
    expect(wrapper.findAll('.settings-module-tile')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('SFTP Servers')
    expect(wrapper.text()).not.toContain('NetSuite')
    expect(wrapper.find('[data-testid="router-view"]').exists()).toBe(true)
  })

  it('keeps only the llm tile in the shared connections layout', () => {
    route.name = 'connections-llm'
    route.path = '/connections/llm'

    const wrapper = mount(SettingsLayoutPage)
    const links = wrapper.findAll('a')
    const llmLink = links.find((link) => link.text().includes('LLM Settings'))

    expect(llmLink).toBeDefined()
    expect(llmLink!.classes()).toContain('settings-module-tile--active')
    expect(llmLink!.attributes('aria-current')).toBe('page')
  })
})
