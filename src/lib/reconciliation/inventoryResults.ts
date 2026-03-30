import type { InventoryReviewRow, InventoryResultRunSummary } from '../api/types'

export type InventoryResultsSortKey = 'pairId' | 'facility_name' | 'product_name' | 'qoh_diff' | 'reasonCode' | 'subReasonCode' | 'confidenceScore' | 'confidenceTier' | 'conclusion'
export type InventoryResultsSortDirection = 'asc' | 'desc'

export interface InventoryResultsFilters {
  reasonCodes: string[]
  subReasonCodes: string[]
  confidenceTiers: string[]
  facilityQuery: string
  productQuery: string
  globalQuery: string
  strictCycleOnly: boolean
  kitSingleOnly: boolean
}

export interface InventoryResultsPageState {
  pageIndex: number
  pageSize: number
}

export interface InventoryResultSortState {
  key: InventoryResultsSortKey
  direction: InventoryResultsSortDirection
}

interface NormalizedInventoryResultsFilters {
  reasonCodes: Set<string>
  subReasonCodes: Set<string>
  confidenceTiers: Set<string>
  facilityQuery: string
  productQuery: string
  globalQuery: string
  strictCycleOnly: boolean
  kitSingleOnly: boolean
}

const searchableFields: Array<keyof InventoryReviewRow> = [
  'pairId',
  'facility_id',
  'facility_name',
  'netsuite_product_id',
  'product_id',
  'product_name',
  'sampleOrderIds',
  'sampleReturnIds',
  'sampleShipmentIds',
  'sampleReceiptIds',
  'samplePhysicalInventoryIds',
  'matchedRuleIds',
  'reasonCode',
  'subReasonCode',
  'confidenceTier',
  'reasonText',
  'conclusion',
]

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  const parsed = Number(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function toNormalizedSet(values: string[]): Set<string> {
  return new Set(values.map((value) => normalize(value)).filter((value) => value.length > 0))
}

function normalizeFilters(filters: InventoryResultsFilters): NormalizedInventoryResultsFilters {
  return {
    reasonCodes: toNormalizedSet(filters.reasonCodes),
    subReasonCodes: toNormalizedSet(filters.subReasonCodes),
    confidenceTiers: toNormalizedSet(filters.confidenceTiers),
    facilityQuery: normalize(filters.facilityQuery),
    productQuery: normalize(filters.productQuery),
    globalQuery: normalize(filters.globalQuery),
    strictCycleOnly: filters.strictCycleOnly,
    kitSingleOnly: filters.kitSingleOnly,
  }
}

export function buildInventoryResultSearchText(row: InventoryReviewRow): string {
  return searchableFields.map((field) => normalize(row[field])).join(' ')
}

export function matchesInventoryResultFilters(row: InventoryReviewRow, filters: InventoryResultsFilters): boolean {
  return matchesInventoryResultFiltersNormalized(row, normalizeFilters(filters))
}

function matchesInventoryResultFiltersNormalized(
  row: InventoryReviewRow,
  filters: NormalizedInventoryResultsFilters,
): boolean {
  const reasonCode = normalize(row.reasonCode)
  if (filters.reasonCodes.size > 0 && !filters.reasonCodes.has(reasonCode)) {
    return false
  }

  if (filters.subReasonCodes.size > 0) {
    const subReason = normalize(row.subReasonCode)
    if (!filters.subReasonCodes.has(subReason)) return false
  }

  if (filters.confidenceTiers.size > 0) {
    const tier = normalize(row.confidenceTier)
    if (!filters.confidenceTiers.has(tier)) return false
  }

  if (filters.facilityQuery) {
    const haystack = normalize(row.facility_name) + ' ' + normalize(row.facility_id)
    if (!haystack.includes(filters.facilityQuery)) return false
  }

  if (filters.productQuery) {
    const haystack = normalize(row.product_name) + ' ' + normalize(row.product_id) + ' ' + normalize(row.netsuite_product_id)
    if (!haystack.includes(filters.productQuery)) return false
  }

  if (filters.strictCycleOnly && row.strictCycleCountSignal !== true) return false
  if (filters.kitSingleOnly && row.kitSingleNarrativeSignal !== true) return false

  if (filters.globalQuery && !buildInventoryResultSearchText(row).includes(filters.globalQuery)) return false

  return true
}

export function filterInventoryResultRows(rows: InventoryReviewRow[], filters: InventoryResultsFilters): InventoryReviewRow[] {
  const normalizedFilters = normalizeFilters(filters)
  return rows.filter((row) => matchesInventoryResultFiltersNormalized(row, normalizedFilters))
}

function compareValues(left: InventoryReviewRow, right: InventoryReviewRow, key: InventoryResultsSortKey): number {
  if (key === 'qoh_diff') {
    return toNumber(left.qoh_diff) - toNumber(right.qoh_diff)
  }
  if (key === 'confidenceScore') {
    return toNumber(left.confidenceScore) - toNumber(right.confidenceScore)
  }
  const leftValue = normalize(left[key as keyof InventoryReviewRow])
  const rightValue = normalize(right[key as keyof InventoryReviewRow])
  return leftValue.localeCompare(rightValue, undefined, { numeric: true, sensitivity: 'base' })
}

export function sortInventoryResultRows(
  rows: InventoryReviewRow[],
  sortState: InventoryResultSortState,
): InventoryReviewRow[] {
  const directionMultiplier = sortState.direction === 'desc' ? -1 : 1
  return [...rows].sort((left, right) => compareValues(left, right, sortState.key) * directionMultiplier)
}

export function paginateInventoryResultRows(
  rows: InventoryReviewRow[],
  pageState: InventoryResultsPageState,
): InventoryReviewRow[] {
  const start = pageState.pageIndex * pageState.pageSize
  return rows.slice(start, start + pageState.pageSize)
}

export function getInventoryResultsPageCount(totalCount: number, pageSize: number): number {
  if (totalCount <= 0) return 1
  return Math.max(1, Math.ceil(totalCount / pageSize))
}

export function getInventoryResultRunLabel(run: InventoryResultRunSummary | null | undefined): string {
  if (!run) return 'No run selected'
  const generatedAt = normalize(run.generatedAt)
  return generatedAt ? `${run.runId} · ${generatedAt}` : run.runId
}

export function getInventoryResultReasonOptions(rows: InventoryReviewRow[]): string[] {
  const uniqueByNormalized = new Map<string, string>()
  rows.forEach((row) => {
    const raw = String(row.reasonCode ?? '').trim()
    if (!raw) return
    const key = raw.toLowerCase()
    if (!uniqueByNormalized.has(key)) uniqueByNormalized.set(key, raw)
  })
  return Array.from(uniqueByNormalized.values()).sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

export function getInventoryResultSubReasonOptions(rows: InventoryReviewRow[]): string[] {
  const uniqueByNormalized = new Map<string, string>()
  rows.forEach((row) => {
    const raw = String(row.subReasonCode ?? '').trim()
    if (!raw) return
    const key = raw.toLowerCase()
    if (!uniqueByNormalized.has(key)) uniqueByNormalized.set(key, raw)
  })
  return Array.from(uniqueByNormalized.values()).sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }),
  )
}

export const CONFIDENCE_TIER_OPTIONS = ['High', 'Medium', 'Low'] as const
export type ConfidenceTier = typeof CONFIDENCE_TIER_OPTIONS[number]
