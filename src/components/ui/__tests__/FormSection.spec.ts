import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FormSection from '../FormSection.vue'

describe('FormSection', () => {
  it('renders the shared form title, description, and body content', () => {
    const wrapper = mount(FormSection, {
      props: {
        title: 'LLM Settings',
        description: 'Configure provider credentials.',
      },
      slots: {
        default: '<div class="form-body-content">Form fields</div>',
      },
    })

    expect(wrapper.find('.form-section-title').text()).toBe('LLM Settings')
    expect(wrapper.find('.form-section-description').text()).toContain('Configure provider credentials.')
    expect(wrapper.find('.form-section-body').text()).toContain('Form fields')
  })
})
