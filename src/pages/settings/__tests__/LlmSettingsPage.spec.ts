import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ApiCallError } from '../../../lib/api/client'

const getLlmSettings = vi.hoisted(() => vi.fn())
const saveLlmSettings = vi.hoisted(() => vi.fn())

vi.mock('../../../lib/api/facade', () => ({
  settingsFacade: {
    getLlmSettings,
    saveLlmSettings,
  },
}))

import LlmSettingsPage from '../LlmSettingsPage.vue'

describe('LlmSettingsPage', () => {
  beforeEach(() => {
    getLlmSettings.mockReset()
    saveLlmSettings.mockReset()
  })

  it('keeps the form unavailable until the initial settings load succeeds', async () => {
    getLlmSettings.mockRejectedValue(new ApiCallError('Unable to connect to Darpan right now. Try again in a moment.', 503))

    const wrapper = mount(LlmSettingsPage)
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.text()).toContain('Load the current provider settings before making changes.')
    expect(wrapper.text()).toContain('Unable to connect to Darpan right now. Try again in a moment.')
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
    expect(wrapper.findAll('button').some((button) => button.text().includes('Retry Loading Settings'))).toBe(true)
    expect(saveLlmSettings).not.toHaveBeenCalled()
  })

  it('restores the current save flow after a successful load', async () => {
    getLlmSettings.mockResolvedValue({
      llmSettings: {
        llmProvider: 'GEMINI',
        llmModel: 'gemini-2.5-pro',
        llmBaseUrl: 'https://generativelanguage.googleapis.com',
        llmTimeoutSeconds: '60',
        llmEnabled: 'N',
        hasStoredLlmApiKey: false,
        hasFallbackLlmApiKey: true,
        fallbackLlmKeyEnvName: 'DARPAN_GEMINI_API_KEY',
      },
    })
    saveLlmSettings.mockResolvedValue({
      ok: true,
      messages: ['Saved LLM settings.'],
      errors: [],
    })

    const wrapper = mount(LlmSettingsPage)
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('Stored API key for GEMINI: No (environment fallback DARPAN_GEMINI_API_KEY active)')

    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(saveLlmSettings).toHaveBeenCalledWith({
      llmProvider: 'GEMINI',
      llmModel: 'gemini-2.5-pro',
      llmBaseUrl: 'https://generativelanguage.googleapis.com',
      llmTimeoutSeconds: '60',
      llmEnabled: 'N',
      llmApiKey: '',
    })
  })
})
