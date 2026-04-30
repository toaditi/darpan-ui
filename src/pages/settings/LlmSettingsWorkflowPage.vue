<template>
  <WorkflowPage :progress-percent="progressPercent" aria-label="AI provider setup progress" center-stage :edit-surface="isEditing">
    <InlineValidation v-if="error" tone="error" :message="error" />
    <p v-if="success" class="success-copy">{{ success }}</p>

    <WorkflowStepForm
      :class="[
        'workflow-form--compact',
        {
          'workflow-form--edit-single-page': isEditing,
        },
      ]"
      :question="currentQuestion"
      :primary-label="primaryLabel"
      :primary-action-variant="primaryActionVariant"
      :show-enter-hint="!isEditing"
      :show-back="showBack"
      :show-cancel-action="isEditing"
      :cancel-disabled="loading"
      cancel-test-id="cancel-llm-settings"
      :allow-select-enter="isCreateSelectStep"
      :submit-disabled="submitDisabled"
      :show-primary-action="canManageGlobalSettings"
      :primary-test-id="primaryTestId"
      @submit="handlePrimarySubmit"
      @back="goBack"
      @cancel="cancelEdit"
    >
      <template v-if="isEditing">
        <div class="workflow-form-grid workflow-form-grid--two">
          <label class="wizard-input-shell">
            <span class="workflow-context-label">Provider</span>
            <AppSelect
              v-model="form.llmProvider"
              :options="providerOptions"
              :disabled="true"
              test-id="llm-provider"
            />
          </label>

          <label class="wizard-input-shell">
            <span class="workflow-context-label">Enabled</span>
            <AppSelect
              v-model="form.llmEnabled"
              :options="yesNoOptions"
              test-id="llm-enabled"
            />
          </label>
        </div>

        <div class="workflow-form-grid workflow-form-grid--two">
          <label class="wizard-input-shell">
            <span class="workflow-context-label">Model</span>
            <input
              name="llmModel"
              v-model="form.llmModel"
              class="wizard-answer-control"
              type="text"
              placeholder="gpt-4.1-mini"
            />
          </label>

          <label class="wizard-input-shell">
            <span class="workflow-context-label">Timeout (seconds)</span>
            <input
              name="llmTimeoutSeconds"
              v-model="form.llmTimeoutSeconds"
              class="wizard-answer-control"
              type="number"
              min="1"
            />
          </label>
        </div>

        <label class="wizard-input-shell">
          <span class="workflow-context-label">Base URL</span>
          <input
            name="llmBaseUrl"
            v-model="form.llmBaseUrl"
            class="wizard-answer-control"
            type="url"
            placeholder="https://api.openai.com"
          />
        </label>

        <label class="wizard-input-shell">
          <span class="workflow-context-label">API Key (leave blank to keep existing)</span>
          <textarea
            name="llmApiKey"
            v-model="form.llmApiKey"
            class="wizard-answer-control workflow-form-textarea workflow-form-textarea--single-row"
            rows="1"
            placeholder="Enter a new API key only when needed"
          />
        </label>

        <p v-if="storedKeyStatus" class="muted-copy">{{ storedKeyStatus }}</p>
      </template>

      <template v-else>
        <label v-if="currentCreateStep.id === 'llmProvider'" class="wizard-input-shell">
          <WorkflowSelect
            v-model="form.llmProvider"
            test-id="llm-provider"
            :options="providerOptions"
            placeholder="Select provider"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'llmEnabled'" class="wizard-input-shell">
          <WorkflowSelect
            v-model="form.llmEnabled"
            test-id="llm-enabled"
            :options="yesNoOptions"
            placeholder="Select enabled state"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'llmModel'" class="wizard-input-shell">
          <input
            name="llmModel"
            v-model="form.llmModel"
            :class="['wizard-answer-control', { empty: !form.llmModel.trim() }]"
            type="text"
            :placeholder="createModelPlaceholder"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'llmBaseUrl'" class="wizard-input-shell">
          <input
            name="llmBaseUrl"
            v-model="form.llmBaseUrl"
            :class="['wizard-answer-control', { empty: !normalizeTextValue(form.llmBaseUrl) }]"
            type="url"
            :placeholder="createBaseUrlPlaceholder"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'llmTimeoutSeconds'" class="wizard-input-shell">
          <input
            name="llmTimeoutSeconds"
            v-model="form.llmTimeoutSeconds"
            :class="['wizard-answer-control', { empty: !normalizeTextValue(form.llmTimeoutSeconds) }]"
            type="number"
            min="1"
            :placeholder="createTimeoutPlaceholder"
          />
        </label>

        <label v-else class="wizard-input-shell">
          <input
            name="llmApiKey"
            v-model="form.llmApiKey"
            class="wizard-answer-control"
            type="password"
            autocomplete="off"
            placeholder="Enter API key if needed"
          />
        </label>
      </template>
    </WorkflowStepForm>
  </WorkflowPage>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorkflowPage from '../../components/workflow/WorkflowPage.vue'
