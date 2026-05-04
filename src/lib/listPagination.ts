import { computed, ref, unref, watch, type ComputedRef, type Ref } from 'vue'

export const DEFAULT_LIST_PAGE_SIZE = 5

type ListSource<T> = Ref<readonly T[]> | ComputedRef<readonly T[]> | readonly T[]

function normalizePageSize(pageSize = DEFAULT_LIST_PAGE_SIZE): number {
  const value = Number(pageSize)
  if (!Number.isFinite(value) || value < 1) return DEFAULT_LIST_PAGE_SIZE
  return Math.floor(value)
}

export function getListPageCount(totalItems: number, pageSize = DEFAULT_LIST_PAGE_SIZE): number {
  const normalizedTotal = Math.max(0, Math.ceil(totalItems))
  return Math.max(1, Math.ceil(normalizedTotal / normalizePageSize(pageSize)))
}

export function clampListPageIndex(pageIndex: number, pageCount: number): number {
  const maxPageIndex = Math.max(0, Math.floor(pageCount) - 1)
  const normalizedPageIndex = Number.isFinite(pageIndex) ? Math.floor(pageIndex) : 0
  return Math.min(Math.max(normalizedPageIndex, 0), maxPageIndex)
}

export function paginateListItems<T>(
  items: readonly T[],
  pageIndex: number,
  pageSize = DEFAULT_LIST_PAGE_SIZE,
): T[] {
  const normalizedPageSize = normalizePageSize(pageSize)
  const normalizedPageIndex = clampListPageIndex(pageIndex, getListPageCount(items.length, normalizedPageSize))
  const start = normalizedPageIndex * normalizedPageSize
  return items.slice(start, start + normalizedPageSize)
}

export function useListPagination<T>(items: ListSource<T>, options: { pageSize?: number } = {}) {
  const pageIndex = ref(0)
  const pageSize = computed(() => normalizePageSize(options.pageSize))
  const itemCount = computed(() => unref(items).length)
  const pageCount = computed(() => getListPageCount(itemCount.value, pageSize.value))
  const pagedItems = computed(() => paginateListItems(unref(items), pageIndex.value, pageSize.value))

  function goToPage(nextPageIndex: number): void {
    pageIndex.value = clampListPageIndex(nextPageIndex, pageCount.value)
  }

  function goToPreviousPage(): void {
    goToPage(pageIndex.value - 1)
  }

  function goToNextPage(): void {
    goToPage(pageIndex.value + 1)
  }

  function resetPage(): void {
    pageIndex.value = 0
  }

  watch(pageCount, () => {
    goToPage(pageIndex.value)
  })

  return {
    pageIndex,
    pageSize,
    pageCount,
    pagedItems,
    goToPage,
    goToPreviousPage,
    goToNextPage,
    resetPage,
  }
}
