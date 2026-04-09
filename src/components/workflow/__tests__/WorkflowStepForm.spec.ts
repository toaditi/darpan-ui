import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkflowStepForm from '../WorkflowStepForm.vue'

describe('WorkflowStepForm', () => {
  it('uses the shared top-offset token so workflow headers sit lower on form pages', () => {
    const wrapper = mount(WorkflowStepForm, {
      props: {
        question: 'Update the NetSuite auth profile.',
      },
    })

    const source = readFileSync('src/components/workflow/WorkflowStepForm.vue', 'utf8')
    const globalSource = readFileSync('src/style.css', 'utf8')

    expect(wrapper.get('form').classes()).toContain('wizard-question-shell')
    expect(source).toContain('padding-top: var(--workflow-form-top-offset);')
    expect(globalSource).toContain('--workflow-form-top-offset: var(--space-6);')
    expect(globalSource).toContain('--workflow-form-top-offset: var(--space-5);')
  })

  it('renders an icon-only cancel action and emits cancel when requested', async () => {
    const wrapper = mount(WorkflowStepForm, {
      props: {
        question: 'Update the NetSuite auth profile.',
        primaryLabel: 'Save',
        showCancelAction: true,
        primaryTestId: 'save-workflow',
        cancelTestId: 'cancel-workflow',
      },
    })

    const source = readFileSync('src/components/workflow/WorkflowStepForm.vue', 'utf8')
    const cancelActionSource = readFileSync('src/components/ui/AppCancelAction.vue', 'utf8')

    const cancelButton = wrapper.get('[data-testid="cancel-workflow"]')

    expect(cancelButton.attributes('aria-label')).toBe('Cancel')
    expect(cancelButton.classes()).toContain('app-icon-action')
    expect(cancelButton.classes()).toContain('app-icon-action--large')
    expect(cancelActionSource).toContain('<line x1="5" y1="5" x2="15" y2="15"')
    expect(cancelActionSource).toContain('<line x1="15" y1="5" x2="5" y2="15"')
    expect(source).toContain('<AppCancelAction')
    expect(source.indexOf('<AppSaveAction')).toBeLessThan(source.indexOf('<AppCancelAction'))
    expect(wrapper.findAll('.wizard-actions > *').map((node) => node.attributes('data-testid') || node.classes().join(' '))).toEqual([
      'save-workflow',
      'cancel-workflow',
      'wizard-enter-hint',
    ])

    await cancelButton.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
