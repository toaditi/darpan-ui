<template>
  <StaticPageFrame>
    <template #hero>
      <h1>SFTP Servers</h1>
    </template>

    <SettingsRecordListSection
      title="Saved Servers"
      :tiles="recordTiles"
      :page-index="pageIndex"
      :page-count="pageCount"
      pager-aria-label="SFTP server pages"
      previous-test-id="sftp-page-previous"
      next-test-id="sftp-page-next"
      :loading="loading"
      loading-message="Loading servers..."
      :error="error"
      empty-title="No SFTP servers"
      list-test-id="saved-sftp-servers"
      tile-test-id="sftp-server-tile"
      :can-create="canEditTenantSettings"
      :create-route="createRoute"
      create-label="Create New Server"
      create-test-id="sftp-create-action"
      empty-create-test-id="sftp-empty-create-action"
      @update:page-index="goToPage"
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
const {
  rows,
  pageIndex,
  pageCount,
  loading,
  error,
  load,
  goToPage,
} = useSettingsPagedList({
  loadPage: (request) => settingsFacade.listSftpServers(request),
  selectRecords: (response) => response.servers ?? [],
  activeTenantUserGroupId: () => authState.sessionInfo?.activeTenantUserGroupId ?? null,
  fallbackErrorMessage: 'Failed to load servers.',
})

const createRoute = computed(() => ({
  path: '/settings/sftp/create',
  state: buildWorkflowOriginState('SFTP Servers', route.fullPath || '/settings/sftp'),
}))
const recordTiles = computed(() => rows.value.map((row) => ({
  key: row.sftpServerId,
  label: resolveRecordLabel({
    description: row.description,
    fallbackId: row.sftpServerId,
  }),
  to: {
    name: 'settings-sftp-edit',
    params: { sftpServerId: row.sftpServerId },
    state: buildWorkflowOriginState('SFTP Servers', route.fullPath || '/settings/sftp'),
  },
})))

onMounted(() => {
  void load()
})
</script>
