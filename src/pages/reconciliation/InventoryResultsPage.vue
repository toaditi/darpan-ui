<template>
  <main class="page-root inventory-results-page">
    <section class="module-intro">
      <p class="eyebrow">[inventory_results] review_workspace</p>
      <h1>Inventory results workspace</h1>
      <p class="muted-copy">
        Review reconciliation runs, inspect the exact evidence behind each discrepancy, and open raw rows only when you
        need the full story.
      </p>
    </section>

    <FormSection title="Run selection" description="Choose a persisted reconciliation run and download the matching review CSV.">
      <div class="stack-md">
        <div class="row-between inventory-results-toolbar">
          <div class="inventory-run-selector">
            <label>
              <span>Result run</span>
              <select
                v-model="selectedRunId"
                name="result-run"
                :disabled="runs.length === 0 || runsLoading"
                @change="handleRunChange"
              >
                <option v-for="run in runs" :key="run.runId" :value="run.runId">
                  {{ formatRunOption(run) }}
                </option>
              </select>
            </label>

            <p class="mono-copy" v-if="activeRunMeta">{{ activeRunMeta.generatedAt }}</p>
          </div>

          <div class="action-row">
            <button type="button" @click="refreshRuns" :disabled="runsLoading">Refresh runs</button>
            <button type="button" @click="downloadReviewCsv" :disabled="downloadLoading || !selectedRunId">
              {{ downloadLoading ? 'Downloading…' : 'Download review CSV' }}
            </button>
          </div>
        </div>

        <InlineValidation v-if="runsError" tone="error" :message="runsError" />
        <InlineValidation v-else-if="runLoadError" tone="error" :message="runLoadError" />

        <EmptyState
          v-if="!runsLoading && runs.length === 0 && !runsError"
          title="No runs found"
          description="The backend has not persisted any inventory reconciliation runs yet."
        />

        <div v-if="activeRunMeta" class="inventory-summary-strip">
          <article class="inventory-metric">
            <p class="eyebrow">Processed items</p>
            <strong>{{ formatCount(processedItemCount) }}</strong>
          </article>
          <article class="inventory-metric">
            <p class="eyebrow">Strict cycle confirmed</p>
            <strong>{{ formatCount(strictCycleConfirmedCount) }}</strong>
          </article>
          <article class="inventory-metric">
            <p class="eyebrow">Strict cycle reclassified</p>
            <strong>{{ formatCount(strictCycleGuardReclassifiedCount) }}</strong>
          </article>
          <article class="inventory-metric inventory-reasons">
            <p class="eyebrow">Reason counts</p>
            <div class="actions-tight">
              <StatusBadge v-for="reason in reasonCountBadges" :key="reason.reasonCode" :label="reason.label" tone="neutral" />
            </div>
          </article>
        </div>
      </div>
    </FormSection>

    <FormSection title="Review filters" description="Filter the review list before opening the evidence drawer.">
      <div class="stack-md">
        <div class="field-grid three">
          <label>
            <span>Reason code</span>
            <select v-model="filters.reasonCodes" name="reason-codes" multiple size="5">
              <option v-for="reasonCode in reasonCodeOptions" :key="reasonCode" :value="reasonCode">
                {{ reasonCode }}
              </option>
            </select>
          </label>

          <label>
            <span>Sub-reason</span>
            <select v-model="filters.subReasonCodes" name="sub-reason-codes" multiple size="5">
              <option v-for="sr in subReasonOptions" :key="sr" :value="sr">
                {{ sr }}
              </option>
            </select>
          </label>

          <label>
            <span>Confidence tier</span>
            <select v-model="filters.confidenceTiers" name="confidence-tiers" multiple size="3">
              <option v-for="tier in CONFIDENCE_TIER_OPTIONS" :key="tier" :value="tier">
                {{ tier }}
              </option>
            </select>
          </label>
        </div>

        <div class="field-grid three">
          <label>
            <span>Facility name</span>
            <input
              v-model="filters.facilityQuery"
              type="search"
              name="facility-query"
              autocomplete="off"
              spellcheck="false"
              placeholder="Charlotte, Dallas, …"
            />
          </label>

          <label>
            <span>Product name</span>
            <input
              v-model="filters.productQuery"
              type="search"
              name="product-query"
              autocomplete="off"
              spellcheck="false"
              placeholder="185-105-G, …"
            />
          </label>
        </div>

        <div class="field-grid two">
          <label class="checkbox-inline inventory-toggle">
            <input v-model="filters.strictCycleOnly" type="checkbox" />
            <span>Strict cycle count signal only</span>
          </label>

          <label class="checkbox-inline inventory-toggle">
            <input v-model="filters.kitSingleOnly" type="checkbox" />
            <span>Kit/single narrative only</span>
          </label>
        </div>

        <label>
          <span>Global search</span>
          <input
            v-model="filters.globalQuery"
            type="search"
            name="global-query"
            autocomplete="off"
            spellcheck="false"
            placeholder="pairId, order ID, return ID, shipment ID, or physical inventory ID…"
          />
        </label>
      </div>
    </FormSection>

    <FormSection title="Review rows" :description="tableDescription">
      <div class="stack-md">
        <div class="row-between inventory-table-controls">
          <p class="muted-copy">{{ visibleCountLabel }}</p>
          <div class="page-controls">
            <label class="page-size-control">
              <span>Rows per page</span>
              <select v-model.number="pageState.pageSize" name="page-size">
                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
              </select>
            </label>

            <button type="button" @click="previousPage" :disabled="pageState.pageIndex === 0">Previous</button>
            <span>{{ pageLabel }}</span>
            <button type="button" @click="nextPage" :disabled="pageState.pageIndex >= lastPageIndex">Next</button>
          </div>
        </div>

        <InlineValidation v-if="tableError" tone="error" :message="tableError" />

        <EmptyState
          v-else-if="!runLoading && filteredRows.length === 0"
          title="No review rows match the current filters"
          description="Clear one or more filters to surface additional discrepancy rows."
        />

        <div v-else class="inventory-table-wrap">
          <table class="inventory-results-table">
            <thead>
              <tr>
                <th v-for="column in columns" :key="column.key">
                  <button
                    v-if="column.sortable"
                    type="button"
                    class="inventory-sort-button"
                    @click="toggleSort(column.key)"
                  >
                    <span>{{ column.label }}</span>
                    <span class="inventory-sort-indicator" aria-hidden="true">{{ sortIndicator(column.key) }}</span>
                  </button>
                  <span v-else>{{ column.label }}</span>
                </th>
                <th>Signals</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in pagedRows" :key="row.pairId" class="inventory-row">
                <td>{{ row.pairId }}</td>
                <td>{{ row.facility_name || row.facility_id || 'None' }}</td>
                <td>{{ row.product_name || row.product_id || row.netsuite_product_id || 'None' }}</td>
                <td>{{ formatReviewValue(row.qoh_diff) }}</td>
                <td>{{ row.reasonCode || 'None' }}</td>
                <td>{{ row.subReasonCode || '—' }}</td>
                <td>
                  <span v-if="row.confidenceTier" :class="['confidence-tier-badge', `tier-${(row.confidenceTier ?? '').toLowerCase()}`]">
                    {{ row.confidenceTier }} {{ row.confidenceScore != null ? `(${row.confidenceScore})` : '' }}
                  </span>
                  <span v-else class="muted-copy">—</span>
                </td>
                <td>{{ row.conclusion || row.reasonText || 'None' }}</td>
                <td>
                  <div class="actions-tight inventory-signal-badges">
                    <StatusBadge :label="signalLabel('strict', row.strictCycleCountSignal)" :tone="signalTone(row.strictCycleCountSignal)" />
                    <StatusBadge :label="signalLabel('kit', row.kitSingleNarrativeSignal)" :tone="signalTone(row.kitSingleNarrativeSignal)" />
                    <StatusBadge :label="signalLabel('return', row.hasOmsReturnSignal)" :tone="signalTone(row.hasOmsReturnSignal)" />
                    <StatusBadge :label="signalLabel('transfer', row.hasTransferSignal)" :tone="signalTone(row.hasTransferSignal)" />
                  </div>
                </td>
                <td class="cell-actions">
                  <button
                    type="button"
                    class="ghost-btn inventory-row-button"
                    :aria-label="`Review evidence for ${row.pairId}`"
                    @click="openDetail(row)"
                  >
                    Review evidence
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </FormSection>

    <InventoryResultEvidenceDrawer
      :open="drawerOpen"
      :loading="detailLoading"
      :error="detailError"
      :detail="selectedDetail"
      :pair-label="drawerPairLabel"
      :run-label="drawerRunLabel"
      @close="closeDrawer"
      @retry="retryDetail"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery, type LocationQueryRaw, type LocationQueryValue } from 'vue-router'
