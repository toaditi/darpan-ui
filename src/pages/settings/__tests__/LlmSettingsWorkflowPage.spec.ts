import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, shallowReactive } from 'vue'

const routeControls = vi.hoisted(() => ({
  route: null as {
    params: Record<string, string>
    name: string
    fullPath: string
  } | null,
  setRoute(nextRoute: { params?: Record<string, string>; name?: string; fullPath?: string }) {
    if (!this.route) throw new Error('Route state not initialized.')
    this.route.params = nextRoute.params ?? {}
    this.route.name = nextRoute.name ?? 'settings-ai-create'
    this.route.fullPath = nextRoute.fullPath ?? '/settings/ai/create'
  },
  reset() {
    this.setRoute({
      params: {},
      name: 'settings-ai-create',
      fullPath: '/settings/ai/create',
    })
  },
}))
const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const getLlmSettings = vi.hoisted(() => vi.fn())
const saveLlmSettings = vi.hoisted(() => vi.fn())

vi.mock('vue-router', () => {
  routeControls.route = shallowReactive({
    params: {} as Record<string, string>,
    name: 'settings-ai-create',
    fullPath: '/settings/ai/create',
  })

  return {
    useRoute: () => routeControls.route,
    useRouter: () => ({
      push,
    }),
  }
})

vi.mock('../../../lib/api/facade', () => ({
  settingsFacade: {
    getLlmSettings,
    saveLlmSettings,
  },
}))

import LlmSettingsWorkflowPage from '../LlmSettingsWorkflowPage.vue'

