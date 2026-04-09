import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const getLlmSettings = vi.hoisted(() => vi.fn())
const saveLlmSettings = vi.hoisted(() => vi.fn())
const route = vi.hoisted(() => ({
  fullPath: '/settings/ai',
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)" v-bind="$attrs"><slot /></a>',
  },
  useRoute: () => route,
}))

vi.mock('../../../lib/api/facade', () => ({
  settingsFacade: {
    getLlmSettings,
    saveLlmSettings,
  },
}))

import LlmSettingsPage from '../LlmSettingsPage.vue'

describe('LlmSettingsPage', () => {
  beforeEach(() => {
    route.fullPath = '/settings/ai'
    getLlmSettings.mockReset()
    saveLlmSettings.mockReset()
  })

  it('renders a single primary LLM section and the remaining provider tiles', async () => {
    getLlmSettings.mockImplementation(async (payload?: { llmProvider?: string }) => {
      if (payload?.llmProvider === 'GEMINI') {
        return {
          ok: true,
          messages: [],
          errors: [],
          llmSettings: {
            activeProvider: 'OPENAI',
            llmProvider: 'GEMINI',
            llmModel: 'gemini-2.5-flash',
            llmBaseUrl: 'https://generativelanguage.googleapis.com',
            llmTimeoutSeconds: '45',
            llmEnabled: 'N',
            hasStoredLlmApiKey: false,
          },
        }
      }

      return {
        ok: true,
        messages: [],
        errors: [],
        llmSettings: {
          activeProvider: 'OPENAI',
          llmProvider: 'OPENAI',
          llmModel: 'gpt-4.1-mini',
          llmBaseUrl: 'https://api.openai.com',
          llmTimeoutSeconds: '45',
          llmEnabled: 'Y',
          hasStoredLlmApiKey: true,
        },
      }
    })

    const wrapper = mount(LlmSettingsPage)
    await flushPromises()

    expect(getLlmSettings).toHaveBeenCalledTimes(2)
    expect(getLlmSettings).toHaveBeenNthCalledWith(1, { llmProvider: 'OPENAI' })
    expect(getLlmSettings).toHaveBeenNthCalledWith(2, { llmProvider: 'GEMINI' })
    expect(wrapper.find('.static-page-frame').exists()).toBe(true)
    expect(wrapper.text()).toContain('LLM Configuration')
    expect(wrapper.text()).toContain('Primary LLM')
    expect(wrapper.text()).toContain('Other Providers')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[data-testid="primary-llm-drop-zone"] .static-page-tile-grid').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="llm-primary-tile"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('OpenAI')
    expect(wrapper.text()).toContain('Gemini')
    expect(wrapper.find('[data-testid="primary-llm-empty-state"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="llm-provider-tile"]')).toHaveLength(1)
    expect(JSON.parse(wrapper.find('[data-testid="llm-primary-tile"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'settings-ai-edit',
      params: { llmProvider: 'OPENAI' },
      state: {
        workflowOriginLabel: 'AI',
        workflowOriginPath: '/settings/ai',
      },
    })
    expect(JSON.parse(wrapper.find('[data-testid="llm-provider-tile"]').attributes('data-to') ?? '{}')).toEqual({
      name: 'settings-ai-edit',
      params: { llmProvider: 'GEMINI' },
      state: {
        workflowOriginLabel: 'AI',
        workflowOriginPath: '/settings/ai',
      },
    })
    expect(JSON.parse(wrapper.get('[data-testid="llm-create-action"]').attributes('data-to') ?? '{}')).toEqual({
      path: '/settings/ai/create',
      state: {
        workflowOriginLabel: 'AI',
        workflowOriginPath: '/settings/ai',
      },
    })
  })

  it('replaces the current primary LLM when another provider is dropped into the primary slot', async () => {
    getLlmSettings.mockImplementation(async (payload?: { llmProvider?: string }) => {
      if (payload?.llmProvider === 'GEMINI') {
        return {
          ok: true,
          messages: [],
          errors: [],
          llmSettings: {
            activeProvider: 'OPENAI',
            llmProvider: 'GEMINI',
            llmModel: 'gemini-2.5-flash',
            llmBaseUrl: 'https://generativelanguage.googleapis.com',
            llmTimeoutSeconds: '45',
            llmEnabled: 'N',
            hasStoredLlmApiKey: false,
          },
        }
      }

      return {
        ok: true,
        messages: [],
        errors: [],
        llmSettings: {
          activeProvider: 'OPENAI',
          llmProvider: 'OPENAI',
          llmModel: 'gpt-4.1-mini',
          llmBaseUrl: 'https://api.openai.com',
          llmTimeoutSeconds: '45',
          llmEnabled: 'Y',
          hasStoredLlmApiKey: true,
        },
      }
    })
    saveLlmSettings.mockResolvedValue({
      ok: true,
      messages: ['Saved LLM settings.'],
      errors: [],
    })

    const wrapper = mount(LlmSettingsPage)
    await flushPromises()

    const transferStore = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: 'move',
      setData: (type: string, value: string) => {
        transferStore.set(type, value)
      },
      getData: (type: string) => transferStore.get(type) ?? '',
    }

    await wrapper.find('[data-provider-id="provider:GEMINI"]').trigger('dragstart', { dataTransfer })
    await wrapper.find('[data-testid="primary-llm-drop-zone"]').trigger('drop', { dataTransfer })
    await flushPromises()

    expect(saveLlmSettings).toHaveBeenCalledWith({
      llmProvider: 'GEMINI',
      llmModel: 'gemini-2.5-flash',
      llmBaseUrl: 'https://generativelanguage.googleapis.com',
      llmTimeoutSeconds: '45',
      llmEnabled: 'N',
      llmApiKey: '',
    })
    expect(wrapper.find('[data-testid="primary-llm-drop-zone"]').text()).toContain('Gemini')
    expect(wrapper.find('[data-testid="other-llm-providers"]').text()).toContain('OpenAI')
    expect(wrapper.find('[data-testid="other-llm-providers"]').text()).not.toContain('Gemini')
  })

  it('restores the previous primary LLM when saving the dropped provider fails', async () => {
    getLlmSettings.mockImplementation(async (payload?: { llmProvider?: string }) => {
      if (payload?.llmProvider === 'GEMINI') {
        return {
          ok: true,
          messages: [],
          errors: [],
          llmSettings: {
            activeProvider: 'OPENAI',
            llmProvider: 'GEMINI',
            llmModel: 'gemini-2.5-flash',
            llmBaseUrl: 'https://generativelanguage.googleapis.com',
            llmTimeoutSeconds: '45',
            llmEnabled: 'N',
          },
        }
      }

      return {
        ok: true,
        messages: [],
        errors: [],
        llmSettings: {
          activeProvider: 'OPENAI',
          llmProvider: 'OPENAI',
          llmModel: 'gpt-4.1-mini',
          llmBaseUrl: 'https://api.openai.com',
          llmTimeoutSeconds: '45',
          llmEnabled: 'Y',
        },
      }
    })
    saveLlmSettings.mockRejectedValueOnce(new Error('save failed'))

    const wrapper = mount(LlmSettingsPage)
    await flushPromises()

    const transferStore = new Map<string, string>()
    const dataTransfer = {
      effectAllowed: 'move',
      setData: (type: string, value: string) => {
        transferStore.set(type, value)
      },
      getData: (type: string) => transferStore.get(type) ?? '',
    }

    await wrapper.find('[data-provider-id="provider:GEMINI"]').trigger('dragstart', { dataTransfer })
    await wrapper.find('[data-testid="primary-llm-drop-zone"]').trigger('drop', { dataTransfer })
    await flushPromises()

    expect(wrapper.find('[data-testid="primary-llm-drop-zone"]').text()).toContain('OpenAI')
    expect(wrapper.find('[data-testid="other-llm-providers"]').text()).toContain('Gemini')
  })

  it('shows an inline dashboard error when provider loading fails', async () => {
    getLlmSettings.mockResolvedValue({
      ok: true,
      messages: [],
      errors: ['Unable to load AI provider settings.'],
    })
    getLlmSettings.mockRejectedValueOnce(new Error('Unable to load AI provider settings.'))
    getLlmSettings.mockResolvedValueOnce({
      ok: true,
      messages: [],
      errors: [],
      llmSettings: {
        activeProvider: 'OPENAI',
        llmProvider: 'GEMINI',
        llmModel: 'gemini-2.5-flash',
        llmBaseUrl: 'https://generativelanguage.googleapis.com',
        llmTimeoutSeconds: '45',
        llmEnabled: 'N',
      },
    })

    const wrapper = mount(LlmSettingsPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Unable to load AI provider settings.')
    expect(wrapper.findAll('[data-testid="llm-provider-tile"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="llm-primary-tile"]')).toHaveLength(0)
  })
})
