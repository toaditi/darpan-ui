import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkflowPage from '../WorkflowPage.vue'

describe('WorkflowPage', () => {
  it('shows the progress bar for guided workflows', () => {
    const wrapper = mount(WorkflowPage, {
      props: {
        progressPercent: '50',
        ariaLabel: 'Reconciliation setup progress',
      },
      slots: {
        default: '<div data-testid="workflow-content">Setup</div>',
      },
    })

    expect(wrapper.find('.wizard-progress').exists()).toBe(true)
    expect(wrapper.get('.wizard-progress').attributes()).toMatchObject({
      role: 'progressbar',
      'aria-label': 'Reconciliation setup progress',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-valuenow': '50',
    })
    expect(wrapper.find('.workflow-page--edit').exists()).toBe(false)
    expect(wrapper.get('[data-testid="workflow-content"]').text()).toBe('Setup')
  })

  it('hides the progress bar for edit workflow surfaces', () => {
    const wrapper = mount(WorkflowPage, {
      props: {
        progressPercent: '100',
        ariaLabel: 'Run settings edit progress',
        editSurface: true,
      },
      slots: {
        default: '<div data-testid="workflow-content">Edit</div>',
      },
    })

    expect(wrapper.find('.wizard-progress').exists()).toBe(false)
    expect(wrapper.find('.workflow-page--edit').exists()).toBe(true)
    expect(wrapper.get('[data-testid="workflow-content"]').text()).toBe('Edit')
  })

  it('keeps the workflow shell pinned to the second grid row so edit layouts stay vertically aligned without a visible progress bar', () => {
    const styleSource = readFileSync('src/style.css', 'utf8')

    expect(styleSource).toMatch(/\.workflow-shell\s*\{[^}]*grid-row: 2;/)
  })
})
