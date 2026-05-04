<template>
  <WorkflowPage :progress-percent="progressPercent" aria-label="Shopify setup progress" center-stage :edit-surface="isEditing">
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
      cancel-test-id="cancel-shopify-auth"
      :submit-disabled="submitDisabled"
      :show-primary-action="canEditTenantSettings"
      :primary-test-id="primaryTestId"
      @submit="handlePrimarySubmit"
      @back="goBack"
      @cancel="cancelEdit"
    >
      <template v-if="isEditing">
        <div class="workflow-form-grid workflow-form-grid--two">
          <label class="wizard-input-shell">
            <span class="workflow-context-label">Shopify Config ID</span>
            <input
              name="shopifyAuthConfigId"
              v-model="form.shopifyAuthConfigId"
              class="wizard-answer-control"
              type="text"
              :maxlength="CONFIG_ID_MAX_LENGTH"
              placeholder="krewe_shopify"
            />
          </label>

          <label class="wizard-input-shell">
            <span class="workflow-context-label">Description</span>
            <input
              name="description"
              v-model="form.description"
              class="wizard-answer-control"
              type="text"
              placeholder="Krewe Shopify"
            />
          </label>
        </div>

        <label class="wizard-input-shell">
          <span class="workflow-context-label">Shop/API URL</span>
          <input
            name="shopApiUrl"
            v-model="form.shopApiUrl"
            class="wizard-answer-control"
            type="url"
            placeholder="https://shop.myshopify.com"
          />
        </label>

        <div class="workflow-form-grid workflow-form-grid--compact">
          <label class="wizard-input-shell">
            <span class="workflow-context-label">API Version</span>
            <input
              name="apiVersion"
              v-model="form.apiVersion"
              class="wizard-answer-control"
              type="text"
              placeholder="2026-01"
            />
          </label>

          <label class="wizard-input-shell">
            <span class="workflow-context-label">Timezone</span>
            <input
              name="timeZone"
              v-model="form.timeZone"
              class="wizard-answer-control"
              type="text"
              placeholder="America/Chicago"
            />
          </label>

          <label class="wizard-input-shell">
            <span class="workflow-context-label">Active</span>
            <input
              v-model="isActiveChecked"
              name="isActive"
              class="app-table__checkbox"
              type="checkbox"
              data-testid="shopify-is-active"
              aria-label="Active"
            />
          </label>
        </div>

        <div class="workflow-context-block" data-testid="shopify-endpoint-options">
          <span class="workflow-context-label">Available Endpoints</span>

          <div class="workflow-choice-grid">
            <label
              :class="[
                'workflow-choice-option',
                'workflow-choice-option--filter',
                {
                  'workflow-choice-option--active': form.canReadOrders,
                },
              ]"
            >
              <input
                v-model="form.canReadOrders"
                name="canReadOrders"
                type="checkbox"
                data-testid="shopify-endpoint-SHOPIFY_ORDERS"
              />
              <span class="workflow-choice-label">Admin GraphQL Orders</span>
            </label>
          </div>
        </div>

        <label class="wizard-input-shell">
          <span class="workflow-context-label">Access Token (leave blank to keep existing)</span>
          <input
            name="accessToken"
            v-model="form.accessToken"
            class="wizard-answer-control"
            type="password"
            autocomplete="off"
          />
        </label>
      </template>

      <template v-else>
        <label v-if="currentCreateStep.id === 'shopApiUrl'" class="wizard-input-shell">
          <input
            name="shopApiUrl"
            v-model="form.shopApiUrl"
            :class="['wizard-answer-control', { empty: !form.shopApiUrl.trim() }]"
            type="url"
            placeholder="https://shop.myshopify.com"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'apiVersion'" class="wizard-input-shell">
          <input
            name="apiVersion"
            v-model="form.apiVersion"
            :class="['wizard-answer-control', { empty: !form.apiVersion.trim() }]"
            type="text"
            placeholder="2026-01"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'timeZone'" class="wizard-input-shell">
          <input
            name="timeZone"
            v-model="form.timeZone"
            :class="['wizard-answer-control', { empty: !form.timeZone.trim() }]"
            type="text"
            placeholder="America/Chicago"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'accessToken'" class="wizard-input-shell">
          <input
            name="accessToken"
            v-model="form.accessToken"
            :class="['wizard-answer-control', { empty: !form.accessToken.trim() }]"
            type="password"
            autocomplete="off"
            placeholder="Paste access token"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'description'" class="wizard-input-shell">
          <input
            name="description"
            v-model="form.description"
            :class="['wizard-answer-control', { empty: !form.description.trim() }]"
            type="text"
            placeholder="Krewe Shopify"
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
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import type { ShopifyAuthConfigRecord } from '../../lib/api/types'
import { useUiPermissions } from '../../lib/auth'
import { CONFIG_ID_MAX_LENGTH, deriveConfigIdFromName, exceedsConfigIdMaxLength } from './configId'

