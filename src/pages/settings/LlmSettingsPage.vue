<template>
  <main class="page-root">
    <FormSection title="LLM Settings" description="Configure provider credentials for rule workspace generation.">
      <form class="stack-lg" @submit.prevent="save">
        <div class="field-grid two">
          <label>
            <span>Provider</span>
            <select v-model="form.llmProvider">
              <option value="OPENAI">OpenAI</option>
              <option value="GEMINI">Gemini</option>
            </select>
          </label>
          <label>
            <span>Enabled</span>
            <select v-model="form.llmEnabled">
              <option value="Y">Yes</option>
              <option value="N">No</option>
            </select>
          </label>
        </div>

        <div class="field-grid two">
          <label>
            <span>Model</span>
            <input v-model="form.llmModel" type="text" />
          </label>
          <label>
            <span>Timeout (seconds)</span>
            <input v-model="form.llmTimeoutSeconds" type="number" min="1" />
          </label>
        </div>

        <label>
          <span>Base URL</span>
          <input v-model="form.llmBaseUrl" type="url" />
        </label>

        <label>
          <span>API Key (leave blank to keep existing)</span>
          <input v-model="form.llmApiKey" type="password" autocomplete="off" />
        </label>

        <p class="muted-copy" v-if="storedKeyStatus">
          {{ storedKeyStatus }}
        </p>

        <div class="action-row">
          <button type="submit" :disabled="loading">Save Provider Settings</button>
        </div>
      </form>

      <InlineValidation v-if="error" tone="error" :message="error" />
      <p v-if="success" class="success-copy">{{ success }}</p>
    </FormSection>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import FormSection from '../../components/ui/FormSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'

interface LlmForm {
  llmProvider: string
  llmModel: string
  llmBaseUrl: string
  llmTimeoutSeconds: string
  llmEnabled: string
  llmApiKey: string
}

const form = reactive<LlmForm>({
  llmProvider: 'OPENAI',
  llmModel: '',
  llmBaseUrl: '',
  llmTimeoutSeconds: '45',
  llmEnabled: 'Y',
  llmApiKey: '',
})

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const hasStoredLlmApiKey = ref(false)
const hasFallbackLlmApiKey = ref(false)
const fallbackLlmKeyEnvName = ref('')

const storedKeyStatus = computed(() => {
  if (hasStoredLlmApiKey.value) {
    return `Stored API key for ${form.llmProvider}: Yes`
  }
  if (hasFallbackLlmApiKey.value) {
    return `Stored API key for ${form.llmProvider}: No (environment fallback ${fallbackLlmKeyEnvName.value} active)`
  }
  return `Stored API key for ${form.llmProvider}: No`
})

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  success.value = null
  try {
    const response = await settingsFacade.getLlmSettings()
    const settings = response.llmSettings
    if (settings) {
      form.llmProvider = settings.llmProvider ?? 'OPENAI'
      form.llmModel = settings.llmModel ?? ''
      form.llmBaseUrl = settings.llmBaseUrl ?? ''
      form.llmTimeoutSeconds = settings.llmTimeoutSeconds ?? '45'
      form.llmEnabled = settings.llmEnabled ?? 'Y'
      form.llmApiKey = ''
      hasStoredLlmApiKey.value = !!settings.hasStoredLlmApiKey
      hasFallbackLlmApiKey.value = !!settings.hasFallbackLlmApiKey
      fallbackLlmKeyEnvName.value = settings.fallbackLlmKeyEnvName ?? ''
    }
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load LLM settings.'
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  loading.value = true
  error.value = null
  success.value = null
  try {
    const response = await settingsFacade.saveLlmSettings({
      llmProvider: form.llmProvider,
      llmModel: form.llmModel,
      llmBaseUrl: form.llmBaseUrl,
      llmTimeoutSeconds: form.llmTimeoutSeconds,
      llmEnabled: form.llmEnabled,
      llmApiKey: form.llmApiKey,
    })
    form.llmApiKey = ''
    success.value = response.messages?.[0] ?? 'Saved LLM settings.'
    await load()
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save LLM settings.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
