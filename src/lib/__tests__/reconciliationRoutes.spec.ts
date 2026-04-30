import { describe, expect, it } from 'vitest'
import {
  buildReconciliationDiffRoute,
  buildReconciliationRunHistoryRoute,
  buildReconciliationRunResultRoute,
  type ReconciliationRunRouteContext,
} from '../reconciliationRoutes'
import { buildWorkflowOriginState } from '../workflowOrigin'

describe('reconciliation route helpers', () => {
  const context: ReconciliationRunRouteContext = {
    savedRunId: 'run-100',
    runName: 'April Run',
    file1SystemLabel: 'NetSuite',
    file2SystemLabel: 'SFTP',
  }

  it('builds the diff workflow route with optional origin state', () => {
    const state = buildWorkflowOriginState('Dashboard', '/')

    expect(buildReconciliationDiffRoute(context, state)).toEqual({
      name: 'reconciliation-diff',
      query: {
        savedRunId: 'run-100',
        runName: 'April Run',
        file1SystemLabel: 'NetSuite',
        file2SystemLabel: 'SFTP',
      },
      state,
    })
  })

  it('builds run history and result routes with the shared query contract', () => {
    expect(buildReconciliationRunHistoryRoute(context)).toEqual({
      name: 'reconciliation-run-history',
      params: {
        savedRunId: 'run-100',
      },
      query: {
        runName: 'April Run',
        file1SystemLabel: 'NetSuite',
        file2SystemLabel: 'SFTP',
      },
    })

    expect(buildReconciliationRunResultRoute(context, 'result.json')).toEqual({
      name: 'reconciliation-run-result',
      params: {
        savedRunId: 'run-100',
        outputFileName: 'result.json',
      },
      query: {
        runName: 'April Run',
        file1SystemLabel: 'NetSuite',
        file2SystemLabel: 'SFTP',
      },
    })
  })
})