type ShopifyCreateStepId =
  | 'shopApiUrl'
  | 'apiVersion'
  | 'timeZone'
  | 'accessToken'
  | 'description'

interface ShopifyCreateStep {
  id: ShopifyCreateStepId
  title: string
  kind: 'text' | 'password' | 'checkbox'
}

interface ShopifyForm {
  shopifyAuthConfigId: string
  description: string
  shopApiUrl: string
  apiVersion: string
  timeZone: string
  accessToken: string
  isActive: string
  canReadOrders: boolean
}

const route = useRoute()
const router = useRouter()
const permissions = useUiPermissions()

function createDefaultShopifyForm(): ShopifyForm {
  return {
    shopifyAuthConfigId: '',
    description: '',
    shopApiUrl: '',
    apiVersion: '2026-01',
    timeZone: 'UTC',
    accessToken: '',
    isActive: 'Y',
    canReadOrders: true,
  }
}

const form = reactive<ShopifyForm>(createDefaultShopifyForm())

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const currentStepIndex = ref(0)

const activeShopifyConfigId = computed(() => String(route.params.shopifyAuthConfigId ?? '').trim())
const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)
const isEditing = computed(() => activeShopifyConfigId.value.length > 0)
const isActiveChecked = computed({
  get: () => form.isActive !== 'N',
  set: (checked: boolean) => {
    form.isActive = checked ? 'Y' : 'N'
  },
})

const createSteps: ShopifyCreateStep[] = [
  { id: 'shopApiUrl', title: 'What Shopify shop or API URL should Darpan use?', kind: 'text' },
  { id: 'apiVersion', title: 'Which Shopify API version should Darpan use?', kind: 'text' },
  { id: 'timeZone', title: 'Which timezone should Darpan use for Shopify date windows?', kind: 'text' },
  { id: 'accessToken', title: 'What access token should Darpan use?', kind: 'password' },
  { id: 'description', title: 'What label should Darpan show for this Shopify config?', kind: 'text' },
]

const currentCreateStep = computed<ShopifyCreateStep>(() => {
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
    ? 'Update the Shopify config.'
    : currentCreateStep.value.title
))
const primaryLabel = computed(() => (
  isEditing.value || currentCreateStep.value.id === 'description'
    ? 'Save'
    : 'OK'
))
const primaryTestId = computed(() => (
  isEditing.value || currentCreateStep.value.id === 'description'
    ? 'save-shopify-auth'
    : 'wizard-next'
))
const primaryActionVariant = computed<'default' | 'save'>(() => (
  isEditing.value || currentCreateStep.value.id === 'description'
    ? 'save'
    : 'default'
))
const showBack = computed(() => !isEditing.value && currentStepIndex.value > 0)
const submitDisabled = computed(() => {
  if (!canEditTenantSettings.value) return true
  if (loading.value) return true
  if (isEditing.value) return false

  switch (currentCreateStep.value.id) {
    case 'shopApiUrl':
      return form.shopApiUrl.trim().length === 0
    case 'apiVersion':
      return form.apiVersion.trim().length === 0
    case 'timeZone':
      return form.timeZone.trim().length === 0
    case 'accessToken':
      return form.accessToken.trim().length === 0
    case 'description':
      return form.description.trim().length === 0
    default:
      return false
  }
})

