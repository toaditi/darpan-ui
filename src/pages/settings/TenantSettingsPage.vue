<template>
  <StaticPageFrame :class="{ 'static-page-frame--popup-open': isPopupOpen }">
    <template #hero>
      <h1>{{ tenantSettingsTitle }}</h1>
    </template>

    <p v-if="summaryLoading" class="section-note">Loading tenant settings...</p>
    <InlineValidation v-if="summaryError" tone="error" :message="summaryError" />

    <StaticPageSection>
      <template #header>
        <div class="static-page-section-header-row">
          <h2 class="static-page-section-heading">AI Configuration</h2>
        </div>
      </template>

      <p v-if="!canManageGlobalSettings" class="section-note">Super admin only</p>
      <p v-else-if="aiLoading" class="section-note">Loading AI provider settings...</p>
      <InlineValidation v-else-if="aiError" tone="error" :message="aiError" />

      <div
        v-else-if="selectedAiProvider"
        class="static-page-tile-grid static-page-record-grid tenant-settings-list-grid"
        data-testid="tenant-ai-providers"
      >
        <button
          type="button"
          class="static-page-tile static-page-record-tile static-page-list-tile"
          data-testid="tenant-ai-provider-tile"
          @click="openAiProviderWorkflow"
        >
          <span class="tenant-settings-list-row">
            <span class="tenant-settings-list-main">
              <span class="static-page-tile-title static-page-list-tile__title">{{ selectedAiProvider.label }}</span>
              <span class="static-page-list-tile__meta">{{ selectedAiProvider.llmModel || 'Model not set' }}</span>
            </span>
            <span class="tenant-settings-list-status">{{ providerSummary(selectedAiProvider) }}</span>
          </span>
        </button>
      </div>
      <button
        v-else
        type="button"
        class="static-page-tile static-page-record-tile static-page-list-tile"
        data-testid="tenant-ai-provider-tile"
        @click="openAiProviderWorkflow"
      >
        <span class="tenant-settings-list-row">
          <span class="tenant-settings-list-main">
            <span class="static-page-tile-title static-page-list-tile__title">No AI provider selected</span>
            <span class="static-page-list-tile__meta">Configure a provider for this tenant.</span>
          </span>
          <span class="tenant-settings-list-status">Not configured</span>
        </span>
      </button>

      <p v-if="aiSuccess" class="section-note" role="status">{{ aiSuccess }}</p>
    </StaticPageSection>

    <StaticPageSection title="Localization">
      <div class="static-page-tile-grid static-page-record-grid tenant-settings-list-grid">
        <button
          type="button"
          class="static-page-tile static-page-record-tile static-page-list-tile"
          data-testid="tenant-module-timezone"
          @click="openTimezoneWorkflow"
        >
          <span class="tenant-settings-list-row">
            <span class="tenant-settings-list-main">
              <span class="static-page-tile-title static-page-list-tile__title">Timezone</span>
            </span>
            <span class="tenant-settings-list-status">{{ tenantTimezoneSummary }}</span>
          </span>
        </button>
      </div>
      <p v-if="timezoneWorkflowSuccess" class="section-note" role="status">{{ timezoneWorkflowSuccess }}</p>
    </StaticPageSection>

    <StaticPageSection title="Operations">
      <div class="static-page-tile-grid static-page-record-grid tenant-settings-list-grid">
        <button
          type="button"
          class="static-page-tile static-page-record-tile static-page-list-tile"
          data-testid="tenant-module-notifications"
          @click="openNotificationWorkflow"
        >
          <span class="tenant-settings-list-row">
            <span class="tenant-settings-list-main">
              <span class="static-page-tile-title static-page-list-tile__title">Notifications</span>
            </span>
            <span class="tenant-settings-list-status">{{ notificationSummary }}</span>
          </span>
        </button>
      </div>
      <p v-if="notificationWorkflowSuccess" class="section-note" role="status">{{ notificationWorkflowSuccess }}</p>
    </StaticPageSection>
  </StaticPageFrame>

  <div
    v-if="isPopupOpen"
    class="popup-workflow-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="tenant-settings-workflow-title"
    @click.self="closePopup"
  >
    <section class="popup-workflow-modal workflow-panel">
      <header class="workflow-panel-header">
        <h2 id="tenant-settings-workflow-title">{{ popupTitle }}</h2>
      </header>

      <div class="workflow-step-wrapper">
        <WorkflowStepForm
          v-if="activePopup?.type === 'timezone'"
          class="workflow-form--popup-compact workflow-form--edit-single-page workflow-form--dense-popup"
          question="Set the tenant timezone."
          :primary-label="timezonePrimaryLabel"
          primary-action-variant="save"
          primary-test-id="save-tenant-timezone"
          :submit-disabled="timezoneSaveDisabled"
          :show-primary-action="canEditTenantSettings"
          :show-enter-hint="false"
          show-cancel-action
          cancel-test-id="tenant-timezone-workflow-cancel"
          @cancel="closePopup"
          @submit="saveTimezoneSettings"
        >
          <InlineValidation v-if="timezoneWorkflowError" tone="error" :message="timezoneWorkflowError" />

          <label class="wizard-input-shell">
            <span class="workflow-context-label">Timezone</span>
            <AppSelect
              v-model="timezoneForm.timeZone"
              :options="timezoneOptions"
              :disabled="!canEditTenantSettings || timezoneWorkflowSaving"
              searchable
              search-placeholder="Search timezones"
              test-id="tenant-timezone-select"
            />
          </label>
        </WorkflowStepForm>

        <WorkflowStepForm
          v-else-if="activePopup?.type === 'notification-menu'"
          class="workflow-form--popup-compact"
          question="What do you want to do with Google Chat notifications?"
          :show-primary-action="false"
          show-cancel-action
          cancel-label="Close"
          cancel-test-id="tenant-notification-workflow-close"
          @cancel="closePopup"
        >
          <InlineValidation v-if="notificationWorkflowError" tone="error" :message="notificationWorkflowError" />
          <WorkflowShortcutChoiceCards
            :options="notificationWorkflowOptions"
            test-id-prefix="tenant-notification-workflow"
            @choose="handleNotificationWorkflowChoice"
          />
        </WorkflowStepForm>

        <WorkflowStepForm
          v-else-if="activePopup?.type === 'notification-form'"
          class="workflow-form--popup-compact workflow-form--edit-single-page workflow-form--dense-popup"
          question="Configure Google Chat notifications."
          :primary-label="notificationPrimaryLabel"
          primary-action-variant="save"
          primary-test-id="save-tenant-notification-settings"
          :submit-disabled="notificationSaveDisabled"
          :show-primary-action="canEditTenantSettings"
          :show-enter-hint="false"
          show-cancel-action
          cancel-test-id="tenant-notification-workflow-cancel"
          @cancel="closePopup"
          @submit="saveNotificationSettings"
        >
          <InlineValidation v-if="notificationWorkflowError" tone="error" :message="notificationWorkflowError" />

          <div class="workflow-form-grid workflow-form-grid--two workflow-form-grid--notification">
            <label class="wizard-input-shell tenant-notification-webhook-field">
              <span class="workflow-context-label">Webhook URL</span>
              <input
                v-model="notificationForm.googleChatWebhookUrl"
                class="wizard-answer-control"
                name="googleChatWebhookUrl"
                type="password"
                autocomplete="off"
                autocapitalize="none"
                spellcheck="false"
                :placeholder="notificationWebhookPlaceholder"
                :disabled="!canEditTenantSettings || notificationWorkflowSaving"
              />
            </label>

            <label class="wizard-input-shell tenant-notification-status-field">
              <span class="workflow-context-label">Status</span>
              <AppSelect
                v-model="notificationForm.isActive"
                :options="notificationEnabledOptions"
                :disabled="!canEditTenantSettings || notificationWorkflowSaving"
                test-id="tenant-notification-enabled"
              />
            </label>
          </div>

          <p
            v-if="notificationConfigured"
            class="tenant-notification-current-webhook"
            data-testid="google-chat-webhook-status"
          >
            Current webhook: {{ notificationWebhookSummary }}
          </p>
        </WorkflowStepForm>

        <WorkflowStepForm
          v-else-if="activePopup?.type === 'ai-menu'"
          class="workflow-form--popup-compact"
          question="What do you want to do with the AI provider?"
          :show-primary-action="false"
          show-cancel-action
          cancel-label="Close"
          cancel-test-id="tenant-ai-workflow-cancel"
          @cancel="closePopup"
        >
          <WorkflowShortcutChoiceCards
            :options="aiProviderWorkflowOptions"
            test-id-prefix="tenant-ai-provider-workflow"
            @choose="handleAiProviderWorkflowChoice"
          />
        </WorkflowStepForm>

        <WorkflowStepForm
          v-else-if="activePopup?.type === 'ai'"
          :class="[
            'workflow-form--popup-compact',
            {
              'workflow-form--edit-single-page': isAiEditing,
            },
          ]"
          :question="aiCurrentQuestion"
          :primary-label="aiPrimaryLabel"
          :primary-action-variant="aiPrimaryActionVariant"
          :show-back="showAiBack"
          :show-enter-hint="!isAiEditing"
          :allow-select-enter="isAiCreateSelectStep"
          :submit-disabled="aiSubmitDisabled"
          :show-primary-action="canManageGlobalSettings"
          show-cancel-action
          cancel-test-id="tenant-ai-workflow-cancel"
          primary-test-id="save-tenant-llm-settings"
          @back="goBackAiStep"
          @cancel="closePopup"
          @submit="handleAiSubmit"
        >
          <InlineValidation v-if="aiWorkflowError" tone="error" :message="aiWorkflowError" />

          <template v-if="isAiEditing">
            <div class="workflow-form-grid workflow-form-grid--two">
              <label class="wizard-input-shell">
                <span class="workflow-context-label">Provider</span>
                <AppSelect
                  v-model="aiForm.llmProvider"
                  :options="providerOptions"
                  :disabled="true"
                  test-id="tenant-llm-provider"
                />
              </label>

              <label class="wizard-input-shell">
                <span class="workflow-context-label">Enabled</span>
                <AppSelect
                  v-model="aiForm.llmEnabled"
                  :options="yesNoOptions"
                  test-id="tenant-llm-enabled"
                />
              </label>
            </div>

            <div class="workflow-form-grid workflow-form-grid--two">
              <label class="wizard-input-shell">
                <span class="workflow-context-label">Model</span>
                <input
                  v-model="aiForm.llmModel"
                  class="wizard-answer-control"
                  name="llmModel"
                  type="text"
                  placeholder="gpt-4.1-mini"
                />
              </label>

              <label class="wizard-input-shell">
                <span class="workflow-context-label">Timeout (seconds)</span>
                <input
                  v-model="aiForm.llmTimeoutSeconds"
                  class="wizard-answer-control"
                  name="llmTimeoutSeconds"
                  type="number"
                  min="1"
                />
              </label>
            </div>

            <label class="wizard-input-shell">
              <span class="workflow-context-label">Base URL</span>
              <input
                v-model="aiForm.llmBaseUrl"
                class="wizard-answer-control"
                name="llmBaseUrl"
                type="url"
                placeholder="https://api.openai.com"
              />
            </label>

            <label class="wizard-input-shell">
              <span class="workflow-context-label">API Key (leave blank to keep existing)</span>
              <textarea
                v-model="aiForm.llmApiKey"
                class="wizard-answer-control workflow-form-textarea workflow-form-textarea--single-row"
                name="llmApiKey"
                rows="1"
                placeholder="Enter a new API key only when needed"
              />
            </label>

            <p v-if="storedKeyStatus" class="muted-copy">{{ storedKeyStatus }}</p>
          </template>

          <template v-else>
            <label v-if="currentAiCreateStep.id === 'llmProvider'" class="wizard-input-shell">
              <WorkflowSelect
                v-model="aiForm.llmProvider"
                test-id="tenant-llm-provider"
                :options="providerOptions"
                placeholder="Select provider"
              />
            </label>

            <label v-else-if="currentAiCreateStep.id === 'llmEnabled'" class="wizard-input-shell">
              <WorkflowSelect
                v-model="aiForm.llmEnabled"
                test-id="tenant-llm-enabled"
                :options="yesNoOptions"
                placeholder="Select enabled state"
              />
            </label>

            <label v-else-if="currentAiCreateStep.id === 'llmModel'" class="wizard-input-shell">
              <input
                v-model="aiForm.llmModel"
                :class="['wizard-answer-control', { empty: !aiForm.llmModel.trim() }]"
                name="llmModel"
                type="text"
                :placeholder="createModelPlaceholder"
              />
            </label>

            <label v-else-if="currentAiCreateStep.id === 'llmBaseUrl'" class="wizard-input-shell">
              <input
                v-model="aiForm.llmBaseUrl"
                :class="['wizard-answer-control', { empty: !normalizeTextValue(aiForm.llmBaseUrl) }]"
                name="llmBaseUrl"
                type="url"
                :placeholder="createBaseUrlPlaceholder"
              />
            </label>

            <label v-else-if="currentAiCreateStep.id === 'llmTimeoutSeconds'" class="wizard-input-shell">
              <input
                v-model="aiForm.llmTimeoutSeconds"
                :class="['wizard-answer-control', { empty: !normalizeTextValue(aiForm.llmTimeoutSeconds) }]"
                name="llmTimeoutSeconds"
                type="number"
                min="1"
                :placeholder="createTimeoutPlaceholder"
              />
            </label>

            <label v-else class="wizard-input-shell">
              <input
                v-model="aiForm.llmApiKey"
                class="wizard-answer-control"
                name="llmApiKey"
                type="password"
                autocomplete="off"
                placeholder="Enter API key if needed"
              />
            </label>
          </template>
        </WorkflowStepForm>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSelect, { type AppSelectOption } from '../../components/ui/AppSelect.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import WorkflowSelect, { type WorkflowSelectOption } from '../../components/workflow/WorkflowSelect.vue'
