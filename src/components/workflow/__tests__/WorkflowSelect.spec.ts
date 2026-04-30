import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkflowSelect from '../WorkflowSelect.vue'
import { DISMISS_INLINE_MENUS_EVENT } from '../../../lib/uiEvents'

describe('WorkflowSelect', () => {
  it('renders a stroked chevron icon instead of a filled triangle glyph', () => {
    const wrapper = mount(WorkflowSelect, {
      props: {
        modelValue: 'Y',
        options: [
          { value: 'Y', label: 'Yes' },
          { value: 'N', label: 'No' },
        ],
        placeholder: 'Select remote attributes',
        testId: 'workflow-select',
      },
    })

    const chevronIcon = wrapper.get('.workflow-select-trigger-icon')

    expect(chevronIcon.find('svg').exists()).toBe(true)
    expect(chevronIcon.find('polyline').exists()).toBe(true)
    expect(chevronIcon.text()).not.toContain('▾')
  })

  it('closes when inline menus are dismissed globally', async () => {
    const wrapper = mount(WorkflowSelect, {
      attachTo: document.body,
      props: {
        modelValue: 'POST',
        options: [
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'GET', label: 'GET' },
        ],
        placeholder: 'Select HTTP method',
        testId: 'workflow-select',
      },
    })

    await wrapper.get('[data-testid="workflow-select"]').trigger('click')
    expect(wrapper.findAll('[data-testid="workflow-select-option"]')).toHaveLength(3)

    document.dispatchEvent(new Event(DISMISS_INLINE_MENUS_EVENT))
    await flushPromises()

    expect(wrapper.get('[data-testid="workflow-select"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="workflow-select-option"]').exists()).toBe(false)
  })

  it('closes the menu on Escape before workflow-level handlers can consume it', async () => {
    const wrapper = mount(WorkflowSelect, {
      attachTo: document.body,
      props: {
        modelValue: 'POST',
        options: [
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'GET', label: 'GET' },
        ],
        placeholder: 'Select HTTP method',
        testId: 'workflow-select',
      },
    })

    await wrapper.get('[data-testid="workflow-select"]').trigger('click')
    const option = wrapper.get('[data-testid="workflow-select-option"][data-option-value="PUT"]')
    ;(option.element as HTMLButtonElement).focus()

    await option.trigger('keydown.escape')

    expect(wrapper.get('[data-testid="workflow-select"]').attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-testid="workflow-select-option"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[data-testid="workflow-select"]').element)
  })
})
