import type { HistoryState, RouteLocationRaw } from 'vue-router'
import type { SavedRunSummary } from './api/types'
import {
  buildReconciliationRuleSetDraftState,
  type ReconciliationRulePreAction,
  type ReconciliationRulePreActionEntry,
  type ReconciliationRulePreActionFieldSide,
  type ReconciliationRuleSetDraft,
} from './reconciliationRuleSetDraft'
import { resolveRecordLabel } from './utils/recordLabel'

export function savedRunName(row: SavedRunSummary): string {
  return resolveRecordLabel({
    primary: row.runName,
    description: row.description,
    fallbackId: row.savedRunId,
  })
}

function normalizePreAction(value: unknown): ReconciliationRulePreAction | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toUpperCase()
  if (normalized === 'STRING_TO_INTEGER' || normalized === 'TO_INT' || normalized === 'TO_INTEGER') return 'STRING_TO_INT'
  if (normalized === 'TO_NUMBER') return 'STRING_TO_NUMBER'
  return normalized === 'STRING_TO_INT' || normalized === 'STRING_TO_NUMBER' ? normalized : null
}

function normalizePreActionFieldSide(value: unknown): ReconciliationRulePreActionFieldSide | null {
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  if (normalized === 'file1' || normalized === 'file_1' || normalized === 'left') return 'file1'
  if (normalized === 'file2' || normalized === 'file_2' || normalized === 'right') return 'file2'
  return null
}

function normalizePreActions(value: unknown): ReconciliationRulePreActionEntry[] | undefined {
  const rawValues = Array.isArray(value) ? value : (value ? [value] : [])
  const normalized = rawValues.flatMap((rawValue): ReconciliationRulePreActionEntry[] => {
    if (typeof rawValue === 'string') {
      const action = normalizePreAction(rawValue)
      return action ? [{ fieldSide: 'file1', action }, { fieldSide: 'file2', action }] : []
    }

    if (!rawValue || typeof rawValue !== 'object') return []

    const record = rawValue as Record<string, unknown>
    const action = normalizePreAction(record.action ?? record.preAction)
    const fieldSide = normalizePreActionFieldSide(record.fieldSide ?? record.field ?? record.side)
    return action && fieldSide ? [{ fieldSide, action }] : []
  })

  const seen = new Set<string>()
  const deduped = normalized.filter((entry) => {
    const key = `${entry.fieldSide}:${entry.action}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped.length ? deduped : undefined
}

function readExpressionPreActions(expression: string | undefined): ReconciliationRulePreActionEntry[] | undefined {
  if (!expression?.trim()) return undefined

  try {
    const parsed = JSON.parse(expression) as Record<string, unknown>
    return normalizePreActions(parsed.preActions ?? parsed.preAction)
  } catch {
    return undefined
  }
}

function buildRuleSetDraft(row: SavedRunSummary): ReconciliationRuleSetDraft | null {
  const file1Option = row.systemOptions.find((option) => option.fileSide === 'FILE_1')
    ?? row.systemOptions.find((option) => option.enumId === row.defaultFile1SystemEnumId)
  const file2Option = row.systemOptions.find((option) => option.fileSide === 'FILE_2')
    ?? row.systemOptions.find((option) => option.enumId === row.defaultFile2SystemEnumId)

  if (!file1Option?.enumId || !file1Option.idFieldExpression || !file2Option?.enumId || !file2Option.idFieldExpression) {
    return null
  }

  return {
    savedRunId: row.savedRunId,
    runName: savedRunName(row),
    description: row.description,
    file1SystemEnumId: file1Option.enumId,
    file1SystemLabel: file1Option.label || file1Option.enumCode || file1Option.description,
    file1SourceTypeEnumId: file1Option.sourceTypeEnumId,
    file1SystemMessageRemoteId: file1Option.systemMessageRemoteId,
    file1SystemMessageRemoteLabel: file1Option.systemMessageRemoteLabel,
    file1NsRestletConfigId: file1Option.nsRestletConfigId,
    file1NsRestletConfigLabel: file1Option.nsRestletConfigLabel,
    file1SourceConfigId: file1Option.sourceConfigId,
    file1SourceConfigType: file1Option.sourceConfigType,
    file1FileTypeEnumId: file1Option.fileTypeEnumId || 'DftCsv',
    file1SchemaFileName: file1Option.schemaFileName,
    file1PrimaryIdExpression: file1Option.idFieldExpression,
    file2SystemEnumId: file2Option.enumId,
    file2SystemLabel: file2Option.label || file2Option.enumCode || file2Option.description,
    file2SourceTypeEnumId: file2Option.sourceTypeEnumId,
    file2SystemMessageRemoteId: file2Option.systemMessageRemoteId,
    file2SystemMessageRemoteLabel: file2Option.systemMessageRemoteLabel,
    file2NsRestletConfigId: file2Option.nsRestletConfigId,
    file2NsRestletConfigLabel: file2Option.nsRestletConfigLabel,
    file2SourceConfigId: file2Option.sourceConfigId,
    file2SourceConfigType: file2Option.sourceConfigType,
    file2FileTypeEnumId: file2Option.fileTypeEnumId || 'DftCsv',
    file2SchemaFileName: file2Option.schemaFileName,
    file2PrimaryIdExpression: file2Option.idFieldExpression,
    rules: row.rules?.map((rule, index) => ({
      ruleId: rule.ruleId,
      file1FieldPath: rule.file1FieldPath ?? '',
      file2FieldPath: rule.file2FieldPath ?? '',
      operator: rule.operator || '=',
      sequenceNum: rule.sequenceNum ?? index + 1,
      preActions: normalizePreActions(rule.preActions) ?? readExpressionPreActions(rule.expression),
      ruleText: rule.ruleText,
      ruleLogic: rule.ruleLogic,
      ruleType: rule.ruleType,
      expression: rule.expression,
      enabled: rule.enabled,
      severity: rule.severity,
    })).filter((rule) => rule.file1FieldPath && rule.file2FieldPath),
  }
}

export function buildSavedRunEditorRoute(row: SavedRunSummary, workflowOriginState: HistoryState): RouteLocationRaw {
  if (row.runType === 'mapping' && row.reconciliationMappingId) {
    return {
      name: 'settings-runs-edit',
      params: { reconciliationMappingId: row.reconciliationMappingId },
      state: workflowOriginState,
    }
  }

  const ruleSetDraft = buildRuleSetDraft(row)
  if (row.runType === 'ruleset' && ruleSetDraft) {
    return {
      name: 'reconciliation-ruleset-manager',
      state: {
        ...workflowOriginState,
        ...buildReconciliationRuleSetDraftState(ruleSetDraft, 'ruleset-manager'),
      },
    }
  }

  return {
    name: 'settings-runs-edit',
    params: { reconciliationMappingId: row.reconciliationMappingId || row.savedRunId },
    state: workflowOriginState,
  }
}
