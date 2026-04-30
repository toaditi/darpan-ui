import { callService } from './client'
import type {
  CreateRuleSetRunResponse,
  CreateCsvRunResponse,
  CreateMappingResponse,
  DeleteJsonSchemaResponse,
  DeleteGeneratedOutputResponse,
  DeleteSavedRunResponse,
  FlattenJsonSchemaResponse,
  GetMappingResponse,
  GetGeneratedOutputResponse,
  GetJsonSchemaResponse,
  InferJsonSchemaResponse,
  ListEnumOptionsResponse,
  ListJsonSchemasResponse,
  ListNsAuthConfigsResponse,
  ListNsRestletConfigsResponse,
  ListGeneratedOutputsResponse,
  ListMappingsResponse,
  ListSavedRunsResponse,
  ListSftpServersResponse,
  LoginSessionResponse,
  LlmSettingsResponse,
  LogoutSessionResponse,
  RunSavedRunDiffResponse,
  SaveJsonSchemaTextResponse,
  SaveLlmSettingsResponse,
  SaveNsAuthConfigResponse,
  SaveDashboardPinnedMappingsResponse,
  SaveDashboardPinnedSavedRunsResponse,
  SaveRuleSetRunResponse,
  SaveSavedRunNameResponse,
  SaveActiveTenantResponse,
  SaveMappingResponse,
  SaveNsRestletConfigResponse,
  SaveRefinedSchemaResponse,
  SaveSftpServerResponse,
  SessionInfoResponse,
  ValidateJsonResponse,
} from './types'

const AUTH = {
  loginSession: 'facade.AuthFacadeServices.login#Session',
  getSessionInfo: 'facade.AuthFacadeServices.get#SessionInfo',
  saveActiveTenant: 'facade.AuthFacadeServices.save#ActiveTenant',
  logoutSession: 'facade.AuthFacadeServices.logout#Session',
}

const SETTINGS = {
  listEnumOptions: 'facade.SettingsFacadeServices.list#EnumOptions',
  getLlmSettings: 'facade.SettingsFacadeServices.get#LlmSettings',
  saveLlmSettings: 'facade.SettingsFacadeServices.save#LlmSettings',
  listSftpServers: 'facade.SettingsFacadeServices.list#SftpServers',
  saveSftpServer: 'facade.SettingsFacadeServices.save#SftpServer',
  listNsAuthConfigs: 'facade.SettingsFacadeServices.list#NsAuthConfigs',
  saveNsAuthConfig: 'facade.SettingsFacadeServices.save#NsAuthConfig',
  listNsRestletConfigs: 'facade.SettingsFacadeServices.list#NsRestletConfigs',
  saveNsRestletConfig: 'facade.SettingsFacadeServices.save#NsRestletConfig',
}

const JSON_SCHEMA = {
  list: 'facade.JsonSchemaFacadeServices.list#JsonSchemas',
  get: 'facade.JsonSchemaFacadeServices.get#JsonSchema',
  saveText: 'facade.JsonSchemaFacadeServices.save#JsonSchemaText',
  inferFromText: 'facade.JsonSchemaFacadeServices.infer#JsonSchemaFromText',
  validateText: 'facade.JsonSchemaFacadeServices.validate#JsonTextAgainstSchema',
  flatten: 'facade.JsonSchemaFacadeServices.flatten#JsonSchema',
  saveRefined: 'facade.JsonSchemaFacadeServices.save#RefinedSchema',
  delete: 'facade.JsonSchemaFacadeServices.delete#JsonSchema',
}

const RECONCILIATION = {
  createRuleSetRun: 'facade.ReconciliationFacadeServices.create#RuleSetRun',
  saveRuleSetRun: 'facade.ReconciliationFacadeServices.save#RuleSetRun',
  createCsvRun: 'facade.ReconciliationFacadeServices.create#CsvRun',
  listSavedRuns: 'facade.ReconciliationFacadeServices.list#SavedRuns',
  createMapping: 'facade.ReconciliationFacadeServices.create#Mapping',
  listMappings: 'facade.ReconciliationFacadeServices.list#Mappings',
  getMapping: 'facade.ReconciliationFacadeServices.get#Mapping',
  saveMapping: 'facade.ReconciliationFacadeServices.save#Mapping',
  saveDashboardPinnedMappings: 'facade.ReconciliationFacadeServices.save#DashboardPinnedMappings',
  saveDashboardPinnedSavedRuns: 'facade.ReconciliationFacadeServices.save#DashboardPinnedSavedRuns',
  saveSavedRunName: 'facade.ReconciliationFacadeServices.save#SavedRunName',
  deleteSavedRun: 'facade.ReconciliationFacadeServices.delete#SavedRun',
  runSavedRunDiff: 'facade.ReconciliationFacadeServices.run#SavedRunDiff',
  listGeneratedOutputs: 'facade.ReconciliationFacadeServices.list#GeneratedOutputs',
  getGeneratedOutput: 'facade.ReconciliationFacadeServices.get#GeneratedOutput',
  deleteGeneratedOutput: 'facade.ReconciliationFacadeServices.delete#GeneratedOutput',
}

