<template>
  <StaticPageFrame>
    <template #hero>
      <h1>NetSuite</h1>
    </template>

    <SettingsRecordListSection
      title="Auth"
      :tiles="authTiles"
      :page-index="authPageIndex"
      :page-count="authPageCount"
      pager-aria-label="NetSuite auth pages"
      previous-test-id="netsuite-auth-page-previous"
      next-test-id="netsuite-auth-page-next"
      :loading="authLoading"
      loading-message="Loading auth configs..."
      :error="authError"
      empty-title="No auth configs"
      list-test-id="saved-auth-configs"
      tile-test-id="netsuite-auth-tile"
      :can-create="canEditTenantSettings"
      :create-route="authCreateRoute"
      create-label="Create Auth Profile"
      create-test-id="netsuite-auth-create-action"
      empty-create-test-id="netsuite-auth-create-action"
      @update:page-index="goToAuthPage"
    />

    <SettingsRecordListSection
      title="Endpoints"
      :tiles="endpointTiles"
      :page-index="endpointPageIndex"
      :page-count="endpointPageCount"
      pager-aria-label="NetSuite endpoint pages"
      previous-test-id="netsuite-endpoint-page-previous"
      next-test-id="netsuite-endpoint-page-next"
      :loading="endpointLoading"
      loading-message="Loading endpoint configs..."
      :error="endpointError"
      empty-title="No endpoint configs"
      list-test-id="saved-endpoint-configs"
      tile-test-id="netsuite-endpoint-tile"
      :can-create="canEditTenantSettings"
      :create-route="endpointCreateRoute"
      create-label="Create Endpoint"
      create-test-id="netsuite-endpoint-create-action"
      empty-create-test-id="netsuite-endpoint-create-action"
      @update:page-index="goToEndpointPage"
    />
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import { settingsFacade } from '../../lib/api/facade'
import { useAuthState, useUiPermissions } from '../../lib/auth'
import { resolveRecordLabel } from '../../lib/utils/recordLabel'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'
import SettingsRecordListSection from './SettingsRecordListSection.vue'
import { useSettingsPagedList } from './useSettingsPagedList'

const route = useRoute()
const authState = useAuthState()
const permissions = useUiPermissions()

const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)

const workflowOriginState = computed(() => buildWorkflowOriginState('NetSuite', route.fullPath || '/settings/netsuite'))
const {
  rows: authRows,
  pageIndex: authPageIndex,
  pageCount: authPageCount,
  loading: authLoading,
  error: authError,
  load: loadAuthConfigs,
  goToPage: goToAuthPage,
} = useSettingsPagedList({
  pageSize: 10,
  loadPage: (request) => settingsFacade.listNsAuthConfigs(request),
  selectRecords: (response) => response.authConfigs ?? [],
  activeTenantUserGroupId: () => authState.sessionInfo?.activeTenantUserGroupId ?? null,
  fallbackErrorMessage: 'Failed to load NetSuite auth configs.',
})
const {
  rows: endpointRows,
  pageIndex: endpointPageIndex,
  pageCount: endpointPageCount,
  loading: endpointLoading,
  error: endpointError,
  load: loadEndpointConfigs,
  goToPage: goToEndpointPage,
} = useSettingsPagedList({
  pageSize: 10,
  loadPage: (request) => settingsFacade.listNsRestletConfigs(request),
  selectRecords: (response) => response.restletConfigs ?? [],
  activeTenantUserGroupId: () => authState.sessionInfo?.activeTenantUserGroupId ?? null,
  fallbackErrorMessage: 'Failed to load endpoint configs.',
})

const authCreateRoute = computed(() => ({
  name: 'settings-netsuite-auth-create',
  state: workflowOriginState.value,
}))
const authTiles = computed(() => authRows.value.map((row) => ({
  key: row.nsAuthConfigId,
  label: resolveRecordLabel({
    description: row.description,
    fallbackId: row.nsAuthConfigId,
  }),
  to: {
    name: 'settings-netsuite-auth-edit',
    params: { nsAuthConfigId: row.nsAuthConfigId },
    state: workflowOriginState.value,
  },
})))

const endpointCreateRoute = computed(() => ({
  name: 'settings-netsuite-endpoints-create',
  state: workflowOriginState.value,
}))
const endpointTiles = computed(() => endpointRows.value.map((row) => ({
  key: row.nsRestletConfigId,
  label: resolveRecordLabel({
    description: row.description,
    fallbackId: row.nsRestletConfigId,
  }),
  to: {
    name: 'settings-netsuite-endpoints-edit',
    params: { nsRestletConfigId: row.nsRestletConfigId },
    state: workflowOriginState.value,
  },
})))

onMounted(() => {
  void loadAuthConfigs()
  void loadEndpointConfigs()
})
</script>
