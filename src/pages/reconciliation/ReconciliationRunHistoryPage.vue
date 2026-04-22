<template>
  <StaticPageFrame>
    <template #hero>
      <div class="run-history-hero">
        <h1>{{ runName }}</h1>
      </div>
    </template>

    <StaticPageSection v-if="featuredOutput" title="Most Recent">
      <RouterLink
        class="static-page-tile run-history-tile run-history-featured-tile"
        data-testid="run-history-featured-tile"
        :to="buildResultRoute(featuredOutput.fileName)"
      >
        <div class="run-history-tile__head">
          <span class="static-page-tile-title">{{ formatOutputCreatedDate(featuredOutput.createdDate) }}</span>
        </div>
        <dl class="run-history-metrics" :class="{ 'run-history-metrics--wide': showRuleDifferenceMetric(featuredOutput) }">
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
          <div v-if="showRuleDifferenceMetric(featuredOutput)">
            <dt>Field mismatches</dt>
            <dd>{{ featuredOutput.ruleDifferenceCount ?? 0 }}</dd>
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
            <span class="static-page-tile-title">{{ formatOutputCreatedDate(output.createdDate) }}</span>
          </div>
          <dl class="run-history-metrics" :class="{ 'run-history-metrics--wide': showRuleDifferenceMetric(output) }">
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
            <div v-if="showRuleDifferenceMetric(output)">
              <dt>Field mismatches</dt>
              <dd>{{ output.ruleDifferenceCount ?? 0 }}</dd>
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

    <RouterLink class="static-page-action-tile" data-testid="run-history-open-workflow" :to="workflowRoute">
      Open Run
    </RouterLink>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { reconciliationFacade } from '../../lib/api/facade'
import type { PaginationMeta, PilotGeneratedOutput } from '../../lib/api/types'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

type RunMode = 'mapping' | 'ruleset'

const GENERATED_OUTPUT_FETCH_PAGE_SIZE = 6
const OTHER_RESULTS_BATCH_SIZE = 5

const route = useRoute()
const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref<string | null>(null)
const generatedOutputs = ref<PilotGeneratedOutput[]>([])
const lastLoadedPageIndex = ref(-1)
const visibleOtherOutputCount = ref(OTHER_RESULTS_BATCH_SIZE)
const pagination = ref<PaginationMeta>({
  pageIndex: 0,
  pageSize: GENERATED_OUTPUT_FETCH_PAGE_SIZE,
  totalCount: 0,
  pageCount: 1,
})
let loadGeneratedOutputsRequestId = 0

const runScopeId = computed(() =>
  typeof route.params.runScopeId === 'string' ? route.params.runScopeId.trim() : '',
)
const runType = computed<RunMode>(() => (route.query.runType === 'ruleset' ? 'ruleset' : 'mapping'))
const reconciliationMappingId = computed(() =>
  typeof route.query.mappingId === 'string' ? route.query.mappingId.trim() : '',
)
const ruleSetId = computed(() =>
  typeof route.query.ruleSetId === 'string' ? route.query.ruleSetId.trim() : '',
)
const compareScopeId = computed(() =>
  typeof route.query.compareScopeId === 'string' ? route.query.compareScopeId.trim() : '',
)
const runName = computed(() => (typeof route.query.runName === 'string' && route.query.runName.trim() ? route.query.runName.trim() : 'Selected Run'))
const file1SystemLabel = computed(() =>
  typeof route.query.file1SystemLabel === 'string' && route.query.file1SystemLabel.trim() ? route.query.file1SystemLabel.trim() : 'File 1',
)
const file2SystemLabel = computed(() =>
  typeof route.query.file2SystemLabel === 'string' && route.query.file2SystemLabel.trim() ? route.query.file2SystemLabel.trim() : 'File 2',
)
const workflowRoute = computed<RouteLocationRaw>(() => ({
  name: 'reconciliation-pilot-diff',
  query:
    runType.value === 'ruleset'
      ? {
          runType: 'ruleset',
          ruleSetId: ruleSetId.value,
          compareScopeId: compareScopeId.value || runScopeId.value,
          runName: runName.value,
          file1SystemLabel: file1SystemLabel.value,
          file2SystemLabel: file2SystemLabel.value,
        }
      : {
          runType: 'mapping',
          mappingId: reconciliationMappingId.value || runScopeId.value,
          runName: runName.value,
          file1SystemLabel: file1SystemLabel.value,
          file2SystemLabel: file2SystemLabel.value,
        },
  state: buildWorkflowOriginState('Run History', route.fullPath),
}))
const featuredOutput = computed(() => generatedOutputs.value[0] ?? null)
const otherGeneratedOutputs = computed(() => generatedOutputs.value.slice(1))
const visibleOtherGeneratedOutputs = computed(() => otherGeneratedOutputs.value.slice(0, visibleOtherOutputCount.value))
const showLoadingState = computed(() => loading.value && generatedOutputs.value.length === 0)
const showHistorySection = computed(() => showLoadingState.value || Boolean(loadError.value) || !featuredOutput.value || otherGeneratedOutputs.value.length > 0)
const hasMoreLoadedOtherOutputs = computed(() => otherGeneratedOutputs.value.length > visibleOtherOutputCount.value)
const hasMoreHistoryPages = computed(() => lastLoadedPageIndex.value + 1 < pagination.value.pageCount)
const hasMoreOtherOutputs = computed(() => hasMoreLoadedOtherOutputs.value || hasMoreHistoryPages.value)

