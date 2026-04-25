import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WorkflowStepForm from '../WorkflowStepForm.vue'

describe('WorkflowStepForm', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('routes the shared top-offset token through the edit-single-page workflow contract instead of all workflow forms', () => {
    const wrapper = mount(WorkflowStepForm, {
      props: {
        question: 'Update the NetSuite auth profile.',
      },
    })

    const source = readFileSync('src/components/workflow/WorkflowStepForm.vue', 'utf8')
    const globalSource = readFileSync('src/style.css', 'utf8')

    expect(wrapper.get('form').classes()).toContain('wizard-question-shell')
    expect(source).not.toContain('padding-top: var(--workflow-form-top-offset);')
    expect(globalSource).toContain('.workflow-form--edit-single-page {')
    expect(globalSource).toContain('padding-top: var(--workflow-form-top-offset);')
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

  it('moves focus to the primary action after a file is selected', async () => {
    vi.useFakeTimers()

    const wrapper = mount(WorkflowStepForm, {
      attachTo: document.body,
      props: {
        question: 'Upload the schema file',
        primaryLabel: 'OK',
        primaryTestId: 'wizard-next',
      },
      slots: {
        default: '<label class="wizard-input-shell wizard-file-shell"><input data-testid="upload-file" class="wizard-file-input" type="file"></label>',
      },
    })

    const fileInput = wrapper.get('[data-testid="upload-file"]')
    Object.defineProperty(fileInput.element, 'files', {
      value: [new File(['{"orderId":"1001"}'], 'orders.json', { type: 'application/json' })],
      configurable: true,
    })

    await fileInput.trigger('change')
    await vi.runAllTimersAsync()

    expect((document.activeElement as HTMLElement | null)?.dataset.testid).toBe('wizard-next')

    wrapper.unmount()
  })

  it('submits when Enter is pressed from a workflow checkbox', async () => {
    const wrapper = mount(WorkflowStepForm, {
      attachTo: document.body,
      props: {
        question: 'Verify the schema',
        primaryLabel: 'OK',
        primaryTestId: 'wizard-next',
      },
      slots: {
        default: '<label><input data-testid="required-field" type="checkbox"> Required field</label>',
      },
    })

    await wrapper.get('[data-testid="required-field"]').trigger('keydown.enter')

    expect(wrapper.emitted('submit')).toHaveLength(1)

    wrapper.unmount()
  })
})
