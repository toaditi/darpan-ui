import type { HistoryState } from 'vue-router'

const RULESET_DRAFT_KEY = 'reconciliationRuleSetDraft'
const RULESET_DRAFT_RESUME_STEP_KEY = 'reconciliationRuleSetDraftResumeStepId'

export type ReconciliationRuleSetDraftStepId = 'ruleset-manager'
export type ReconciliationRulePreAction = 'STRING_TO_INT' | 'STRING_TO_NUMBER'
export type ReconciliationRulePreActionFieldSide = 'file1' | 'file2'

export interface ReconciliationRulePreActionEntry {
  fieldSide: ReconciliationRulePreActionFieldSide
  action: ReconciliationRulePreAction
}

export interface ReconciliationRuleSetDraftRule {
  ruleId?: string
  file1FieldPath: string
  file2FieldPath: string
  operator: string
  sequenceNum: number
  preActions?: ReconciliationRulePreActionEntry[]
  ruleText?: string
  ruleLogic?: string
  ruleType?: string
  expression?: string
  enabled?: string
  severity?: string
}

export interface ReconciliationRuleSetDraft {
  savedRunId?: string
  runName: string
  description?: string
  file1SystemEnumId: string
  file1SystemLabel?: string
  file1FileTypeEnumId: string
  file1JsonSchemaId?: string
  file1SchemaLabel?: string
  file1SchemaFileName?: string
  file1PrimaryIdExpression: string
  file2SystemEnumId: string
  file2SystemLabel?: string
  file2FileTypeEnumId: string
  file2JsonSchemaId?: string
  file2SchemaLabel?: string
  file2SchemaFileName?: string
  file2PrimaryIdExpression: string
  rules?: ReconciliationRuleSetDraftRule[]
}

