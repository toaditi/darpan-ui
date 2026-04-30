import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import {
  buildReconciliationRuleSetDraftState,
  type ReconciliationRuleSetDraftRule,
} from '../../../lib/reconciliationRuleSetDraft'
import { buildWorkflowOriginState } from '../../../lib/workflowOrigin'

const getJsonSchema = vi.hoisted(() => vi.fn())
const deleteSavedRun = vi.hoisted(() => vi.fn())
const routerPush = vi.hoisted(() => vi.fn())
const route = vi.hoisted(() => ({
  fullPath: '/reconciliation/ruleset-manager',
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    name: 'RouterLink',
    props: ['to'],
    template: '<a :data-to="typeof to === \'string\' ? to : JSON.stringify(to)" v-bind="$attrs"><slot /></a>',
  },
  useRouter: () => ({
    push: routerPush,
  }),
  useRoute: () => route,
}))

vi.mock('../../../lib/api/facade', () => ({
  jsonSchemaFacade: {
    get: getJsonSchema,
  },
  reconciliationFacade: {
    deleteSavedRun,
  },
}))

import ReconciliationRuleSetManagerPage from '../ReconciliationRuleSetManagerPage.vue'

function createDraftState() {
  return buildReconciliationRuleSetDraftState(
    {
      savedRunId: 'RS_JSON_ORDER_COMPARE',
      runName: 'JSON Order Compare',
      file1SystemEnumId: 'OMS',
      file1SystemLabel: 'OMS',
      file1FileTypeEnumId: 'DftJson',
      file1JsonSchemaId: 'schema-oms-orders',
      file1SchemaFileName: 'test-oms-orders.schema.json',
      file1PrimaryIdExpression: '$.orders[0].order_id',
      file2SystemEnumId: 'SHOPIFY',
      file2SystemLabel: 'SHOPIFY',
      file2FileTypeEnumId: 'DftJson',
      file2JsonSchemaId: 'schema-shopify-orders',
      file2SchemaFileName: 'test-shopify-orders.schema.json',
      file2PrimaryIdExpression: '$.data.orders.edges[0].node.id',
    },
    'ruleset-manager',
  )
}

function createSavedRunReopenDraftState(rules: ReconciliationRuleSetDraftRule[] = []) {
  return buildReconciliationRuleSetDraftState(
    {
      savedRunId: 'RS_ORDER_SYNC',
      runName: 'Order Sync',
      file1SystemEnumId: 'SHOPIFY',
      file1SystemLabel: 'SHOPIFY',
      file1FileTypeEnumId: 'DftJson',
      file1SchemaFileName: 'orders-reconciliation-prod-2026-03-01-to-2026-03-31-2026-04-09-04-55-22',
      file1PrimaryIdExpression: '$.orders[*].legacyResourceId',
      file2SystemEnumId: 'OMS',
      file2SystemLabel: 'OMS',
      file2FileTypeEnumId: 'DftJson',
      file2SchemaFileName: 'Krewe OMS Orders (1)',
      file2PrimaryIdExpression: '$[*].shopify_order_id',
      rules,
    },
    'ruleset-manager',
  )
}

