<template>
  <StaticPageFrame>
    <template #hero>
      <div class="run-history-hero">
        <StaticEditableTitle
          v-model="editableRunName"
          :editable="canEditTenantSettings && Boolean(savedRunId) && !savingRunName"
          aria-label="Run name"
          test-id="run-history-title"
          fallback="Selected Run"
          @commit="saveRunName"
        />
      </div>
    </template>

    <StaticPageSection v-if="featuredOutput" title="Most Recent">
      <RouterLink
        class="static-page-tile run-history-tile run-history-featured-tile"
        data-testid="run-history-featured-tile"
        :to="buildResultRoute(featuredOutput.fileName)"
      >
        <div class="run-history-tile__head">
          <span class="static-page-tile-title">{{ formatSavedResultDateTime(featuredOutput.createdDate) }}</span>
        </div>
        <dl class="run-history-metrics run-history-metrics--featured">
          <div>
            <dt>Total differences</dt>
            <dd>{{ featuredOutput.totalDifferences ?? 0 }}</dd>
          </div>
          <div>
            <dt>Missing from {{ featuredOutput.file1Label || file1SystemLabel }}</dt>
            <dd>{{ featuredOutput.onlyInFile2Count ?? 0 }}</dd>
          </div>
          <div>
            <dt>Missing from {{ featuredOutput.file2Label || file2SystemLabel }}</dt>
            <dd>{{ featuredOutput.onlyInFile1Count ?? 0 }}</dd>
          </div>
        </dl>
      </RouterLink>
    </StaticPageSection>

    <StaticPageSection v-if="showHistorySection" title="Previous Results">
      <p v-if="showLoadingState" class="section-note" data-testid="run-history-loading">Loading saved results…</p>
      <InlineValidation v-else-if="loadError" tone="error" :message="loadError" />
      <div v-else-if="visibleOtherGeneratedOutputs.length > 0" class="static-page-tile-grid run-history-grid" data-testid="run-history-results">
        <RouterLink
          v-for="output in visibleOtherGeneratedOutputs"
          :key="output.fileName"
          class="static-page-tile run-history-tile"
          data-testid="run-history-result-tile"
          :to="buildResultRoute(output.fileName)"
        >
          <div class="run-history-tile__head">
            <span class="static-page-tile-title">{{ formatSavedResultDateTime(output.createdDate) }}</span>
          </div>
          <dl class="run-history-metrics">
            <div>
              <dt>Total differences</dt>
              <dd>{{ output.totalDifferences ?? 0 }}</dd>
            </div>
            <div>
              <dt>Missing from {{ output.file1Label || file1SystemLabel }}</dt>
              <dd>{{ output.onlyInFile2Count ?? 0 }}</dd>
            </div>
            <div>
              <dt>Missing from {{ output.file2Label || file2SystemLabel }}</dt>
              <dd>{{ output.onlyInFile1Count ?? 0 }}</dd>
            </div>
          </dl>
        </RouterLink>
        <button
          v-if="hasMoreOtherOutputs"
          type="button"
          class="static-page-control-tile run-history-more-tile"
          data-testid="run-history-more"
          :disabled="loadingMore"
          @click="void loadMoreOutputs()"
        >
          {{ loadingMore ? 'Loading…' : 'More...' }}
        </button>
      </div>
      <div v-else class="static-page-drop-hint" data-testid="run-history-empty">No saved results yet for this run.</div>
    </StaticPageSection>

    <RouterLink v-if="canEditTenantSettings" class="static-page-action-tile" data-testid="run-history-open-workflow" :to="workflowRoute">
      Open Run
    </RouterLink>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import StaticEditableTitle from '../../components/ui/StaticEditableTitle.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { reconciliationFacade } from '../../lib/api/facade'
import type { PaginationMeta, GeneratedOutput } from '../../lib/api/types'
import { useUiPermissions } from '../../lib/auth'
import {
  buildReconciliationDiffRoute,
  buildReconciliationRunResultRoute,
  type ReconciliationRunRouteContext,
} from '../../lib/reconciliationRoutes'
import { formatSavedResultDateTime } from '../../lib/utils/date'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const GENERATED_OUTPUT_FETCH_PAGE_SIZE = 6
const OTHER_RESULTS_BATCH_SIZE = 5