import WorkflowShortcutChoiceCards, { type WorkflowShortcutChoiceOption } from '../../components/workflow/WorkflowShortcutChoiceCards.vue'
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import type { LlmSettings, TenantNotificationSettings, TenantSettings } from '../../lib/api/types'
import { saveTenantSettings, useAuthState, useUiPermissions } from '../../lib/auth'
import { buildTimezoneOptions } from '../../lib/timezones'

type LlmProvider = 'OPENAI' | 'GEMINI'
type AiWorkflowMode = 'create' | 'edit'
type NotificationWorkflowChoice = 'configure' | 'edit' | 'disable' | 'enable'

interface ProviderProfile extends LlmSettings {
  activeProvider: LlmProvider
  llmProvider: LlmProvider
  label: string
}

type ActivePopup =
  | { type: 'timezone' }
  | { type: 'notification-menu' }
  | { type: 'notification-form' }
  | { type: 'ai-menu' }
  | { type: 'ai'; mode: AiWorkflowMode }

type CreateStepId = 'llmProvider' | 'llmEnabled' | 'llmModel' | 'llmBaseUrl' | 'llmTimeoutSeconds' | 'llmApiKey'

interface CreateStep {
  id: CreateStepId
  title: string
  kind: 'select' | 'text' | 'password' | 'number'
}

