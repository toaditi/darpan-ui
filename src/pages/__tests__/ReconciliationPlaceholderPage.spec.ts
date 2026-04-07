import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const getLinearPortalConfig = vi.hoisted(() => vi.fn())

vi.mock('../../lib/linearAccess', () => ({
  getLinearPortalConfig,
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="to"><slot /></a>',
  },
}))

import ReconciliationPlaceholderPage from '../ReconciliationPlaceholderPage.vue'

describe('ReconciliationPlaceholderPage', () => {
  it('renders roadmap and request as the two primary customer actions', () => {
    getLinearPortalConfig.mockReturnValue({
      roadmapUrl: 'https://linear.app/public-roadmap',
      requestUrl: 'https://linear.app/forms/customer-request',
      embedEnabled: true,
    })

    const wrapper = mount(ReconciliationPlaceholderPage)

    const cards = wrapper.findAll('.portal-choice-card')
    expect(cards).toHaveLength(2)
    expect(wrapper.text()).toContain('Review roadmap')
    expect(wrapper.text()).toContain('Open request')
    expect(wrapper.text()).not.toContain('Configuration pending')
    expect(wrapper.text()).not.toContain('How this surface behaves')
    expect(wrapper.findAll('iframe')).toHaveLength(0)

    const links = wrapper.findAll('a[href]')
    expect(links[0]?.attributes('href')).toBe('https://linear.app/public-roadmap')
    expect(links[1]?.attributes('href')).toBe('https://linear.app/forms/customer-request')
  })

  it('keeps missing configuration calm and hides admin env-var messaging', () => {
    getLinearPortalConfig.mockReturnValue({
      roadmapUrl: null,
      requestUrl: null,
      embedEnabled: true,
    })

    const wrapper = mount(ReconciliationPlaceholderPage)

    expect(wrapper.text()).toContain('Roadmap access is not available yet.')
    expect(wrapper.text()).toContain('Request intake is not available yet.')
    expect(wrapper.text()).not.toContain('VITE_DARPAN_LINEAR_ROADMAP_URL')
    expect(wrapper.text()).not.toContain('VITE_DARPAN_LINEAR_REQUEST_URL')
  })
})
