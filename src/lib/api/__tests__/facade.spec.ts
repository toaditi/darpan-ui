import { beforeEach, describe, expect, it, vi } from 'vitest'

const callService = vi.hoisted(() => vi.fn())

vi.mock('../client', () => ({
  callService,
}))

import { resultsFacade } from '../facade'

describe('resultsFacade', () => {
  beforeEach(() => {
    callService.mockReset()
    callService.mockResolvedValue({ ok: true, messages: [], errors: [] })
  })

  it('maps listInventoryResultRuns to the expected rpc method', async () => {
    await resultsFacade.listInventoryResultRuns({ pageIndex: 0, pageSize: 50 })

    expect(callService).toHaveBeenCalledWith('facade.InventoryResultsFacadeServices.list#InventoryResultRuns', {
      pageIndex: 0,
      pageSize: 50,
    })
  })

  it('maps getInventoryResultDetail to the expected rpc method', async () => {
    await resultsFacade.getInventoryResultDetail({ runId: 'run-1', pairId: 'pair-1' })

    expect(callService).toHaveBeenCalledWith('facade.InventoryResultsFacadeServices.get#InventoryResultDetail', {
      runId: 'run-1',
      pairId: 'pair-1',
    })
  })

  it('maps downloadInventoryResultReviewCsv to the expected rpc method', async () => {
    await resultsFacade.downloadInventoryResultReviewCsv('run-1')

    expect(callService).toHaveBeenCalledWith('facade.InventoryResultsFacadeServices.download#InventoryResultReviewCsv', {
      runId: 'run-1',
    })
  })
})
