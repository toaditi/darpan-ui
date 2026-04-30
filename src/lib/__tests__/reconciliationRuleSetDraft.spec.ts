import { describe, expect, it } from 'vitest'
import {
  buildReconciliationRuleSetDraftState,
  buildRuleSetRulePayloads,
  readReconciliationRuleSetDraftState,
  type ReconciliationRuleSetDraft,
} from '../reconciliationRuleSetDraft'

function createDraft(overrides: Partial<ReconciliationRuleSetDraft> = {}): ReconciliationRuleSetDraft {
  return {
    savedRunId: 'RS_JSON_ORDER_COMPARE',
    runName: 'JSON Order Compare',
    file1SystemEnumId: 'OMS',
    file1FileTypeEnumId: 'DftJson',
    file1PrimaryIdExpression: '$.orders[*].order_id',
    file2SystemEnumId: 'SHOPIFY',
    file2FileTypeEnumId: 'DftJson',
    file2PrimaryIdExpression: '$[*].shopify_order_id',
    ...overrides,
  }
}

describe('reconciliationRuleSetDraft', () => {
  it('serializes rule pre-actions into expression JSON and applies them before operator comparison', () => {
    const [rule] = buildRuleSetRulePayloads(createDraft({
      rules: [
        {
          file1FieldPath: '$.orders[*].totalQuantity',
          file2FieldPath: '$[*].quantity',
          operator: '>',
          sequenceNum: 1,
          preActions: [
            { fieldSide: 'file1', action: 'STRING_TO_INT' },
            { fieldSide: 'file2', action: 'STRING_TO_NUMBER' },
          ],
        },
      ],
    }))
    expect(rule).toBeDefined()
    if (!rule) throw new Error('Expected a generated rule payload')

    expect(JSON.parse(rule.expression as string)).toEqual({
      type: 'FIELD_COMPARISON',
      file1FieldPath: '$.orders[*].totalQuantity',
      file2FieldPath: '$[*].quantity',
      operator: '>',
      preActions: [
        { fieldSide: 'file1', action: 'STRING_TO_INT' },
        { fieldSide: 'file2', action: 'STRING_TO_NUMBER' },
      ],
    })
    expect(rule.ruleText).toBe('totalQuantity > quantity')
    expect(rule.ruleLogic).toContain('RuleDiffSupport.applyPreActions')
    expect(rule.ruleLogic).toContain('RuleDiffSupport.violatesOperator')
    expect(rule.ruleLogic).toContain('"STRING_TO_INT"')
    expect(rule.ruleLogic).toContain('"STRING_TO_NUMBER"')
    expect(rule.ruleLogic).not.toContain('String.valueOf')
  })

  it('uses RuleDiffSupport for ordered comparisons even without pre-actions', () => {
    const [rule] = buildRuleSetRulePayloads(createDraft({
      rules: [
        {
          file1FieldPath: '$.orders[*].totalQuantity',
          file2FieldPath: '$[*].quantity',
          operator: '>',
          sequenceNum: 1,
        },
      ],
    }))
    expect(rule).toBeDefined()
    if (!rule) throw new Error('Expected a generated rule payload')

    expect(rule.ruleLogic).toContain('RuleDiffSupport.violatesOperator')
    expect(rule.ruleLogic).not.toContain('String.valueOf')
  })

  it('round-trips rule metadata through history state', () => {
    const state = buildReconciliationRuleSetDraftState(createDraft({
      rules: [
        {
          ruleId: 'quantity-check',
          file1FieldPath: '$.orders[*].totalQuantity',
          file2FieldPath: '$[*].quantity',
          operator: '>',
          sequenceNum: 1,
          enabled: 'N',
          severity: 'ERROR',
          ruleType: 'FIELD_COMPARISON',
          ruleText: 'totalQuantity > quantity',
          ruleLogic: 'rule "quantity-check"',
          expression: JSON.stringify({ type: 'FIELD_COMPARISON' }),
        },
      ],
    }))

    const restored = readReconciliationRuleSetDraftState(state)

    expect(restored?.draft.rules?.[0]).toMatchObject({
      ruleId: 'quantity-check',
      enabled: 'N',
      severity: 'ERROR',
      ruleType: 'FIELD_COMPARISON',
      ruleText: 'totalQuantity > quantity',
      ruleLogic: 'rule "quantity-check"',
      expression: JSON.stringify({ type: 'FIELD_COMPARISON' }),
    })
  })
})
