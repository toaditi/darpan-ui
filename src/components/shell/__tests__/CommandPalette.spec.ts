import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CommandPalette from '../CommandPalette.vue'
import type { CommandAction } from '../../../lib/types/ux'

const actions: CommandAction[] = [
  {
    id: 'navigate-dashboard',
    label: 'Go to Dashboard',
    description: 'Open the main workspace.',
    group: 'Navigate',
    to: '/',
    aliases: ['home', 'dashboard'],
  },
  {
    id: 'navigate-ai-settings',
    label: 'Open AI Settings',
    description: 'Manage providers and API keys.',
    group: 'Navigate',
    to: '/settings/ai',
    aliases: ['ai', 'openai', 'api key'],
  },
  {
    id: 'navigate-run-reconciliation',
    label: 'Run Reconciliation',
    description: 'Compare two files and review the result.',
    group: 'Navigate',
    to: '/reconciliation/pilot-diff',
    aliases: ['compare files', 'reconcile'],
  },
]

describe('CommandPalette', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  async function triggerSearchKey(
    wrapper: ReturnType<typeof mount<typeof CommandPalette>>,
    key: string,
  ): Promise<void> {
    await wrapper.get('#command-palette-search').trigger('keydown', { key })
  }

  it('moves the active result down with arrow keys and executes that result on Enter', async () => {
    const wrapper = mount(CommandPalette, {
      attachTo: document.body,
      global: {
        stubs: {
          teleport: true,
        },
      },
      props: {
        open: true,
        actions,
      },
    })

    await wrapper.vm.$nextTick()

    const input = wrapper.get('#command-palette-search')
    expect(wrapper.text()).toContain('Use Up/Down to select a result. Press Enter to open the selected match.')
    expect(input.attributes('aria-activedescendant')).toBe('command-palette-option-navigate-dashboard')
    expect(wrapper.findAll('.command-item')[0]?.classes()).toContain('command-item--active')

    await triggerSearchKey(wrapper, 'ArrowDown')

    const items = wrapper.findAll('.command-item')
    expect(items[1]?.classes()).toContain('command-item--active')
    expect(items[0]?.classes()).not.toContain('command-item--active')
    expect(wrapper.get('#command-palette-search').attributes('aria-activedescendant')).toBe(
      'command-palette-option-navigate-ai-settings',
    )

    await triggerSearchKey(wrapper, 'Enter')

    expect(wrapper.emitted('execute')?.[0]?.[0]).toMatchObject({ id: 'navigate-ai-settings' })
  })

  it('moves the active result up from the first item to the last visible item', async () => {
    const wrapper = mount(CommandPalette, {
      attachTo: document.body,
      global: {
        stubs: {
          teleport: true,
        },
      },
      props: {
        open: true,
        actions,
      },
    })

    await wrapper.vm.$nextTick()

    await triggerSearchKey(wrapper, 'ArrowUp')

    const items = wrapper.findAll('.command-item')
    expect(items[2]?.classes()).toContain('command-item--active')
    expect(wrapper.get('#command-palette-search').attributes('aria-activedescendant')).toBe(
      'command-palette-option-navigate-run-reconciliation',
    )

    await triggerSearchKey(wrapper, 'Enter')

    expect(wrapper.emitted('execute')?.[0]?.[0]).toMatchObject({ id: 'navigate-run-reconciliation' })
  })

  it('suppresses stale hover highlighting after arrow-key navigation changes the active result', async () => {
    const wrapper = mount(CommandPalette, {
      attachTo: document.body,
      global: {
        stubs: {
          teleport: true,
        },
      },
      props: {
        open: true,
        actions,
      },
    })

    await wrapper.vm.$nextTick()

    const items = wrapper.findAll('.command-item')
    await items[0]!.trigger('mouseenter')

    expect(wrapper.get('.command-panel').classes()).not.toContain('command-panel--keyboard')
    expect(items[0]!.classes()).toContain('command-item--active')

    await triggerSearchKey(wrapper, 'ArrowDown')

    const updatedItems = wrapper.findAll('.command-item')
    expect(wrapper.get('.command-panel').classes()).toContain('command-panel--keyboard')
    expect(updatedItems[1]!.classes()).toContain('command-item--active')
    expect(updatedItems[0]!.classes()).not.toContain('command-item--active')
  })
})
