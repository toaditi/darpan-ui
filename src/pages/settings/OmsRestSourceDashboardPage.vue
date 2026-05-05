<template>
  <StaticPageFrame>
    <template #hero>
      <h1>{{ heroTitle }}</h1>
    </template>

    <p v-if="loading" class="section-note">Loading HotWax auth config...</p>
    <InlineValidation v-else-if="error" tone="error" :message="error" />

    <template v-else-if="config">
      <InlineValidation v-if="deleteError" tone="error" :message="deleteError" />

      <StaticPageSection>
        <template #header>
          <div class="static-page-section-header-row">
            <h2 class="static-page-section-heading">Auth</h2>
            <RouterLink
              v-if="canEditTenantSettings"
              :to="editRoute"
              class="app-icon-action static-page-section-edit-action"
              data-testid="oms-auth-edit-action"
              aria-label="Edit HotWax Auth"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path :d="editIconPath" />
              </svg>
            </RouterLink>
          </div>
        </template>

        <div class="static-page-summary-grid">
          <article class="static-page-summary-card">
            <span class="static-page-summary-label">Config ID</span>
            <span>{{ config.omsRestSourceConfigId }}</span>
          </article>
          <article class="static-page-summary-card static-page-summary-card--wide">
            <span class="static-page-summary-label">Base URL</span>
            <span>{{ config.baseUrl }}</span>
          </article>
          <article class="static-page-summary-card">
            <span class="static-page-summary-label">Active</span>
            <span>{{ activeLabel }}</span>
          </article>
          <article class="static-page-summary-card static-page-summary-card--wide">
            <span class="static-page-summary-label">Timezone</span>
            <span>{{ timeZone }}</span>
          </article>
        </div>
      </StaticPageSection>

      <StaticPageSection title="Endpoints">
        <div
          class="static-page-tile-grid static-page-record-grid static-page-record-grid--fixed"
          data-testid="oms-endpoint-configs"
        >
          <article
            v-for="endpoint in availableEndpoints"
            :key="endpoint.id"
            class="static-page-tile static-page-list-tile static-page-record-tile"
            data-testid="oms-endpoint-tile"
          >
            <span class="static-page-list-tile__title">{{ endpoint.label }}</span>
            <span class="static-page-list-tile__meta">{{ endpoint.method }} {{ endpoint.path }}</span>
          </article>
          <EmptyState v-if="availableEndpoints.length === 0" title="No available endpoints" />
        </div>
      </StaticPageSection>
    </template>

    <StaticPageSection v-else>
      <EmptyState title="HotWax auth config unavailable" />
    </StaticPageSection>

    <template v-if="config" #actions>
      <div class="action-row settings-dashboard-footer-row">
        <RouterLink
          to="/settings/hotwax"
          class="app-icon-action app-icon-action--large settings-dashboard-footer-action"
          data-testid="back-oms-rest-source"
          aria-label="Back to HotWax Settings"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path :d="backIconPath" fill="currentColor" />
          </svg>
        </RouterLink>

        <RouterLink
          to="/settings/hotwax"
          class="app-icon-action app-icon-action--large settings-dashboard-footer-action"
          data-testid="list-oms-rest-sources"
          aria-label="View HotWax sources"
          title="View HotWax sources"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path :d="listIconPath" fill="currentColor" />
          </svg>
        </RouterLink>

        <button
          v-if="canEditTenantSettings"
          type="button"
          class="app-icon-action app-icon-action--large app-icon-action--danger settings-dashboard-footer-action"
          data-testid="delete-oms-rest-source"
          aria-label="Delete HotWax source"
          :disabled="deletingConfig"
          @click="deleteConfig"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path :d="trashIconPath" :transform="trashIconTransform" fill="currentColor" />
          </svg>
        </button>
      </div>
    </template>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import type { OmsRestSourceConfigRecord } from '../../lib/api/types'
import { useAuthState, useUiPermissions } from '../../lib/auth'
import { OMS_ORDERS_ENDPOINT_DOC } from '../../lib/omsSwagger'
import { resolveRecordLabel } from '../../lib/utils/recordLabel'
import { filterRecordsForActiveTenant } from '../../lib/utils/tenantRecords'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const route = useRoute()
const router = useRouter()
const authState = useAuthState()
const permissions = useUiPermissions()