describe('LlmSettingsWorkflowPage', () => {
  beforeEach(() => {
    routeControls.reset()
    push.mockReset()
    getLlmSettings.mockReset()
    saveLlmSettings.mockReset()
  })

  it('saves a new AI provider config from the stepped workflow and returns to the AI dashboard', async () => {
    saveLlmSettings.mockResolvedValue({
      ok: true,
      messages: ['Saved LLM settings.'],
      errors: [],
    })

    const wrapper = mount(LlmSettingsWorkflowPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Which AI provider should Darpan configure?')

    await wrapper.get('[data-testid="llm-provider"]').trigger('click')
    await wrapper.get('[data-testid="workflow-select-option"][data-option-value="GEMINI"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    expect((wrapper.get('input[name="llmModel"]').element as HTMLInputElement).value).toBe('')

    await wrapper.get('input[name="llmModel"]').setValue('gemini-2.5-pro')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    expect((wrapper.get('input[name="llmBaseUrl"]').element as HTMLInputElement).value).toBe('')

    await wrapper.get('input[name="llmBaseUrl"]').setValue('https://generativelanguage.googleapis.com/v1beta')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    expect((wrapper.get('input[name="llmTimeoutSeconds"]').element as HTMLInputElement).value).toBe('')

    await wrapper.get('input[name="llmTimeoutSeconds"]').setValue('60')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('input[name="llmApiKey"]').setValue('gemini-secret')
    await wrapper.get('[data-testid="save-llm-settings"]').trigger('click')
    await flushPromises()

    expect(saveLlmSettings).toHaveBeenCalledWith({
      llmProvider: 'GEMINI',
      llmModel: 'gemini-2.5-pro',
      llmBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      llmTimeoutSeconds: '60',
      llmEnabled: 'Y',
      llmApiKey: 'gemini-secret',
    })
    expect(push).toHaveBeenCalledWith('/settings/ai')
  })

  it('loads an existing provider into the compact edit form', async () => {
    routeControls.setRoute({
      params: { llmProvider: 'GEMINI' },
      name: 'settings-ai-edit',
      fullPath: '/settings/ai/edit/GEMINI',
    })
    getLlmSettings.mockResolvedValue({
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
        hasFallbackLlmApiKey: true,
        fallbackLlmKeyEnvName: 'GEMINI_API_KEY',
      },
    })

    const wrapper = mount(LlmSettingsWorkflowPage)
    await flushPromises()

    expect(getLlmSettings).toHaveBeenCalledWith({ llmProvider: 'GEMINI' })
    expect(wrapper.get('[data-testid="llm-provider"]').classes()).toContain('app-select-trigger--disabled')
    expect(wrapper.get('[data-testid="llm-provider"]').text()).toContain('Gemini')
    expect((wrapper.get('input[name="llmModel"]').element as HTMLInputElement).value).toBe('gemini-2.5-flash')
    expect((wrapper.get('input[name="llmBaseUrl"]').element as HTMLInputElement).value).toBe(
      'https://generativelanguage.googleapis.com',
    )
    expect((wrapper.get('input[name="llmTimeoutSeconds"]').element as HTMLInputElement).value).toBe('45')
    expect(wrapper.get('[data-testid="llm-enabled"]').text()).toContain('No')
    expect(wrapper.text()).toContain('Environment fallback GEMINI_API_KEY is currently active.')
  })

  it('shows an X cancel action on edit and returns to the AI dashboard without saving', async () => {
    routeControls.setRoute({
      params: { llmProvider: 'OPENAI' },
      name: 'settings-ai-edit',
      fullPath: '/settings/ai/edit/OPENAI',
    })
    getLlmSettings.mockResolvedValue({
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
    })

    const wrapper = mount(LlmSettingsWorkflowPage)
    await flushPromises()

    const cancelButton = wrapper.get('[data-testid="cancel-llm-settings"]')
    expect(cancelButton.attributes('aria-label')).toBe('Cancel')
    expect(cancelButton.classes()).toContain('app-icon-action')
    expect(cancelButton.classes()).toContain('app-icon-action--large')

    await cancelButton.trigger('click')

    expect(push).toHaveBeenCalledWith('/settings/ai')
    expect(saveLlmSettings).not.toHaveBeenCalled()
  })

  it('clears writeable fields when the shared page instance switches from edit into create', async () => {
    routeControls.setRoute({
      params: { llmProvider: 'OPENAI' },
      name: 'settings-ai-edit',
      fullPath: '/settings/ai/edit/OPENAI',
    })
    getLlmSettings.mockResolvedValue({
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
    })

    const wrapper = mount(LlmSettingsWorkflowPage)
    await flushPromises()

    expect((wrapper.get('input[name="llmModel"]').element as HTMLInputElement).value).toBe('gpt-4.1-mini')

    routeControls.setRoute({
      params: {},
      name: 'settings-ai-create',
      fullPath: '/settings/ai/create',
    })
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('Which AI provider should Darpan configure?')

    await wrapper.get('[data-testid="llm-provider"]').trigger('click')
    await wrapper.get('[data-testid="workflow-select-option"][data-option-value="OPENAI"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    const modelInput = wrapper.get('input[name="llmModel"]')
    expect((modelInput.element as HTMLInputElement).value).toBe('')
    expect(modelInput.attributes('placeholder')).toBe('gpt-4.1-mini')

    await modelInput.setValue('gpt-4.1-mini')
    await wrapper.get('[data-testid="wizard-next"]').trigger('click')

    const baseUrlInput = wrapper.get('input[name="llmBaseUrl"]')
    expect((baseUrlInput.element as HTMLInputElement).value).toBe('')
    expect(baseUrlInput.attributes('placeholder')).toBe('https://api.openai.com')
  })

  it('uses the shared compact workflow contracts for AI create and edit', () => {
    const pageSource = readFileSync('src/pages/settings/LlmSettingsWorkflowPage.vue', 'utf8')
    const styleSource = readFileSync('src/style.css', 'utf8')

    expect(pageSource).toContain("'workflow-form--compact'")
    expect(pageSource).toContain("'workflow-form--edit-single-page': isEditing")
    expect(pageSource).toContain(':show-enter-hint="!isEditing"')
    expect(pageSource).toContain('workflow-form-grid workflow-form-grid--two')
    expect(pageSource).toContain('workflow-form-textarea workflow-form-textarea--single-row')
    expect(styleSource).toContain('.workflow-form--edit-single-page {')
  })
})
