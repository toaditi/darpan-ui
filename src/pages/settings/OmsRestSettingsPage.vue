<template>
  <StaticPageFrame>
    <template #hero>
      <h1>HotWax</h1>
    </template>

    <StaticPageSection title="Auth">
      <div v-if="authPageCount > 1" class="static-page-pager">
        <button type="button" @click="prevAuthPage" :disabled="authPageIndex <= 0">Prev</button>
        <span>Page {{ authPageIndex + 1 }} / {{ authPageCount }}</span>
        <button type="button" @click="nextAuthPage" :disabled="authPageIndex + 1 >= authPageCount">Next</button>
      </div>

      <p v-if="authLoading" class="section-note">Loading auth configs...</p>
      <InlineValidation v-else-if="authError" tone="error" :message="authError" />

      <EmptyState
        v-else-if="authRows.length === 0"
        title="No auth configs"
      />

      <div
        v-else
        class="static-page-tile-grid static-page-record-grid static-page-record-grid--fixed"
        data-testid="saved-oms-auth-configs"
      >
        <RouterLink
          v-for="row in authRows"
          :key="row.omsRestSourceConfigId"
          :to="buildAuthDashboardRoute(row.omsRestSourceConfigId)"
          class="static-page-tile static-page-record-tile"
          data-testid="oms-auth-tile"
        >
          <span class="static-page-tile-title">{{ savedAuthConfigName(row) }}</span>
        </RouterLink>
      </div>

      <RouterLink
        v-if="canEditTenantSettings && authRows.length === 0 && !authLoading && !authError"
        :to="authCreateRoute"
        class="static-page-action-tile static-page-action-tile--inline"
        data-testid="oms-auth-create-action"
      >
        Create Auth Profile
      </RouterLink>
    </StaticPageSection>

    <RouterLink
      v-if="canEditTenantSettings && authRows.length > 0"
      :to="authCreateRoute"
      class="static-page-action-tile static-page-create-action"
      data-testid="oms-auth-create-action"
    >
      Create Auth Profile
    </RouterLink>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import type { OmsRestSourceConfigRecord } from '../../lib/api/types'
import { useAuthState, useUiPermissions } from '../../lib/auth'
import { resolveRecordLabel } from '../../lib/utils/recordLabel'
import { filterRecordsForActiveTenant } from '../../lib/utils/tenantRecords'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const route = useRoute()
const authState = useAuthState()
const permissions = useUiPermissions()

const authRows = ref<OmsRestSourceConfigRecord[]>([])
const authPageIndex = ref(0)
const authPageSize = ref(12)
const authPageCount = ref(1)
const authLoading = ref(false)
const authError = ref<string | null>(null)

const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)
const workflowOriginState = computed(() => buildWorkflowOriginState('HotWax', route.fullPath || '/settings/hotwax'))

const authCreateRoute = computed(() => ({
  name: 'settings-oms-create',
  state: workflowOriginState.value,
}))

function savedAuthConfigName(row: OmsRestSourceConfigRecord): string {
  return resolveRecordLabel({
    description: row.description,
    fallbackId: row.omsRestSourceConfigId,
  })
}

function buildAuthDashboardRoute(
  omsRestSourceConfigId: string,
): { name: string; params: { omsRestSourceConfigId: string }; state: Record<string, string> } {
  return {
    name: 'settings-oms-auth',
    params: { omsRestSourceConfigId },
    state: workflowOriginState.value,
  }
}

async function load(): Promise<void> {
  authLoading.value = true
  authError.value = null
  try {
    const response = await settingsFacade.listOmsRestSourceConfigs({
      pageIndex: authPageIndex.value,
      pageSize: authPageSize.value,
    })
    authRows.value = filterRecordsForActiveTenant(
      response.omsRestSourceConfigs ?? [],
      authState.sessionInfo?.activeTenantUserGroupId ?? null,
    )
    authPageCount.value = response.pagination?.pageCount ?? 1
  } catch (loadError) {
    authError.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load HotWax auth configs.'
  } finally {
    authLoading.value = false
  }
}

function prevAuthPage(): void {
  if (authPageIndex.value > 0) {
    authPageIndex.value -= 1
    void load()
  }
}

function nextAuthPage(): void {
  if (authPageIndex.value + 1 < authPageCount.value) {
    authPageIndex.value += 1
    void load()
  }
}

onMounted(() => {
  void load()
})
</script>
