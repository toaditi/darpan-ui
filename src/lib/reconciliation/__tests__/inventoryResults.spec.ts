import { describe, expect, it } from 'vitest'
import {
  filterInventoryResultRows,
  getInventoryResultsPageCount,
  paginateInventoryResultRows,
  sortInventoryResultRows,
} from '../inventoryResults'
import type { InventoryReviewRow } from '../../api/types'

const rows: InventoryReviewRow[] = [
  {
    pairId: 'pair-1',
    facility_name: 'Charlotte',
    product_name: 'Kit A',
    qoh_diff: '-1',
    reasonCode: 'INCORRECT_CYCLE_COUNT',
    conclusion: 'Kit/single narrative',
    strictCycleCountSignal: true,
    kitSingleNarrativeSignal: true,
    sampleOrderIds: 'ORD-1',
    sampleReturnIds: 'RET-1',
    sampleShipmentIds: 'SHP-1',
  },
  {
    pairId: 'pair-2',
    facility_name: 'Dallas',
    product_name: 'Single B',
    qoh_diff: '4',
    reasonCode: 'REFUND_TRANSACTION_MISSING',
    conclusion: 'Return evidence missing',
    strictCycleCountSignal: false,
    kitSingleNarrativeSignal: false,
    sampleOrderIds: 'ORD-2',
    sampleReturnIds: 'RET-2',
    sampleShipmentIds: 'SHP-2',
  },
]

describe('inventoryResults helpers', () => {
  it('filters rows by reason, text, signals, and global search', () => {
    const filtered = filterInventoryResultRows(rows, {
      reasonCodes: ['INCORRECT_CYCLE_COUNT'],
      subReasonCodes: [],
      confidenceTiers: [],
      facilityQuery: 'charlotte',
      productQuery: 'kit',
      globalQuery: 'ord-1',
      strictCycleOnly: true,
      kitSingleOnly: true,
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.pairId).toBe('pair-1')
  })

  it('sorts by qoh diff numerically and paginates', () => {
    const sorted = sortInventoryResultRows(rows, { key: 'qoh_diff', direction: 'asc' })
    expect(sorted.map((row) => row.pairId)).toEqual(['pair-1', 'pair-2'])

    expect(getInventoryResultsPageCount(2, 50)).toBe(1)
    expect(paginateInventoryResultRows(sorted, { pageIndex: 0, pageSize: 1 })).toHaveLength(1)
    expect(paginateInventoryResultRows(sorted, { pageIndex: 1, pageSize: 1 })[0]?.pairId).toBe('pair-2')
  })
})
