<template>
  <StaticPageFrame>
    <template #hero>
      <h1>Run Editor</h1>
    </template>

    <StaticPageSection title="Saved Runs">
      <div v-if="pageCount > 1" class="static-page-pager">
        <button type="button" @click="prevPage" :disabled="pageIndex <= 0">Prev</button>
        <span>Page {{ pageIndex + 1 }} / {{ pageCount }}</span>
        <button type="button" @click="nextPage" :disabled="pageIndex + 1 >= pageCount">Next</button>
      </div>

      <p v-if="loading" class="section-note">Loading runs...</p>
      <InlineValidation v-else-if="error" tone="error" :message="error" />

      <EmptyState
        v-else-if="rows.length === 0"
        title="No runs"
      />

      <div
        v-else
        class="static-page-tile-grid static-page-record-grid static-page-record-grid--fixed"
        data-testid="saved-runs"
      >
        <RouterLink
          v-for="row in rows"
          :key="row.reconciliationMappingId"
          :to="buildEditRoute(row.reconciliationMappingId)"
          class="static-page-tile static-page-record-tile"
          data-testid="run-tile"
        >
          <span class="static-page-tile-title">{{ savedRunName(row) }}</span>
        </RouterLink>
      </div>

      <RouterLink
        v-if="rows.length === 0 && !loading && !error"
        :to="createRoute"
        class="static-page-action-tile static-page-action-tile--inline"
        data-testid="runs-empty-create-action"
      >
        Create Run
      </RouterLink>
    </StaticPageSection>

    <RouterLink
      v-if="rows.length > 0"
      :to="createRoute"
      class="static-page-action-tile static-page-create-action"
      data-testid="runs-create-action"
    >
      Create Run
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
import { reconciliationFacade } from '../../lib/api/facade'
import type { PilotMappingSummary } from '../../lib/api/types'
import { resolveRecordLabel } from '../../lib/utils/recordLabel'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const route = useRoute()

const rows = ref<PilotMappingSummary[]>([])
const pageIndex = ref(0)
const pageSize = ref(12)
const pageCount = ref(1)

const loading = ref(false)
const error = ref<string | null>(null)

const workflowOriginState = computed(() => buildWorkflowOriginState('Run Editor', route.fullPath || '/settings/runs'))

const createRoute = computed(() => ({
  path: '/reconciliation/create',
  state: workflowOriginState.value,
}))

function savedRunName(row: PilotMappingSummary): string {
  return resolveRecordLabel({
    primary: row.mappingName,
    description: row.description,
    fallbackId: row.reconciliationMappingId,
  })
}

function buildEditRoute(
  reconciliationMappingId: string,
): { name: string; params: { reconciliationMappingId: string }; state: Record<string, string> } {
  return {
    name: 'settings-runs-edit',
    params: { reconciliationMappingId },
    state: workflowOriginState.value,
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await reconciliationFacade.listPilotMappings({
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
      query: '',
    })
    rows.value = response.mappings ?? []
    pageCount.value = response.pagination?.pageCount ?? 1
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load runs.'
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