import WorkflowSelect, { type WorkflowSelectOption } from '../../components/workflow/WorkflowSelect.vue'
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import AppSelect, { type AppSelectOption } from '../../components/ui/AppSelect.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import { useUiPermissions } from '../../lib/auth'

type LlmProvider = 'OPENAI' | 'GEMINI'
type CreateStepId = 'llmProvider' | 'llmEnabled' | 'llmModel' | 'llmBaseUrl' | 'llmTimeoutSeconds' | 'llmApiKey'

interface CreateStep {
  id: CreateStepId
  title: string
  kind: 'select' | 'text' | 'password' | 'number'
}

interface LlmForm {
  llmProvider: string
  llmModel: string
  llmBaseUrl: string
  llmTimeoutSeconds: string
  llmEnabled: string
  llmApiKey: string
}

const route = useRoute()
const router = useRouter()
const permissions = useUiPermissions()

const providerDefaults: Record<LlmProvider, { llmModel: string; llmBaseUrl: string; llmTimeoutSeconds: string }> = {
  OPENAI: {
    llmModel: 'gpt-4.1-mini',
    llmBaseUrl: 'https://api.openai.com',
    llmTimeoutSeconds: '45',
  },
  GEMINI: {
    llmModel: 'gemini-2.0-flash',
    llmBaseUrl: 'https://generativelanguage.googleapis.com',
    llmTimeoutSeconds: '45',
  },
}

const providerOptions: WorkflowSelectOption[] & AppSelectOption[] = [
  { value: 'OPENAI', label: 'OpenAI' },
  { value: 'GEMINI', label: 'Gemini' },
]
const yesNoOptions: WorkflowSelectOption[] & AppSelectOption[] = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
]
const createSteps: CreateStep[] = [
  { id: 'llmProvider', title: 'Which AI provider should Darpan configure?', kind: 'select' },
  { id: 'llmEnabled', title: 'Should this provider be enabled?', kind: 'select' },
  { id: 'llmModel', title: 'What model should this provider use?', kind: 'text' },
  { id: 'llmBaseUrl', title: 'What base URL should this provider use?', kind: 'text' },
  { id: 'llmTimeoutSeconds', title: 'What timeout should this provider use in seconds?', kind: 'number' },
  { id: 'llmApiKey', title: 'What API key should this provider use?', kind: 'password' },
]

const form = reactive<LlmForm>({
  llmProvider: '',
  llmModel: '',
  llmBaseUrl: '',
  llmTimeoutSeconds: '',
  llmEnabled: 'Y',
  llmApiKey: '',
})

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const currentStepIndex = ref(0)
const hasStoredLlmApiKey = ref(false)
const hasFallbackLlmApiKey = ref(false)
const fallbackLlmKeyEnvName = ref('')
const loadVersion = ref(0)
const canManageGlobalSettings = computed(() => permissions.canManageGlobalSettings)

const activeProvider = computed(() => normalizeProvider(route.params.llmProvider))
const isEditing = computed(() => activeProvider.value !== '')
const currentCreateStep = computed<CreateStep>(() => {
  const lastStepIndex = Math.max(0, createSteps.length - 1)
  return createSteps[Math.min(currentStepIndex.value, lastStepIndex)] ?? createSteps[0]!
})
const progressPercent = computed(() => (
  isEditing.value
    ? '100'
    : ((Math.max(1, currentStepIndex.value + 1) / createSteps.length) * 100).toFixed(2)
))
const currentQuestion = computed(() => (
  isEditing.value
    ? 'Update the AI provider settings.'
    : currentCreateStep.value.title
))
const primaryLabel = computed(() => (
  isEditing.value || currentCreateStep.value.id === 'llmApiKey'
    ? 'Save'
    : 'OK'
))
const primaryTestId = computed(() => (
  isEditing.value || currentCreateStep.value.id === 'llmApiKey'
    ? 'save-llm-settings'
    : 'wizard-next'
))
const primaryActionVariant = computed<'default' | 'save'>(() => (
  isEditing.value || currentCreateStep.value.id === 'llmApiKey'
    ? 'save'
    : 'default'
))
const showBack = computed(() => !isEditing.value && currentStepIndex.value > 0)
const isCreateSelectStep = computed(() => !isEditing.value && currentCreateStep.value.kind === 'select')
const submitDisabled = computed(() => {
  if (!canManageGlobalSettings.value) return true
  if (loading.value) return true
  if (isEditing.value) return false

  switch (currentCreateStep.value.id) {
    case 'llmProvider':
      return normalizeProvider(form.llmProvider) === ''
    case 'llmModel':
      return normalizeTextValue(form.llmModel).length === 0
    case 'llmBaseUrl':
      return normalizeTextValue(form.llmBaseUrl).length === 0
    case 'llmTimeoutSeconds':
      return !/^\d+$/.test(normalizeTextValue(form.llmTimeoutSeconds)) || Number(form.llmTimeoutSeconds) < 1
    default:
      return false
  }
})
const storedKeyStatus = computed(() => {
  if (hasStoredLlmApiKey.value) {
    return 'A stored API key is already configured for this provider.'
  }
  if (hasFallbackLlmApiKey.value && fallbackLlmKeyEnvName.value) {
    return `Environment fallback ${fallbackLlmKeyEnvName.value} is currently active.`
  }
  return 'No stored API key is configured yet.'
})
const createProviderDefaults = computed(() => {
  const normalizedProvider = normalizeProvider(form.llmProvider)
  return normalizedProvider ? providerDefaults[normalizedProvider] : null
})
const createModelPlaceholder = computed(() => createProviderDefaults.value?.llmModel ?? 'Enter model')
const createBaseUrlPlaceholder = computed(() => createProviderDefaults.value?.llmBaseUrl ?? 'Enter base URL')
const createTimeoutPlaceholder = computed(() => createProviderDefaults.value?.llmTimeoutSeconds ?? 'Enter timeout')