import FormSection from '../../components/ui/FormSection.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import InventoryResultEvidenceDrawer from '../../components/reconciliation/InventoryResultEvidenceDrawer.vue'
import { resultsFacade } from '../../lib/api/facade'
import type {
  InventoryReasonCount,
  InventoryReviewRow,
  InventoryResultDetail,
  InventoryResultRunSummary,
} from '../../lib/api/types'
import {
  filterInventoryResultRows,
  getInventoryResultReasonOptions,
  getInventoryResultSubReasonOptions,
  getInventoryResultsPageCount,
  getInventoryResultRunLabel,
  paginateInventoryResultRows,
  sortInventoryResultRows,
  CONFIDENCE_TIER_OPTIONS,
  type InventoryResultsFilters,
  type InventoryResultsSortKey,
  type InventoryResultSortState,
  type InventoryResultsPageState,
} from '../../lib/reconciliation/inventoryResults'

interface ReasonBadge {
  reasonCode: string
  label: string
}

const DEFAULT_PAGE_SIZE = 50
const DEFAULT_SORT_KEY: InventoryResultsSortKey = 'qoh_diff'
const COUNT_FORMATTER = new Intl.NumberFormat()

const route = useRoute()
const router = useRouter()

const runs = ref<InventoryResultRunSummary[]>([])
const activeRunMeta = ref<InventoryResultRunSummary | null>(null)
const reviewRows = ref<InventoryReviewRow[]>([])
const selectedRunId = ref('')
const runsLoading = ref(false)
const runsError = ref('')
const runLoading = ref(false)
const runLoadError = ref('')
const detailLoading = ref(false)
const detailError = ref('')
const downloadLoading = ref(false)
const drawerOpen = ref(false)
const selectedDetail = ref<InventoryResultDetail | null>(null)
const selectedPairId = ref('')
const pendingPairId = ref('')
let applyingRouteState = false
let syncingRouteQuery = false

