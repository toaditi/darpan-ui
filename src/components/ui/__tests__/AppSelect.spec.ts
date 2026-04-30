import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import AppSelect from '../AppSelect.vue'
import { DISMISS_INLINE_MENUS_EVENT } from '../../../lib/uiEvents'

describe('AppSelect', () => {
  it('renders a stroked chevron icon instead of a filled triangle glyph', () => {
    const wrapper = mount(AppSelect, {
      props: {
        modelValue: 'auth-primary',
        options: [
          { value: 'auth-primary', label: 'Primary Auth' },
        ],
        testId: 'auth-config-select',
      },
    })

    const chevronIcon = wrapper.get('.app-select-trigger-icon')

    expect(chevronIcon.find('svg').exists()).toBe(true)
    expect(chevronIcon.find('polyline').exists()).toBe(true)
    expect(chevronIcon.text()).not.toContain('▾')
  })

  it('shows placeholder copy until a value is selected and emits on click selection', async () => {
    const wrapper = mount(AppSelect, {
      props: {
        modelValue: '',
        placeholder: 'Select auth config',
        options: [
          { value: '', label: 'Select auth config' },
          { value: 'auth-primary', label: 'Primary Auth' },
          { value: 'auth-backup', label: 'Backup Auth' },
        ],
        testId: 'auth-config-select',
      },
    })

    expect(wrapper.get('[data-testid="auth-config-select"]').text()).toContain('Select auth config')
    expect(wrapper.get('[data-testid="auth-config-select"]').classes()).toContain('empty')

    await wrapper.get('[data-testid="auth-config-select"]').trigger('click')
    await wrapper.get('[data-testid="app-select-option"][data-option-value="auth-primary"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([['auth-primary']])
    expect(wrapper.find('[data-testid="app-select-option"]').exists()).toBe(false)
  })

  it('opens with keyboard focus on the current value and preserves a single selected option state', async () => {
    const wrapper = mount(AppSelect, {
      attachTo: document.body,
      props: {
        modelValue: 'bearer',
        options: [
          { value: 'none', label: 'None' },
          { value: 'bearer', label: 'Bearer' },
          { value: 'basic', label: 'Basic' },
        ],
        testId: 'auth-type-select',
      },
    })

    await wrapper.get('[data-testid="auth-type-select"]').trigger('keydown.down')
    await flushPromises()

    const selectedOption = wrapper.get('[data-testid="app-select-option"][data-option-value="bearer"]')
    expect(selectedOption.classes()).toContain('app-select-option--selected')
    expect(document.activeElement).toBe(selectedOption.element)

    wrapper.unmount()
  })

  it('closes an already-open select when another AppSelect opens', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const firstSelect = mount(AppSelect, {
      attachTo: host,
      props: {
        modelValue: 'shopify',
        testId: 'first-select',
        options: [
          { value: 'shopify', label: 'Shopify' },
          { value: 'oms', label: 'OMS' },
        ],
      },
    })

    const secondSelect = mount(AppSelect, {
      attachTo: host,
      props: {
        modelValue: 'id',
        testId: 'second-select',
        options: [
          { value: 'id', label: '$.id' },
          { value: 'legacyResourceId', label: '$.legacyResourceId' },
        ],
      },
    })

    await firstSelect.get('[data-testid="first-select"]').trigger('click')
    expect(document.querySelectorAll('[data-testid="app-select-option"]')).toHaveLength(2)

    await secondSelect.get('[data-testid="second-select"]').trigger('click')
    await flushPromises()

    expect(firstSelect.get('[data-testid="first-select"]').attributes('aria-expanded')).toBe('false')
    expect(secondSelect.get('[data-testid="second-select"]').attributes('aria-expanded')).toBe('true')
    expect(document.querySelectorAll('[data-testid="app-select-option"]')).toHaveLength(2)
    expect(document.querySelector('[data-testid="app-select-option"][data-option-value="shopify"]')).toBeNull()

    firstSelect.unmount()
    secondSelect.unmount()
    host.remove()
  })

  it('closes when inline menus are dismissed globally', async () => {
    const wrapper = mount(AppSelect, {
      attachTo: document.body,
      props: {
        modelValue: 'auth-primary',
        options: [
          { value: 'auth-primary', label: 'Primary Auth' },
          { value: 'auth-backup', label: 'Backup Auth' },
        ],
        testId: 'auth-config-select',
      },
    })

    await wrapper.get('[data-testid="auth-config-select"]').trigger('click')
    expect(wrapper.findAll('[data-testid="app-select-option"]')).toHaveLength(2)

    document.dispatchEvent(new Event(DISMISS_INLINE_MENUS_EVENT))
    await flushPromises()

    expect(wrapper.get('[data-testid="auth-config-select"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="app-select-option"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('submits the closest form after Enter selects an option when enabled', async () => {
    const submit = vi.fn((event: Event) => event.preventDefault())
    const form = document.createElement('form')
    form.addEventListener('submit', submit)
    document.body.appendChild(form)

    const wrapper = mount(AppSelect, {
      attachTo: form,
      props: {
        modelValue: '',
        testId: 'system-select',
        submitOnEnter: true,
        options: [
          { value: 'oms', label: 'OMS' },
          { value: 'shopify', label: 'SHOPIFY' },
        ],
      },
    })

    await wrapper.get('[data-testid="system-select"]').trigger('click')
    await wrapper.get('[data-testid="app-select-option"][data-option-value="shopify"]').trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([['shopify']])
    expect(submit).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="app-select-option"]').exists()).toBe(false)

    wrapper.unmount()
    form.removeEventListener('submit', submit)
    form.remove()
  })

  it('submits from the trigger on Enter when a selected value is enabled for submit', async () => {
    const submit = vi.fn((event: Event) => event.preventDefault())
    const form = document.createElement('form')
    form.addEventListener('submit', submit)
    document.body.appendChild(form)

    const wrapper = mount(AppSelect, {
      attachTo: form,
      props: {
        modelValue: 'shopify',
        testId: 'system-select',
        submitOnEnter: true,
        options: [
          { value: 'oms', label: 'OMS' },
          { value: 'shopify', label: 'SHOPIFY' },
        ],
      },
    })

    await wrapper.get('[data-testid="system-select"]').trigger('keydown.enter')
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')).toEqual([['shopify']])
    expect(submit).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    form.removeEventListener('submit', submit)
    form.remove()
  })
})
