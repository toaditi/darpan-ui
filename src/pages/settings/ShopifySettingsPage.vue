<template>
  <StaticPageFrame>
    <template #hero>
      <h1>Shopify</h1>
    </template>

    <StaticPageSection title="Saved Configs">
      <div v-if="pageCount > 1" class="static-page-pager">
        <button type="button" @click="prevPage" :disabled="pageIndex <= 0">Prev</button>
        <span>Page {{ pageIndex + 1 }} / {{ pageCount }}</span>
        <button type="button" @click="nextPage" :disabled="pageIndex + 1 >= pageCount">Next</button>
      </div>

      <p v-if="loading" class="section-note">Loading Shopify configs...</p>
      <InlineValidation v-else-if="error" tone="error" :message="error" />

      <EmptyState
        v-else-if="rows.length === 0"
        title="No Shopify configs"
      />

      <div
        v-else
        class="static-page-tile-grid static-page-record-grid static-page-record-grid--fixed"
        data-testid="saved-shopify-configs"
      >
        <RouterLink
          v-for="row in rows"
          :key="row.shopifyAuthConfigId"
          :to="buildDashboardRoute(row.shopifyAuthConfigId)"
          class="static-page-tile static-page-record-tile"
          data-testid="shopify-auth-tile"
        >
          <span class="static-page-tile-title">{{ savedConfigName(row) }}</span>
        </RouterLink>
      </div>

      <RouterLink
        v-if="canEditTenantSettings && rows.length === 0 && !loading && !error"
        :to="createRoute"
        class="static-page-action-tile static-page-action-tile--inline"
        data-testid="shopify-empty-create-action"
      >
        Create Shopify Config
      </RouterLink>
    </StaticPageSection>

    <RouterLink
      v-if="canEditTenantSettings && rows.length > 0"
      :to="createRoute"
      class="static-page-action-tile static-page-create-action"
      data-testid="shopify-create-action"
    >
      Create Shopify Config
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
import type { ShopifyAuthConfigRecord } from '../../lib/api/types'
import { useAuthState, useUiPermissions } from '../../lib/auth'
import { resolveRecordLabel } from '../../lib/utils/recordLabel'
import { filterRecordsForActiveTenant } from '../../lib/utils/tenantRecords'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const route = useRoute()
const authState = useAuthState()
const permissions = useUiPermissions()

const rows = ref<ShopifyAuthConfigRecord[]>([])
const pageIndex = ref(0)
const pageSize = ref(12)
const pageCount = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)

const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)
const workflowOriginState = computed(() => buildWorkflowOriginState('Shopify', route.fullPath || '/settings/shopify'))

const createRoute = computed(() => ({
  name: 'settings-shopify-create',
  state: workflowOriginState.value,
}))

function savedConfigName(row: ShopifyAuthConfigRecord): string {
  return resolveRecordLabel({
    description: row.description,
    fallbackId: row.shopifyAuthConfigId,
  })
}

function buildDashboardRoute(
  shopifyAuthConfigId: string,
): { name: string; params: { shopifyAuthConfigId: string }; state: Record<string, string> } {
  return {
    name: 'settings-shopify-auth',
    params: { shopifyAuthConfigId },
    state: workflowOriginState.value,
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await settingsFacade.listShopifyAuthConfigs({
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
    })
    rows.value = filterRecordsForActiveTenant(
      response.shopifyAuthConfigs ?? [],
      authState.sessionInfo?.activeTenantUserGroupId ?? null,
    )
    pageCount.value = response.pagination?.pageCount ?? 1
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load Shopify configs.'
  } finally {
    loading.value = false
  }
}

function prevPage(): void {
  if (pageIndex.value > 0) {
    pageIndex.value -= 1
    void load()
  }
}

function nextPage(): void {
  if (pageIndex.value + 1 < pageCount.value) {
    pageIndex.value += 1
    void load()
  }
}

onMounted(() => {
  void load()
})
</script>