const config = ref<OmsRestSourceConfigRecord | null>(null)
const loading = ref(false)
const deletingConfig = ref(false)
const error = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const ordersEndpoint = OMS_ORDERS_ENDPOINT_DOC
const editIconPath =
  'M14.73 2.73a1.75 1.75 0 0 1 2.48 2.48l-1.2 1.2-2.48-2.48 1.2-1.2ZM12.47 4.99 4.8 12.66l-1.18 3.72 3.72-1.18 7.67-7.67-2.54-2.54Z'
const trashIconPath =
  'M7.5 3.5A1.5 1.5 0 0 1 9 2h2a1.5 1.5 0 0 1 1.5 1.5V4H15a.75.75 0 0 1 0 1.5h-.57l-.58 9.17A1.75 1.75 0 0 1 12.1 16.5H7.9a1.75 1.75 0 0 1-1.75-1.33L5.57 5.5H5a.75.75 0 0 1 0-1.5h2.5v-.5ZM11 3.5h-2V4h2v-.5ZM7.07 5.5l.56 8.89c.02.19.13.31.27.31h4.2c.14 0 .25-.12.27-.31l.56-8.89H7.07Zm1.68 1.75a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Zm2.5 0a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Z'
const trashIconTransform = 'translate(0 0.75)'
const backIconPath =
  'M9.53 4.47a.75.75 0 0 1 0 1.06L6.81 8.25H15a.75.75 0 0 1 0 1.5H6.81l2.72 2.72a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0Z'
const listIconPath =
  'M5.5 5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm2-.75h8a.75.75 0 0 1 0 1.5h-8a.75.75 0 0 1 0-1.5ZM5.5 10a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm2-.75h8a.75.75 0 0 1 0 1.5h-8a.75.75 0 0 1 0-1.5ZM5.5 15a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm2-.75h8a.75.75 0 0 1 0 1.5h-8a.75.75 0 0 1 0-1.5Z'

const configId = computed(() => String(route.params.omsRestSourceConfigId ?? '').trim())
const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)
const heroTitle = computed(() => (
  config.value
    ? resolveRecordLabel({ description: config.value.description, fallbackId: config.value.omsRestSourceConfigId })
    : 'HotWax'
))
const timeZone = computed(() => config.value?.timeZone?.trim() || 'UTC')
const activeLabel = computed(() => (config.value?.isActive === 'N' ? 'No' : 'Yes'))
const availableEndpoints = computed(() => (
  config.value?.canReadOrders === false ? [] : [ordersEndpoint]
))
const workflowOriginState = computed(() => buildWorkflowOriginState(heroTitle.value, route.fullPath || `/settings/hotwax/auth/${configId.value}`))
const editRoute = computed(() => ({
  name: 'settings-oms-edit',
  params: { omsRestSourceConfigId: configId.value },
  state: workflowOriginState.value,
}))

async function load(): Promise<void> {
  if (!configId.value) {
    error.value = 'HotWax Config ID is missing.'
    return
  }

  loading.value = true
  error.value = null
  config.value = null
  try {
    const response = await settingsFacade.listOmsRestSourceConfigs({ pageIndex: 0, pageSize: 200 })
    const matchingConfig = filterRecordsForActiveTenant(
      response.omsRestSourceConfigs ?? [],
      authState.sessionInfo?.activeTenantUserGroupId ?? null,
    ).find((record) => record.omsRestSourceConfigId === configId.value)
    if (!matchingConfig) {
      error.value = `Unable to find HotWax auth config "${configId.value}".`
      return
    }
    config.value = matchingConfig
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load HotWax auth config.'
  } finally {
    loading.value = false
  }
}

async function deleteConfig(): Promise<void> {
  if (!config.value || !canEditTenantSettings.value || deletingConfig.value) return

  const deleteLabel = resolveRecordLabel({
    description: config.value.description,
    fallbackId: config.value.omsRestSourceConfigId,
  })
  if (!window.confirm(`Delete HotWax source "${deleteLabel}"?`)) return

  deletingConfig.value = true
  deleteError.value = null
  try {
    await settingsFacade.deleteOmsRestSourceConfig({ omsRestSourceConfigId: config.value.omsRestSourceConfigId })
    await router.push('/settings/hotwax')
  } catch (deleteFailure) {
    deleteError.value = deleteFailure instanceof ApiCallError ? deleteFailure.message : 'Failed to delete HotWax source.'
  } finally {
    deletingConfig.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