const route = useRoute()
const router = useRouter()
const authState = useAuthState()
const permissions = useUiPermissions()

const providerOrder: LlmProvider[] = ['OPENAI', 'GEMINI']
const providerLabels: Record<LlmProvider, string> = {
  OPENAI: 'OpenAI',
  GEMINI: 'Gemini',
}
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

const providers = ref<ProviderProfile[]>([])
const aiLoading = ref(false)
const aiError = ref<string | null>(null)
const aiSuccess = ref<string | null>(null)
const summaryLoading = ref(false)
const summaryError = ref<string | null>(null)
const tenantSettings = ref<TenantSettings | null>(null)
const tenantTimezoneSummary = ref('UTC')
const timezoneWorkflowError = ref<string | null>(null)
const timezoneWorkflowSuccess = ref<string | null>(null)
const timezoneWorkflowSaving = ref(false)
const notificationSettings = ref<TenantNotificationSettings | null>(null)
const notificationSummary = ref('Not configured')
const notificationWorkflowError = ref<string | null>(null)
const notificationWorkflowSuccess = ref<string | null>(null)
const notificationWorkflowSaving = ref(false)
const activePopup = ref<ActivePopup | null>(null)
const aiCreateStepIndex = ref(0)
const aiWorkflowSaving = ref(false)
const aiWorkflowLoading = ref(false)
const aiWorkflowError = ref<string | null>(null)
const hasStoredLlmApiKey = ref(false)
const hasFallbackLlmApiKey = ref(false)
const fallbackLlmKeyEnvName = ref('')
const aiForm = reactive({
  llmProvider: '',
  llmModel: '',
  llmBaseUrl: '',
  llmTimeoutSeconds: '',
  llmEnabled: 'Y',
  llmApiKey: '',
})
const notificationForm = reactive({
  googleChatWebhookUrl: '',
  isActive: 'Y',
})
const timezoneForm = reactive({
  timeZone: 'UTC',
})

