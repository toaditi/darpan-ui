<template>
  <StaticPageFrame>
    <template #hero>
      <div class="run-result-hero">
        <h1>{{ runName }}</h1>
        <p class="static-page-section-description">{{ heroDescription }}</p>
      </div>
    </template>

    <StaticPageSection>
      <p v-if="loading" class="section-note" data-testid="run-result-loading">Loading saved result…</p>
      <InlineValidation v-else-if="loadError" tone="error" :message="loadError" />

      <section v-else-if="savedOutput" class="pilot-diff-details">
        <div class="pilot-diff-details__bucket-grid">
          <button
            v-for="bucket in diffDetailBuckets"
            :key="bucket.key"
            :data-testid="bucket.testId"
            type="button"
            class="pilot-diff-bucket"
            :class="{ 'pilot-diff-bucket--active': activeDiffBuckets.includes(bucket.key) }"
            :aria-pressed="activeDiffBuckets.includes(bucket.key) ? 'true' : 'false'"
            @click="toggleDiffBucket(bucket.key)"
          >
            <span class="pilot-diff-bucket__label">{{ bucket.label }}</span>
            <strong>{{ bucket.count }}</strong>
          </button>
        </div>

        <div v-if="showDiffDetailsToolbar" class="pilot-diff-details__toolbar">
          <label class="pilot-diff-details__search">
            <div class="pilot-diff-details__search-field">
              <input
                v-model="diffDetailsSearch"
                data-testid="diff-details-search"
                class="pilot-diff-details__search-input"
                type="text"
                aria-label="Record search"
                spellcheck="false"
                autocomplete="off"
                placeholder="Search record id"
              />
              <button
                v-if="diffDetailsSearch.trim().length > 0"
                type="button"
                data-testid="diff-details-search-clear"
                class="pilot-diff-details__search-clear"
                aria-label="Clear record search"
                @click="clearDiffDetailsSearch"
              >
                ×
              </button>
            </div>
          </label>
        </div>

        <div
          v-if="filteredDiffDetailRows.length > 0"
          class="pilot-diff-details__pagination"
          data-testid="diff-details-pagination"
        >
          <button
            type="button"
            data-testid="diff-page-previous"
            :disabled="diffDetailsPageIndex === 0"
            @click="goToDiffDetailsPage(diffDetailsPageIndex - 1)"
          >
            Previous
          </button>
          <p>Page {{ diffDetailsPageIndex + 1 }} of {{ diffDetailsPageCount }}</p>
          <button
            type="button"
            data-testid="diff-page-next"
            :disabled="diffDetailsPageIndex >= diffDetailsPageCount - 1"
            @click="goToDiffDetailsPage(diffDetailsPageIndex + 1)"
          >
            Next
          </button>
        </div>

        <AppTableFrame
          v-if="pagedDiffDetailRows.length > 0"
          :columns="diffDetailColumns"
          :rows="pagedDiffDetailRowsAsRows"
          row-key="rowKey"
          row-test-id="diff-details-row"
        >
          <template #header-actions>
            <button
              v-if="downloadableOutputFile"
              type="button"
              class="app-table__header-action"
              data-testid="run-result-download"
              aria-label="Download saved result"
              @click="downloadSavedResult"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path
                  d="M10 2.5a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V3.25A.75.75 0 0 1 10 2.5Zm-5 11a.75.75 0 0 1 .75.75v1.5c0 .14.11.25.25.25h8c.14 0 .25-.11.25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 14 17.5H6A1.75 1.75 0 0 1 4.25 15.75v-1.5A.75.75 0 0 1 5 13.5Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </template>

          <template #cell-recordId="{ row }">
            <strong>{{ row.recordId }}</strong>
          </template>

          <template #cell-detailText="{ row }">
            <pre class="run-result-table__json">{{ row.detailText }}</pre>
          </template>

          <template #cell-actions>
            <span aria-hidden="true"></span>
          </template>
        </AppTableFrame>
        <p v-else data-testid="diff-details-empty" class="section-note">
          {{ diffDetailsEmptyMessage }}
        </p>
      </section>
    </StaticPageSection>

    <div v-if="savedOutput" class="run-result-actions">
      <RouterLink
        class="pilot-run-history-link"
        data-testid="run-result-view-history"
        :to="runHistoryRoute"
      >
        View all previous runs
      </RouterLink>
      <RouterLink
        class="static-page-action-tile static-page-action-tile--inline"
        data-testid="run-result-open-workflow"
        :to="workflowRoute"
      >
        Open Run
      </RouterLink>
    </div>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router'