function getConfigIdError(): string | null {
  if (!isEditing.value) return null

  return exceedsConfigIdMaxLength(form.shopifyAuthConfigId)
    ? `Shopify Config ID must be ${CONFIG_ID_MAX_LENGTH} characters or fewer.`
    : null
}

function applyRecord(record: ShopifyAuthConfigRecord): void {
  form.shopifyAuthConfigId = record.shopifyAuthConfigId
  form.description = record.description ?? ''
  form.shopApiUrl = record.shopApiUrl ?? ''
  form.apiVersion = record.apiVersion ?? '2026-01'
  form.timeZone = record.timeZone ?? 'UTC'
  form.accessToken = ''
  form.isActive = record.isActive ?? 'Y'
  form.canReadOrders = record.canReadOrders !== false
}

function resetCreateForm(): void {
  Object.assign(form, createDefaultShopifyForm())
  currentStepIndex.value = 0
  error.value = null
  success.value = null
}

function buildShopifyAuthDashboardRoute(shopifyAuthConfigId: string) {
  return {
    name: 'settings-shopify-auth',
    params: { shopifyAuthConfigId },
  }
}

async function loadShopifyConfig(): Promise<void> {
  if (!isEditing.value) return

  const response = await settingsFacade.getShopifyAuthConfig({
    shopifyAuthConfigId: activeShopifyConfigId.value,
  })
  if (!response.shopifyAuthConfig) {
    error.value = `Unable to find Shopify config "${activeShopifyConfigId.value}".`
    return
  }
  applyRecord(response.shopifyAuthConfig)
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  success.value = null
  if (!isEditing.value) resetCreateForm()

  try {
    await loadShopifyConfig()
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load Shopify config.'
  } finally {
    loading.value = false
  }
}

function goNext(): void {
  currentStepIndex.value = Math.min(currentStepIndex.value + 1, createSteps.length - 1)
}

function goBack(): void {
  error.value = null
  currentStepIndex.value = Math.max(currentStepIndex.value - 1, 0)
}

async function handlePrimarySubmit(): Promise<void> {
  if (isEditing.value || currentCreateStep.value.id === 'description') {
    await save()
    return
  }

  goNext()
}

async function save(): Promise<void> {
  if (!canEditTenantSettings.value) {
    error.value = 'You do not have permission to save Shopify settings for the active tenant.'
    return
  }

  loading.value = true
  error.value = null
  success.value = null
  try {
    const configIdError = getConfigIdError()
    if (configIdError) {
      error.value = configIdError
      return
    }

    const response = await settingsFacade.saveShopifyAuthConfig({
      shopifyAuthConfigId: isEditing.value
        ? form.shopifyAuthConfigId.trim()
        : deriveConfigIdFromName(form.description, 'shopify_config'),
      description: form.description.trim(),
      shopApiUrl: form.shopApiUrl.trim(),
      apiVersion: form.apiVersion.trim(),
      timeZone: form.timeZone.trim(),
      accessToken: form.accessToken.trim(),
      isActive: form.isActive,
      canReadOrders: form.canReadOrders,
    })
    success.value = response.messages?.[0] ?? 'Saved Shopify config.'
    if (isEditing.value) {
      const savedConfigId = response.savedShopifyAuthConfig?.shopifyAuthConfigId?.trim() || form.shopifyAuthConfigId.trim()
      await router.push(buildShopifyAuthDashboardRoute(savedConfigId))
      return
    }
    await router.push('/settings/shopify')
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save Shopify config.'
  } finally {
    loading.value = false
  }
}

async function cancelEdit(): Promise<void> {
  if (!isEditing.value || loading.value) return
  const selectedConfigId = activeShopifyConfigId.value || form.shopifyAuthConfigId.trim()
  if (!selectedConfigId) {
    await router.push('/settings/shopify')
    return
  }
  await router.push(buildShopifyAuthDashboardRoute(selectedConfigId))
}

watch(() => route.fullPath, () => {
  void load()
}, { immediate: true })
</script>