const canManageGlobalSettings = computed(() => permissions.canManageGlobalSettings)
const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)
const activeTenantUserGroupId = computed(() => authState.sessionInfo?.activeTenantUserGroupId ?? null)
const tenantLabel = computed(() => (
  authState.sessionInfo?.activeTenantLabel
  || authState.sessionInfo?.availableTenants?.find((tenant) => tenant.userGroupId === activeTenantUserGroupId.value)?.label
  || activeTenantUserGroupId.value
  || 'Active tenant'
))
const tenantSettingsTitle = computed(() => {
  if (!activeTenantUserGroupId.value) return 'Tenant Settings'
  return `${tenantLabel.value} Settings`
})
const isPopupOpen = computed(() => activePopup.value !== null)
const isAiEditing = computed(() => activePopup.value?.type === 'ai' && activePopup.value.mode === 'edit')
const selectedAiProvider = computed(() => {
  const directPrimary = providers.value.find((provider) => provider.activeProvider === provider.llmProvider)
  if (directPrimary) return directPrimary

  const activeProvider = providers.value.map((provider) => provider.activeProvider).find((provider) => providerOrder.includes(provider))
  return providers.value.find((provider) => provider.llmProvider === activeProvider) ?? providers.value[0] ?? null
})
const popupTitle = computed(() => {
  if (activePopup.value?.type === 'timezone') return 'Timezone'
  if (activePopup.value?.type === 'notification-menu' || activePopup.value?.type === 'notification-form') return 'Notifications'
  if (activePopup.value?.type === 'ai-menu') return 'AI Provider'
  if (activePopup.value?.type === 'ai') return isAiEditing.value ? 'Edit AI Provider' : 'Configure AI Provider'
  return tenantSettingsTitle.value
})
const notificationConfigured = computed(() => notificationSettings.value?.googleChatConfigured === true)
const notificationActive = computed(() => (notificationSettings.value?.isActive ?? 'N') !== 'N')
const notificationWebhookSummary = computed(() => (
  notificationConfigured.value
    ? (notificationSettings.value?.googleChatWebhookUrlMasked || 'Configured')
    : 'Not configured'
))
const notificationWebhookPlaceholder = computed(() => (
  notificationSettings.value?.googleChatWebhookUrlMasked
  || 'https://chat.googleapis.com/v1/spaces/.../messages?key=...&token=...'
))
const notificationWebhookInput = computed(() => normalizeTextValue(notificationForm.googleChatWebhookUrl))
const hasWebhookForNotificationSave = computed(() => (
  notificationForm.isActive === 'N' || notificationWebhookInput.value.length > 0 || notificationConfigured.value
))
const notificationSaveDisabled = computed(() => (
  notificationWorkflowSaving.value || !canEditTenantSettings.value || !hasWebhookForNotificationSave.value
))
const notificationPrimaryLabel = computed(() => (
  notificationWorkflowSaving.value ? 'Saving notifications' : 'Save Notifications'
))
const notificationEnabledOptions: AppSelectOption[] = [
  { value: 'Y', label: 'Enabled' },
  { value: 'N', label: 'Disabled' },
]
const notificationWorkflowOptions = computed<WorkflowShortcutChoiceOption[]>(() => {
  const options: Array<{ value: NotificationWorkflowChoice; label: string }> = []
  if (notificationConfigured.value) {
    options.push({ value: 'edit', label: 'Edit Google Chat webhook' })
    options.push(
      notificationActive.value
        ? { value: 'disable', label: 'Disable notifications' }
        : { value: 'enable', label: 'Enable notifications' },
    )
  } else {
    options.push({ value: 'configure', label: 'Configure Google Chat webhook' })
  }

  return options.map((option, index) => ({
    ...option,
    shortcutKey: String.fromCharCode(65 + index),
  }))
})
const aiProviderWorkflowOptions = computed<WorkflowShortcutChoiceOption[]>(() => {
  const selectedProvider = selectedAiProvider.value
  const options: Array<{ value: string; label: string }> = []
  if (selectedProvider) options.push({ value: 'update', label: `Update ${selectedProvider.label}` })
  options.push(
    { value: 'change', label: 'Change selected provider' },
    { value: 'add', label: 'Add provider settings' },
  )

  return options.map((option, index) => ({
    ...option,
    shortcutKey: String.fromCharCode(65 + index),
  }))
})
const currentAiCreateStep = computed<CreateStep>(() => (
  createSteps[Math.min(aiCreateStepIndex.value, createSteps.length - 1)] ?? createSteps[0]!
))
const aiCurrentQuestion = computed(() => (
  isAiEditing.value
    ? 'Update the AI provider settings.'
    : currentAiCreateStep.value.title
))
const showAiBack = computed(() => !isAiEditing.value && aiCreateStepIndex.value > 0)
const isAiCreateSelectStep = computed(() => !isAiEditing.value && currentAiCreateStep.value.kind === 'select')
const aiPrimaryActionVariant = computed<'default' | 'save'>(() => (
  isAiEditing.value || currentAiCreateStep.value.id === 'llmApiKey'
    ? 'save'
    : 'default'
))
const aiPrimaryLabel = computed(() => (
  isAiEditing.value || currentAiCreateStep.value.id === 'llmApiKey'
    ? (aiWorkflowSaving.value ? 'Saving' : 'Save')
    : 'OK'
))
const aiSubmitDisabled = computed(() => {
  if (!canManageGlobalSettings.value || aiWorkflowSaving.value || aiWorkflowLoading.value) return true
  if (isAiEditing.value) return false

  switch (currentAiCreateStep.value.id) {
    case 'llmProvider':
      return normalizeProvider(aiForm.llmProvider) === null
    case 'llmModel':
      return normalizeTextValue(aiForm.llmModel).length === 0
    case 'llmBaseUrl':
      return normalizeTextValue(aiForm.llmBaseUrl).length === 0
    case 'llmTimeoutSeconds':
      return !/^\d+$/.test(normalizeTextValue(aiForm.llmTimeoutSeconds)) || Number(aiForm.llmTimeoutSeconds) < 1
    default:
      return false
  }
})
const storedKeyStatus = computed(() => {
  if (hasStoredLlmApiKey.value) return 'A stored API key is already configured for this provider.'
  if (hasFallbackLlmApiKey.value && fallbackLlmKeyEnvName.value) {
    return `Environment fallback ${fallbackLlmKeyEnvName.value} is currently active.`
  }
  return 'No stored API key is configured yet.'
})
const createProviderDefaults = computed(() => {
  const normalizedProvider = normalizeProvider(aiForm.llmProvider)
  return normalizedProvider ? providerDefaults[normalizedProvider] : null
})
const createModelPlaceholder = computed(() => createProviderDefaults.value?.llmModel ?? 'Enter model')
const createBaseUrlPlaceholder = computed(() => createProviderDefaults.value?.llmBaseUrl ?? 'Enter base URL')
const createTimeoutPlaceholder = computed(() => createProviderDefaults.value?.llmTimeoutSeconds ?? 'Enter timeout')
const selectedTimeZone = computed(() => (
  normalizeTextValue(timezoneForm.timeZone)
  || normalizeTextValue(tenantSettings.value?.timeZone)
  || normalizeTextValue(authState.sessionInfo?.timeZone)
  || 'UTC'
))
const timezoneOptions = computed<AppSelectOption[]>(() => buildTimezoneOptions(selectedTimeZone.value))
const timezoneSaveDisabled = computed(() => (
  timezoneWorkflowSaving.value ||
  !canEditTenantSettings.value ||
  normalizeTextValue(timezoneForm.timeZone).length === 0
))
const timezonePrimaryLabel = computed(() => (
  timezoneWorkflowSaving.value ? 'Saving timezone' : 'Save Timezone'
))