function normalizeTextValue(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeProvider(rawProvider: unknown): LlmProvider | '' {
  const normalized = normalizeTextValue(rawProvider).toUpperCase()
  if (normalized === 'OPENAI' || normalized === 'GEMINI') return normalized
  return ''
}

async function load(): Promise<void> {
  if (!canManageGlobalSettings.value) {
    error.value = 'Only super admins can access AI settings.'
    return
  }

  const provider = activeProvider.value
  if (!provider) return

  const currentLoadVersion = ++loadVersion.value
  loading.value = true
  error.value = null
  try {
    const response = await settingsFacade.getLlmSettings({ llmProvider: provider })
    if (currentLoadVersion !== loadVersion.value || !isEditing.value || activeProvider.value !== provider) return

    const settings = response.llmSettings
    if (!settings) {
      error.value = `Unable to find AI provider "${provider}".`
      return
    }
    form.llmProvider = settings.llmProvider ?? provider
    form.llmModel = settings.llmModel ?? ''
    form.llmBaseUrl = settings.llmBaseUrl ?? ''
    form.llmTimeoutSeconds = settings.llmTimeoutSeconds ?? ''
    form.llmEnabled = settings.llmEnabled ?? 'Y'
    form.llmApiKey = ''
    hasStoredLlmApiKey.value = !!settings.hasStoredLlmApiKey
    hasFallbackLlmApiKey.value = !!settings.hasFallbackLlmApiKey
    fallbackLlmKeyEnvName.value = settings.fallbackLlmKeyEnvName ?? ''
  } catch (loadError) {
    if (currentLoadVersion !== loadVersion.value || !isEditing.value || activeProvider.value !== provider) return
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load AI provider settings.'
  } finally {
    if (currentLoadVersion === loadVersion.value) {
      loading.value = false
    }
  }
}

function resetCreateForm(): void {
  loadVersion.value += 1
  loading.value = false
  error.value = null
  success.value = null
  currentStepIndex.value = 0
  form.llmProvider = ''
  form.llmModel = ''
  form.llmBaseUrl = ''
  form.llmTimeoutSeconds = ''
  form.llmEnabled = 'Y'
  form.llmApiKey = ''
  hasStoredLlmApiKey.value = false
  hasFallbackLlmApiKey.value = false
  fallbackLlmKeyEnvName.value = ''
}

function initializeForRoute(): void {
  error.value = null
  success.value = null

  if (!isEditing.value) {
    resetCreateForm()
    return
  }

  currentStepIndex.value = 0
  form.llmProvider = activeProvider.value
  form.llmModel = ''
  form.llmBaseUrl = ''
  form.llmTimeoutSeconds = ''
  form.llmEnabled = 'Y'
  form.llmApiKey = ''
  hasStoredLlmApiKey.value = false
  hasFallbackLlmApiKey.value = false
  fallbackLlmKeyEnvName.value = ''
  void load()
}

function goNext(): void {
  currentStepIndex.value = Math.min(currentStepIndex.value + 1, createSteps.length - 1)
}

function goBack(): void {
  error.value = null
  currentStepIndex.value = Math.max(currentStepIndex.value - 1, 0)
}

async function handlePrimarySubmit(): Promise<void> {
  if (isEditing.value || currentCreateStep.value.id === 'llmApiKey') {
    await save()
    return
  }

  goNext()
}

async function save(): Promise<void> {
  if (!canManageGlobalSettings.value) {
    error.value = 'Only super admins can update AI settings.'
    return
  }

  loading.value = true
  error.value = null
  success.value = null
  try {
    const response = await settingsFacade.saveLlmSettings({
      llmProvider: normalizeProvider(form.llmProvider),
      llmModel: normalizeTextValue(form.llmModel),
      llmBaseUrl: normalizeTextValue(form.llmBaseUrl),
      llmTimeoutSeconds: normalizeTextValue(form.llmTimeoutSeconds),
      llmEnabled: form.llmEnabled,
      llmApiKey: form.llmApiKey,
    })
    form.llmApiKey = ''
    success.value = response.messages?.[0] ?? 'Saved LLM settings.'
    await router.push('/settings/ai')
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save AI provider settings.'
  } finally {
    loading.value = false
  }
}

async function cancelEdit(): Promise<void> {
  if (!isEditing.value || loading.value) return
  await router.push('/settings/ai')
}

watch(() => route.fullPath, initializeForRoute, { immediate: true })
</script>
