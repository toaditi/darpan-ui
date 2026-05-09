import { ref, type Ref } from 'vue'
import { ApiCallError } from '../../lib/api/client'
import type { PaginationMeta } from '../../lib/api/types'
import { filterRecordsForActiveTenant } from '../../lib/utils/tenantRecords'

interface TenantOwnedRecord {
  companyUserGroupId?: string | null
}

interface PageRequest extends Record<string, unknown> {
  pageIndex: number
  pageSize: number
}

interface PaginatedSettingsResponse {
  pagination?: Partial<PaginationMeta> | null
}

interface UseSettingsPagedListOptions<T extends object, R extends PaginatedSettingsResponse> {
  pageSize?: number
  loadPage: (request: PageRequest) => Promise<R>
  selectRecords: (response: R) => T[] | undefined
  activeTenantUserGroupId?: () => string | null | undefined
  fallbackErrorMessage: string
}

function normalizePageCount(pageCount: number | undefined): number {
  const value = Number(pageCount)
  if (!Number.isFinite(value)) return 1
  return Math.max(1, Math.floor(value))
}

function normalizeError(error: unknown, fallbackMessage: string): string {
  return error instanceof ApiCallError ? error.message : fallbackMessage
}

export function useSettingsPagedList<T extends object, R extends PaginatedSettingsResponse>({
  pageSize = 12,
  loadPage,
  selectRecords,
  activeTenantUserGroupId,
  fallbackErrorMessage,
}: UseSettingsPagedListOptions<T, R>) {
  const rows = ref<T[]>([]) as Ref<T[]>
  const pageIndex = ref(0)
  const pageCount = ref(1)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const response = await loadPage({
        pageIndex: pageIndex.value,
        pageSize,
      })
      const records = selectRecords(response) ?? []
      const tenantId = activeTenantUserGroupId?.()
      rows.value = tenantId === undefined
        ? records
        : filterRecordsForActiveTenant(records as TenantOwnedRecord[], tenantId) as T[]
      pageCount.value = normalizePageCount(response.pagination?.pageCount)
    } catch (loadError) {
      error.value = normalizeError(loadError, fallbackErrorMessage)
    } finally {
      loading.value = false
    }
  }

  function goToPage(nextPageIndex: number): void {
    if (nextPageIndex === pageIndex.value) return
    pageIndex.value = nextPageIndex
    void load()
  }

  return {
    rows,
    pageIndex,
    pageSize,
    pageCount,
    loading,
    error,
    load,
    goToPage,
  }
}