const route = useRoute()
const permissions = useUiPermissions()
const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref<string | null>(null)
const editableRunName = ref('')
const persistedRunName = ref('')
const savingRunName = ref(false)
const generatedOutputs = ref<GeneratedOutput[]>([])
const lastLoadedPageIndex = ref(-1)
const visibleOtherOutputCount = ref(OTHER_RESULTS_BATCH_SIZE)
const pagination = ref<PaginationMeta>({
  pageIndex: 0,
  pageSize: GENERATED_OUTPUT_FETCH_PAGE_SIZE,
  totalCount: 0,
  pageCount: 1,
})
const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)

const savedRunId = computed(() =>
  typeof route.params.savedRunId === 'string' ? route.params.savedRunId.trim() : '',
)
const routeRunName = computed(() => (typeof route.query.runName === 'string' && route.query.runName.trim() ? route.query.runName.trim() : 'Selected Run'))
const runName = computed(() => editableRunName.value || routeRunName.value)
const file1SystemLabel = computed(() =>
  typeof route.query.file1SystemLabel === 'string' && route.query.file1SystemLabel.trim() ? route.query.file1SystemLabel.trim() : 'System 1',
)
const file2SystemLabel = computed(() =>
  typeof route.query.file2SystemLabel === 'string' && route.query.file2SystemLabel.trim() ? route.query.file2SystemLabel.trim() : 'System 2',
)
const reconciliationRunRouteContext = computed<ReconciliationRunRouteContext>(() => ({
  savedRunId: savedRunId.value,
  runName: runName.value,
  file1SystemLabel: file1SystemLabel.value,
  file2SystemLabel: file2SystemLabel.value,
}))
const workflowRoute = computed(() =>
  buildReconciliationDiffRoute(
    reconciliationRunRouteContext.value,
    buildWorkflowOriginState('Run History', route.fullPath),
  ),
)
const featuredOutput = computed(() => generatedOutputs.value[0] ?? null)
const otherGeneratedOutputs = computed(() => generatedOutputs.value.slice(1))
const visibleOtherGeneratedOutputs = computed(() => otherGeneratedOutputs.value.slice(0, visibleOtherOutputCount.value))
const showLoadingState = computed(() => loading.value && generatedOutputs.value.length === 0)
const showHistorySection = computed(() => showLoadingState.value || Boolean(loadError.value) || !featuredOutput.value || otherGeneratedOutputs.value.length > 0)
const hasMoreLoadedOtherOutputs = computed(() => otherGeneratedOutputs.value.length > visibleOtherOutputCount.value)
const hasMoreHistoryPages = computed(() => lastLoadedPageIndex.value + 1 < pagination.value.pageCount)
const hasMoreOtherOutputs = computed(() => hasMoreLoadedOtherOutputs.value || hasMoreHistoryPages.value)

function buildResultRoute(outputFileName: string) {
  return buildReconciliationRunResultRoute(reconciliationRunRouteContext.value, outputFileName)
}

function resetHistoryState(): void {
  loadError.value = null
  editableRunName.value = routeRunName.value
  persistedRunName.value = routeRunName.value
  savingRunName.value = false
  generatedOutputs.value = []
  loadingMore.value = false
  lastLoadedPageIndex.value = -1
  visibleOtherOutputCount.value = OTHER_RESULTS_BATCH_SIZE
  pagination.value = {
    pageIndex: 0,
    pageSize: GENERATED_OUTPUT_FETCH_PAGE_SIZE,
    totalCount: 0,
    pageCount: 1,
  }
}

