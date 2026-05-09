import { beforeEach, describe, expect, it, vi } from 'vitest'

const callService = vi.hoisted(() => vi.fn())

vi.mock('../client', () => ({
  callService,
}))

import { clearApiResponseCache, reconciliationFacade, settingsFacade } from '../facade'

describe('facade response cache', () => {
  beforeEach(() => {
    callService.mockReset()
    clearApiResponseCache()
  })

  it('reuses identical generated-output list requests during page activity', async () => {
    callService.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      generatedOutputs: [],
    })

    await reconciliationFacade.listGeneratedOutputs({ pageIndex: 0, pageSize: 80, query: '' })
    await reconciliationFacade.listGeneratedOutputs({ query: '', pageSize: 80, pageIndex: 0 })

    expect(callService).toHaveBeenCalledTimes(1)
    expect(callService).toHaveBeenCalledWith(
      'facade.ReconciliationFacadeServices.list#GeneratedOutputs',
      { pageIndex: 0, pageSize: 80, query: '' },
    )
  })

  it('coalesces concurrent saved-run list requests', async () => {
    let resolveResponse: (value: unknown) => void = () => {}
    callService.mockReturnValue(new Promise((resolve) => {
      resolveResponse = resolve
    }))

    const firstLoad = reconciliationFacade.listSavedRuns({ pageIndex: 0, pageSize: 12, query: '' })
    const secondLoad = reconciliationFacade.listSavedRuns({ query: '', pageSize: 12, pageIndex: 0 })

    expect(callService).toHaveBeenCalledTimes(1)

    resolveResponse({
      ok: true,
      messages: [],
      errors: [],
      savedRuns: [],
      pinnedSavedRunIds: [],
    })

    await expect(Promise.all([firstLoad, secondLoad])).resolves.toHaveLength(2)
  })

  it('clears cached result lists after run mutations', async () => {
    callService.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      generatedOutputs: [],
    })

    await reconciliationFacade.listGeneratedOutputs({ pageIndex: 0, pageSize: 80, query: '' })
    await reconciliationFacade.listGeneratedOutputs({ pageIndex: 0, pageSize: 80, query: '' })

    expect(callService).toHaveBeenCalledTimes(1)

    await reconciliationFacade.deleteGeneratedOutput({ fileName: 'reconciliation-runs/RS/orders_result.json' })
    await reconciliationFacade.listGeneratedOutputs({ pageIndex: 0, pageSize: 80, query: '' })

    expect(callService).toHaveBeenCalledTimes(3)
    expect(callService).toHaveBeenLastCalledWith(
      'facade.ReconciliationFacadeServices.list#GeneratedOutputs',
      { pageIndex: 0, pageSize: 80, query: '' },
    )
  })

  it('reuses settings list requests and clears them after settings mutations', async () => {
    callService.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      authConfigs: [],
    })

    await settingsFacade.listNsAuthConfigs({ pageIndex: 0, pageSize: 10 })
    await settingsFacade.listNsAuthConfigs({ pageSize: 10, pageIndex: 0 })

    expect(callService).toHaveBeenCalledTimes(1)

    await settingsFacade.saveNsAuthConfig({ nsAuthConfigId: 'auth-primary' })
    await settingsFacade.listNsAuthConfigs({ pageIndex: 0, pageSize: 10 })

    expect(callService).toHaveBeenCalledTimes(3)
    expect(callService).toHaveBeenLastCalledWith(
      'facade.SettingsFacadeServices.list#NsAuthConfigs',
      { pageIndex: 0, pageSize: 10 },
    )
  })
})