const filters = reactive<InventoryResultsFilters>({
  reasonCodes: [],
  subReasonCodes: [],
  confidenceTiers: [],
  facilityQuery: '',
  productQuery: '',
  globalQuery: '',
  strictCycleOnly: false,
  kitSingleOnly: false,
})

const pageState = reactive<InventoryResultsPageState>({
  pageIndex: 0,
  pageSize: DEFAULT_PAGE_SIZE,
})

const pageSizeOptions = [25, 50, 100]
const sortState = ref<InventoryResultSortState>({
  key: DEFAULT_SORT_KEY,
  direction: 'desc',
})
const detailCache = new Map<string, InventoryResultDetail>()

const columns: Array<{ key: InventoryResultsSortKey; label: string; sortable: boolean }> = [
  { key: 'pairId', label: 'Pair ID', sortable: true },
  { key: 'facility_name', label: 'Facility', sortable: true },
  { key: 'product_name', label: 'Product', sortable: true },
  { key: 'qoh_diff', label: 'QOH diff', sortable: true },
  { key: 'reasonCode', label: 'Reason code', sortable: true },
  { key: 'subReasonCode', label: 'Sub-reason', sortable: true },
  { key: 'confidenceTier', label: 'Confidence', sortable: true },
  { key: 'conclusion', label: 'Conclusion', sortable: false },
]

