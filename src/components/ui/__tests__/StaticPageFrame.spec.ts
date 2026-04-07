import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StaticPageFrame from '../StaticPageFrame.vue'
import StaticPageSection from '../StaticPageSection.vue'

describe('StaticPageFrame', () => {
  it('renders the hero and board slots inside the shared static wireframe', () => {
    const wrapper = mount(StaticPageFrame, {
      slots: {
        hero: '<h1>Static Page Title</h1><p class="muted-copy">Reusable hero copy</p>',
        default: '<div class="wireframe-body">Board content</div>',
      },
    })

    expect(wrapper.find('.static-page-hero').text()).toContain('Static Page Title')
    expect(wrapper.find('.static-page-board').text()).toContain('Board content')
  })
})

describe('StaticPageSection', () => {
  it('renders the shared section header and body content', () => {
    const wrapper = mount(StaticPageSection, {
      props: {
        title: 'Pinned Runs',
        description: 'Reusable section shell',
      },
      slots: {
        default: '<div class="wireframe-section-body">Tile grid</div>',
      },
    })

    expect(wrapper.find('.static-page-section-heading').text()).toBe('Pinned Runs')
    expect(wrapper.find('.static-page-section-description').text()).toContain('Reusable section shell')
    expect(wrapper.find('.static-page-section-body').text()).toContain('Tile grid')
  })
})
