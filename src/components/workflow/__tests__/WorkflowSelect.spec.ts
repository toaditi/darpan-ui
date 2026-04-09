import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkflowSelect from '../WorkflowSelect.vue'

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
})
