export const WORKFLOW_ORIGIN_LABEL_KEY = 'workflowOriginLabel'
export const WORKFLOW_ORIGIN_PATH_KEY = 'workflowOriginPath'

export interface WorkflowOrigin {
  label: string
  path: string
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function buildWorkflowOriginState(label: string, path: string): Record<string, string> {
  return {
    [WORKFLOW_ORIGIN_LABEL_KEY]: label,
    [WORKFLOW_ORIGIN_PATH_KEY]: path,
  }
}

export function readWorkflowOriginState(stateLike: unknown): WorkflowOrigin | null {
  if (!stateLike || typeof stateLike !== 'object') return null

  const stateRecord = stateLike as Record<string, unknown>
  const label = normalizeString(stateRecord[WORKFLOW_ORIGIN_LABEL_KEY])
  const path = normalizeString(stateRecord[WORKFLOW_ORIGIN_PATH_KEY])
  if (!label || !path) return null

  return { label, path }
}

export function readWorkflowOriginFromHistoryState(): WorkflowOrigin | null {
  if (typeof window === 'undefined') return null
  return readWorkflowOriginState(window.history.state)
}

export function resolveStaticPageLabel(routeLike: { meta?: { surfaceMode?: unknown; staticPageLabel?: unknown } | null }): string | null {
  if (routeLike?.meta?.surfaceMode === 'workflow') return null
  return normalizeString(routeLike?.meta?.staticPageLabel)
}