import AppTableFrame from '../../components/ui/AppTableFrame.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { reconciliationFacade } from '../../lib/api/facade'
import type { GetPilotGeneratedOutputFile, PilotGeneratedOutput } from '../../lib/api/types'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

type DiffBucketKey = 'file-1' | 'file-2' | 'rule'

interface DiffDetailsMetadata {
  file1Label?: string
  file2Label?: string
  timestamp?: string
  reconciliationMappingId?: string
  reconciliationMappingName?: string
}

interface DiffDetailsSummary {
  totalDifferences?: number
  onlyInFile1Count?: number
  onlyInFile2Count?: number
  missingObjectDifferenceCount?: number
  ruleDifferenceCount?: number
}

interface DiffDetailsRecord {
  diffType?: string
  type?: string
  id?: string | number
  primaryId?: string | number
  presentIn?: string
  missingIn?: string
  data?: unknown
  field?: string
  file1Value?: unknown
  file2Value?: unknown
  ruleId?: string
  severity?: string
  message?: string
}

interface DiffDetailsPayload {
  metadata?: DiffDetailsMetadata
  summary?: DiffDetailsSummary
  differences?: DiffDetailsRecord[]
}

interface NormalizedDiffDetailRow {
  rowKey: string
  recordId: string
  bucket: DiffBucketKey
  detailText: string
}

const diffDetailColumns = [
  {
    key: 'recordId',
    label: 'Record ID',
    colStyle: { width: '13rem' },
  },
  {
    key: 'detailText',
    label: 'Diff Detail',
  },
  {
    key: 'actions',
    label: '',
    headerAlign: 'end' as const,
    colClass: 'app-table__action-column',
    headerClass: 'app-table__action-header',
    cellClass: 'app-table__action-cell',
  },
]

const route = useRoute()
const loading = ref(false)
const loadError = ref<string | null>(null)
const savedOutput = ref<PilotGeneratedOutput | null>(null)
const downloadableOutputFile = ref<GetPilotGeneratedOutputFile | null>(null)
const diffDetailsMeta = ref<DiffDetailsMetadata>({})
const diffDetailsSummary = ref<DiffDetailsSummary>({})
const diffDetailRows = ref<NormalizedDiffDetailRow[]>([])
const selectedDiffBuckets = ref<DiffBucketKey[]>(['file-1', 'file-2', 'rule'])
const diffDetailsSearch = ref('')
const diffDetailsPageIndex = ref(0)

const DIFF_DETAILS_PAGE_SIZE = 5
const DIFF_BUCKET_ORDER: DiffBucketKey[] = ['file-1', 'file-2', 'rule']