function normalizeTextValue(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeProvider(rawProvider: unknown): LlmProvider | null {
  const normalized = normalizeTextValue(rawProvider).toUpperCase()
  if (normalized === 'OPENAI' || normalized === 'GEMINI') return normalized
  return null
}

function buildProfile(llmProvider: LlmProvider, settings?: LlmSettings | null): ProviderProfile {
  return {
    activeProvider: normalizeProvider(settings?.activeProvider) ?? llmProvider,
    llmProvider,
    llmModel: settings?.llmModel ?? '',
    llmBaseUrl: settings?.llmBaseUrl ?? '',
    llmTimeoutSeconds: settings?.llmTimeoutSeconds ?? '',
    llmEnabled: settings?.llmEnabled ?? 'Y',
    hasStoredLlmApiKey: settings?.hasStoredLlmApiKey,
    hasFallbackLlmApiKey: settings?.hasFallbackLlmApiKey,
    fallbackLlmKeyEnvName: settings?.fallbackLlmKeyEnvName,
    label: providerLabels[llmProvider],
  }
}

function providerSummary(provider: ProviderProfile): string {
  const parts = [
    provider.activeProvider === provider.llmProvider ? 'Primary' : 'Available',
    provider.llmEnabled === 'N' ? 'Disabled' : 'Enabled',
    provider.hasStoredLlmApiKey ? 'Key stored' : 'No stored key',
  ]
  return parts.join(' · ')
}

function resetAiForm(): void {
  aiCreateStepIndex.value = 0
  aiWorkflowSaving.value = false
  aiWorkflowLoading.value = false
  aiWorkflowError.value = null
  aiForm.llmProvider = ''
  aiForm.llmModel = ''
  aiForm.llmBaseUrl = ''
  aiForm.llmTimeoutSeconds = ''
  aiForm.llmEnabled = 'Y'
  aiForm.llmApiKey = ''
  hasStoredLlmApiKey.value = false
  hasFallbackLlmApiKey.value = false
  fallbackLlmKeyEnvName.value = ''
}

function applyTenantSettings(nextSettings?: TenantSettings | null): void {
  tenantSettings.value = nextSettings ?? null
  const nextTimeZone = normalizeTextValue(nextSettings?.timeZone) || normalizeTextValue(authState.sessionInfo?.timeZone) || 'UTC'
  timezoneForm.timeZone = nextTimeZone
  tenantTimezoneSummary.value = nextTimeZone
}

function applyNotificationSettings(nextSettings?: TenantNotificationSettings | null): void {
  notificationSettings.value = nextSettings ?? null
  notificationForm.googleChatWebhookUrl = ''
  notificationForm.isActive = (nextSettings?.isActive ?? 'N') !== 'N' ? 'Y' : 'N'
  notificationSummary.value = nextSettings?.googleChatConfigured
    ? (nextSettings.isActive === 'N' ? 'Configured, disabled' : 'Configured')
    : 'Not configured'
}

function openTimezoneWorkflow(): void {
  timezoneWorkflowError.value = null
  timezoneWorkflowSuccess.value = null
  timezoneForm.timeZone = tenantTimezoneSummary.value || 'UTC'
  activePopup.value = { type: 'timezone' }
}

async function saveTimezoneSettings(): Promise<void> {
  if (timezoneSaveDisabled.value) return

  timezoneWorkflowSaving.value = true
  timezoneWorkflowError.value = null
  timezoneWorkflowSuccess.value = null
  try {
    const response = await saveTenantSettings({
      timeZone: normalizeTextValue(timezoneForm.timeZone),
    })
    if (!response?.ok) {
      timezoneWorkflowError.value = response?.errors?.[0] ?? authState.error ?? 'Failed to save tenant timezone.'
      return
    }

    applyTenantSettings(response.tenantSettings)
    timezoneWorkflowSuccess.value = response.messages?.[0] ?? 'Saved tenant settings.'
    activePopup.value = null
  } catch (saveError) {
    timezoneWorkflowError.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save tenant timezone.'
  } finally {
    timezoneWorkflowSaving.value = false
  }
}

function openNotificationWorkflow(): void {
  notificationWorkflowError.value = null
  notificationWorkflowSuccess.value = null
  activePopup.value = { type: 'notification-menu' }
}

function openNotificationForm(): void {
  notificationWorkflowError.value = null
  notificationWorkflowSuccess.value = null
  notificationForm.googleChatWebhookUrl = ''
  notificationForm.isActive = notificationActive.value ? 'Y' : 'N'
  activePopup.value = { type: 'notification-form' }
}

function handleNotificationWorkflowChoice(value: string): void {
  if (value === 'configure' || value === 'edit') {
    openNotificationForm()
    return
  }

  if (value === 'disable' || value === 'enable') {
    void saveNotificationActiveState(value === 'enable')
  }
}

async function saveNotificationActiveState(isActive: boolean): Promise<void> {
  if (!canEditTenantSettings.value || notificationWorkflowSaving.value) return

  notificationWorkflowSaving.value = true
  notificationWorkflowError.value = null
  notificationWorkflowSuccess.value = null
  try {
    const response = await settingsFacade.saveTenantNotificationSettings({
      googleChatWebhookUrl: '',
      isActive: isActive ? 'Y' : 'N',
    })
    applyNotificationSettings(response.tenantNotificationSettings)
    notificationWorkflowSuccess.value = response.messages?.[0] ?? 'Saved notification settings.'
    activePopup.value = null
  } catch (saveError) {
    notificationWorkflowError.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save notification settings.'
  } finally {
    notificationWorkflowSaving.value = false
  }
}

async function saveNotificationSettings(): Promise<void> {
  if (notificationSaveDisabled.value) return

  notificationWorkflowSaving.value = true
  notificationWorkflowError.value = null
  notificationWorkflowSuccess.value = null
  try {
    const response = await settingsFacade.saveTenantNotificationSettings({
      googleChatWebhookUrl: notificationWebhookInput.value,
      isActive: notificationForm.isActive,
    })
    applyNotificationSettings(response.tenantNotificationSettings)
    notificationWorkflowSuccess.value = response.messages?.[0] ?? 'Saved notification settings.'
    activePopup.value = null
  } catch (saveError) {
    notificationWorkflowError.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save notification settings.'
  } finally {
    notificationWorkflowSaving.value = false
  }
}

function applyAiSettings(settings: ProviderProfile | LlmSettings, fallbackProvider?: LlmProvider): void {
  const provider = normalizeProvider(settings.llmProvider) ?? fallbackProvider ?? 'OPENAI'
  aiForm.llmProvider = provider
  aiForm.llmModel = settings.llmModel ?? ''
  aiForm.llmBaseUrl = settings.llmBaseUrl ?? ''
  aiForm.llmTimeoutSeconds = settings.llmTimeoutSeconds ?? ''
  aiForm.llmEnabled = settings.llmEnabled ?? 'Y'
  aiForm.llmApiKey = ''
  hasStoredLlmApiKey.value = !!settings.hasStoredLlmApiKey
  hasFallbackLlmApiKey.value = !!settings.hasFallbackLlmApiKey
  fallbackLlmKeyEnvName.value = settings.fallbackLlmKeyEnvName ?? ''
}

async function loadAiProvider(llmProvider: LlmProvider): Promise<void> {
  aiWorkflowLoading.value = true
  aiWorkflowError.value = null
  try {
    const response = await settingsFacade.getLlmSettings({ llmProvider })
    if (!response.llmSettings) {
      aiWorkflowError.value = `Unable to find AI provider "${llmProvider}".`
      return
    }
    applyAiSettings(response.llmSettings, llmProvider)
  } catch (loadError) {
    aiWorkflowError.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load AI provider settings.'
  } finally {
    aiWorkflowLoading.value = false
  }
}

function openAiProviderWorkflow(): void {
  if (!canManageGlobalSettings.value) return
  aiSuccess.value = null
  resetAiForm()
  activePopup.value = { type: 'ai-menu' }
}

function handleAiProviderWorkflowChoice(value: string): void {
  if (value === 'update') {
    openAiEdit(selectedAiProvider.value?.llmProvider)
    return
  }

  if (value === 'change' || value === 'add') {
    openAiCreate()
  }
}

function openAiCreate(): void {
  if (!canManageGlobalSettings.value) return
  aiSuccess.value = null
  resetAiForm()
  activePopup.value = { type: 'ai', mode: 'create' }
}

function openAiEdit(rawProvider: unknown): void {
  if (!canManageGlobalSettings.value) return
  const llmProvider = normalizeProvider(rawProvider)
  if (!llmProvider) return

  aiSuccess.value = null
  resetAiForm()
  activePopup.value = { type: 'ai', mode: 'edit' }
  const provider = providers.value.find((nextProvider) => nextProvider.llmProvider === llmProvider)
  if (provider) {
    applyAiSettings(provider, llmProvider)
  } else {
    aiForm.llmProvider = llmProvider
    void loadAiProvider(llmProvider)
  }
}

function closePopup(): void {
  activePopup.value = null
  resetAiForm()
  timezoneWorkflowError.value = null
  notificationWorkflowError.value = null
  if (route.query.workflow) {
    void router.replace('/settings/tenant')
  }
}

function applyCreateDefaults(): void {
  const provider = normalizeProvider(aiForm.llmProvider)
  if (!provider) return

  const defaults = providerDefaults[provider]
  if (!normalizeTextValue(aiForm.llmModel)) aiForm.llmModel = defaults.llmModel
  if (!normalizeTextValue(aiForm.llmBaseUrl)) aiForm.llmBaseUrl = defaults.llmBaseUrl
  if (!normalizeTextValue(aiForm.llmTimeoutSeconds)) aiForm.llmTimeoutSeconds = defaults.llmTimeoutSeconds
}

function goNextAiStep(): void {
  if (currentAiCreateStep.value.id === 'llmProvider') applyCreateDefaults()
  aiCreateStepIndex.value = Math.min(aiCreateStepIndex.value + 1, createSteps.length - 1)
}

function goBackAiStep(): void {
  aiWorkflowError.value = null
  aiCreateStepIndex.value = Math.max(aiCreateStepIndex.value - 1, 0)
}

async function handleAiSubmit(): Promise<void> {
  if (isAiEditing.value || currentAiCreateStep.value.id === 'llmApiKey') {
    await saveAiSettings()
    return
  }

  goNextAiStep()
}

async function saveAiSettings(): Promise<void> {
  if (!canManageGlobalSettings.value) {
    aiWorkflowError.value = 'Only super admins can update AI settings.'
    return
  }

  const provider = normalizeProvider(aiForm.llmProvider)
  if (!provider) {
    aiWorkflowError.value = 'Choose an AI provider.'
    return
  }

  aiWorkflowSaving.value = true
  aiWorkflowError.value = null
  try {
    const response = await settingsFacade.saveLlmSettings({
      llmProvider: provider,
      llmModel: normalizeTextValue(aiForm.llmModel),
      llmBaseUrl: normalizeTextValue(aiForm.llmBaseUrl),
      llmTimeoutSeconds: normalizeTextValue(aiForm.llmTimeoutSeconds),
      llmEnabled: aiForm.llmEnabled,
      llmApiKey: aiForm.llmApiKey,
    })
    activePopup.value = null
    resetAiForm()
    aiSuccess.value = response.messages?.[0] ?? 'Saved LLM settings.'
    await loadAiProviders()
  } catch (saveError) {
    aiWorkflowError.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save AI provider settings.'
  } finally {
    aiWorkflowSaving.value = false
  }
}

async function loadAiProviders(): Promise<void> {
  if (!canManageGlobalSettings.value) {
    providers.value = []
    aiError.value = null
    return
  }

  aiLoading.value = true
  aiError.value = null
  try {
    const responses = await Promise.all(providerOrder.map((llmProvider) => settingsFacade.getLlmSettings({ llmProvider })))
    providers.value = responses.map((response, index) => buildProfile(providerOrder[index]!, response.llmSettings))
  } catch (loadError) {
    providers.value = []
    aiError.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load AI provider settings.'
  } finally {
    aiLoading.value = false
  }
}

async function loadTenantSummaries(): Promise<void> {
  summaryLoading.value = true
  summaryError.value = null
  try {
    const [
      tenantSettingsResult,
      notificationResult,
    ] = await Promise.allSettled([
      settingsFacade.getTenantSettings(),
      settingsFacade.getTenantNotificationSettings(),
    ])

    if (tenantSettingsResult.status === 'fulfilled') {
      applyTenantSettings(tenantSettingsResult.value.tenantSettings)
    } else {
      tenantTimezoneSummary.value = 'Not loaded'
    }

    if (notificationResult.status === 'fulfilled') {
      applyNotificationSettings(notificationResult.value.tenantNotificationSettings)
    } else {
      notificationSummary.value = 'Not loaded'
    }

    const failed = [
      tenantSettingsResult,
      notificationResult,
    ].some((result) => result.status === 'rejected')
    summaryError.value = failed ? 'Some tenant settings could not be loaded.' : null
  } finally {
    summaryLoading.value = false
  }
}

function openRouteRequestedWorkflow(): void {
  const workflow = String(route.query.workflow ?? '')
  if (workflow === 'ai-create') {
    openAiCreate()
    return
  }

  if (workflow === 'ai-edit') {
    openAiEdit(route.query.llmProvider)
    return
  }

  if (workflow === 'notifications') {
    openNotificationWorkflow()
    return
  }

  if (workflow === 'timezone') {
    openTimezoneWorkflow()
  }
}

watch(
  () => [route.query.workflow, route.query.llmProvider],
  openRouteRequestedWorkflow,
  { immediate: true },
)

onMounted(() => {
  void loadAiProviders()
  void loadTenantSummaries()
})
</script>
