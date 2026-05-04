import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import InlineValidation from '../InlineValidation.vue'

describe('InlineValidation', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides error messages after ten seconds', async () => {
    vi.useFakeTimers()
    const wrapper = mount(InlineValidation, {
      props: {
        tone: 'error',
        message: 'HotWax: OMS REST request failed with status 404.',
      },
    })

    expect(wrapper.text()).toContain('HotWax: OMS REST request failed with status 404.')

    vi.advanceTimersByTime(9_999)
    await nextTick()
    expect(wrapper.find('.inline-validation').exists()).toBe(true)

    vi.advanceTimersByTime(1)
    await nextTick()
    expect(wrapper.find('.inline-validation').exists()).toBe(false)
  })

  it('restarts the ten second display window when the error message changes', async () => {
    vi.useFakeTimers()
    const wrapper = mount(InlineValidation, {
      props: {
        tone: 'error',
        message: 'First error',
      },
    })

    vi.advanceTimersByTime(9_000)
    await wrapper.setProps({ message: 'Second error' })
    vi.advanceTimersByTime(9_999)
    await nextTick()

    expect(wrapper.text()).toContain('Second error')

    vi.advanceTimersByTime(1)
    await nextTick()
    expect(wrapper.find('.inline-validation').exists()).toBe(false)
  })

  it('keeps non-error messages visible', async () => {
    vi.useFakeTimers()
    const wrapper = mount(InlineValidation, {
      props: {
        tone: 'info',
        message: 'Nothing to reconcile yet.',
      },
    })

    vi.advanceTimersByTime(10_000)
    await nextTick()

    expect(wrapper.text()).toContain('Nothing to reconcile yet.')
  })
})
