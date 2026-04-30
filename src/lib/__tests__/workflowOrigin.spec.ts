import { describe, expect, it } from 'vitest'
import {
  WORKFLOW_ORIGIN_LABEL_KEY,
  WORKFLOW_ORIGIN_PATH_KEY,
  WORKFLOW_ORIGIN_ROUTE_STATE_KEY,
  buildWorkflowOriginState,
  readWorkflowOriginState,
  resolveStaticPageLabel,
} from '../workflowOrigin'

describe('workflowOrigin', () => {
  it('builds a serializable workflow origin state payload', () => {
    expect(buildWorkflowOriginState('Dashboard', '/')).toEqual({
      [WORKFLOW_ORIGIN_LABEL_KEY]: 'Dashboard',
      [WORKFLOW_ORIGIN_PATH_KEY]: '/',
    })
  })

  it('builds a workflow origin payload with optional route state', () => {
    expect(
      buildWorkflowOriginState('Run Details', '/reconciliation/ruleset-manager', {
        reconciliationRuleSetDraft: { runName: 'JSON Order Compare' },
      }),
    ).toEqual({
      [WORKFLOW_ORIGIN_LABEL_KEY]: 'Run Details',
      [WORKFLOW_ORIGIN_PATH_KEY]: '/reconciliation/ruleset-manager',
      [WORKFLOW_ORIGIN_ROUTE_STATE_KEY]: {
        reconciliationRuleSetDraft: { runName: 'JSON Order Compare' },
      },
    })
  })

  it('reads workflow origin state when both label and path are present', () => {
    expect(
      readWorkflowOriginState({
        workflowOriginLabel: 'Schema Library',
        workflowOriginPath: '/schemas/library',
      }),
    ).toEqual({
      label: 'Schema Library',
      path: '/schemas/library',
    })
  })

  it('reads workflow origin route state when present', () => {
    expect(
      readWorkflowOriginState({
        workflowOriginLabel: 'Run Details',
        workflowOriginPath: '/reconciliation/ruleset-manager',
        workflowOriginRouteState: {
          reconciliationRuleSetDraft: { runName: 'JSON Order Compare' },
        },
      }),
    ).toEqual({
      label: 'Run Details',
      path: '/reconciliation/ruleset-manager',
      state: {
        reconciliationRuleSetDraft: { runName: 'JSON Order Compare' },
      },
    })
  })

  it('rejects incomplete workflow origin state', () => {
    expect(readWorkflowOriginState({ workflowOriginLabel: 'Dashboard' })).toBeNull()
    expect(readWorkflowOriginState({ workflowOriginPath: '/' })).toBeNull()
    expect(readWorkflowOriginState(null)).toBeNull()
  })

  it('returns the static page label for non-workflow routes', () => {
    expect(
      resolveStaticPageLabel({
        meta: {
          surfaceMode: 'static',
          staticPageLabel: 'Dashboard',
        },
      }),
    ).toBe('Dashboard')
  })

  it('does not resolve a static label for workflow routes', () => {
    expect(
      resolveStaticPageLabel({
        meta: {
          surfaceMode: 'workflow',
          staticPageLabel: 'Dashboard',
        },
      }),
    ).toBeNull()
  })
})