export interface ReconciliationRuleSetDraftState {
  draft: ReconciliationRuleSetDraft
  resumeStepId: ReconciliationRuleSetDraftStepId | null
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function normalizeSequenceNum(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value !== 'string' || value.trim().length === 0) return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
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

function normalizePreActions(value: unknown): ReconciliationRulePreActionEntry[] {
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
  return normalized.filter((entry) => {
    const key = `${entry.fieldSide}:${entry.action}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function readDraftRules(value: unknown): ReconciliationRuleSetDraftRule[] {
  if (!Array.isArray(value)) return []

  return value.reduce<ReconciliationRuleSetDraftRule[]>((rules, rawRule, index) => {
    if (!rawRule || typeof rawRule !== 'object') return rules

    const record = rawRule as Record<string, unknown>
    const expressionRule = readRuleExpression(record.expression)
    const file1FieldPath = normalizeString(record.file1FieldPath) ?? expressionRule.file1FieldPath
    const file2FieldPath = normalizeString(record.file2FieldPath) ?? expressionRule.file2FieldPath
    const recordPreActions = normalizePreActions(record.preActions)
    const preActions = recordPreActions.length ? recordPreActions : expressionRule.preActions
    if (!file1FieldPath || !file2FieldPath) return rules

    rules.push({
      ruleId: normalizeString(record.ruleId) ?? undefined,
      file1FieldPath,
      file2FieldPath,
      operator: normalizeString(record.operator) ?? expressionRule.operator ?? '=',
      sequenceNum: normalizeSequenceNum(record.sequenceNum) ?? index + 1,
      ...(preActions?.length ? { preActions } : {}),
      ruleText: normalizeString(record.ruleText) ?? undefined,
      ruleLogic: normalizeString(record.ruleLogic) ?? undefined,
      ruleType: normalizeString(record.ruleType) ?? undefined,
      expression: normalizeString(record.expression) ?? undefined,
      enabled: normalizeString(record.enabled) ?? undefined,
      severity: normalizeString(record.severity) ?? undefined,
    })
    return rules
  }, [])
}

function readRuleExpression(value: unknown): Partial<ReconciliationRuleSetDraftRule> {
  const expression = normalizeString(value)
  if (!expression) return {}

  try {
    const parsed = JSON.parse(expression) as Record<string, unknown>
    return {
      file1FieldPath: normalizeString(parsed.file1FieldPath) ?? undefined,
      file2FieldPath: normalizeString(parsed.file2FieldPath) ?? undefined,
      operator: normalizeString(parsed.operator) ?? undefined,
      preActions: normalizePreActions(parsed.preActions ?? parsed.preAction),
    }
  } catch {
    return {}
  }
}

function readDraft(value: unknown): ReconciliationRuleSetDraft | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>
  const runName = normalizeString(record.runName)
  const file1SystemEnumId = normalizeString(record.file1SystemEnumId)
  const file1FileTypeEnumId = normalizeString(record.file1FileTypeEnumId)
  const file1PrimaryIdExpression = normalizeString(record.file1PrimaryIdExpression)
  const file2SystemEnumId = normalizeString(record.file2SystemEnumId)
  const file2FileTypeEnumId = normalizeString(record.file2FileTypeEnumId)
  const file2PrimaryIdExpression = normalizeString(record.file2PrimaryIdExpression)

  if (
    !runName
    || !file1SystemEnumId
    || !file1FileTypeEnumId
    || !file1PrimaryIdExpression
    || !file2SystemEnumId
    || !file2FileTypeEnumId
    || !file2PrimaryIdExpression
  ) {
    return null
  }

  return {
    savedRunId: normalizeString(record.savedRunId) ?? undefined,
    runName,
    description: normalizeString(record.description) ?? undefined,
    file1SystemEnumId,
    file1SystemLabel: normalizeString(record.file1SystemLabel) ?? undefined,
    file1FileTypeEnumId,
    file1JsonSchemaId: normalizeString(record.file1JsonSchemaId) ?? undefined,
    file1SchemaLabel: normalizeString(record.file1SchemaLabel) ?? undefined,
    file1SchemaFileName: normalizeString(record.file1SchemaFileName) ?? undefined,
    file1PrimaryIdExpression,
    file2SystemEnumId,
    file2SystemLabel: normalizeString(record.file2SystemLabel) ?? undefined,
    file2FileTypeEnumId,
    file2JsonSchemaId: normalizeString(record.file2JsonSchemaId) ?? undefined,
    file2SchemaLabel: normalizeString(record.file2SchemaLabel) ?? undefined,
    file2SchemaFileName: normalizeString(record.file2SchemaFileName) ?? undefined,
    file2PrimaryIdExpression,
    rules: readDraftRules(record.rules),
  }
}

export function buildReconciliationRuleSetDraftState(
  draft: ReconciliationRuleSetDraft,
  resumeStepId: ReconciliationRuleSetDraftStepId | null = null,
): HistoryState {
  const historyDraft: HistoryState = {
    runName: draft.runName.trim(),
    file1SystemEnumId: draft.file1SystemEnumId,
    file1FileTypeEnumId: draft.file1FileTypeEnumId,
    file1PrimaryIdExpression: draft.file1PrimaryIdExpression.trim(),
    file2SystemEnumId: draft.file2SystemEnumId,
    file2FileTypeEnumId: draft.file2FileTypeEnumId,
    file2PrimaryIdExpression: draft.file2PrimaryIdExpression.trim(),
  }

  if (draft.savedRunId?.trim()) historyDraft.savedRunId = draft.savedRunId.trim()
  if (draft.description?.trim()) historyDraft.description = draft.description.trim()
  if (draft.file1SystemLabel?.trim()) historyDraft.file1SystemLabel = draft.file1SystemLabel.trim()
  if (draft.file1JsonSchemaId?.trim()) historyDraft.file1JsonSchemaId = draft.file1JsonSchemaId.trim()
  if (draft.file1SchemaLabel?.trim()) historyDraft.file1SchemaLabel = draft.file1SchemaLabel.trim()
  if (draft.file1SchemaFileName?.trim()) historyDraft.file1SchemaFileName = draft.file1SchemaFileName.trim()
  if (draft.file2SystemLabel?.trim()) historyDraft.file2SystemLabel = draft.file2SystemLabel.trim()
  if (draft.file2JsonSchemaId?.trim()) historyDraft.file2JsonSchemaId = draft.file2JsonSchemaId.trim()
  if (draft.file2SchemaLabel?.trim()) historyDraft.file2SchemaLabel = draft.file2SchemaLabel.trim()
  if (draft.file2SchemaFileName?.trim()) historyDraft.file2SchemaFileName = draft.file2SchemaFileName.trim()
  if (draft.rules?.length) {
    historyDraft.rules = draft.rules.map((rule): HistoryState => {
      const preActions = normalizePreActions(rule.preActions)
      const historyRule: HistoryState = {
        ...(rule.ruleId?.trim() ? { ruleId: rule.ruleId.trim() } : {}),
        file1FieldPath: rule.file1FieldPath.trim(),
        file2FieldPath: rule.file2FieldPath.trim(),
        operator: rule.operator.trim() || '=',
        sequenceNum: rule.sequenceNum,
        ...(preActions.length
          ? { preActions: preActions.map((preAction): HistoryState => ({ fieldSide: preAction.fieldSide, action: preAction.action })) }
          : {}),
      }
      if (rule.ruleText?.trim()) historyRule.ruleText = rule.ruleText.trim()
      if (rule.ruleLogic?.trim()) historyRule.ruleLogic = rule.ruleLogic.trim()
      if (rule.ruleType?.trim()) historyRule.ruleType = rule.ruleType.trim()
      if (rule.expression?.trim()) historyRule.expression = rule.expression.trim()
      if (rule.enabled?.trim()) historyRule.enabled = rule.enabled.trim()
      if (rule.severity?.trim()) historyRule.severity = rule.severity.trim()
      return historyRule
    })
  }

  return {
    [RULESET_DRAFT_KEY]: historyDraft,
    ...(resumeStepId ? { [RULESET_DRAFT_RESUME_STEP_KEY]: resumeStepId } : {}),
  }
}

export function readReconciliationRuleSetDraftState(stateLike: unknown): ReconciliationRuleSetDraftState | null {
  if (!stateLike || typeof stateLike !== 'object') return null

  const stateRecord = stateLike as Record<string, unknown>
  const draft = readDraft(stateRecord[RULESET_DRAFT_KEY])
  if (!draft) return null

  const resumeStepId = normalizeString(stateRecord[RULESET_DRAFT_RESUME_STEP_KEY])
  return {
    draft,
    resumeStepId: resumeStepId === 'ruleset-manager' ? 'ruleset-manager' : null,
  }
}

export function buildCreateRuleSetRunPayload(draft: ReconciliationRuleSetDraft): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    runName: draft.runName.trim(),
    description: draft.description?.trim() || undefined,
    file1SystemEnumId: draft.file1SystemEnumId,
    file1FileTypeEnumId: draft.file1FileTypeEnumId,
    file1SchemaFileName: normalizeString(draft.file1SchemaFileName) ?? undefined,
    file1PrimaryIdExpression: draft.file1PrimaryIdExpression.trim(),
    file2SystemEnumId: draft.file2SystemEnumId,
    file2FileTypeEnumId: draft.file2FileTypeEnumId,
    file2SchemaFileName: normalizeString(draft.file2SchemaFileName) ?? undefined,
    file2PrimaryIdExpression: draft.file2PrimaryIdExpression.trim(),
  }
  const rules = buildRuleSetRulePayloads(draft)
  if (rules.length) payload.rules = rules
  return payload
}

export function buildSaveRuleSetRunPayload(draft: ReconciliationRuleSetDraft): Record<string, unknown> {
  return {
    ...buildCreateRuleSetRunPayload(draft),
    savedRunId: draft.savedRunId?.trim(),
    rules: buildRuleSetRulePayloads(draft),
  }
}

export function buildRuleSetRulePayloads(draft: ReconciliationRuleSetDraft): Record<string, unknown>[] {
  return [...(draft.rules ?? [])]
    .filter((rule) => rule.sequenceNum > 0 && rule.file1FieldPath.trim() && rule.file2FieldPath.trim())
    .sort((left, right) => left.sequenceNum - right.sequenceNum)
    .map((rule, index) => {
      const operator = normalizeRuleOperator(rule.operator)
      const preActions = normalizePreActions(rule.preActions)
      const expression = {
        type: 'FIELD_COMPARISON',
        file1FieldPath: rule.file1FieldPath.trim(),
        file2FieldPath: rule.file2FieldPath.trim(),
        operator,
        ...(preActions.length ? { preActions } : {}),
      }

      return {
        ...(rule.ruleId?.trim() ? { ruleId: rule.ruleId.trim() } : {}),
        sequenceNum: rule.sequenceNum,
        ruleText: `${formatFieldKey(rule.file1FieldPath)} ${operator} ${formatFieldKey(rule.file2FieldPath)}`,
        ruleLogic: buildFieldComparisonRuleLogic(draft, rule, operator, preActions, index),
        ruleType: 'FIELD_COMPARISON',
        expression: JSON.stringify(expression),
        enabled: rule.enabled?.trim() || 'Y',
        severity: rule.severity?.trim() || 'WARN',
      }
    })
}

function normalizeRuleOperator(operator: string | undefined): string {
  const normalized = operator?.trim()
  return normalized && ['=', '==', '!=', '>', '<', '>=', '<='].includes(normalized) ? normalized : '='
}

function buildFieldComparisonRuleLogic(
  draft: ReconciliationRuleSetDraft,
  rule: ReconciliationRuleSetDraftRule,
  operator: string,
  preActions: ReconciliationRulePreActionEntry[],
  index: number,
): string {
  const ruleName = rule.ruleId?.trim() || `FIELD_COMPARISON_${index + 1}`
  const file1Path = fieldPathRelativeToPrimary(rule.file1FieldPath, draft.file1PrimaryIdExpression)
  const file2Path = fieldPathRelativeToPrimary(rule.file2FieldPath, draft.file2PrimaryIdExpression)
  const file1RawValueExpression = buildDrlMapAccess('$m.get("file1")', file1Path)
  const file2RawValueExpression = buildDrlMapAccess('$m.get("file2")', file2Path)
  const file1ValueExpression = buildPreActionValueExpression(file1RawValueExpression, preActionNamesForSide(preActions, 'file1'))
  const file2ValueExpression = buildPreActionValueExpression(file2RawValueExpression, preActionNamesForSide(preActions, 'file2'))
  const violationExpression = buildViolationExpression(file1ValueExpression, file2ValueExpression, operator, preActions.length > 0)
  const fieldLabel = `${formatFieldKey(rule.file1FieldPath)} ${operator} ${formatFieldKey(rule.file2FieldPath)}`
  const severity = rule.severity?.trim() || 'WARN'

  return `rule "${escapeDrlString(ruleName)}"
when
    $m : Map(this["file1"] != null, this["file2"] != null)
    eval(${violationExpression})
then
    Object _file1Value = ${file1ValueExpression};
    Object _file2Value = ${file2ValueExpression};
    reconciliation.rule.RuleDiffSupport.addFieldMismatch(
        $m,
        kcontext.getRule().getName(),
        "${escapeDrlString(fieldLabel)}",
        _file1Value,
        _file2Value,
        "${escapeDrlString(severity)}",
        "Field comparison failed: ${escapeDrlString(fieldLabel)}"
    );
end`
}

function preActionNamesForSide(
  preActions: ReconciliationRulePreActionEntry[],
  fieldSide: ReconciliationRulePreActionFieldSide,
): ReconciliationRulePreAction[] {
  return preActions
    .filter((preAction) => preAction.fieldSide === fieldSide)
    .map((preAction) => preAction.action)
}

function buildPreActionValueExpression(valueExpression: string, preActions: ReconciliationRulePreAction[]): string {
  if (!preActions.length) return valueExpression

  const drlPreActions = preActions.map((preAction) => `"${escapeDrlString(preAction)}"`).join(', ')
  return `reconciliation.rule.RuleDiffSupport.applyPreActions(${valueExpression}, java.util.Arrays.asList(${drlPreActions}))`
}

function buildDrlMapAccess(rootExpression: string, fieldPath: string): string {
  return pathSegments(fieldPath).reduce((expression, segment) => (
    `((Map) ${expression}).get("${escapeDrlString(segment)}")`
  ), rootExpression)
}

function pathSegments(fieldPath: string): string[] {
  return stripRootPrefix(fieldPath)
    .replace(/\[['"]?([A-Za-z_$][\w$-]*)['"]?\]/g, '.$1')
    .replace(/\[(\d+)\]/g, '.$1')
    .replace(/\[\*\]/g, '')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
}

function buildViolationExpression(file1ValueExpression: string, file2ValueExpression: string, operator: string, useRuleDiffSupport = false): string {
  if (useRuleDiffSupport || ['>', '<', '>=', '<='].includes(operator)) {
    return `reconciliation.rule.RuleDiffSupport.violatesOperator(${file1ValueExpression}, ${file2ValueExpression}, "${escapeDrlString(operator)}")`
  }

  switch (operator) {
    case '!=':
      return `java.util.Objects.equals(${file1ValueExpression}, ${file2ValueExpression})`
    case '=':
    case '==':
    default:
      return `!java.util.Objects.equals(${file1ValueExpression}, ${file2ValueExpression})`
  }
}

function normalizeFieldPathForRule(fieldPath: string | undefined): string {
  const trimmed = fieldPath?.trim()
  if (!trimmed) return ''

  const expression = trimmed.split('|', 1)[0] ?? ''
  return expression
    .trim()
    .replace(/\[(\d+)\]/g, '[*]')
    .replace('.[*]', '[*]')
}

function fieldPathRelativeToPrimary(fieldPath: string, primaryExpression: string): string {
  const normalizedField = normalizeFieldPathForRule(fieldPath)
  const normalizedPrimary = normalizeFieldPathForRule(primaryExpression)
  if (!normalizedField) return ''

  const starIndex = normalizedPrimary.indexOf('[*]')
  if (starIndex >= 0) {
    const recordPrefix = normalizedPrimary.slice(0, starIndex + 3)
    const prefixWithDot = `${recordPrefix}.`
    if (normalizedField.startsWith(prefixWithDot)) return stripRootPrefix(normalizedField.slice(prefixWithDot.length))
  }

  return stripRootPrefix(normalizedField)
}

function stripRootPrefix(fieldPath: string): string {
  return fieldPath
    .replace(/^\$\[\*\]\.?/, '')
    .replace(/^\$\./, '')
    .replace(/^\$/, '')
    .replace(/^\./, '')
}

function formatFieldKey(fieldPath: string | undefined): string {
  const normalized = normalizeFieldPathForRule(fieldPath)
  if (!normalized) return 'Field pending'

  const pathSegments = stripRootPrefix(normalized)
    .replace(/\[['"]?([A-Za-z_$][\w$-]*)['"]?\]/g, '.$1')
    .replace(/\[\*\]/g, '')
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '$')

  return pathSegments.at(-1) || normalized
}

function escapeDrlString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ')
}
