<template>
  <StaticPageFrame>
    <template #hero>
      <h1>HotWax</h1>
    </template>

    <SettingsRecordListSection
      title="Auth"
      :tiles="authTiles"
      :page-index="authPageIndex"
      :page-count="authPageCount"
      pager-aria-label="HotWax auth pages"
      previous-test-id="oms-auth-page-previous"
      next-test-id="oms-auth-page-next"
      :loading="authLoading"
      loading-message="Loading auth configs..."
      :error="authError"
      empty-title="No auth configs"
      list-test-id="saved-oms-auth-configs"
      tile-test-id="oms-auth-tile"
      :can-create="canEditTenantSettings"
      :create-route="authCreateRoute"
      create-label="Create Auth Profile"
      create-test-id="oms-auth-create-action"
      empty-create-test-id="oms-auth-create-action"
      @update:page-index="goToAuthPage"
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
const workflowOriginState = computed(() => buildWorkflowOriginState('HotWax', route.fullPath || '/settings/hotwax'))
const {
  rows: authRows,
  pageIndex: authPageIndex,
  pageCount: authPageCount,
  loading: authLoading,
  error: authError,
  load,
  goToPage: goToAuthPage,
} = useSettingsPagedList({
  loadPage: (request) => settingsFacade.listOmsRestSourceConfigs(request),
  selectRecords: (response) => response.omsRestSourceConfigs ?? [],
  activeTenantUserGroupId: () => authState.sessionInfo?.activeTenantUserGroupId ?? null,
  fallbackErrorMessage: 'Failed to load HotWax auth configs.',
})

const authCreateRoute = computed(() => ({
  name: 'settings-oms-create',
  state: workflowOriginState.value,
}))
const authTiles = computed(() => authRows.value.map((row) => ({
  key: row.omsRestSourceConfigId,
  label: resolveRecordLabel({
    description: row.description,
    fallbackId: row.omsRestSourceConfigId,
  }),
  to: {
    name: 'settings-oms-auth',
    params: { omsRestSourceConfigId: row.omsRestSourceConfigId },
    state: workflowOriginState.value,
  },
})))

onMounted(() => {
  void load()
})
</script>
