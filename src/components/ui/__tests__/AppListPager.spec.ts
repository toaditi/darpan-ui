import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppListPager from '../AppListPager.vue'

describe('AppListPager', () => {
  it('renders Previous and Next controls with the shared pager contract', async () => {
    const wrapper = mount(AppListPager, {
      props: {
        pageIndex: 1,
        pageCount: 3,
        ariaLabel: 'Previous runs pages',
        previousTestId: 'previous-runs-page-previous',
        nextTestId: 'previous-runs-page-next',
      },
    })

    expect(wrapper.get('nav').classes()).toContain('static-page-pager')
    expect(wrapper.get('nav').attributes('aria-label')).toBe('Previous runs pages')
    expect(wrapper.text()).toContain('Page 2 of 3')

    await wrapper.get('[data-testid="previous-runs-page-previous"]').trigger('click')
    await wrapper.get('[data-testid="previous-runs-page-next"]').trigger('click')

    expect(wrapper.emitted('update:pageIndex')).toEqual([[0], [2]])
  })

  it('hides itself when there is only one page', () => {
    const wrapper = mount(AppListPager, {
      props: {
        pageIndex: 0,
        pageCount: 1,
      },
    })

    expect(wrapper.find('nav').exists()).toBe(false)
  })
})
