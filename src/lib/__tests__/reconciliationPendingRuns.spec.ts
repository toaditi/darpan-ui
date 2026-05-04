import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installLocalStorageStub } from '../../test/localStorage'
import {
  clearPendingReconciliationRun,
  listPendingReconciliationRuns,
  recordPendingReconciliationRun,
  resolveCompletedPendingReconciliationRuns,
} from '../reconciliationPendingRuns'

describe('reconciliation pending runs', () => {
  beforeEach(() => {
    installLocalStorageStub()
    window.localStorage.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-17T12:00:00.000Z'))
  })

  it('records and clears pending run markers by saved run', () => {
    const pending = recordPendingReconciliationRun({
      savedRunId: 'RS_ORDER_CSV',
      runName: 'CSV Order Compare',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    })

    expect(listPendingReconciliationRuns('RS_ORDER_CSV')).toEqual([
      expect.objectContaining({
        pendingRunId: pending.pendingRunId,
        savedRunId: 'RS_ORDER_CSV',
        submittedAt: '2026-05-17T12:00:00.000Z',
      }),
    ])

    clearPendingReconciliationRun(pending.pendingRunId)

    expect(listPendingReconciliationRuns('RS_ORDER_CSV')).toEqual([])
    expect(window.localStorage.getItem('darpan.pendingReconciliationRuns')).toBeNull()
  })

  it('clears pending markers when a completed result exists after submission', () => {
    recordPendingReconciliationRun({
      savedRunId: 'RS_ORDER_CSV',
      runName: 'CSV Order Compare',
      file1SystemLabel: 'OMS',
      file2SystemLabel: 'SHOPIFY',
    })

    resolveCompletedPendingReconciliationRuns('RS_ORDER_CSV', [
      {
        createdDate: '2026-05-17T12:01:00.000Z',
      },
    ])

    expect(listPendingReconciliationRuns('RS_ORDER_CSV')).toEqual([])
  })
})
