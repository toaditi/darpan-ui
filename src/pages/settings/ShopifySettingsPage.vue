<template>
  <StaticPageFrame>
    <template #hero>
      <h1>Shopify</h1>
    </template>

    <SettingsRecordListSection
      title="Saved Configs"
      :tiles="recordTiles"
      :page-index="pageIndex"
      :page-count="pageCount"
      pager-aria-label="Shopify config pages"
      previous-test-id="shopify-page-previous"
      next-test-id="shopify-page-next"
      :loading="loading"
      loading-message="Loading Shopify configs..."
      :error="error"
      empty-title="No Shopify configs"
      list-test-id="saved-shopify-configs"
      tile-test-id="shopify-auth-tile"
      :can-create="canEditTenantSettings"
      :create-route="createRoute"
      create-label="Create Shopify Config"
      create-test-id="shopify-create-action"
      empty-create-test-id="shopify-empty-create-action"
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
const workflowOriginState = computed(() => buildWorkflowOriginState('Shopify', route.fullPath || '/settings/shopify'))
const {
  rows,
  pageIndex,
  pageCount,
  loading,
  error,
  load,
  goToPage,
} = useSettingsPagedList({
  loadPage: (request) => settingsFacade.listShopifyAuthConfigs(request),
  selectRecords: (response) => response.shopifyAuthConfigs ?? [],
  activeTenantUserGroupId: () => authState.sessionInfo?.activeTenantUserGroupId ?? null,
  fallbackErrorMessage: 'Failed to load Shopify configs.',
})

const createRoute = computed(() => ({
  name: 'settings-shopify-create',
  state: workflowOriginState.value,
}))
const recordTiles = computed(() => rows.value.map((row) => ({
  key: row.shopifyAuthConfigId,
  label: resolveRecordLabel({
    description: row.description,
    fallbackId: row.shopifyAuthConfigId,
  }),
  to: {
    name: 'settings-shopify-auth',
    params: { shopifyAuthConfigId: row.shopifyAuthConfigId },
    state: workflowOriginState.value,
  },
})))

onMounted(() => {
  void load()
})
</script>