describe('ReconciliationRuleSetManagerPage', () => {
  beforeEach(() => {
    getJsonSchema.mockReset()
    deleteSavedRun.mockReset()
    routerPush.mockReset()
    window.history.replaceState({}, '', '/reconciliation/ruleset-manager')

    getJsonSchema.mockImplementation(async ({ jsonSchemaId, schemaName }: { jsonSchemaId?: string, schemaName?: string }) => {
      if (jsonSchemaId === 'schema-oms-orders') {
        return {
          ok: true,
          messages: [],
          errors: [],
          schemaData: {
            jsonSchemaId,
            schemaName: 'test-oms-orders.schema.json',
            description: 'OMS orders',
            systemEnumId: 'OMS',
            systemLabel: 'OMS',
            schemaText: '{}',
          },
        }
      }

      if (schemaName === 'orders-reconciliation-prod-2026-03-01-to-2026-03-31-2026-04-09-04-55-22') {
        return {
          ok: true,
          messages: [],
          errors: [],
          schemaData: {
            jsonSchemaId: 'schema-shopify-orders',
            schemaName,
            description: 'Shopify Orders',
            systemEnumId: 'SHOPIFY',
            systemLabel: 'SHOPIFY',
            schemaText: '{}',
          },
        }
      }

      if (schemaName === 'Krewe OMS Orders (1)') {
        return {
          ok: true,
          messages: [],
          errors: [],
          schemaData: {
            jsonSchemaId: 'schema-krewe-oms-orders',
            schemaName,
            description: 'Krewe OMS Orders',
            systemEnumId: 'OMS',
            systemLabel: 'OMS',
            schemaText: '{}',
          },
        }
      }

      return {
        ok: true,
        messages: [],
        errors: [],
        schemaData: {
          jsonSchemaId,
          schemaName: 'test-shopify-orders.schema.json',
          description: 'Shopify orders',
          systemEnumId: 'SHOPIFY',
          systemLabel: 'SHOPIFY',
          schemaText: '{}',
        },
      }
    })

  })

  it('renders the draft-backed run summary and static equation', async () => {
    window.history.replaceState(
      {
        ...buildWorkflowOriginState('Run Editor', '/settings/runs'),
        ...createDraftState(),
      },
      '',
      '/reconciliation/ruleset-manager',
    )

    const wrapper = mount(ReconciliationRuleSetManagerPage)
    await flushPromises()

    expect(wrapper.text()).toContain('JSON Order Compare')
    expect(wrapper.get('.ruleset-manager-hero h1').text()).toBe('JSON Order Compare')
    expect(wrapper.text()).not.toContain('RuleSet Manager')
    expect(wrapper.text()).toContain('Rules')
    expect(wrapper.text()).not.toContain('Rule Builder')
    expect(wrapper.text()).toContain('Run')
    const sectionHeaders = wrapper.findAll('.ruleset-manager-section-header')
    expect(sectionHeaders).toHaveLength(2)
    expect(sectionHeaders[0]?.find('.static-page-section-heading').text()).toBe('Run')
    expect(sectionHeaders[0]?.find('[data-testid="ruleset-manager-edit-run"]').exists()).toBe(true)
    expect(sectionHeaders[0]?.find('[data-testid="ruleset-manager-edit-run"] svg').exists()).toBe(true)
    expect(sectionHeaders[0]?.find('[data-testid="ruleset-manager-edit-run"]').classes()).not.toContain('app-icon-action--large')
    expect(sectionHeaders[0]?.find('[data-testid="ruleset-manager-edit-run"]').classes()).toContain('ruleset-manager-section-edit')
    expect(sectionHeaders[0]?.findAll('[data-testid="ruleset-manager-edit-run"] .ruleset-manager-edit-icon-path')).toHaveLength(1)
    expect(sectionHeaders[0]?.find('[data-testid="ruleset-manager-edit-run"] .ruleset-manager-edit-icon-path').attributes('fill')).toBeUndefined()
    expect(sectionHeaders[1]?.find('.static-page-section-heading').text()).toBe('Rules')
    expect(sectionHeaders[1]?.find('[data-testid="ruleset-manager-edit-rules"]').exists()).toBe(true)
    expect(sectionHeaders[1]?.find('[data-testid="ruleset-manager-edit-rules"] svg').exists()).toBe(true)
    expect(sectionHeaders[1]?.find('[data-testid="ruleset-manager-edit-rules"]').classes()).not.toContain('app-icon-action--large')
    expect(sectionHeaders[1]?.find('[data-testid="ruleset-manager-edit-rules"]').classes()).toContain('ruleset-manager-section-edit')
    expect(sectionHeaders[1]?.findAll('[data-testid="ruleset-manager-edit-rules"] .ruleset-manager-edit-icon-path')).toHaveLength(1)
    expect(sectionHeaders[1]?.find('[data-testid="ruleset-manager-edit-rules"] .ruleset-manager-edit-icon-path').attributes('fill')).toBeUndefined()
    expect(wrapper.get('[data-testid="ruleset-manager-edit-run"]').attributes('aria-label')).toBe('Edit Run')
    expect(wrapper.get('[data-testid="ruleset-manager-edit-rules"]').attributes('aria-label')).toBe('Edit Rules')
    expect(wrapper.text()).toContain('OMS')
    expect(wrapper.text()).toContain('SHOPIFY')
    expect(wrapper.text()).toContain('OMS orders')
    expect(wrapper.text()).toContain('Shopify orders')
    expect(wrapper.text()).not.toContain('OMS orders - OMS - Primary ID')
    expect(wrapper.text()).not.toContain('Shopify orders - SHOPIFY - Primary ID')
    const schemaRows = wrapper.findAll('.ruleset-manager-schema-row')
    expect(schemaRows).toHaveLength(2)
    expect(schemaRows[0]?.text()).toContain('System')
    expect(schemaRows[0]?.text()).toContain('Schema')
    expect(schemaRows[0]?.text()).toContain('Primary ID')
    expect(schemaRows[0]?.text()).toContain('OMS')
    expect(schemaRows[0]?.text()).toContain('OMS orders')
    expect(schemaRows[0]?.text()).toContain('order_id')
    expect(schemaRows[0]?.text()).not.toContain('$.orders[0].order_id')
    expect(schemaRows[0]?.text()).not.toContain('SHOPIFY')
    expect(schemaRows[0]?.text()).not.toContain('Shopify orders')
    expect(schemaRows[1]?.text()).toContain('System')
    expect(schemaRows[1]?.text()).toContain('Schema')
    expect(schemaRows[1]?.text()).toContain('Primary ID')
    expect(schemaRows[1]?.text()).toContain('SHOPIFY')
    expect(schemaRows[1]?.text()).toContain('Shopify orders')
    expect(schemaRows[1]?.text()).toContain('id')
    expect(schemaRows[1]?.text()).not.toContain('$.data.orders.edges[0].node.id')
    expect(schemaRows[1]?.text()).not.toContain('OMS orders')
    const basicCards = wrapper.findAll('.ruleset-manager-basic-card')
    expect(basicCards).toHaveLength(6)
    expect(basicCards[0]?.text()).toContain('System')
    expect(basicCards[0]?.text()).toContain('OMS')
    expect(basicCards[1]?.text()).toContain('Schema')
    expect(basicCards[1]?.text()).not.toContain('Schema 1')
    expect(basicCards[1]?.text()).not.toContain('File 1')
    expect(basicCards[1]?.text()).toContain('OMS orders')
    expect(basicCards[2]?.text()).toContain('Primary ID')
    expect(basicCards[2]?.text()).not.toContain('Schema 2')
    expect(basicCards[2]?.text()).not.toContain('File 2')
    expect(basicCards[2]?.text()).toContain('order_id')
    expect(basicCards[2]?.text()).not.toContain('$.orders[0].order_id')
    expect(basicCards[3]?.text()).toContain('System')
    expect(basicCards[3]?.text()).toContain('SHOPIFY')
    expect(basicCards[4]?.text()).toContain('Schema')
    expect(basicCards[4]?.text()).toContain('Shopify orders')
    expect(basicCards[5]?.text()).toContain('Primary ID')
    expect(basicCards[5]?.text()).toContain('id')
    expect(basicCards[5]?.text()).not.toContain('$.data.orders.edges[0].node.id')
    expect(wrapper.text()).not.toContain('Run Basics')
    expect(wrapper.find('.ruleset-manager-basics-grid').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('test-oms-orders.schema.json')
    expect(wrapper.text()).not.toContain('test-shopify-orders.schema.json')
    expect(wrapper.find('.ruleset-manager-field-grid').exists()).toBe(false)
    expect(wrapper.find('.ruleset-manager-source').exists()).toBe(false)
    expect(wrapper.find('.ruleset-manager-comparison-side').exists()).toBe(false)
    expect(wrapper.find('.ruleset-manager-operator').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ruleset-manager-operator-equals"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="ruleset-manager-preview"]').text()).toContain('order_id = id')
    expect(wrapper.get('[data-testid="ruleset-manager-rule-list"]').text()).toContain('#0')
    expect(wrapper.get('[data-testid="ruleset-manager-preview"]').text()).not.toContain('$.orders[0].order_id')
    expect(wrapper.get('[data-testid="ruleset-manager-preview"]').text()).not.toContain('$.data.orders.edges[0].node.id')
    expect(wrapper.find('[data-testid="ruleset-manager-normalizer-note"]').exists()).toBe(false)
    const runButton = wrapper.get('[data-testid="ruleset-manager-run-ruleset"]')
    expect(runButton.attributes('aria-label')).toBe('Run ruleset')
    expect(runButton.classes()).toContain('app-icon-action')
    expect(runButton.classes()).toContain('app-icon-action--large')
    expect(runButton.classes()).not.toContain('app-icon-action--danger')
    expect(runButton.element.closest('.ruleset-manager-footer-row')).not.toBeNull()
    expect(runButton.element.closest('.static-page-actions')).not.toBeNull()
    expect(runButton.element.closest('.static-page-board')).toBeNull()
    expect(runButton.get('path').attributes('fill')).toBe('currentColor')
    expect(runButton.get('path').attributes('transform')).toBe('translate(0 1.5)')
    const deleteButton = wrapper.get('[data-testid="ruleset-manager-delete-run"]')
    expect(deleteButton.attributes('aria-label')).toBe('Delete run')
    expect(deleteButton.classes()).toContain('app-icon-action')
    expect(deleteButton.classes()).toContain('app-icon-action--large')
    expect(deleteButton.classes()).toContain('app-icon-action--danger')
    expect(deleteButton.element.closest('.ruleset-manager-footer-row')).not.toBeNull()
    expect(deleteButton.element.closest('.static-page-actions')).not.toBeNull()
    expect(deleteButton.element.closest('.static-page-board')).toBeNull()
    expect(deleteButton.get('path').attributes('transform')).toBe('translate(0 0.75)')
    expect(wrapper.findAll('.ruleset-manager-footer-row button').map((button) => button.attributes('data-testid'))).toEqual([
      'ruleset-manager-run-ruleset',
      'ruleset-manager-delete-run',
    ])
  })

  it('renders a saved run summary and equation without editable rule controls', async () => {
    window.history.replaceState(
      {
        ...buildWorkflowOriginState('Run Editor', '/settings/runs'),
        ...createSavedRunReopenDraftState(),
      },
      '',
      '/reconciliation/ruleset-manager',
    )

    const wrapper = mount(ReconciliationRuleSetManagerPage)
    await flushPromises()

    expect(getJsonSchema).toHaveBeenCalledWith({ schemaName: 'orders-reconciliation-prod-2026-03-01-to-2026-03-31-2026-04-09-04-55-22' })
    expect(getJsonSchema).toHaveBeenCalledWith({ schemaName: 'Krewe OMS Orders (1)' })
    expect(wrapper.get('[data-testid="ruleset-manager-preview"]').text()).toContain('legacyResourceId = shopify_order_id')
    expect(wrapper.get('[data-testid="ruleset-manager-rule-list"]').text()).toContain('#0')
    expect(wrapper.get('[data-testid="ruleset-manager-preview"]').text()).not.toContain('$.orders[*].legacyResourceId')
    expect(wrapper.get('[data-testid="ruleset-manager-preview"]').text()).not.toContain('$[*].shopify_order_id')
    expect(wrapper.find('.ruleset-manager-basics-grid').exists()).toBe(true)
    expect(wrapper.findAll('.ruleset-manager-schema-row')).toHaveLength(2)
    expect(wrapper.findAll('.ruleset-manager-basic-card')).toHaveLength(6)
    expect(wrapper.find('.ruleset-manager-comparison-side').exists()).toBe(false)
    expect(wrapper.find('.ruleset-manager-operator').exists()).toBe(false)
    expect(wrapper.text()).toContain('Shopify Orders')
    expect(wrapper.text()).toContain('Krewe OMS Orders')
    expect(wrapper.text()).not.toContain('Shopify Orders - SHOPIFY - Primary ID')
    expect(wrapper.text()).not.toContain('Krewe OMS Orders - OMS - Primary ID')
    expect(wrapper.text()).not.toContain('orders-reconciliation-prod-2026-03-01-to-2026-03-31-2026-04-09-04-55-22')
  })

  it('renders persisted rules from the rules editor draft and keeps the basic diff visible', async () => {
    window.history.replaceState(
      {
        ...buildWorkflowOriginState('Run Editor', '/settings/runs'),
        ...createSavedRunReopenDraftState([
          {
            ruleId: 'basic-diff',
            file1FieldPath: '$.orders[*].legacyResourceId',
            file2FieldPath: '$[*].shopify_order_id',
            operator: '=',
            sequenceNum: 0,
          },
          {
            ruleId: 'RS_ORDER_SYNC_RULE_1',
            file1FieldPath: '$.orders[*].legacyResourceId',
            file2FieldPath: '$[*].order_name',
            operator: '=',
            sequenceNum: 1,
          },
        ]),
      },
      '',
      '/reconciliation/ruleset-manager',
    )

    const wrapper = mount(ReconciliationRuleSetManagerPage)
    await flushPromises()

    expect(wrapper.get('[data-testid="ruleset-manager-rule-list"]').text()).toContain('#0')
    expect(wrapper.get('[data-testid="ruleset-manager-rule-list"]').text()).toContain('legacyResourceId = shopify_order_id')
    expect(wrapper.get('[data-testid="ruleset-manager-rule-list"]').text()).toContain('#1')
    expect(wrapper.get('[data-testid="ruleset-manager-rule-list"]').text()).toContain('legacyResourceId = order_name')
    expect(wrapper.get('[data-testid="ruleset-manager-preview"]').text()).not.toContain('basic-diff')
  })

  it('opens the run edit workflow from the Run section without sending rule state', async () => {
    window.history.replaceState(
      {
        ...buildWorkflowOriginState('Run Editor', '/settings/runs'),
        ...createSavedRunReopenDraftState(),
      },
      '',
      '/reconciliation/ruleset-manager',
    )

    const wrapper = mount(ReconciliationRuleSetManagerPage)
    await flushPromises()

    await wrapper.get('[data-testid="ruleset-manager-edit-run"]').trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith({
      name: 'settings-runs-edit',
      params: { reconciliationMappingId: 'RS_ORDER_SYNC' },
      state: expect.objectContaining({
        workflowOriginLabel: 'Run Details',
        workflowOriginPath: '/reconciliation/ruleset-manager',
        workflowOriginRouteState: expect.objectContaining({
          reconciliationRuleSetDraft: expect.objectContaining({
            savedRunId: 'RS_ORDER_SYNC',
            runName: 'Order Sync',
          }),
        }),
        reconciliationRuleSetDraft: expect.objectContaining({
          savedRunId: 'RS_ORDER_SYNC',
          runName: 'Order Sync',
          file1SystemEnumId: 'SHOPIFY',
          file2SystemEnumId: 'OMS',
        }),
      }),
    })
    expect(routerPush.mock.calls.at(-1)?.[0].state).not.toHaveProperty('rules')
  })

  it('opens the rules edit workflow from the Rules section', async () => {
    const rules = [
      {
        ruleId: 'RS_ORDER_SYNC_RULE_1',
        file1FieldPath: '$.orders[*].legacyResourceId',
        file2FieldPath: '$[*].order_name',
        operator: '=',
        sequenceNum: 1,
      },
    ]
    window.history.replaceState(
      {
        ...buildWorkflowOriginState('Run Editor', '/settings/runs'),
        ...createSavedRunReopenDraftState(rules),
      },
      '',
      '/reconciliation/ruleset-manager',
    )

    const wrapper = mount(ReconciliationRuleSetManagerPage)
    await flushPromises()

    await wrapper.get('[data-testid="ruleset-manager-edit-rules"]').trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith({
      name: 'reconciliation-ruleset-editor',
      state: expect.objectContaining({
        workflowOriginLabel: 'Run Details',
        workflowOriginPath: '/reconciliation/ruleset-manager',
        workflowOriginRouteState: expect.objectContaining({
          reconciliationRuleSetDraft: expect.objectContaining({
            savedRunId: 'RS_ORDER_SYNC',
            runName: 'Order Sync',
          }),
        }),
        reconciliationRuleSetDraft: expect.objectContaining({
          savedRunId: 'RS_ORDER_SYNC',
          runName: 'Order Sync',
          file1SystemEnumId: 'SHOPIFY',
          file2SystemEnumId: 'OMS',
          rules: [
            expect.objectContaining({
              ruleId: 'RS_ORDER_SYNC_RULE_1',
              file1FieldPath: '$.orders[*].legacyResourceId',
              file2FieldPath: '$[*].order_name',
            }),
          ],
        }),
      }),
    })
  })

  it('opens the reconciliation run workflow from the bottom play action', async () => {
    window.history.replaceState(
      {
        ...buildWorkflowOriginState('Run Editor', '/settings/runs'),
        ...createSavedRunReopenDraftState(),
      },
      '',
      '/reconciliation/ruleset-manager',
    )

    const wrapper = mount(ReconciliationRuleSetManagerPage)
    await flushPromises()

    await wrapper.get('[data-testid="ruleset-manager-run-ruleset"]').trigger('click')
    await flushPromises()

    expect(routerPush).toHaveBeenCalledWith({
      name: 'reconciliation-diff',
      query: {
        savedRunId: 'RS_ORDER_SYNC',
        runName: 'Order Sync',
        file1SystemLabel: 'SHOPIFY',
        file2SystemLabel: 'OMS',
      },
      state: expect.objectContaining({
        workflowOriginLabel: 'Run Details',
        workflowOriginPath: '/reconciliation/ruleset-manager',
      }),
    })
  })

  it('does not offer residual actions from the manager edit surface', async () => {
    window.history.replaceState(
      {
        ...buildWorkflowOriginState('Run Editor', '/settings/runs'),
        ...createDraftState(),
      },
      '',
      '/reconciliation/ruleset-manager',
    )

    const wrapper = mount(ReconciliationRuleSetManagerPage)
    await flushPromises()

    expect(wrapper.text()).not.toContain('Create Basic Diff Run')
    expect(wrapper.text()).not.toContain('Back to Run Editor')
    expect(wrapper.find('.ruleset-manager-actions').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ruleset-manager-back"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="ruleset-manager-create"]').exists()).toBe(false)
  })

  it('deletes a saved run from the bottom trash action after confirmation', async () => {
    window.history.replaceState(
      {
        ...buildWorkflowOriginState('Run Editor', '/settings/runs'),
        ...createSavedRunReopenDraftState(),
      },
      '',
      '/reconciliation/ruleset-manager',
    )
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    deleteSavedRun.mockResolvedValue({
      ok: true,
      messages: ['Deleted saved run RS_ORDER_SYNC.'],
      errors: [],
      deleted: true,
      deletedSavedRunId: 'RS_ORDER_SYNC',
    })

    const wrapper = mount(ReconciliationRuleSetManagerPage)
    await flushPromises()

    await wrapper.get('[data-testid="ruleset-manager-delete-run"]').trigger('click')
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalledWith('Delete run "Order Sync"?')
    expect(deleteSavedRun).toHaveBeenCalledWith({ savedRunId: 'RS_ORDER_SYNC' })
    expect(routerPush).toHaveBeenCalledWith('/settings/runs')

    confirmSpy.mockRestore()
  })

  it('shows an empty state when there is no draft in history state', async () => {
    const wrapper = mount(ReconciliationRuleSetManagerPage)
    await flushPromises()

    expect(wrapper.text()).toContain('No run basics defined yet')
    expect(wrapper.text()).toContain('Go to Run Setup')
    expect(wrapper.find('[data-testid="ruleset-manager-create"]').exists()).toBe(false)
  })
})