async function saveRunName(nextRunName: string): Promise<void> {
  const normalizedRunName = nextRunName.trim()
  const previousRunName = persistedRunName.value || routeRunName.value
  if (!canEditTenantSettings.value) {
    editableRunName.value = previousRunName
    return
  }
  if (!savedRunId.value) return
  if (!normalizedRunName) {
    editableRunName.value = previousRunName
    return
  }
  if (normalizedRunName === previousRunName || savingRunName.value) return

  savingRunName.value = true
  loadError.value = null

  try {
    const response = await reconciliationFacade.saveSavedRunName({
      savedRunId: savedRunId.value,
      runName: normalizedRunName,
    })
    const savedRunName = response.savedRun?.runName || normalizedRunName
    editableRunName.value = savedRunName
    persistedRunName.value = savedRunName
  } catch (error) {
    editableRunName.value = previousRunName
    loadError.value = error instanceof ApiCallError ? error.message : 'Unable to save run name.'
  } finally {
    savingRunName.value = false
  }
}

function appendGeneratedOutputs(nextOutputs: GeneratedOutput[]): void {
  const existingFileNames = new Set(generatedOutputs.value.map((output) => output.fileName))
  const dedupedOutputs = nextOutputs.filter((output) => !existingFileNames.has(output.fileName))
  generatedOutputs.value = [...generatedOutputs.value, ...dedupedOutputs]
}

async function loadGeneratedOutputs(targetPageIndex = 0, append = false): Promise<void> {
  const requestedSavedRunId = savedRunId.value

  if (!requestedSavedRunId) {
    resetHistoryState()
    loadError.value = 'Run history is unavailable without a selected reconciliation run.'
    return
  }

  if (append) loadingMore.value = true
  else {
    loading.value = true
    loadError.value = null
  }

  try {
    const response = await reconciliationFacade.listGeneratedOutputs({
      savedRunId: requestedSavedRunId,
      pageIndex: targetPageIndex,
      pageSize: GENERATED_OUTPUT_FETCH_PAGE_SIZE,
      query: '',
    })

    if (savedRunId.value !== requestedSavedRunId) return

    const nextOutputs = response.generatedOutputs ?? []
    if (append) appendGeneratedOutputs(nextOutputs)
    else generatedOutputs.value = nextOutputs

    pagination.value = response.pagination ?? pagination.value
    lastLoadedPageIndex.value = targetPageIndex
  } catch (error) {
    if (savedRunId.value !== requestedSavedRunId) return

    if (!append) generatedOutputs.value = []
    loadError.value = error instanceof ApiCallError ? error.message : 'Unable to load saved results.'
  } finally {
    if (savedRunId.value === requestedSavedRunId) {
      if (append) loadingMore.value = false
      else loading.value = false
    }
  }
}

async function loadMoreOutputs(): Promise<void> {
  if (hasMoreLoadedOtherOutputs.value) {
    visibleOtherOutputCount.value += OTHER_RESULTS_BATCH_SIZE
    return
  }

  if (!hasMoreHistoryPages.value || loadingMore.value) return

  await loadGeneratedOutputs(lastLoadedPageIndex.value + 1, true)
  visibleOtherOutputCount.value += OTHER_RESULTS_BATCH_SIZE
}

watch(savedRunId, () => {
  resetHistoryState()
  void loadGeneratedOutputs()
}, { immediate: true })
</script>

<style scoped>
.run-history-hero {
  display: grid;
  gap: var(--space-2);
}

.run-history-hero h1 {
  margin: 0;
}

.run-history-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.run-history-featured-tile {
  width: 100%;
  min-height: 0;
}

.run-history-tile {
  width: 100%;
  align-items: flex-start;
  gap: var(--space-3);
  justify-content: flex-start;
  text-align: left;
}

.run-history-tile__head,
.run-history-metrics {
  display: grid;
  gap: var(--space-2);
}

.run-history-metrics {
  margin: 0;
}

.run-history-metrics--featured {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.run-history-metrics div {
  display: grid;
  gap: 0.15rem;
}

.run-history-metrics dt {
  color: var(--text-muted);
}

.run-history-metrics dd {
  margin: 0;
}

.run-history-more-tile {
  width: 100%;
}

@media (max-width: 760px) {
  .run-history-metrics--featured {
    grid-template-columns: 1fr;
    gap: var(--space-2);
  }
}
</style>