export const authFacade = {
  loginSession(username: string, password: string): Promise<LoginSessionResponse> {
    return callService<LoginSessionResponse>(AUTH.loginSession, { username, password })
  },
  getSessionInfo(): Promise<SessionInfoResponse> {
    return callService<SessionInfoResponse>(AUTH.getSessionInfo)
  },
  saveActiveTenant(activeTenantUserGroupId: string): Promise<SaveActiveTenantResponse> {
    return callService<SaveActiveTenantResponse>(AUTH.saveActiveTenant, { activeTenantUserGroupId })
  },
  logoutSession(): Promise<LogoutSessionResponse> {
    return callService<LogoutSessionResponse>(AUTH.logoutSession)
  },
}

export const settingsFacade = {
  listEnumOptions(enumTypeId: string): Promise<ListEnumOptionsResponse> {
    return callService<ListEnumOptionsResponse>(SETTINGS.listEnumOptions, { enumTypeId })
  },
  getLlmSettings(payload?: Record<string, unknown>): Promise<LlmSettingsResponse> {
    return callService<LlmSettingsResponse>(SETTINGS.getLlmSettings, payload)
  },
  saveLlmSettings(payload: Record<string, unknown>): Promise<SaveLlmSettingsResponse> {
    return callService<SaveLlmSettingsResponse>(SETTINGS.saveLlmSettings, payload)
  },
  listSftpServers(payload: Record<string, unknown>): Promise<ListSftpServersResponse> {
    return callService<ListSftpServersResponse>(SETTINGS.listSftpServers, payload)
  },
  saveSftpServer(payload: Record<string, unknown>): Promise<SaveSftpServerResponse> {
    return callService<SaveSftpServerResponse>(SETTINGS.saveSftpServer, payload)
  },
  listNsAuthConfigs(payload: Record<string, unknown>): Promise<ListNsAuthConfigsResponse> {
    return callService<ListNsAuthConfigsResponse>(SETTINGS.listNsAuthConfigs, payload)
  },
  saveNsAuthConfig(payload: Record<string, unknown>): Promise<SaveNsAuthConfigResponse> {
    return callService<SaveNsAuthConfigResponse>(SETTINGS.saveNsAuthConfig, payload)
  },
  listNsRestletConfigs(payload: Record<string, unknown>): Promise<ListNsRestletConfigsResponse> {
    return callService<ListNsRestletConfigsResponse>(SETTINGS.listNsRestletConfigs, payload)
  },
  saveNsRestletConfig(payload: Record<string, unknown>): Promise<SaveNsRestletConfigResponse> {
    return callService<SaveNsRestletConfigResponse>(SETTINGS.saveNsRestletConfig, payload)
  },
}

export const jsonSchemaFacade = {
  list(payload: Record<string, unknown>): Promise<ListJsonSchemasResponse> {
    return callService<ListJsonSchemasResponse>(JSON_SCHEMA.list, payload)
  },
  get(payload: Record<string, unknown>): Promise<GetJsonSchemaResponse> {
    return callService<GetJsonSchemaResponse>(JSON_SCHEMA.get, payload)
  },
  saveText(payload: Record<string, unknown>): Promise<SaveJsonSchemaTextResponse> {
    return callService<SaveJsonSchemaTextResponse>(JSON_SCHEMA.saveText, payload)
  },
  inferFromText(payload: Record<string, unknown>): Promise<InferJsonSchemaResponse> {
    return callService<InferJsonSchemaResponse>(JSON_SCHEMA.inferFromText, payload)
  },
  validateText(payload: Record<string, unknown>): Promise<ValidateJsonResponse> {
    return callService<ValidateJsonResponse>(JSON_SCHEMA.validateText, payload)
  },
  flatten(payload: Record<string, unknown>): Promise<FlattenJsonSchemaResponse> {
    return callService<FlattenJsonSchemaResponse>(JSON_SCHEMA.flatten, payload)
  },
  saveRefined(payload: Record<string, unknown>): Promise<SaveRefinedSchemaResponse> {
    return callService<SaveRefinedSchemaResponse>(JSON_SCHEMA.saveRefined, payload)
  },
  delete(payload: Record<string, unknown>): Promise<DeleteJsonSchemaResponse> {
    return callService<DeleteJsonSchemaResponse>(JSON_SCHEMA.delete, payload)
  },
}

