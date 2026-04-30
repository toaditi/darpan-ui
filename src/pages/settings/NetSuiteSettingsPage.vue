<template>
  <StaticPageFrame>
    <template #hero>
      <h1>NetSuite</h1>
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
        data-testid="saved-auth-configs"
      >
        <RouterLink
          v-for="row in authRows"
          :key="row.nsAuthConfigId"
          :to="buildAuthEditRoute(row.nsAuthConfigId)"
          class="static-page-tile static-page-record-tile"
          data-testid="netsuite-auth-tile"
        >
          <span class="static-page-tile-title">{{ savedAuthConfigName(row) }}</span>
        </RouterLink>
      </div>

      <RouterLink
        v-if="canEditTenantSettings && authRows.length === 0 && !authLoading && !authError"
        :to="authCreateRoute"
        class="static-page-action-tile static-page-action-tile--inline"
        data-testid="netsuite-auth-create-action"
      >
        Create Auth Profile
      </RouterLink>
    </StaticPageSection>

    <RouterLink
      v-if="canEditTenantSettings && authRows.length > 0"
      :to="authCreateRoute"
      class="static-page-action-tile static-page-create-action"
      data-testid="netsuite-auth-create-action"
    >
      Create Auth Profile
    </RouterLink>

    <StaticPageSection title="Endpoints">
      <div v-if="endpointPageCount > 1" class="static-page-pager">
        <button type="button" @click="prevEndpointPage" :disabled="endpointPageIndex <= 0">Prev</button>
        <span>Page {{ endpointPageIndex + 1 }} / {{ endpointPageCount }}</span>
        <button type="button" @click="nextEndpointPage" :disabled="endpointPageIndex + 1 >= endpointPageCount">
          Next
        </button>
      </div>

      <p v-if="endpointLoading" class="section-note">Loading endpoint configs...</p>
      <InlineValidation v-else-if="endpointError" tone="error" :message="endpointError" />

      <EmptyState
        v-else-if="endpointRows.length === 0"
        title="No endpoint configs"
      />

      <div
        v-else
        class="static-page-tile-grid static-page-record-grid static-page-record-grid--fixed"
        data-testid="saved-endpoint-configs"
      >
        <RouterLink
          v-for="row in endpointRows"
          :key="row.nsRestletConfigId"
          :to="buildEndpointEditRoute(row.nsRestletConfigId)"
          class="static-page-tile static-page-record-tile"
          data-testid="netsuite-endpoint-tile"
        >
          <span class="static-page-tile-title">{{ savedEndpointConfigName(row) }}</span>
        </RouterLink>
      </div>

      <RouterLink
        v-if="canEditTenantSettings && endpointRows.length === 0 && !endpointLoading && !endpointError"
        :to="endpointCreateRoute"
        class="static-page-action-tile static-page-action-tile--inline"
        data-testid="netsuite-endpoint-create-action"
      >
        Create Endpoint
      </RouterLink>
    </StaticPageSection>

    <RouterLink
      v-if="canEditTenantSettings && endpointRows.length > 0"
      :to="endpointCreateRoute"
      class="static-page-action-tile static-page-create-action"
      data-testid="netsuite-endpoint-create-action"
    >
      Create Endpoint
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
import { useAuthState, useUiPermissions } from '../../lib/auth'
import type { NsAuthConfigRecord, NsRestletConfigRecord } from '../../lib/api/types'
import { resolveRecordLabel } from '../../lib/utils/recordLabel'
import { filterRecordsForActiveTenant } from '../../lib/utils/tenantRecords'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const route = useRoute()
const authState = useAuthState()
const permissions = useUiPermissions()

const authRows = ref<NsAuthConfigRecord[]>([])
const authPageIndex = ref(0)
const authPageSize = ref(10)
const authPageCount = ref(1)
const authLoading = ref(false)
const authError = ref<string | null>(null)

const endpointRows = ref<NsRestletConfigRecord[]>([])
const endpointPageIndex = ref(0)
const endpointPageSize = ref(10)
const endpointPageCount = ref(1)
const endpointLoading = ref(false)
const endpointError = ref<string | null>(null)
const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)

const workflowOriginState = computed(() => buildWorkflowOriginState('NetSuite', route.fullPath || '/settings/netsuite'))

const authCreateRoute = computed(() => ({
  name: 'settings-netsuite-auth-create',
  state: workflowOriginState.value,
}))

const endpointCreateRoute = computed(() => ({
  name: 'settings-netsuite-endpoints-create',
  state: workflowOriginState.value,
}))

function savedAuthConfigName(row: NsAuthConfigRecord): string {
  return resolveRecordLabel({
    description: row.description,
    fallbackId: row.nsAuthConfigId,
  })
}

function savedEndpointConfigName(row: NsRestletConfigRecord): string {
  return resolveRecordLabel({
    description: row.description,
    fallbackId: row.nsRestletConfigId,
  })
}

function buildAuthEditRoute(nsAuthConfigId: string): { name: string; params: { nsAuthConfigId: string }; state: Record<string, string> } {
  return {
    name: 'settings-netsuite-auth-edit',
    params: { nsAuthConfigId },
    state: workflowOriginState.value,
  }
}

function buildEndpointEditRoute(
  nsRestletConfigId: string,
): { name: string; params: { nsRestletConfigId: string }; state: Record<string, string> } {
  return {
    name: 'settings-netsuite-endpoints-edit',
    params: { nsRestletConfigId },
    state: workflowOriginState.value,
  }
}

async function loadAuthConfigs(): Promise<void> {
  authLoading.value = true
  authError.value = null
  try {
    const response = await settingsFacade.listNsAuthConfigs({
      pageIndex: authPageIndex.value,
      pageSize: authPageSize.value,
    })
    authRows.value = filterRecordsForActiveTenant(
      response.authConfigs ?? [],
      authState.sessionInfo?.activeTenantUserGroupId ?? null,
    )
    authPageCount.value = response.pagination?.pageCount ?? 1
  } catch (loadError) {
    authError.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load NetSuite auth configs.'
  } finally {
    authLoading.value = false
  }
}

async function loadEndpointConfigs(): Promise<void> {
  endpointLoading.value = true
  endpointError.value = null
  try {
    const response = await settingsFacade.listNsRestletConfigs({
      pageIndex: endpointPageIndex.value,
      pageSize: endpointPageSize.value,
    })
    endpointRows.value = filterRecordsForActiveTenant(
      response.restletConfigs ?? [],
      authState.sessionInfo?.activeTenantUserGroupId ?? null,
    )
    endpointPageCount.value = response.pagination?.pageCount ?? 1
  } catch (loadError) {
    endpointError.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load endpoint configs.'
  } finally {
    endpointLoading.value = false
  }
}

function prevAuthPage(): void {
  if (authPageIndex.value > 0) {
    authPageIndex.value -= 1
    void loadAuthConfigs()
  }
}

function nextAuthPage(): void {
  if (authPageIndex.value + 1 < authPageCount.value) {
    authPageIndex.value += 1
    void loadAuthConfigs()
  }
}

function prevEndpointPage(): void {
  if (endpointPageIndex.value > 0) {
    endpointPageIndex.value -= 1
    void loadEndpointConfigs()
  }
}

function nextEndpointPage(): void {
  if (endpointPageIndex.value + 1 < endpointPageCount.value) {
    endpointPageIndex.value += 1
    void loadEndpointConfigs()
  }
}

onMounted(() => {
  void loadAuthConfigs()
  void loadEndpointConfigs()
})
</script>
