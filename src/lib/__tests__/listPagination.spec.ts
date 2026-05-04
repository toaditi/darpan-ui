import { nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LIST_PAGE_SIZE,
  getListPageCount,
  paginateListItems,
  useListPagination,
} from '../listPagination'

describe('listPagination', () => {
  it('uses the shared five-row default from run result pagination', () => {
    expect(DEFAULT_LIST_PAGE_SIZE).toBe(5)
    expect(getListPageCount(11)).toBe(3)
    expect(paginateListItems([1, 2, 3, 4, 5, 6], 1)).toEqual([6])
  })

  it('pages reactive list data and clamps when the list shrinks', async () => {
    const rows = ref(['A', 'B', 'C', 'D', 'E', 'F'])
    const pagination = useListPagination(rows)

    expect(pagination.pageCount.value).toBe(2)
    expect(pagination.pagedItems.value).toEqual(['A', 'B', 'C', 'D', 'E'])

    pagination.goToNextPage()
    expect(pagination.pageIndex.value).toBe(1)
    expect(pagination.pagedItems.value).toEqual(['F'])

    rows.value = ['A', 'B']
    await nextTick()

    expect(pagination.pageIndex.value).toBe(0)
    expect(pagination.pageCount.value).toBe(1)
    expect(pagination.pagedItems.value).toEqual(['A', 'B'])
  })
})