function buildResultRoute(outputFileName: string): RouteLocationRaw {
  return {
    name: 'reconciliation-run-result',
    params: {
      runScopeId: runScopeId.value,
      outputFileName,
    },
    query:
      runType.value === 'ruleset'
        ? {
            runType: 'ruleset',
            ruleSetId: ruleSetId.value,
            compareScopeId: compareScopeId.value || runScopeId.value,
            runName: runName.value,
            file1SystemLabel: file1SystemLabel.value,
            file2SystemLabel: file2SystemLabel.value,
          }
        : {
            runType: 'mapping',
            mappingId: reconciliationMappingId.value || runScopeId.value,
            runName: runName.value,
            file1SystemLabel: file1SystemLabel.value,
            file2SystemLabel: file2SystemLabel.value,
          },
  }
}

function resetHistoryState(): void {
  loadError.value = null
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

function appendGeneratedOutputs(nextOutputs: PilotGeneratedOutput[]): void {
  const existingFileNames = new Set(generatedOutputs.value.map((output) => output.fileName))
  const dedupedOutputs = nextOutputs.filter((output) => !existingFileNames.has(output.fileName))
  generatedOutputs.value = [...generatedOutputs.value, ...dedupedOutputs]
}

async function loadGeneratedOutputs(targetPageIndex = 0, append = false): Promise<boolean> {
  const requestId = ++loadGeneratedOutputsRequestId
  const requestedRunScopeId = runScopeId.value
  const requestedRunType = runType.value
  const requestedMappingIdValue = reconciliationMappingId.value
  const requestedRuleSetIdValue = ruleSetId.value
  const requestedCompareScopeIdValue = compareScopeId.value

  if (!requestedRunScopeId) {
    resetHistoryState()
    loadError.value = 'Run history is unavailable without a selected reconciliation run.'
    return false
  }

  if (append) loadingMore.value = true
  else {
    loading.value = true
    loadError.value = null
  }

  try {
    const response =
      requestedRunType === 'ruleset'
        ? await reconciliationFacade.listPilotGeneratedOutputs({
            ruleSetId: requestedRuleSetIdValue,
            compareScopeId: requestedCompareScopeIdValue || requestedRunScopeId,
            pageIndex: targetPageIndex,
            pageSize: GENERATED_OUTPUT_FETCH_PAGE_SIZE,
            query: '',
          })
        : await reconciliationFacade.listPilotGeneratedOutputs({
            reconciliationMappingId: requestedMappingIdValue || requestedRunScopeId,
            pageIndex: targetPageIndex,
            pageSize: GENERATED_OUTPUT_FETCH_PAGE_SIZE,
            query: '',
          })

    if (requestId !== loadGeneratedOutputsRequestId) return false

    const nextOutputs = response.generatedOutputs ?? []
    if (append) appendGeneratedOutputs(nextOutputs)
    else generatedOutputs.value = nextOutputs

    pagination.value = response.pagination ?? pagination.value
    lastLoadedPageIndex.value = targetPageIndex
    return true
  } catch (error) {
    if (requestId !== loadGeneratedOutputsRequestId) return false
    if (!append) generatedOutputs.value = []
    loadError.value = error instanceof ApiCallError ? error.message : 'Unable to load saved results.'
    return false
  } finally {
    if (requestId === loadGeneratedOutputsRequestId) {
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

  const applied = await loadGeneratedOutputs(lastLoadedPageIndex.value + 1, true)
  if (!applied) return
  visibleOtherOutputCount.value += OTHER_RESULTS_BATCH_SIZE
}

function formatOutputCreatedDate(createdDate?: string): string {
  if (!createdDate) return 'Saved result'

  const parsedDate = new Date(createdDate)
  if (Number.isNaN(parsedDate.getTime())) return createdDate

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

function showRuleDifferenceMetric(output: PilotGeneratedOutput): boolean {
  return (output.ruleDifferenceCount ?? 0) > 0
}

watch([runScopeId, runType, reconciliationMappingId, ruleSetId, compareScopeId], () => {
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
  display: grid;
  gap: var(--space-3);
}

.run-history-tile {
  display: grid;
  gap: var(--space-3);
  text-decoration: none;
  color: inherit;
}

.run-history-tile__head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: center;
}

.run-history-metrics {
  margin: 0;
  display: grid;
  gap: var(--space-2);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.run-history-metrics--wide {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.run-history-metrics div {
  display: grid;
  gap: 0.2rem;
}

.run-history-metrics dt {
  color: var(--text-muted);
  font-size: 0.86rem;
}

.run-history-metrics dd {
  margin: 0;
  font-size: 1rem;
}

.run-history-more-tile {
  min-height: 100%;
}

@media (max-width: 760px) {
  .run-history-metrics,
  .run-history-metrics--wide {
    grid-template-columns: 1fr;
  }
}
</style>