const reconciliationMappingId = computed(() =>
  typeof route.params.reconciliationMappingId === 'string' ? route.params.reconciliationMappingId.trim() : '',
)
const outputFileName = computed(() =>
  typeof route.params.outputFileName === 'string' ? route.params.outputFileName.trim() : '',
)
const runName = computed(() => (typeof route.query.runName === 'string' && route.query.runName.trim() ? route.query.runName.trim() : 'Selected Run'))
const file1SystemLabel = computed(() =>
  typeof route.query.file1SystemLabel === 'string' && route.query.file1SystemLabel.trim() ? route.query.file1SystemLabel.trim() : 'System 1',
)
const file2SystemLabel = computed(() =>
  typeof route.query.file2SystemLabel === 'string' && route.query.file2SystemLabel.trim() ? route.query.file2SystemLabel.trim() : 'System 2',
)
const heroDescription = computed(() =>
  savedOutput.value?.createdDate ? formatOutputCreatedDate(savedOutput.value.createdDate) : 'Review the saved reconciliation output for this run.',
)
const workflowRoute = computed<RouteLocationRaw>(() => ({
  name: 'reconciliation-pilot-diff',
  query: {
    mappingId: reconciliationMappingId.value,
    runName: runName.value,
    file1SystemLabel: diffDetailsFile1Label.value,
    file2SystemLabel: diffDetailsFile2Label.value,
  },
  state: buildWorkflowOriginState('Run Result', route.fullPath),
}))
const runHistoryRoute = computed<RouteLocationRaw>(() => ({
  name: 'reconciliation-run-history',
  params: {
    reconciliationMappingId: reconciliationMappingId.value,
  },
  query: {
    runName: runName.value,
    file1SystemLabel: diffDetailsFile1Label.value,
    file2SystemLabel: diffDetailsFile2Label.value,
  },
}))
const diffDetailsFile1Label = computed(
  () => diffDetailsMeta.value.file1Label || savedOutput.value?.file1Label || file1SystemLabel.value || 'File 1',
)
const diffDetailsFile2Label = computed(
  () => diffDetailsMeta.value.file2Label || savedOutput.value?.file2Label || file2SystemLabel.value || 'File 2',
)
const activeDiffBuckets = computed<DiffBucketKey[]>(() =>
  DIFF_BUCKET_ORDER.filter((bucket) => selectedDiffBuckets.value.includes(bucket)),
)
const diffDetailBuckets = computed(() => [
  {
    key: 'file-1' as const,
    label: `Missing from ${diffDetailsFile1Label.value}`,
    count:
      diffDetailsSummary.value.onlyInFile2Count ??
      diffDetailRows.value.filter((row) => row.bucket === 'file-1').length,
    testId: 'diff-bucket-file-1',
  },
  {
    key: 'file-2' as const,
    label: `Missing from ${diffDetailsFile2Label.value}`,
    count:
      diffDetailsSummary.value.onlyInFile1Count ??
      diffDetailRows.value.filter((row) => row.bucket === 'file-2').length,
    testId: 'diff-bucket-file-2',
  },
  {
    key: 'rule' as const,
    label: 'Rule differences',
    count:
      diffDetailsSummary.value.ruleDifferenceCount ??
      diffDetailRows.value.filter((row) => row.bucket === 'rule').length,
    testId: 'diff-bucket-rule',
  },
])
const activeBucketDiffDetailRows = computed(() =>
  diffDetailRows.value.filter((row) => activeDiffBuckets.value.includes(row.bucket)),
)
const filteredDiffDetailRows = computed(() => {
  const searchValue = diffDetailsSearch.value.trim().toLowerCase()

  return activeBucketDiffDetailRows.value.filter((row) => {
    if (!searchValue) return true
    return row.recordId.toLowerCase().includes(searchValue)
  })
})
const showDiffDetailsToolbar = computed(
  () => activeBucketDiffDetailRows.value.length > 0 || diffDetailsSearch.value.trim().length > 0,
)
const diffDetailsEmptyMessage = computed(() => {
  if (diffDetailsSearch.value.trim().length > 0) {
    return 'No records match the current diff detail filters.'
  }
  if (activeDiffBuckets.value.length === 0 && diffDetailRows.value.length > 0) {
    return 'Select a diff bucket to view matching records.'
  }
  if (activeBucketDiffDetailRows.value.length === 0 && diffDetailRows.value.length > 0) {
    return 'No records are available in the selected diff bucket.'
  }
  return 'No diff detail records are available.'
})
const diffDetailsPageCount = computed(() => Math.max(1, Math.ceil(filteredDiffDetailRows.value.length / DIFF_DETAILS_PAGE_SIZE)))
const pagedDiffDetailRows = computed(() => {
  const start = diffDetailsPageIndex.value * DIFF_DETAILS_PAGE_SIZE
  return filteredDiffDetailRows.value.slice(start, start + DIFF_DETAILS_PAGE_SIZE)
})
const pagedDiffDetailRowsAsRows = computed(() => pagedDiffDetailRows.value as Array<Record<string, unknown>>)