const currentRunRows = computed(() => reviewRows.value)
const filteredRows = computed(() => filterInventoryResultRows(currentRunRows.value, filters))
const sortedRows = computed(() => sortInventoryResultRows(filteredRows.value, sortState.value))
const pageCount = computed(() => getInventoryResultsPageCount(sortedRows.value.length, pageState.pageSize))
const lastPageIndex = computed(() => Math.max(0, pageCount.value - 1))
const pagedRows = computed(() => paginateInventoryResultRows(sortedRows.value, pageState))
const processedItemCount = computed(() => Number(activeRunMeta.value?.processedItemCount ?? reviewRows.value.length))
const strictCycleConfirmedCount = computed(() => Number(activeRunMeta.value?.strictCycleConfirmedCount ?? 0))
const strictCycleGuardReclassifiedCount = computed(() =>
  Number(activeRunMeta.value?.strictCycleGuardReclassifiedCount ?? 0),
)
const reasonCountBadges = computed<ReasonBadge[]>(() => {
  const reasonCounts = activeRunMeta.value?.reasonCounts ?? []
  return reasonCounts.map((reason) => ({
    reasonCode: reason.reasonCode,
    label: `${reason.reasonCode} · ${reason.count}`,
  }))
})
const reasonCodeOptions = computed(() => {
  const fromSummary = activeRunMeta.value?.reasonCounts?.map((reason) => reason.reasonCode) ?? []
  const fromRows = getInventoryResultReasonOptions(reviewRows.value)
  const byNormalized = new Map<string, string>()
  ;[...fromSummary, ...fromRows].forEach((reasonCode) => {
    const raw = String(reasonCode ?? '').trim()
    if (!raw) return
    const key = raw.toLowerCase()
    if (!byNormalized.has(key)) byNormalized.set(key, raw)
  })
  return Array.from(byNormalized.values()).sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }),
  )
})
const subReasonOptions = computed(() => getInventoryResultSubReasonOptions(reviewRows.value))
const tableDescription = computed(() => {
  if (runLoading.value) return 'Loading the selected run…'
  if (sortedRows.value.length === 0) return 'No discrepancy rows currently match the selected filters.'
  const start = pageState.pageIndex * pageState.pageSize + 1
  const end = Math.min((pageState.pageIndex + 1) * pageState.pageSize, sortedRows.value.length)
  return `Showing ${formatCount(start)}-${formatCount(end)} of ${formatCount(sortedRows.value.length)} rows.`
})
const visibleCountLabel = computed(() => `${formatCount(sortedRows.value.length)} matching row(s)`)
const pageLabel = computed(() => `Page ${formatCount(pageState.pageIndex + 1)} of ${formatCount(pageCount.value)}`)
const drawerRunLabel = computed(() => getInventoryResultRunLabel(activeRunMeta.value))
const drawerPairLabel = computed(() => {
  const row = selectedRow.value
  if (!row) return 'Selected row'
  return `${row.pairId} · ${row.facility_name || row.facility_id || 'Unknown facility'}`
})
const selectedRow = computed(() => reviewRows.value.find((row) => row.pairId === selectedPairId.value) ?? null)
const tableError = computed(() => runLoadError.value || runsError.value || '')

function formatCount(value: number): string {
  return COUNT_FORMATTER.format(value)
}

function getDefaultSortDirection(key: InventoryResultsSortKey): InventoryResultSortState['direction'] {
  return key === DEFAULT_SORT_KEY ? 'desc' : 'asc'
}

function toQueryString(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  if (Array.isArray(value)) {
    return String(value[0] ?? '').trim()
  }
  return String(value ?? '').trim()
}

function toQueryValues(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value != null ? [value] : []
  return values
    .map((entry) => String(entry ?? '').trim())
    .filter((entry) => entry.length > 0)
}

