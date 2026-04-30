import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { buildReconciliationRuleSetDraftState } from '../../../lib/reconciliationRuleSetDraft'

const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const route = vi.hoisted(() => ({
  params: {
    reconciliationMappingId: 'OrderIdMap',
  },
}))
const listSchemas = vi.hoisted(() => vi.fn())
const flatten = vi.hoisted(() => vi.fn())
const getMapping = vi.hoisted(() => vi.fn())
const saveMapping = vi.hoisted(() => vi.fn())
const saveRuleSetRun = vi.hoisted(() => vi.fn())
const authState = vi.hoisted(() => ({
  sessionInfo: {
    userId: 'editor',
    canEditActiveTenantData: true,
    isSuperAdmin: false,
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => ({
    push,
  }),
}))

vi.mock('../../../lib/api/facade', () => ({
  jsonSchemaFacade: {
    list: listSchemas,
    flatten,
  },
  reconciliationFacade: {
    getMapping,
    saveMapping,
    saveRuleSetRun,
  },
}))

vi.mock('../../../lib/auth', () => ({
  useUiPermissions: () => ({
    get canEditTenantSettings() {
      return authState.sessionInfo.canEditActiveTenantData === true || authState.sessionInfo.isSuperAdmin === true
    },
    get canManageGlobalSettings() {
      return authState.sessionInfo.isSuperAdmin === true
    },
    get canViewTenantSettings() {
      return Boolean(authState.sessionInfo.userId)
    },
  }),
}))

import RunsSettingsWorkflowPage from '../RunsSettingsWorkflowPage.vue'

async function chooseAppSelectOption(
  wrapper: ReturnType<typeof mount>,
  testId: string,
  value: string,
): Promise<void> {
  await wrapper.get(`[data-testid="${testId}"]`).trigger('click')
  await wrapper.get(`[data-testid="app-select-option"][data-option-value="${value}"]`).trigger('click')
}

describe('RunsSettingsWorkflowPage', () => {
  beforeEach(() => {
    push.mockClear()
    route.params.reconciliationMappingId = 'OrderIdMap'
    listSchemas.mockReset()
    flatten.mockReset()
    getMapping.mockReset()
    saveMapping.mockReset()
    saveRuleSetRun.mockReset()
    authState.sessionInfo = {
      userId: 'editor',
      canEditActiveTenantData: true,
      isSuperAdmin: false,
    }
    window.history.replaceState(
      {
        workflowOriginLabel: 'Runs',
        workflowOriginPath: '/settings/runs',
      },
      '',
      '/settings/runs/edit/OrderIdMap',
    )

    listSchemas.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      schemas: [
        {
          jsonSchemaId: '100408',
          schemaName: 'Returns Feed',
          description: 'Return events exported from OMS.',
          systemEnumId: 'DarSysOms',
          systemLabel: 'OMS',
        },
        {
          jsonSchemaId: '100409',
          schemaName: 'Shopify Orders',
          description: 'Orders exported from Shopify.',
          systemEnumId: 'DarSysShopify',
          systemLabel: 'SHOPIFY',
        },
        {
          jsonSchemaId: '100411',
          schemaName: 'NetSuite Returns',
          description: 'Return events from NetSuite.',
          systemEnumId: 'DarSysNetsuite',
          systemLabel: 'NETSUITE',
        },
      ],
    })

    flatten.mockImplementation(({ jsonSchemaId }: { jsonSchemaId: string }) => {
      if (jsonSchemaId === '100408') {
        return Promise.resolve({
          ok: true,
          messages: [],
          errors: [],
          fieldList: [
            { fieldPath: '$.return_id', type: 'string', required: true },
            { fieldPath: '$.return_ref', type: 'string', required: false },
          ],
        })
      }

      if (jsonSchemaId === '100411') {
        return Promise.resolve({
          ok: true,
          messages: [],
          errors: [],
          fieldList: [
            { fieldPath: '$.return.externalId', type: 'string', required: true },
          ],
        })
      }

      return Promise.resolve({
        ok: true,
        messages: [],
        errors: [],
        fieldList: [
          { fieldPath: '$.id', type: 'string', required: true },
          { fieldPath: '$.legacyResourceId', type: 'string', required: false },
        ],
      })
    })

    getMapping.mockResolvedValue({
      ok: true,
      messages: [],
      errors: [],
      mapping: {
        reconciliationMappingId: 'OrderIdMap',
        mappingName: 'Order ID',
        members: [
          {
            mappingMemberId: 'OrderIdMap-1',
            systemEnumId: 'DarSysOms',
            systemLabel: 'OMS',
            jsonSchemaId: '100408',
            schemaName: 'Returns Feed',
            fieldPath: '$.return_id',
          },
          {
            mappingMemberId: 'OrderIdMap-2',
            systemEnumId: 'DarSysShopify',
            systemLabel: 'SHOPIFY',
            jsonSchemaId: '100409',
            schemaName: 'Shopify Orders',
            fieldPath: '$.id',
          },
        ],
      },
    })

    saveMapping.mockResolvedValue({
      ok: true,
      messages: ['Saved run Order Returns.'],
      errors: [],
      savedMapping: {
        reconciliationMappingId: 'OrderIdMap',
        mappingName: 'Order Returns',
        file1SystemEnumId: 'DarSysOms',
        file2SystemEnumId: 'DarSysNetsuite',
        file1SchemaName: 'Returns Feed',
        file2SchemaName: 'NetSuite Returns',
        file1FieldPath: '$.return_ref',
        file2FieldPath: '$.return.externalId',
      },
    })

    saveRuleSetRun.mockResolvedValue({
      ok: true,
      messages: ['Saved RuleSet run Order Sync Revised.'],
      errors: [],
      savedRun: {
        savedRunId: 'RS_ORDER_SYNC',
        runName: 'Order Sync Revised',
        description: 'Compares orders across systems.',
        runType: 'ruleset',
        ruleSetId: 'RS_ORDER_SYNC',
        compareScopeId: 'RS_ORDER_SYNC_SCOPE',
        requiresSystemSelection: false,
        defaultFile1SystemEnumId: 'DarSysOms',
        defaultFile2SystemEnumId: 'DarSysShopify',
        systemOptions: [],
      },
    })
  })

  it('loads an editable two-source run form and saves back to the runs settings page', async () => {
    const wrapper = mount(RunsSettingsWorkflowPage)
    await flushPromises()

    expect(wrapper.find('.workflow-page').exists()).toBe(true)
    expect(wrapper.find('.wizard-question-shell').classes()).toContain('workflow-form--compact')
    expect(wrapper.find('.wizard-question-shell').classes()).toContain('workflow-form--edit-single-page')
    expect(wrapper.find('input[name="mappingName"]').element).toHaveProperty('value', 'Order ID')
    expect(wrapper.text()).not.toContain('Source 1 system:')
    expect(wrapper.text()).not.toContain('Source 2 system:')
    expect(getMapping).toHaveBeenCalledWith({ reconciliationMappingId: 'OrderIdMap' })
    expect(flatten).toHaveBeenCalledWith({ jsonSchemaId: '100408' })
    expect(flatten).toHaveBeenCalledWith({ jsonSchemaId: '100409' })

    await wrapper.find('input[name="mappingName"]').setValue('Order Returns')
    await chooseAppSelectOption(wrapper, 'run-field-1', '$.return_ref')
    await chooseAppSelectOption(wrapper, 'run-schema-2', '100411')
    await flushPromises()
    await chooseAppSelectOption(wrapper, 'run-field-2', '$.return.externalId')
    await wrapper.get('[data-testid="save-run-settings"]').trigger('click')
    await flushPromises()

    expect(saveMapping).toHaveBeenCalledWith({
      reconciliationMappingId: 'OrderIdMap',
      mappingName: 'Order Returns',
      schema1Id: '100408',
      schema2Id: '100411',
      schema1FieldPath: '$.return_ref',
      schema2FieldPath: '$.return.externalId',
    })
    expect(push).toHaveBeenCalledWith('/settings/runs')
  })

  it('preselects stored source fields when the saved mapping uses legacy field expressions', async () => {
    getMapping.mockResolvedValueOnce({
      ok: true,
      messages: [],
      errors: [],
      mapping: {
        reconciliationMappingId: 'OrderIdMap',
        mappingName: 'Order ID',
        members: [
          {
            mappingMemberId: 'OrderIdMap-1',
            systemEnumId: 'DarSysOms',
            systemLabel: 'OMS',
            jsonSchemaId: '100408',
            schemaName: 'Returns Feed',
            fieldPath: 'return_id',
          },
          {
            mappingMemberId: 'OrderIdMap-2',
            systemEnumId: 'DarSysShopify',
            systemLabel: 'SHOPIFY',
            jsonSchemaId: '100409',
            schemaName: 'Shopify Orders',
            fieldPath: 'id',
          },
        ],
      },
    })

    const wrapper = mount(RunsSettingsWorkflowPage)
    await flushPromises()

    expect(wrapper.get('[data-testid="run-field-1"]').text()).toContain('$.return_id')
    expect(wrapper.get('[data-testid="run-field-2"]').text()).toContain('$.id')
  })

  it('loads a ruleset run draft and saves non-rule settings back to the run details page', async () => {
    route.params.reconciliationMappingId = 'RS_ORDER_SYNC'
    window.history.replaceState(
      {
        workflowOriginLabel: 'Run Details',
        workflowOriginPath: '/reconciliation/ruleset-manager',
        ...buildReconciliationRuleSetDraftState({
          savedRunId: 'RS_ORDER_SYNC',
          runName: 'Order Sync',
          description: 'Compares orders across systems.',
          file1SystemEnumId: 'DarSysOms',
          file1SystemLabel: 'OMS',
          file1FileTypeEnumId: 'DftJson',
          file1JsonSchemaId: '100408',
          file1SchemaFileName: 'Returns Feed',
          file1PrimaryIdExpression: '$.return_id',
          file2SystemEnumId: 'DarSysShopify',
          file2SystemLabel: 'SHOPIFY',
          file2FileTypeEnumId: 'DftJson',
          file2JsonSchemaId: '100409',
          file2SchemaFileName: 'Shopify Orders',
          file2PrimaryIdExpression: '$.id',
        }),
      },
      '',
      '/settings/runs/edit/RS_ORDER_SYNC',
    )

    const wrapper = mount(RunsSettingsWorkflowPage)
    await flushPromises()

    expect(getMapping).not.toHaveBeenCalled()
    expect(wrapper.find('input[name="mappingName"]').element).toHaveProperty('value', 'Order Sync')
    expect(wrapper.text()).not.toContain('Rules')

    await wrapper.find('input[name="mappingName"]').setValue('Order Sync Revised')
    await chooseAppSelectOption(wrapper, 'run-field-1', '$.return_ref')
    await wrapper.get('[data-testid="save-run-settings"]').trigger('click')
    await flushPromises()

    expect(saveRuleSetRun).toHaveBeenCalledWith({
      savedRunId: 'RS_ORDER_SYNC',
      runName: 'Order Sync Revised',
      description: 'Compares orders across systems.',
      file1SystemEnumId: 'DarSysOms',
      file1FileTypeEnumId: 'DftJson',
      file1SchemaFileName: 'Returns Feed',
      file1PrimaryIdExpression: '$.return_ref',
      file2SystemEnumId: 'DarSysShopify',
      file2FileTypeEnumId: 'DftJson',
      file2SchemaFileName: 'Shopify Orders',
      file2PrimaryIdExpression: '$.id',
    })
    expect(saveMapping).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({
      name: 'reconciliation-ruleset-manager',
      state: expect.objectContaining({
        reconciliationRuleSetDraft: expect.objectContaining({
          savedRunId: 'RS_ORDER_SYNC',
          runName: 'Order Sync Revised',
          file1PrimaryIdExpression: '$.return_ref',
          file2PrimaryIdExpression: '$.id',
        }),
        reconciliationRuleSetDraftResumeStepId: 'ruleset-manager',
      }),
    })
  })

  it('uses the schema label for the selected schema text instead of internal identifiers', async () => {
    listSchemas.mockResolvedValueOnce({
      ok: true,
      messages: [],
      errors: [],
      schemas: [
        {
          jsonSchemaId: '100408',
          schemaName: 'gorjana_oms_order',
          description: 'Gorjana OMS Order',
          systemEnumId: 'DarSysOms',
          systemLabel: 'OMS',
        },
        {
          jsonSchemaId: '100409',
          schemaName: 'gorjana_shopify_order',
          description: 'Gorjana Shopify Orders',
          systemEnumId: 'DarSysShopify',
          systemLabel: 'SHOPIFY',
        },
      ],
    })
    getMapping.mockResolvedValueOnce({
      ok: true,
      messages: [],
      errors: [],
      mapping: {
        reconciliationMappingId: 'OrderIdMap',
        mappingName: 'Order ID',
        members: [
          {
            mappingMemberId: 'OrderIdMap-1',
            systemEnumId: 'DarSysOms',
            systemLabel: 'OMS',
            jsonSchemaId: '100408',
            schemaName: 'gorjana_oms_order',
            fieldPath: '$.return_id',
          },
          {
            mappingMemberId: 'OrderIdMap-2',
            systemEnumId: 'DarSysShopify',
            systemLabel: 'SHOPIFY',
            jsonSchemaId: '100409',
            schemaName: 'gorjana_shopify_order',
            fieldPath: '$.id',
          },
        ],
      },
    })

    const wrapper = mount(RunsSettingsWorkflowPage)
    await flushPromises()

    expect(wrapper.get('[data-testid="run-schema-1"]').text()).toContain('Gorjana OMS Order - OMS')
    expect(wrapper.get('[data-testid="run-schema-2"]').text()).toContain('Gorjana Shopify Orders - SHOPIFY')
    expect(wrapper.get('[data-testid="run-schema-1"]').text()).not.toContain('gorjana_oms_order')
    expect(wrapper.get('[data-testid="run-schema-2"]').text()).not.toContain('gorjana_shopify_order')
    expect(wrapper.text()).not.toContain('100408')
    expect(wrapper.text()).not.toContain('100409')
  })

  it('uses the shared app select controls and no page-local scoped styles', () => {
    const source = readFileSync('src/pages/settings/RunsSettingsWorkflowPage.vue', 'utf8')

    expect(source).toContain('<WorkflowStepForm')
    expect(source).toContain("<AppSelect")
    expect(source).toContain("'workflow-form--compact'")
    expect(source).toContain("'workflow-form--edit-single-page'")
    expect(source).not.toContain('<select')
    expect(source).not.toContain('<style scoped>')
  })
})
