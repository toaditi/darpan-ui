import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/api/facade', () => ({
  reconciliationFacade: {
    listSavedRuns: vi.fn(),
    listGeneratedOutputs: vi.fn(),
    runSavedRunDiff: vi.fn(),
  },
}))

import { useReconciliationDiff } from '../useReconciliationDiff'
import { ApiCallError } from '../../lib/api/client'
import { reconciliationFacade } from '../../lib/api/facade'

const listSavedRuns = vi.mocked(reconciliationFacade.listSavedRuns)
const listGeneratedOutputs = vi.mocked(reconciliationFacade.listGeneratedOutputs)
const runSavedRunDiff = vi.mocked(reconciliationFacade.runSavedRunDiff)

describe('useReconciliationDiff', () => {
  beforeEach(() => {
    listSavedRuns.mockReset()
    listGeneratedOutputs.mockReset()
    runSavedRunDiff.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loadSavedRuns stores the returned saved runs', async () => {
    listSavedRuns.mockResolvedValue({
      savedRuns: [{ savedRunId: 'r-1', runName: 'Run 1', requiresSystemSelection: false, systemOptions: [] }],
    } as never)
    const diff = useReconciliationDiff()
    await diff.loadSavedRuns()
    expect(diff.savedRuns.value).toHaveLength(1)
    expect(diff.loadError.value).toBeNull()
  })

  it('loadSavedRuns surfaces ApiCallError messages on failure', async () => {
    listSavedRuns.mockRejectedValue(new ApiCallError('Backend exploded', 500, { failures: [] }))
    const diff = useReconciliationDiff()
    await diff.loadSavedRuns()
    expect(diff.loadError.value).toBe('Backend exploded')
  })

  it('loadLatestSavedOutput ignores stale responses', async () => {
    const diff = useReconciliationDiff()

    let resolveOld: () => void = () => {}
    listGeneratedOutputs.mockImplementationOnce(
      () =>
        new Promise<never>((resolve) => {
          resolveOld = () => resolve({ generatedOutputs: [] } as never)
        }),
    )
    const oldPromise = diff.loadLatestSavedOutput('run-A')

    listGeneratedOutputs.mockResolvedValueOnce({
      generatedOutputs: [{ fileName: 'new.json', createdDate: '2026-01-01' }],
    } as never)
    await diff.loadLatestSavedOutput('run-B')

    resolveOld()
    await oldPromise

    expect(diff.latestSavedOutput.value?.fileName).toBe('new.json')
  })

  it('submitDiff returns the response and clears errors when successful', async () => {
    runSavedRunDiff.mockResolvedValue({
      ok: true,
      runResult: {
        validationErrors: [],
        processingWarnings: ['minor'],
        generatedOutput: { fileName: 'out.json', createdDate: '2026-01-01' },
      },
    } as never)

    const diff = useReconciliationDiff()
    const response = await diff.submitDiff({
      savedRunId: 'r-1',
      file1SystemEnumId: 'NS',
      file2SystemEnumId: 'OMS',
      hasHeader: true,
    })
    expect(response?.runResult?.generatedOutput?.fileName).toBe('out.json')
    expect(diff.processingWarnings.value).toEqual(['minor'])
    expect(diff.runError.value).toBeNull()
    expect(diff.running.value).toBe(false)
  })

  it('submitDiff surfaces validation feedback on ApiCallError', async () => {
    const apiError = new ApiCallError('Invalid input', 422, {
      result: {
        validationErrors: ['Bad file'],
        processingWarnings: ['Heads up'],
      },
    })
    runSavedRunDiff.mockRejectedValue(apiError)

    const diff = useReconciliationDiff()
    await expect(
      diff.submitDiff({
        savedRunId: 'r-1',
        file1SystemEnumId: 'NS',
        file2SystemEnumId: 'OMS',
        hasHeader: true,
      }),
    ).rejects.toBeInstanceOf(ApiCallError)
    expect(diff.runError.value).toBe('Invalid input')
    expect(diff.validationErrors.value).toEqual(['Bad file'])
    expect(diff.processingWarnings.value).toEqual(['Heads up'])
  })
})