function toQueryBoolean(value: LocationQueryValue | LocationQueryValue[] | undefined): boolean {
  const normalized = toQueryString(value).toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function toPositiveInteger(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
  fallback: number,
  allowedValues?: number[],
): number {
  const parsed = Number.parseInt(toQueryString(value), 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  if (allowedValues && !allowedValues.includes(parsed)) return fallback
  return parsed
}

function toSortKey(value: string): InventoryResultsSortKey {
  const normalized = value.trim()
  const allowedKeys = new Set(columns.map((column) => column.key))
  return allowedKeys.has(normalized as InventoryResultsSortKey)
    ? (normalized as InventoryResultsSortKey)
    : DEFAULT_SORT_KEY
}

function toSortDirection(
  value: string,
  key: InventoryResultsSortKey,
): InventoryResultSortState['direction'] {
  return value === 'asc' || value === 'desc' ? value : getDefaultSortDirection(key)
}

function normalizeQueryForComparison(query: LocationQuery | LocationQueryRaw): string {
  const entries: string[] = []
  for (const [key, value] of Object.entries(query).sort(([left], [right]) => left.localeCompare(right))) {
    const values = Array.isArray(value) ? value : value == null ? [] : [value]
    values.forEach((entry) => {
      const normalized = String(entry ?? '').trim()
      if (!normalized) return
      entries.push(`${key}=${normalized}`)
    })
  }
  return entries.join('&')
}

function buildRouteQuery(): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  const reasonCodes = toQueryValues(filters.reasonCodes)
  const subReasonCodes = toQueryValues(filters.subReasonCodes)
  const confidenceTiers = toQueryValues(filters.confidenceTiers)
  const facilityQuery = filters.facilityQuery.trim()
  const productQuery = filters.productQuery.trim()
  const globalQuery = filters.globalQuery.trim()
  const currentPage = pageState.pageIndex + 1
  const defaultSortDirection = getDefaultSortDirection(sortState.value.key)
  const hasCustomSortKey = sortState.value.key !== DEFAULT_SORT_KEY
  const hasCustomSortDirection = sortState.value.direction !== defaultSortDirection

  if (selectedRunId.value) query.run = selectedRunId.value
  if (reasonCodes.length > 0) query.reason = reasonCodes
  if (subReasonCodes.length > 0) query.subReason = subReasonCodes
  if (confidenceTiers.length > 0) query.confidence = confidenceTiers
  if (facilityQuery) query.facility = facilityQuery
  if (productQuery) query.product = productQuery
  if (globalQuery) query.query = globalQuery
  if (filters.strictCycleOnly) query.strict = '1'
  if (filters.kitSingleOnly) query.kit = '1'
  if (currentPage > 1) query.page = String(currentPage)
  if (pageState.pageSize !== DEFAULT_PAGE_SIZE) query.pageSize = String(pageState.pageSize)
  if (hasCustomSortKey || hasCustomSortDirection) query.sort = sortState.value.key
  if (hasCustomSortDirection) query.dir = sortState.value.direction
  if (drawerOpen.value && selectedPairId.value) query.pair = selectedPairId.value

  return query
}

function applyRouteQuery(query: LocationQuery): void {
  applyingRouteState = true
  selectedRunId.value = toQueryString(query.run)
  filters.reasonCodes = toQueryValues(query.reason)
  filters.subReasonCodes = toQueryValues(query.subReason)
  filters.confidenceTiers = toQueryValues(query.confidence)
  filters.facilityQuery = toQueryString(query.facility)
  filters.productQuery = toQueryString(query.product)
  filters.globalQuery = toQueryString(query.query)
  filters.strictCycleOnly = toQueryBoolean(query.strict)
  filters.kitSingleOnly = toQueryBoolean(query.kit)
  pageState.pageSize = toPositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE, pageSizeOptions)
  pageState.pageIndex = toPositiveInteger(query.page, 1) - 1

  const nextSortKey = toSortKey(toQueryString(query.sort))
  sortState.value = {
    key: nextSortKey,
    direction: toSortDirection(toQueryString(query.dir), nextSortKey),
  }

  pendingPairId.value = toQueryString(query.pair)
  applyingRouteState = false
}

async function syncRouteQuery(): Promise<void> {
  if (applyingRouteState || syncingRouteQuery) return

  const nextQuery = buildRouteQuery()
  if (normalizeQueryForComparison(route.query) === normalizeQueryForComparison(nextQuery)) {
    return
  }

  syncingRouteQuery = true
  try {
    await router.replace({ query: nextQuery })
  } finally {
    syncingRouteQuery = false
  }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : fallback
}

function toReasonCounts(value: unknown, fallback: InventoryReasonCount[] = []): InventoryReasonCount[] {
  if (!Array.isArray(value)) return fallback
  return value
    .map((item) => {
      const entry = item as Partial<InventoryReasonCount>
      if (!entry.reasonCode) return null
      return {
        reasonCode: String(entry.reasonCode),
        count: toFiniteNumber(entry.count, 0),
      }
    })
    .filter((item): item is InventoryReasonCount => item !== null)
}

function formatRunOption(run: InventoryResultRunSummary): string {
  const parts = [run.runId]
  if (run.generatedAt) parts.push(run.generatedAt)
  if (typeof run.processedItemCount === 'number') parts.push(`${formatCount(run.processedItemCount)} items`)
  return parts.join(' · ')
}

function formatReviewValue(value: number | string | undefined): string {
  if (value === null || value === undefined || String(value).trim().length === 0) return 'None'
  return String(value)
}

function signalLabel(name: 'strict' | 'kit' | 'return' | 'transfer', enabled: boolean | undefined): string {
  const labelMap: Record<'strict' | 'kit' | 'return' | 'transfer', string> = {
    strict: 'Strict',
    kit: 'Kit/single',
    return: 'Return',
    transfer: 'Transfer',
  }
  return `${labelMap[name]} ${enabled ? 'yes' : 'no'}`
}

