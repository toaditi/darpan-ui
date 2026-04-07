import { describe, expect, it } from 'vitest'
import {
  WORKFLOW_ORIGIN_LABEL_KEY,
  WORKFLOW_ORIGIN_PATH_KEY,
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
