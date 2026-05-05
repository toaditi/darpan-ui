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

    <StaticPageSection v-if="runningRuns.length > 0" title="In Progress">
      <div class="static-page-tile-grid run-history-grid" data-testid="run-history-running-results">
        <article
          v-for="runningRun in runningRuns"
          :key="runningRun.runningRunId"
          class="static-page-tile run-history-tile run-history-running-tile"
          data-testid="run-history-running-tile"
        >
          <div class="run-history-tile__head run-history-tile__head--status">
            <span class="static-page-tile-title">{{ formatSavedResultDateTime(runningRun.submittedAt) }}</span>
            <StatusBadge :label="runningRun.statusLabel" tone="warning" />
          </div>
          <p class="section-note">Results will appear here when this reconciliation finishes.</p>
        </article>
      </div>
    </StaticPageSection>

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
      <InlineValidation v-if="runSettingsError" tone="error" :message="runSettingsError" />
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

    <template v-if="canRunActiveTenantReconciliation || canOpenRunSettings" #actions>
      <div class="action-row">
        <RouterLink
          v-if="canRunActiveTenantReconciliation"
          class="app-icon-action app-icon-action--large"
          data-testid="run-history-open-workflow"
          aria-label="Open run"
          title="Open run"
          :to="workflowRoute"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path :d="playIconPath" :transform="playIconTransform" fill="currentColor" />
          </svg>
        </RouterLink>
        <button
          v-if="canOpenRunSettings"
          type="button"
          class="app-icon-action app-icon-action--large"
          data-testid="run-history-open-settings"
          aria-label="Run settings"
          title="Run settings"
          :disabled="openingRunSettings"
          @click="void openRunSettings()"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path :d="settingsIconPath" />
          </svg>
        </button>
      </div>
    </template>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import StaticEditableTitle from '../../components/ui/StaticEditableTitle.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import { ApiCallError } from '../../lib/api/client'
import { reconciliationFacade } from '../../lib/api/facade'
import type { PaginationMeta, GeneratedOutput } from '../../lib/api/types'
import { useUiPermissions } from '../../lib/auth'
import {
  listPendingReconciliationRuns,
  PENDING_RECONCILIATION_RUNS_EVENT,
  resolveCompletedPendingReconciliationRuns,
  type PendingReconciliationRun,
} from '../../lib/reconciliationPendingRuns'
import {
  buildReconciliationDiffRoute,
  buildReconciliationRunResultRoute,
  type ReconciliationRunRouteContext,
} from '../../lib/reconciliationRoutes'
import { resolveSavedRunEditorRoute } from '../../lib/savedRunEditorRoute'
import { formatSavedResultDateTime } from '../../lib/utils/date'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const GENERATED_OUTPUT_FETCH_PAGE_SIZE = 6
const OTHER_RESULTS_BATCH_SIZE = 5
const RUNNING_STATUS_IDS = new Set(['AUT_STAT_PENDING', 'AUT_STAT_RUNNING'])

interface RunningRunView {
  runningRunId: string
  submittedAt: string
  statusLabel: string
}

const route = useRoute()
const router = useRouter()
const permissions = useUiPermissions()
const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref<string | null>(null)
const openingRunSettings = ref(false)
const runSettingsError = ref<string | null>(null)
const editableRunName = ref('')
const persistedRunName = ref('')
const savingRunName = ref(false)
const generatedOutputs = ref<GeneratedOutput[]>([])
const pendingRuns = ref<PendingReconciliationRun[]>([])
const lastLoadedPageIndex = ref(-1)
const visibleOtherOutputCount = ref(OTHER_RESULTS_BATCH_SIZE)
const pagination = ref<PaginationMeta>({
  pageIndex: 0,
  pageSize: GENERATED_OUTPUT_FETCH_PAGE_SIZE,
  totalCount: 0,
  pageCount: 1,
})
const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)
const canRunActiveTenantReconciliation = computed(() => permissions.canRunActiveTenantReconciliation)
const playIconPath =
  'M6.75 4.2c0-.91.99-1.48 1.78-1.01l7.1 4.25a1.18 1.18 0 0 1 0 2.02l-7.1 4.25a1.18 1.18 0 0 1-1.78-1.01V4.2Z'