function normalizeDiffLabel(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeDiffToken(value: unknown): string {
  return normalizeDiffLabel(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeDiffBucketSelection(buckets: DiffBucketKey[]): DiffBucketKey[] {
  return DIFF_BUCKET_ORDER.filter((bucket) => buckets.includes(bucket))
}

function resetDiffDetailsState(): void {
  savedOutput.value = null
  downloadableOutputFile.value = null
  diffDetailsMeta.value = {}
  diffDetailsSummary.value = {}
  diffDetailRows.value = []
  selectedDiffBuckets.value = [...DIFF_BUCKET_ORDER]
  diffDetailsSearch.value = ''
  diffDetailsPageIndex.value = 0
}

function downloadText(filename: string, text: string, contentType: string): void {
  const blob = new Blob([text], { type: contentType || 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function stringifyDiffJson(value: unknown): string {
  if (value == null) return ''

  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function resolveDiffType(record: DiffDetailsRecord): string {
  return normalizeDiffLabel(record.diffType || record.type)
}

function resolveDiffRecordId(record: DiffDetailsRecord, rowIndex: number): string {
  if (record.id != null && String(record.id).trim()) return String(record.id).trim()
  if (record.primaryId != null && String(record.primaryId).trim()) return String(record.primaryId).trim()

  if (record.data && typeof record.data === 'object') {
    const candidate =
      (record.data as Record<string, unknown>).primaryId ??
      (record.data as Record<string, unknown>).record_id ??
      (record.data as Record<string, unknown>).recordId ??
      (record.data as Record<string, unknown>).compare_id ??
      (record.data as Record<string, unknown>).compareId ??
      (record.data as Record<string, unknown>).id
    if (candidate != null && String(candidate).trim()) return String(candidate).trim()
  }

  return `row-${rowIndex + 1}`
}

function resolveMissingBucket(
  record: DiffDetailsRecord,
  file1LabelValue: string,
  file2LabelValue: string,
): DiffBucketKey {
  const missingToken = normalizeDiffToken(record.missingIn)
  const file1Token = normalizeDiffToken(file1LabelValue)
  const file2Token = normalizeDiffToken(file2LabelValue)
  const typeToken = normalizeDiffToken(resolveDiffType(record))
  const presentToken = normalizeDiffToken(record.presentIn)

  if (missingToken && missingToken === file1Token) return 'file-1'
  if (missingToken && missingToken === file2Token) return 'file-2'
  if (file1Token && typeToken.includes(`missing_in_${file1Token}`)) return 'file-1'
  if (file2Token && typeToken.includes(`missing_in_${file2Token}`)) return 'file-2'
  if (presentToken && presentToken === file1Token) return 'file-2'
  if (presentToken && presentToken === file2Token) return 'file-1'
  return 'rule'
}

function isMissingDiffRecord(record: DiffDetailsRecord): boolean {
  const typeToken = normalizeDiffToken(resolveDiffType(record))
  return Boolean(record.missingIn || record.presentIn || typeToken.startsWith('missing_in_'))
}

function parseDiffData(rawData: unknown): unknown {
  if (typeof rawData !== 'string') return rawData

  try {
    return JSON.parse(rawData)
  } catch {
    return rawData
  }
}

function buildDiffDetailPayload(record: DiffDetailsRecord, parsedData: unknown): unknown {
  if (parsedData != null && !(typeof parsedData === 'string' && !parsedData.trim())) {
    return parsedData
  }

  const diffDetail = {
    diffType: resolveDiffType(record) || undefined,
    primaryId:
      record.primaryId != null && String(record.primaryId).trim() ? String(record.primaryId).trim() : undefined,
    field: normalizeDiffLabel(record.field) || undefined,
    file1Value: record.file1Value,
    file2Value: record.file2Value,
    severity: normalizeDiffLabel(record.severity) || undefined,
    ruleId: normalizeDiffLabel(record.ruleId) || undefined,
    message: normalizeDiffLabel(record.message) || undefined,
  }

  const normalizedDetail = Object.fromEntries(Object.entries(diffDetail).filter(([, value]) => value != null))
  return Object.keys(normalizedDetail).length > 0 ? normalizedDetail : null
}

function resolveDiffBucket(
  record: DiffDetailsRecord,
  file1LabelValue: string,
  file2LabelValue: string,
): DiffBucketKey {
  if (isMissingDiffRecord(record)) {
    return resolveMissingBucket(record, file1LabelValue, file2LabelValue)
  }
  return 'rule'
}

function normalizeDiffDetailRows(
  payload: DiffDetailsPayload,
  file1LabelValue: string,
  file2LabelValue: string,
): NormalizedDiffDetailRow[] {
  return (payload.differences ?? []).map((record, index) => {
    const parsedData = parseDiffData(record.data)
    const detailPayload = buildDiffDetailPayload(record, parsedData)
    const bucket = resolveDiffBucket(record, file1LabelValue, file2LabelValue)
    const recordId = resolveDiffRecordId(
      {
        ...record,
        data: parsedData,
      },
      index,
    )

    return {
      rowKey: `${bucket}-${recordId}-${index}`,
      recordId,
      bucket,
      detailText: stringifyDiffJson(detailPayload),
    }
  })
}

function buildGeneratedOutputFromPayload(fileName: string, payload: DiffDetailsPayload): PilotGeneratedOutput {
  const file1LabelValue = normalizeDiffLabel(payload.metadata?.file1Label) || normalizeDiffLabel(file1SystemLabel.value) || 'File 1'
  const file2LabelValue = normalizeDiffLabel(payload.metadata?.file2Label) || normalizeDiffLabel(file2SystemLabel.value) || 'File 2'
  const totalDifferences = payload.summary?.totalDifferences ?? payload.differences?.length ?? 0
  const onlyInFile1Count =
    payload.summary?.onlyInFile1Count ??
    (payload.differences ?? []).filter((record) => resolveMissingBucket(record, file1LabelValue, file2LabelValue) === 'file-2').length
  const onlyInFile2Count =
    payload.summary?.onlyInFile2Count ??
    (payload.differences ?? []).filter((record) => resolveMissingBucket(record, file1LabelValue, file2LabelValue) === 'file-1').length

  return {
    fileName,
    sourceFormat: 'json',
    availableFormats: ['json', 'csv'],
    preferredDownloadFormat: 'csv',
    reconciliationMappingId: payload.metadata?.reconciliationMappingId || reconciliationMappingId.value,
    mappingName: payload.metadata?.reconciliationMappingName || runName.value,
    file1Label: file1LabelValue,
    file2Label: file2LabelValue,
    totalDifferences,
    onlyInFile1Count,
    onlyInFile2Count,
    createdDate: payload.metadata?.timestamp,
  }
}

async function loadSavedResult(): Promise<void> {
  if (!reconciliationMappingId.value || !outputFileName.value) {
    resetDiffDetailsState()
    loadError.value = 'Saved result details are unavailable without a selected run result.'
    return
  }

  loading.value = true
  loadError.value = null
  resetDiffDetailsState()

  try {
    const response = await reconciliationFacade.getPilotGeneratedOutput({
      fileName: outputFileName.value,
      format: 'json',
    })
    const contentText = response.outputFile?.contentText
    if (!contentText) {
      throw new Error('Unable to load saved result.')
    }

    const payload = JSON.parse(contentText) as DiffDetailsPayload
    const descriptor = buildGeneratedOutputFromPayload(outputFileName.value, payload)

    savedOutput.value = descriptor
    downloadableOutputFile.value = response.outputFile ?? null
    diffDetailsMeta.value = {
      file1Label: descriptor.file1Label,
      file2Label: descriptor.file2Label,
      timestamp: payload.metadata?.timestamp,
    }
    diffDetailsSummary.value = {
      totalDifferences: descriptor.totalDifferences,
      onlyInFile1Count: descriptor.onlyInFile1Count,
      onlyInFile2Count: descriptor.onlyInFile2Count,
    }
    diffDetailRows.value = normalizeDiffDetailRows(payload, descriptor.file1Label || 'File 1', descriptor.file2Label || 'File 2')
  } catch (error) {
    resetDiffDetailsState()
    loadError.value = error instanceof ApiCallError ? error.message : 'Unable to load saved result.'
  } finally {
    loading.value = false
  }
}

function goToDiffDetailsPage(nextPageIndex: number): void {
  diffDetailsPageIndex.value = Math.min(Math.max(nextPageIndex, 0), diffDetailsPageCount.value - 1)
}

function clearDiffDetailsSearch(): void {
  diffDetailsSearch.value = ''
}

function toggleDiffBucket(bucket: DiffBucketKey): void {
  const isActive = activeDiffBuckets.value.includes(bucket)
  selectedDiffBuckets.value = isActive
    ? normalizeDiffBucketSelection(activeDiffBuckets.value.filter((activeBucket) => activeBucket !== bucket))
    : normalizeDiffBucketSelection([...activeDiffBuckets.value, bucket])

  diffDetailsPageIndex.value = 0
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

function downloadSavedResult(): void {
  if (!downloadableOutputFile.value) return

  downloadText(
    downloadableOutputFile.value.downloadFileName || downloadableOutputFile.value.fileName || outputFileName.value || 'saved-result.json',
    downloadableOutputFile.value.contentText,
    downloadableOutputFile.value.contentType,
  )
}

watch(diffDetailsSearch, () => {
  diffDetailsPageIndex.value = 0
})

watch(filteredDiffDetailRows, () => {
  if (diffDetailsPageIndex.value >= diffDetailsPageCount.value) {
    diffDetailsPageIndex.value = Math.max(diffDetailsPageCount.value - 1, 0)
  }
})

watch([reconciliationMappingId, outputFileName], () => {
  void loadSavedResult()
}, { immediate: true })
</script>

<style scoped>
.run-result-hero {
  display: grid;
  gap: var(--space-2);
}

.run-result-hero h1 {
  margin: 0;
}

.pilot-diff-details {
  display: grid;
  gap: var(--space-3);
}

.pilot-diff-details__bucket-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.pilot-diff-bucket {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.35rem;
  min-height: 0;
  padding: var(--space-3);
  text-align: left;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-soft);
  background: color-mix(in oklab, var(--surface-2) 95%, white);
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    background 160ms ease;
}

.pilot-diff-bucket:hover {
  transform: translateY(-1px);
}

.pilot-diff-bucket--active {
  border-color: color-mix(in oklab, var(--accent) 58%, var(--border));
  background: color-mix(in oklab, var(--surface-2) 80%, var(--accent));
}

.pilot-diff-bucket__label {
  color: var(--text-muted);
}

.pilot-diff-bucket strong {
  font-size: 1.9rem;
  line-height: 1;
}

.pilot-diff-details__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-3);
}

.pilot-diff-details__search {
  min-width: min(100%, 22rem);
}

.pilot-diff-details__search-field {
  position: relative;
}

.pilot-diff-details__search-input {
  width: 100%;
  min-height: 3rem;
  padding: 0.8rem 2.9rem 0.8rem 0.95rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}

.pilot-diff-details__search-clear {
  position: absolute;
  top: 50%;
  right: 0.55rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  min-height: 1.9rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 1.35rem;
  line-height: 1;
  transform: translateY(-50%);
}

.pilot-diff-details__search-clear:hover {
  background: color-mix(in oklab, var(--surface-2) 84%, var(--accent));
  color: var(--text);
}

.run-result-table__json {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--text);
}

.pilot-diff-details__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.pilot-diff-details__pagination p {
  margin: 0;
  color: var(--text-muted);
  text-align: center;
}

.run-result-actions {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
}

.pilot-run-history-link {
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
}

.pilot-run-history-link:hover {
  color: var(--text);
  text-decoration: underline;
}

@media (max-width: 760px) {
  .pilot-diff-details__pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .pilot-diff-details__bucket-grid {
    grid-template-columns: 1fr;
  }

  .run-result-table__id-cell {
    width: auto;
  }
}
</style>
