import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import WorkflowShortcutChoiceCards from '../WorkflowShortcutChoiceCards.vue'

describe('WorkflowShortcutChoiceCards', () => {
  it('renders keyed choice cards with the shared shortcut contract', () => {
    const wrapper = mount(WorkflowShortcutChoiceCards, {
      props: {
        selectedValue: 'json',
        testIdPrefix: 'filetype-choice',
        options: [
          { value: 'csv', label: 'CSV', shortcutKey: 'A' },
          { value: 'json', label: 'JSON', shortcutKey: 'B' },
        ],
      },
    })

    const csvChoice = wrapper.get('[data-testid="filetype-choice-csv"]')
    const jsonChoice = wrapper.get('[data-testid="filetype-choice-json"]')

    expect(wrapper.findAll('.workflow-shortcut-choice-card')).toHaveLength(2)
    expect(csvChoice.attributes('aria-keyshortcuts')).toBe('a')
    expect(jsonChoice.attributes('aria-keyshortcuts')).toBe('b')
    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('B')
    expect(jsonChoice.classes()).toContain('workflow-shortcut-choice-card--active')
    expect(csvChoice.classes()).not.toContain('workflow-shortcut-choice-card--active')
  })

  it('emits the selected value when a card is clicked', async () => {
    const wrapper = mount(WorkflowShortcutChoiceCards, {
      props: {
        options: [
          { value: 'schema', label: 'Schema file', shortcutKey: 'A' },
          { value: 'sample', label: 'Sample file', shortcutKey: 'B' },
        ],
      },
    })

    await wrapper.get('[data-testid="workflow-shortcut-choice-sample"]').trigger('click')

    expect(wrapper.emitted('choose')).toEqual([[ 'sample' ]])
  })
})