const playIconTransform = 'translate(0 1.5)'
const settingsIconPath =
  'M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.3a2 2 0 0 1-4 0V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H2.7a2 2 0 0 1 0-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6v-.3a2 2 0 0 1 4 0V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1A1.7 1.7 0 0 0 21 10h.3a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z'

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
const workflowOriginState = computed(() => buildWorkflowOriginState('Run History', route.fullPath))
const workflowRoute = computed(() =>
  buildReconciliationDiffRoute(
    reconciliationRunRouteContext.value,
    workflowOriginState.value,
  ),
)
const canOpenRunSettings = computed(() => canEditTenantSettings.value && Boolean(savedRunId.value))
const runningGeneratedOutputs = computed(() => generatedOutputs.value.filter(isRunningGeneratedOutput))
const completedGeneratedOutputs = computed(() => generatedOutputs.value.filter(isCompletedGeneratedOutput))
const runningRuns = computed<RunningRunView[]>(() => {
  const backendRunningRuns = runningGeneratedOutputs.value.map(buildBackendRunningRunView)
  if (backendRunningRuns.length > 0) return backendRunningRuns
  return pendingRuns.value.map(buildLocalRunningRunView)
})
const featuredOutput = computed(() => completedGeneratedOutputs.value[0] ?? null)
const otherGeneratedOutputs = computed(() => completedGeneratedOutputs.value.slice(1))
const visibleOtherGeneratedOutputs = computed(() => otherGeneratedOutputs.value.slice(0, visibleOtherOutputCount.value))
const showLoadingState = computed(() => loading.value && generatedOutputs.value.length === 0)
const showHistorySection = computed(() =>
  showLoadingState.value ||
  Boolean(loadError.value) ||
  Boolean(runSettingsError.value) ||
  !featuredOutput.value ||
  otherGeneratedOutputs.value.length > 0
)
const hasMoreLoadedOtherOutputs = computed(() => otherGeneratedOutputs.value.length > visibleOtherOutputCount.value)
const hasMoreHistoryPages = computed(() => lastLoadedPageIndex.value + 1 < pagination.value.pageCount)
const hasMoreOtherOutputs = computed(() => hasMoreLoadedOtherOutputs.value || hasMoreHistoryPages.value)

function buildResultRoute(outputFileName: string) {
  return buildReconciliationRunResultRoute(reconciliationRunRouteContext.value, outputFileName)
}

async function openRunSettings(): Promise<void> {
  const targetId = savedRunId.value
  if (!canOpenRunSettings.value || !targetId || openingRunSettings.value) return

  openingRunSettings.value = true
  runSettingsError.value = null

  try {
    const editorRoute = await resolveSavedRunEditorRoute(targetId, workflowOriginState.value)
    if (!editorRoute) {
      runSettingsError.value = `Unable to find run "${targetId}".`
      return
    }

    await router.push(editorRoute)
  } catch (error) {
    runSettingsError.value = error instanceof ApiCallError ? error.message : 'Unable to open run settings.'
  } finally {
    openingRunSettings.value = false
  }
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function generatedOutputKey(output: GeneratedOutput): string {
  return normalizeText(output.fileName) ||
    normalizeText(output.reconciliationRunResultId) ||
    [output.savedRunId, output.statusEnumId, output.createdDate].map((value) => normalizeText(value)).filter(Boolean).join(':')
}

function isRunningGeneratedOutput(output: GeneratedOutput): boolean {
  const statusEnumId = normalizeText(output.statusEnumId)
  return RUNNING_STATUS_IDS.has(statusEnumId)
}

function isCompletedGeneratedOutput(output: GeneratedOutput): boolean {
  return !isRunningGeneratedOutput(output) && output.resultAvailable !== false && Boolean(normalizeText(output.fileName))
}

function buildBackendRunningRunView(output: GeneratedOutput): RunningRunView {
  const submittedAt = normalizeText(output.startedDate) || normalizeText(output.createdDate) || normalizeText(output.lastUpdatedDate) || new Date().toISOString()
  const statusLabel = normalizeText(output.statusLabel) || 'Running'
  return {
    runningRunId: generatedOutputKey(output) || `${savedRunId.value}:${submittedAt}`,
    submittedAt,
    statusLabel,
  }
}

function buildLocalRunningRunView(pendingRun: PendingReconciliationRun): RunningRunView {
  return {
    runningRunId: pendingRun.pendingRunId,
    submittedAt: pendingRun.submittedAt,
    statusLabel: 'Running',
  }
}

function refreshPendingRuns(): void {
  pendingRuns.value = listPendingReconciliationRuns(savedRunId.value)
}

function resetHistoryState(): void {
  loadError.value = null
  runSettingsError.value = null
  editableRunName.value = routeRunName.value
  persistedRunName.value = routeRunName.value
  savingRunName.value = false
  generatedOutputs.value = []
  pendingRuns.value = []
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
  const existingOutputKeys = new Set(generatedOutputs.value.map(generatedOutputKey))
  const dedupedOutputs = nextOutputs.filter((output) => {
    const outputKey = generatedOutputKey(output)
    if (!outputKey || existingOutputKeys.has(outputKey)) return false
    existingOutputKeys.add(outputKey)
    return true
  })
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
    pendingRuns.value = resolveCompletedPendingReconciliationRuns(
      requestedSavedRunId,
      generatedOutputs.value.filter(isCompletedGeneratedOutput),
    )

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
  refreshPendingRuns()
  void loadGeneratedOutputs()
}, { immediate: true })

onMounted(() => {
  window.addEventListener(PENDING_RECONCILIATION_RUNS_EVENT, refreshPendingRuns)
})

onUnmounted(() => {
  window.removeEventListener(PENDING_RECONCILIATION_RUNS_EVENT, refreshPendingRuns)
})
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

.run-history-tile__head--status {
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
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