export const reconciliationFacade = {
  createRuleSetRun(payload: Record<string, unknown>): Promise<CreateRuleSetRunResponse> {
    return callService<CreateRuleSetRunResponse>(RECONCILIATION.createRuleSetRun, payload)
  },
  saveRuleSetRun(payload: Record<string, unknown>): Promise<SaveRuleSetRunResponse> {
    return callService<SaveRuleSetRunResponse>(RECONCILIATION.saveRuleSetRun, payload)
  },
  createCsvRun(payload: Record<string, unknown>): Promise<CreateCsvRunResponse> {
    return callService<CreateCsvRunResponse>(RECONCILIATION.createCsvRun, payload)
  },
  listSavedRuns(payload: Record<string, unknown>): Promise<ListSavedRunsResponse> {
    return callService<ListSavedRunsResponse>(RECONCILIATION.listSavedRuns, payload)
  },
  createMapping(payload: Record<string, unknown>): Promise<CreateMappingResponse> {
    return callService<CreateMappingResponse>(RECONCILIATION.createMapping, payload)
  },
  listMappings(payload: Record<string, unknown>): Promise<ListMappingsResponse> {
    return callService<ListMappingsResponse>(RECONCILIATION.listMappings, payload)
  },
  getMapping(payload: Record<string, unknown>): Promise<GetMappingResponse> {
    return callService<GetMappingResponse>(RECONCILIATION.getMapping, payload)
  },
  saveMapping(payload: Record<string, unknown>): Promise<SaveMappingResponse> {
    return callService<SaveMappingResponse>(RECONCILIATION.saveMapping, payload)
  },
  saveDashboardPinnedMappings(payload: Record<string, unknown>): Promise<SaveDashboardPinnedMappingsResponse> {
    return callService<SaveDashboardPinnedMappingsResponse>(RECONCILIATION.saveDashboardPinnedMappings, payload)
  },
  saveDashboardPinnedSavedRuns(payload: Record<string, unknown>): Promise<SaveDashboardPinnedSavedRunsResponse> {
    return callService<SaveDashboardPinnedSavedRunsResponse>(RECONCILIATION.saveDashboardPinnedSavedRuns, payload)
  },
  saveSavedRunName(payload: Record<string, unknown>): Promise<SaveSavedRunNameResponse> {
    return callService<SaveSavedRunNameResponse>(RECONCILIATION.saveSavedRunName, payload)
  },
  deleteSavedRun(payload: Record<string, unknown>): Promise<DeleteSavedRunResponse> {
    return callService<DeleteSavedRunResponse>(RECONCILIATION.deleteSavedRun, payload)
  },
  runSavedRunDiff(payload: Record<string, unknown>): Promise<RunSavedRunDiffResponse> {
    return callService<RunSavedRunDiffResponse>(RECONCILIATION.runSavedRunDiff, payload)
  },
  listGeneratedOutputs(payload: Record<string, unknown>): Promise<ListGeneratedOutputsResponse> {
    return callService<ListGeneratedOutputsResponse>(RECONCILIATION.listGeneratedOutputs, payload)
  },
  getGeneratedOutput(payload: Record<string, unknown>): Promise<GetGeneratedOutputResponse> {
    return callService<GetGeneratedOutputResponse>(RECONCILIATION.getGeneratedOutput, payload)
  },
  deleteGeneratedOutput(payload: Record<string, unknown>): Promise<DeleteGeneratedOutputResponse> {
    return callService<DeleteGeneratedOutputResponse>(RECONCILIATION.deleteGeneratedOutput, payload)
  },
}
