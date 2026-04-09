import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AppSelect from '../AppSelect.vue'

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
      props: {
        modelValue: 'bearer',
        options: [
          { value: 'none', label: 'None' },
          { value: 'bearer', label: 'Bearer' },
          { value: 'basic', label: 'Basic' },
        ],
        testId: 'auth-type-select',
      },
      attachTo: document.body,
    })

    await wrapper.get('[data-testid="auth-type-select"]').trigger('keydown.down')
    await flushPromises()

    const selectedOption = wrapper.get('[data-testid="app-select-option"][data-option-value="bearer"]')
    expect(selectedOption.classes()).toContain('app-select-option--selected')
    expect(document.activeElement).toBe(selectedOption.element)
  })
})
