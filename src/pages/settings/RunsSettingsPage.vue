<template>
  <StaticPageFrame>
    <template #hero>
      <h1>Run Editor</h1>
    </template>

    <SettingsRecordListSection
      title="Saved Runs"
      :tiles="recordTiles"
      :page-index="pageIndex"
      :page-count="pageCount"
      pager-aria-label="Saved run pages"
      previous-test-id="runs-page-previous"
      next-test-id="runs-page-next"
      :loading="loading"
      loading-message="Loading runs..."
      :error="error"
      empty-title="No runs"
      list-test-id="saved-runs"
      tile-test-id="run-tile"
      @update:page-index="goToPage"
    />
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import { reconciliationFacade } from '../../lib/api/facade'
import { buildSavedRunEditorRoute, savedRunName } from '../../lib/savedRunEditorRoute'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'
import SettingsRecordListSection from './SettingsRecordListSection.vue'
import { useSettingsPagedList } from './useSettingsPagedList'

const route = useRoute()

const workflowOriginState = computed(() => buildWorkflowOriginState('Run Editor', route.fullPath || '/settings/runs'))
const {
  rows,
  pageIndex,
  pageCount,
  loading,
  error,
  load,
  goToPage,
} = useSettingsPagedList({
  loadPage: (request) => reconciliationFacade.listSavedRuns({ ...request, query: '' }),
  selectRecords: (response) => response.savedRuns ?? [],
  fallbackErrorMessage: 'Failed to load runs.',
})
const recordTiles = computed(() => rows.value.map((row) => ({
  key: row.savedRunId,
  label: savedRunName(row),
  to: buildSavedRunEditorRoute(row, workflowOriginState.value),
})))

onMounted(() => {
  void load()
})
</script>
