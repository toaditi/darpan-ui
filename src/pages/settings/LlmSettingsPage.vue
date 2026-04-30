<template>
  <StaticPageFrame>
    <template #hero>
      <h1>LLM Configuration</h1>
    </template>

    <p v-if="loading" class="section-note">Loading AI provider settings...</p>

    <template v-else>
      <InlineValidation v-if="error" tone="error" :message="error" />

      <StaticPageSection title="Primary LLM">
        <div class="static-page-drop-zone" data-testid="primary-llm-drop-zone" @dragover.prevent @drop="handleDrop($event)">
          <div v-if="primaryProvider" class="static-page-tile-grid">
            <RouterLink
              :to="buildEditRoute(primaryProvider.llmProvider)"
              class="static-page-tile static-page-record-tile"
              data-testid="llm-primary-tile"
              :data-provider-id="buildProviderDragId(primaryProvider.llmProvider)"
              draggable="true"
              @dragstart="handleDragStart(primaryProvider.llmProvider, $event)"
            >
              <span class="static-page-tile-title">{{ primaryProvider.label }}</span>
            </RouterLink>
          </div>

          <div v-else class="static-page-drop-hint" data-testid="primary-llm-empty-state">
            drag and drop a provider here to make it primary
          </div>
        </div>
      </StaticPageSection>

      <StaticPageSection title="Other Providers">
        <div
          :class="['static-page-drop-zone', { 'static-page-drop-zone--compact': !hasOtherProviders }]"
          data-testid="other-llm-providers"
        >
          <div
            v-if="hasOtherProviders"
            class="static-page-tile-grid static-page-record-grid static-page-record-grid--fixed"
          >
            <RouterLink
              v-for="provider in otherProviders"
              :key="provider.llmProvider"
              :to="buildEditRoute(provider.llmProvider)"
              class="static-page-tile static-page-record-tile"
              data-testid="llm-provider-tile"
              :data-provider-id="buildProviderDragId(provider.llmProvider)"
              draggable="true"
              @dragstart="handleDragStart(provider.llmProvider, $event)"
            >
              <span class="static-page-tile-title">{{ provider.label }}</span>
            </RouterLink>
          </div>
        </div>
      </StaticPageSection>

      <RouterLink
        v-if="providers.length > 0 || !error"
        :to="createRoute"
        class="static-page-action-tile static-page-create-action"
        data-testid="llm-create-action"
      >
        Configure Provider
      </RouterLink>
    </template>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import type { LlmSettings } from '../../lib/api/types'
import { useUiPermissions } from '../../lib/auth'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

type LlmProvider = 'OPENAI' | 'GEMINI'

interface ProviderProfile extends LlmSettings {
  activeProvider: LlmProvider
  llmProvider: LlmProvider
  label: string
}

const route = useRoute()
const permissions = useUiPermissions()
const providers = ref<ProviderProfile[]>([])
const primaryProviderId = ref<LlmProvider | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const canManageGlobalSettings = computed(() => permissions.canManageGlobalSettings)

const providerOrder: LlmProvider[] = ['OPENAI', 'GEMINI']
const providerLabels: Record<LlmProvider, string> = {
  OPENAI: 'OpenAI',
  GEMINI: 'Gemini',
}

const workflowOriginState = computed(() => buildWorkflowOriginState('AI', route.fullPath || '/settings/ai'))

const createRoute = computed(() => ({
  path: '/settings/ai/create',
  state: workflowOriginState.value,
}))

function buildEditRoute(llmProvider: string): { name: string; params: { llmProvider: string }; state: Record<string, string> } {
  return {
    name: 'settings-ai-edit',
    params: { llmProvider },
    state: workflowOriginState.value,
  }
}

function buildProviderDragId(llmProvider: string): string {
  return `provider:${llmProvider}`
}

function normalizeProvider(rawProvider: unknown): LlmProvider | null {
  const normalized = String(rawProvider ?? '').trim().toUpperCase()
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

const primaryProvider = computed<ProviderProfile | null>(() => (
  providers.value.find((provider) => provider.llmProvider === primaryProviderId.value) ?? null
))

const otherProviders = computed<ProviderProfile[]>(() => (
  providers.value.filter((provider) => provider.llmProvider !== primaryProviderId.value)
))

const hasOtherProviders = computed(() => otherProviders.value.length > 0)

function updatePrimaryProvider(nextProviderId: LlmProvider | null): void {
  primaryProviderId.value = nextProviderId
  providers.value = providers.value.map((provider) => ({
    ...provider,
    activeProvider: nextProviderId ?? provider.activeProvider,
  }))
}

function resolvePrimaryProviderId(nextProviders: ProviderProfile[]): LlmProvider | null {
  const activeProvider = normalizeProvider(nextProviders[0]?.activeProvider)
  if (activeProvider && nextProviders.some((provider) => provider.llmProvider === activeProvider)) {
    return activeProvider
  }
  return nextProviders[0]?.llmProvider ?? null
}

function handleDragStart(llmProvider: string, event: DragEvent): void {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', buildProviderDragId(llmProvider))
}

async function savePrimaryProvider(nextProvider: ProviderProfile, previousProviderId: LlmProvider | null): Promise<void> {
  if (!canManageGlobalSettings.value) {
    error.value = 'Only super admins can update AI settings.'
    return
  }

  updatePrimaryProvider(nextProvider.llmProvider)

  try {
    await settingsFacade.saveLlmSettings({
      llmProvider: nextProvider.llmProvider,
      llmModel: nextProvider.llmModel,
      llmBaseUrl: nextProvider.llmBaseUrl,
      llmTimeoutSeconds: nextProvider.llmTimeoutSeconds,
      llmEnabled: nextProvider.llmEnabled,
      llmApiKey: '',
    })
  } catch (saveError) {
    updatePrimaryProvider(previousProviderId)
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save the primary AI provider.'
  }
}

async function handleDrop(event: DragEvent): Promise<void> {
  if (!canManageGlobalSettings.value) return

  const droppedProviderId = normalizeProvider(event.dataTransfer?.getData('text/plain')?.replace('provider:', ''))
  if (!droppedProviderId || droppedProviderId === primaryProviderId.value) return

  const nextProvider = providers.value.find((provider) => provider.llmProvider === droppedProviderId)
  if (!nextProvider) return

  const previousProviderId = primaryProviderId.value
  error.value = null
  await savePrimaryProvider(nextProvider, previousProviderId)
}

async function load(): Promise<void> {
  if (!canManageGlobalSettings.value) {
    providers.value = []
    primaryProviderId.value = null
    error.value = 'Only super admins can access AI settings.'
    return
  }

  loading.value = true
  error.value = null
  try {
    const responses = await Promise.all(providerOrder.map((llmProvider) => settingsFacade.getLlmSettings({ llmProvider })))
    providers.value = responses.map((response, index) => buildProfile(providerOrder[index]!, response.llmSettings))
    primaryProviderId.value = resolvePrimaryProviderId(providers.value)
  } catch (loadError) {
    providers.value = []
    primaryProviderId.value = null
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load AI provider settings.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