function signalTone(enabled: boolean | undefined): 'neutral' | 'success' | 'warning' | 'danger' {
  if (enabled === true) {
    return 'success'
  }
  return 'neutral'
}

function sortIndicator(key: InventoryResultsSortKey): string {
  if (sortState.value.key !== key) return '↕'
  return sortState.value.direction === 'asc' ? '↑' : '↓'
}

function toggleSort(key: InventoryResultsSortKey): void {
  if (sortState.value.key === key) {
    sortState.value.direction = sortState.value.direction === 'asc' ? 'desc' : 'asc'
    return
  }

  sortState.value = {
    key,
    direction: getDefaultSortDirection(key),
  }
}

function resetPaging(): void {
  pageState.pageIndex = 0
}

function getDetailCacheKey(runId: string, pairId: string): string {
  return `${runId}::${pairId}`
}

function previousPage(): void {
  pageState.pageIndex = Math.max(0, pageState.pageIndex - 1)
}

function nextPage(): void {
  pageState.pageIndex = Math.min(lastPageIndex.value, pageState.pageIndex + 1)
}

async function loadRuns(preserveSelection = false): Promise<void> {
  runsLoading.value = true
  runsError.value = ''

  try {
    const response = await resultsFacade.listInventoryResultRuns({ pageIndex: 0, pageSize: 100 })
    runs.value = response.runs ?? []

    const nextSelectedRunId = determineSelectedRunId(preserveSelection)
    if (nextSelectedRunId) {
      const shouldResetPage = route.query.page == null && nextSelectedRunId !== activeRunMeta.value?.runId
      selectedRunId.value = nextSelectedRunId
      await loadRun(nextSelectedRunId, { resetPage: shouldResetPage })
    } else {
      selectedRunId.value = ''
      activeRunMeta.value = null
      reviewRows.value = []
      selectedDetail.value = null
      selectedPairId.value = ''
      drawerOpen.value = false
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load inventory result runs.'
    runsError.value = message
    runs.value = []
    selectedRunId.value = ''
    activeRunMeta.value = null
    reviewRows.value = []
  } finally {
    runsLoading.value = false
  }
}

function determineSelectedRunId(preserveSelection: boolean): string {
  if (runs.value.length === 0) return ''
  if (selectedRunId.value && runs.value.some((run) => run.runId === selectedRunId.value)) {
    return selectedRunId.value
  }
  if (preserveSelection && activeRunMeta.value?.runId && runs.value.some((run) => run.runId === activeRunMeta.value?.runId)) {
    return activeRunMeta.value.runId
  }
  return runs.value[0]?.runId ?? ''
}

async function loadRun(runId: string, options: { resetPage?: boolean } = {}): Promise<void> {
  if (!runId) return
  const { resetPage = true } = options

  runLoading.value = true
  runLoadError.value = ''
  detailError.value = ''
  detailLoading.value = false
  drawerOpen.value = false
  selectedDetail.value = null
  selectedPairId.value = ''
  if (resetPage) {
    pageState.pageIndex = 0
  }
  detailCache.clear()

  try {
    const response = await resultsFacade.getInventoryResultRun({ runId })
    const selectedRun = runs.value.find((run) => run.runId === runId) ?? null
    const summary = response.summary ?? {}
    activeRunMeta.value = {
      ...(selectedRun ?? { runId, generatedAt: '' }),
      ...(response.runMeta ?? {}),
      processedItemCount: toFiniteNumber(summary.processedItemCount, selectedRun?.processedItemCount ?? 0),
      reasonCounts: toReasonCounts(summary.reasonCounts, selectedRun?.reasonCounts ?? []),
      strictCycleConfirmedCount: toFiniteNumber(
        summary.strictCycleConfirmedCount,
        selectedRun?.strictCycleConfirmedCount ?? 0,
      ),
      strictCycleGuardReclassifiedCount: toFiniteNumber(
        summary.strictCycleGuardReclassifiedCount,
        selectedRun?.strictCycleGuardReclassifiedCount ?? 0,
      ),
    }
    reviewRows.value = response.reviewRows ?? []
    await syncDrawerWithQuery()
  } catch (error) {
    activeRunMeta.value = runs.value.find((run) => run.runId === runId) ?? null
    reviewRows.value = []
    const message = error instanceof Error ? error.message : 'Unable to load the selected inventory result run.'
    runLoadError.value = message
  } finally {
    runLoading.value = false
  }
}

async function handleRunChange(): Promise<void> {
  await loadRun(selectedRunId.value)
}

async function refreshRuns(): Promise<void> {
  await loadRuns(true)
}

async function openDetail(row: InventoryReviewRow): Promise<void> {
  if (!selectedRunId.value) return

  selectedPairId.value = row.pairId
  drawerOpen.value = true
  detailError.value = ''
  const cacheKey = getDetailCacheKey(selectedRunId.value, row.pairId)

  const cached = detailCache.get(cacheKey)
  if (cached) {
    detailLoading.value = false
    selectedDetail.value = cached
    return
  }

  detailLoading.value = true
  try {
    const response = await resultsFacade.getInventoryResultDetail({
      runId: selectedRunId.value,
      pairId: row.pairId,
    })
    selectedDetail.value = response.detail ?? null
    if (response.detail) {
      detailCache.set(cacheKey, response.detail)
    }
  } catch (error) {
    selectedDetail.value = null
    detailError.value = error instanceof Error ? error.message : 'Unable to load evidence for this row.'
  } finally {
    detailLoading.value = false
  }
}

async function syncDrawerWithQuery(): Promise<void> {
  const pairId = pendingPairId.value.trim()
  if (!pairId) {
    closeDrawer()
    return
  }

  const row = reviewRows.value.find((entry) => entry.pairId === pairId)
  if (!row) return
  if (drawerOpen.value && selectedPairId.value === pairId) return
  await openDetail(row)
}

function closeDrawer(): void {
  drawerOpen.value = false
  detailLoading.value = false
  detailError.value = ''
  selectedDetail.value = null
  selectedPairId.value = ''
}

async function retryDetail(): Promise<void> {
  const row = selectedRow.value
  if (!row) return
  await openDetail(row)
}

async function downloadReviewCsv(): Promise<void> {
  if (!selectedRunId.value) return

  downloadLoading.value = true
  try {
    const response = await resultsFacade.downloadInventoryResultReviewCsv(selectedRunId.value)
    const csvText = response.csvContent ?? ''
    const blob = new Blob([csvText], {
      type: response.contentType ?? 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = response.fileName ?? activeRunMeta.value?.summaryFileName ?? `${selectedRunId.value}.csv`
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    runLoadError.value = error instanceof Error ? error.message : 'Unable to download the review CSV.'
  } finally {
    downloadLoading.value = false
  }
}

watch(
  () => [filters.reasonCodes, filters.subReasonCodes, filters.confidenceTiers, filters.facilityQuery, filters.productQuery, filters.globalQuery, filters.strictCycleOnly, filters.kitSingleOnly, pageState.pageSize],
  () => {
    if (applyingRouteState) return
    resetPaging()
  },
  { deep: true },
)

watch(
  () => [sortState.value.key, sortState.value.direction],
  () => {
    if (applyingRouteState) return
    resetPaging()
  },
)

watch(
  () => lastPageIndex.value,
  (nextLastPageIndex) => {
    if (pageState.pageIndex > nextLastPageIndex) {
      pageState.pageIndex = nextLastPageIndex
    }
  },
)

watch(
  () => route.query,
  (query) => {
    if (syncingRouteQuery) return
    applyRouteQuery(query)

    if (runs.value.length === 0) return
    if (selectedRunId.value && selectedRunId.value !== activeRunMeta.value?.runId) {
      void loadRun(selectedRunId.value, { resetPage: false })
      return
    }

    void syncDrawerWithQuery()
  },
  { immediate: true },
)

watch(
  () => [
    selectedRunId.value,
    filters.reasonCodes.join('\u0001'),
    filters.subReasonCodes.join('\u0001'),
    filters.confidenceTiers.join('\u0001'),
    filters.facilityQuery,
    filters.productQuery,
    filters.globalQuery,
    filters.strictCycleOnly ? '1' : '0',
    filters.kitSingleOnly ? '1' : '0',
    pageState.pageIndex,
    pageState.pageSize,
    sortState.value.key,
    sortState.value.direction,
    drawerOpen.value ? selectedPairId.value : '',
  ],
  () => {
    void syncRouteQuery()
  },
)

onMounted(async () => {
  await loadRuns(false)
})
</script>
