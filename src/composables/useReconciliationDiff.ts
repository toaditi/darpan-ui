import { ref, type Ref } from 'vue'
import { ApiCallError } from '../lib/api/client'
import { reconciliationFacade } from '../lib/api/facade'
import type { GeneratedOutput, RunSavedRunDiffResponse, SavedRunSummary } from '../lib/api/types'
import type { RunSavedRunDiffPayload } from '../lib/api/facadeTypes'
import { makeRequestGuard } from '../lib/utils/async'

interface FailedRunFeedback {
  validationErrors: string[]
  processingWarnings: string[]
}

export interface UseReconciliationDiff {
  savedRuns: Ref<SavedRunSummary[]>
  loadingSavedRuns: Ref<boolean>
  loadError: Ref<string | null>
  latestSavedOutput: Ref<GeneratedOutput | null>
  latestSavedOutputLoading: Ref<boolean>
  latestSavedOutputError: Ref<string | null>
  runError: Ref<string | null>
  running: Ref<boolean>
  validationErrors: Ref<string[]>
  processingWarnings: Ref<string[]>
  loadSavedRuns: () => Promise<void>
  loadLatestSavedOutput: (savedRunId: string) => Promise<void>
  clearLatestSavedOutputState: () => void
  clearRunState: () => void
  submitDiff: (payload: RunSavedRunDiffPayload) => Promise<RunSavedRunDiffResponse | null>
  readFailedRunFeedback: (error: ApiCallError) => FailedRunFeedback
}

export function useReconciliationDiff(): UseReconciliationDiff {
  const savedRuns = ref<SavedRunSummary[]>([])
  const loadingSavedRuns = ref(false)
  const loadError = ref<string | null>(null)
  const latestSavedOutput = ref<GeneratedOutput | null>(null)
  const latestSavedOutputLoading = ref(false)
  const latestSavedOutputError = ref<string | null>(null)
  const runError = ref<string | null>(null)
  const running = ref(false)
  const validationErrors = ref<string[]>([])
  const processingWarnings = ref<string[]>([])

  const latestOutputRequest = makeRequestGuard()

  function clearRunState(): void {
    runError.value = null
    validationErrors.value = []
    processingWarnings.value = []
  }

  function clearLatestSavedOutputState(): void {
    latestSavedOutput.value = null
    latestSavedOutputLoading.value = false
    latestSavedOutputError.value = null
  }

  async function loadSavedRuns(): Promise<void> {
    loadingSavedRuns.value = true
    loadError.value = null

    try {
      const response = await reconciliationFacade.listSavedRuns({
        pageIndex: 0,
        pageSize: 50,
        query: '',
      })
      savedRuns.value = response.savedRuns ?? []
    } catch (error) {
      loadError.value = error instanceof ApiCallError ? error.message : 'Unable to load saved runs.'
    } finally {
      loadingSavedRuns.value = false
    }
  }

  async function loadLatestSavedOutput(savedRunId: string): Promise<void> {
    const normalizedSavedRunId = savedRunId.trim()
    if (!normalizedSavedRunId) {
      clearLatestSavedOutputState()
      return
    }

    const requestId = latestOutputRequest.getRequestId()
    latestSavedOutputLoading.value = true
    latestSavedOutputError.value = null
    latestSavedOutput.value = null

    try {
      const response = await reconciliationFacade.listGeneratedOutputs({
        savedRunId: normalizedSavedRunId,
        pageIndex: 0,
        pageSize: 1,
        query: '',
      })

      if (!latestOutputRequest.isCurrentRequest(requestId)) return
      latestSavedOutput.value = response.generatedOutputs?.[0] ?? null
    } catch (error) {
      if (!latestOutputRequest.isCurrentRequest(requestId)) return
      latestSavedOutput.value = null
      latestSavedOutputError.value = error instanceof ApiCallError ? error.message : 'Unable to load saved results.'
    } finally {
      if (latestOutputRequest.isCurrentRequest(requestId)) {
        latestSavedOutputLoading.value = false
      }
    }
  }

  function readFailedRunFeedback(error: ApiCallError): FailedRunFeedback {
    const details = (error.details ?? {}) as {
      result?: {
        validationErrors?: unknown
        processingWarnings?: unknown
      }
    }

    return {
      validationErrors: Array.isArray(details.result?.validationErrors)
        ? details.result.validationErrors.map((item) => String(item))
        : [],
      processingWarnings: Array.isArray(details.result?.processingWarnings)
        ? details.result.processingWarnings.map((item) => String(item))
        : [],
    }
  }

  async function submitDiff(payload: RunSavedRunDiffPayload): Promise<RunSavedRunDiffResponse | null> {
    clearRunState()
    running.value = true

    try {
      const response = await reconciliationFacade.runSavedRunDiff(payload)
      validationErrors.value = response.runResult?.validationErrors ?? []
      processingWarnings.value = response.runResult?.processingWarnings ?? []
      return response
    } catch (error) {
      if (error instanceof ApiCallError) {
        const failedFeedback = readFailedRunFeedback(error)
        validationErrors.value = failedFeedback.validationErrors
        processingWarnings.value = failedFeedback.processingWarnings
        runError.value = error.message
      } else {
        runError.value = 'Unable to run the diff.'
      }
      throw error
    } finally {
      running.value = false
    }
  }

  return {
    savedRuns,
    loadingSavedRuns,
    loadError,
    latestSavedOutput,
    latestSavedOutputLoading,
    latestSavedOutputError,
    runError,
    running,
    validationErrors,
    processingWarnings,
    loadSavedRuns,
    loadLatestSavedOutput,
    clearLatestSavedOutputState,
    clearRunState,
    submitDiff,
    readFailedRunFeedback,
  }
}
