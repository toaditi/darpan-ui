import { callService } from './client'
export { clearApiResponseCache } from '../queryClient'
import type {
  CreateRuleSetRunResponse,
  CreateCsvRunResponse,
  ChangeOwnPasswordResponse,
  CreateMappingResponse,
  DeleteJsonSchemaResponse,
  DeleteAutomationResponse,
  DeleteGeneratedOutputResponse,
  DeleteOmsRestSourceConfigResponse,
  DeleteSavedRunResponse,
  DeleteShopifyAuthConfigResponse,
  FlattenJsonSchemaResponse,
  GetAutomationResponse,
  GetMappingResponse,
  GetGeneratedOutputResponse,
  GetShopifyAuthConfigResponse,
  GetTenantSettingsResponse,
  GetTenantNotificationSettingsResponse,
  GetJsonSchemaResponse,
  InferJsonSchemaResponse,
  ListAutomationExecutionsResponse,
  ListAutomationsResponse,
  ListAutomationSourceOptionsResponse,
  ListEnumOptionsResponse,
  ListJsonSchemasResponse,
  ListNsAuthConfigsResponse,
  ListOmsRestSourceConfigsResponse,
  ListNsRestletConfigsResponse,
  ListShopifyAuthConfigsResponse,
  ListGeneratedOutputsResponse,
  ListMappingsResponse,
  ListSavedRunsResponse,
  ListSftpServersResponse,
  LoginSessionResponse,
  LlmSettingsResponse,
  LogoutSessionResponse,
  RunAutomationNowResponse,
  RunSavedRunDiffResponse,
  SaveAutomationResponse,
  SaveJsonSchemaTextResponse,
  SaveLlmSettingsResponse,
  SaveNsAuthConfigResponse,
  SaveOmsRestSourceConfigResponse,
  SaveDashboardPinnedMappingsResponse,
  SaveDashboardPinnedSavedRunsResponse,
  SaveRuleSetRunResponse,
  SaveSavedRunNameResponse,
  SaveActiveTenantResponse,
  SaveTenantSettingsResponse,
  SaveUserSettingsResponse,
  SaveShopifyAuthConfigResponse,
  SaveTenantNotificationSettingsResponse,
  VerifyOwnPasswordResponse,
  SaveMappingResponse,
  SaveNsRestletConfigResponse,
  SaveRefinedSchemaResponse,
  SaveSftpServerResponse,
  SessionInfoResponse,
  ValidateJsonResponse,
} from './types'
import type {
  ChangeOwnPasswordPayload,
  CreateCsvRunPayload,
  CreateMappingPayload,
  CreateRuleSetRunPayload,
  DeleteAutomationPayload,
  DeleteGeneratedOutputPayload,
  DeleteJsonSchemaPayload,
  DeleteOmsRestSourceConfigPayload,
  DeleteSavedRunPayload,
  DeleteShopifyAuthConfigPayload,
  FlattenJsonSchemaPayload,
  GetAutomationPayload,
  GetGeneratedOutputPayload,
  GetJsonSchemaPayload,
  GetLlmSettingsPayload,
  GetMappingPayload,
  GetShopifyAuthConfigPayload,
  InferJsonSchemaFromTextPayload,
  ListAutomationExecutionsPayload,
  ListAutomationsPayload,
  ListGeneratedOutputsPayload,
  ListJsonSchemasPayload,
  ListMappingsPayload,
  ListNsAuthConfigsPayload,
  ListNsRestletConfigsPayload,
  ListOmsRestSourceConfigsPayload,
  ListSavedRunsPayload,
  ListSftpServersPayload,
  ListShopifyAuthConfigsPayload,
  PauseAutomationPayload,
  ResumeAutomationPayload,
  RunAutomationNowPayload,
  RunSavedRunDiffPayload,
  SaveAutomationPayload,
  SaveDashboardPinnedMappingsPayload,
  SaveDashboardPinnedSavedRunsPayload,
  SaveJsonSchemaTextPayload,
  SaveLlmSettingsPayload,
  SaveMappingPayload,
  SaveNsAuthConfigPayload,
  SaveNsRestletConfigPayload,
  SaveOmsRestSourceConfigPayload,
  SaveRefinedSchemaPayload,
  SaveRuleSetRunPayload,
  SaveSavedRunNamePayload,
  SaveSftpServerPayload,
  SaveShopifyAuthConfigPayload,
  SaveTenantNotificationSettingsPayload,
  SaveTenantSettingsPayload,
  SaveUserSettingsPayload,
  ValidateJsonTextPayload,
  VerifyOwnPasswordPayload,
} from './facadeTypes'

const AUTH = {
  loginSession: 'facade.AuthFacadeServices.login#Session',
  getSessionInfo: 'facade.AuthFacadeServices.get#SessionInfo',
  saveActiveTenant: 'facade.AuthFacadeServices.save#ActiveTenant',
  saveUserSettings: 'facade.AuthFacadeServices.save#UserSettings',
  verifyOwnPassword: 'facade.AuthFacadeServices.verify#OwnPassword',
  changeOwnPassword: 'facade.AuthFacadeServices.change#OwnPassword',
  logoutSession: 'facade.AuthFacadeServices.logout#Session',
}

const SETTINGS = {
  listEnumOptions: 'facade.SettingsFacadeServices.list#EnumOptions',
  getLlmSettings: 'facade.SettingsFacadeServices.get#LlmSettings',
  saveLlmSettings: 'facade.SettingsFacadeServices.save#LlmSettings',
  getTenantSettings: 'facade.SettingsFacadeServices.get#TenantSettings',
  saveTenantSettings: 'facade.SettingsFacadeServices.save#TenantSettings',
  getTenantNotificationSettings: 'facade.SettingsFacadeServices.get#TenantNotificationSettings',
  saveTenantNotificationSettings: 'facade.SettingsFacadeServices.save#TenantNotificationSettings',
  listSftpServers: 'facade.SettingsFacadeServices.list#SftpServers',
  saveSftpServer: 'facade.SettingsFacadeServices.save#SftpServer',
  listNsAuthConfigs: 'facade.SettingsFacadeServices.list#NsAuthConfigs',
  saveNsAuthConfig: 'facade.SettingsFacadeServices.save#NsAuthConfig',
  listNsRestletConfigs: 'facade.SettingsFacadeServices.list#NsRestletConfigs',
  saveNsRestletConfig: 'facade.SettingsFacadeServices.save#NsRestletConfig',
  listShopifyAuthConfigs: 'facade.ShopifyFacadeServices.list#ShopifyAuthConfigs',
  getShopifyAuthConfig: 'facade.ShopifyFacadeServices.get#ShopifyAuthConfig',
  saveShopifyAuthConfig: 'facade.ShopifyFacadeServices.save#ShopifyAuthConfig',
  deleteShopifyAuthConfig: 'facade.ShopifyFacadeServices.delete#ShopifyAuthConfig',
  listOmsRestSourceConfigs: 'facade.HotWaxOmsFacadeServices.list#HotWaxOmsRestSourceConfigs',
  saveOmsRestSourceConfig: 'facade.HotWaxOmsFacadeServices.save#HotWaxOmsRestSourceConfig',
  deleteOmsRestSourceConfig: 'facade.HotWaxOmsFacadeServices.delete#HotWaxOmsRestSourceConfig',
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
  listAutomations: 'facade.ReconciliationFacadeServices.list#Automations',
  getAutomation: 'facade.ReconciliationFacadeServices.get#Automation',
  saveAutomation: 'facade.ReconciliationFacadeServices.save#Automation',
  deleteAutomation: 'facade.ReconciliationFacadeServices.delete#Automation',
  pauseAutomation: 'facade.ReconciliationFacadeServices.pause#Automation',
  resumeAutomation: 'facade.ReconciliationFacadeServices.resume#Automation',
  runAutomationNow: 'facade.ReconciliationFacadeServices.run#AutomationNow',
  listAutomationExecutions: 'facade.ReconciliationFacadeServices.list#AutomationExecutions',
  listAutomationSourceOptions: 'facade.ReconciliationFacadeServices.list#AutomationSourceOptions',
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
  saveUserSettings(payload: SaveUserSettingsPayload): Promise<SaveUserSettingsResponse> {
    return callService<SaveUserSettingsResponse>(AUTH.saveUserSettings, payload)
  },
  verifyOwnPassword(payload: VerifyOwnPasswordPayload): Promise<VerifyOwnPasswordResponse> {
    return callService<VerifyOwnPasswordResponse>(AUTH.verifyOwnPassword, payload)
  },
  changeOwnPassword(payload: ChangeOwnPasswordPayload): Promise<ChangeOwnPasswordResponse> {
    return callService<ChangeOwnPasswordResponse>(AUTH.changeOwnPassword, payload)
  },
  logoutSession(): Promise<LogoutSessionResponse> {
    return callService<LogoutSessionResponse>(AUTH.logoutSession)
  },
}

export const settingsFacade = {
  listEnumOptions(enumTypeId: string): Promise<ListEnumOptionsResponse> {
    return callService<ListEnumOptionsResponse>(SETTINGS.listEnumOptions, { enumTypeId })
  },
  getLlmSettings(payload?: GetLlmSettingsPayload): Promise<LlmSettingsResponse> {
    return callService<LlmSettingsResponse>(SETTINGS.getLlmSettings, payload)
  },
  saveLlmSettings(payload: SaveLlmSettingsPayload): Promise<SaveLlmSettingsResponse> {
    return callService<SaveLlmSettingsResponse>(SETTINGS.saveLlmSettings, payload)
  },
  getTenantSettings(): Promise<GetTenantSettingsResponse> {
    return callService<GetTenantSettingsResponse>(SETTINGS.getTenantSettings)
  },
  saveTenantSettings(payload: SaveTenantSettingsPayload): Promise<SaveTenantSettingsResponse> {
    return callService<SaveTenantSettingsResponse>(SETTINGS.saveTenantSettings, payload)
  },
  getTenantNotificationSettings(): Promise<GetTenantNotificationSettingsResponse> {
    return callService<GetTenantNotificationSettingsResponse>(SETTINGS.getTenantNotificationSettings)
  },
  saveTenantNotificationSettings(payload: SaveTenantNotificationSettingsPayload): Promise<SaveTenantNotificationSettingsResponse> {
    return callService<SaveTenantNotificationSettingsResponse>(SETTINGS.saveTenantNotificationSettings, payload)
  },
  listSftpServers(payload: ListSftpServersPayload): Promise<ListSftpServersResponse> {
    return callService<ListSftpServersResponse>(SETTINGS.listSftpServers, payload)
  },
  saveSftpServer(payload: SaveSftpServerPayload): Promise<SaveSftpServerResponse> {
    return callService<SaveSftpServerResponse>(SETTINGS.saveSftpServer, payload)
  },
  listNsAuthConfigs(payload: ListNsAuthConfigsPayload): Promise<ListNsAuthConfigsResponse> {
    return callService<ListNsAuthConfigsResponse>(SETTINGS.listNsAuthConfigs, payload)
  },
  saveNsAuthConfig(payload: SaveNsAuthConfigPayload): Promise<SaveNsAuthConfigResponse> {
    return callService<SaveNsAuthConfigResponse>(SETTINGS.saveNsAuthConfig, payload)
  },
  listNsRestletConfigs(payload: ListNsRestletConfigsPayload): Promise<ListNsRestletConfigsResponse> {
    return callService<ListNsRestletConfigsResponse>(SETTINGS.listNsRestletConfigs, payload)
  },
  saveNsRestletConfig(payload: SaveNsRestletConfigPayload): Promise<SaveNsRestletConfigResponse> {
    return callService<SaveNsRestletConfigResponse>(SETTINGS.saveNsRestletConfig, payload)
  },
  listShopifyAuthConfigs(payload: ListShopifyAuthConfigsPayload): Promise<ListShopifyAuthConfigsResponse> {
    return callService<ListShopifyAuthConfigsResponse>(SETTINGS.listShopifyAuthConfigs, payload)
  },
  getShopifyAuthConfig(payload: GetShopifyAuthConfigPayload): Promise<GetShopifyAuthConfigResponse> {
    return callService<GetShopifyAuthConfigResponse>(SETTINGS.getShopifyAuthConfig, payload)
  },
  saveShopifyAuthConfig(payload: SaveShopifyAuthConfigPayload): Promise<SaveShopifyAuthConfigResponse> {
    return callService<SaveShopifyAuthConfigResponse>(SETTINGS.saveShopifyAuthConfig, payload)
  },
  deleteShopifyAuthConfig(payload: DeleteShopifyAuthConfigPayload): Promise<DeleteShopifyAuthConfigResponse> {
    return callService<DeleteShopifyAuthConfigResponse>(SETTINGS.deleteShopifyAuthConfig, payload)
  },
  listOmsRestSourceConfigs(payload: ListOmsRestSourceConfigsPayload): Promise<ListOmsRestSourceConfigsResponse> {
    return callService<ListOmsRestSourceConfigsResponse>(SETTINGS.listOmsRestSourceConfigs, payload)
  },
  saveOmsRestSourceConfig(payload: SaveOmsRestSourceConfigPayload): Promise<SaveOmsRestSourceConfigResponse> {
    return callService<SaveOmsRestSourceConfigResponse>(SETTINGS.saveOmsRestSourceConfig, payload)
  },
  deleteOmsRestSourceConfig(payload: DeleteOmsRestSourceConfigPayload): Promise<DeleteOmsRestSourceConfigResponse> {
    return callService<DeleteOmsRestSourceConfigResponse>(SETTINGS.deleteOmsRestSourceConfig, payload)
  },
}

export const jsonSchemaFacade = {
  list(payload: ListJsonSchemasPayload): Promise<ListJsonSchemasResponse> {
    return callService<ListJsonSchemasResponse>(JSON_SCHEMA.list, payload)
  },
  get(payload: GetJsonSchemaPayload): Promise<GetJsonSchemaResponse> {
    return callService<GetJsonSchemaResponse>(JSON_SCHEMA.get, payload)
  },
  saveText(payload: SaveJsonSchemaTextPayload): Promise<SaveJsonSchemaTextResponse> {
    return callService<SaveJsonSchemaTextResponse>(JSON_SCHEMA.saveText, payload)
  },
  inferFromText(payload: InferJsonSchemaFromTextPayload): Promise<InferJsonSchemaResponse> {
    return callService<InferJsonSchemaResponse>(JSON_SCHEMA.inferFromText, payload)
  },
  validateText(payload: ValidateJsonTextPayload): Promise<ValidateJsonResponse> {
    return callService<ValidateJsonResponse>(JSON_SCHEMA.validateText, payload)
  },
  flatten(payload: FlattenJsonSchemaPayload): Promise<FlattenJsonSchemaResponse> {
    return callService<FlattenJsonSchemaResponse>(JSON_SCHEMA.flatten, payload)
  },
  saveRefined(payload: SaveRefinedSchemaPayload): Promise<SaveRefinedSchemaResponse> {
    return callService<SaveRefinedSchemaResponse>(JSON_SCHEMA.saveRefined, payload)
  },
  delete(payload: DeleteJsonSchemaPayload): Promise<DeleteJsonSchemaResponse> {
    return callService<DeleteJsonSchemaResponse>(JSON_SCHEMA.delete, payload)
  },
}

export const reconciliationFacade = {
  createRuleSetRun(payload: CreateRuleSetRunPayload): Promise<CreateRuleSetRunResponse> {
    return callService<CreateRuleSetRunResponse>(RECONCILIATION.createRuleSetRun, payload)
  },
  saveRuleSetRun(payload: SaveRuleSetRunPayload): Promise<SaveRuleSetRunResponse> {
    return callService<SaveRuleSetRunResponse>(RECONCILIATION.saveRuleSetRun, payload)
  },
  createCsvRun(payload: CreateCsvRunPayload): Promise<CreateCsvRunResponse> {
    return callService<CreateCsvRunResponse>(RECONCILIATION.createCsvRun, payload)
  },
  listSavedRuns(payload: ListSavedRunsPayload): Promise<ListSavedRunsResponse> {
    return callService<ListSavedRunsResponse>(RECONCILIATION.listSavedRuns, payload)
  },
  createMapping(payload: CreateMappingPayload): Promise<CreateMappingResponse> {
    return callService<CreateMappingResponse>(RECONCILIATION.createMapping, payload)
  },
  listMappings(payload: ListMappingsPayload): Promise<ListMappingsResponse> {
    return callService<ListMappingsResponse>(RECONCILIATION.listMappings, payload)
  },
  getMapping(payload: GetMappingPayload): Promise<GetMappingResponse> {
    return callService<GetMappingResponse>(RECONCILIATION.getMapping, payload)
  },
  saveMapping(payload: SaveMappingPayload): Promise<SaveMappingResponse> {
    return callService<SaveMappingResponse>(RECONCILIATION.saveMapping, payload)
  },
  saveDashboardPinnedMappings(payload: SaveDashboardPinnedMappingsPayload): Promise<SaveDashboardPinnedMappingsResponse> {
    return callService<SaveDashboardPinnedMappingsResponse>(RECONCILIATION.saveDashboardPinnedMappings, payload)
  },
  saveDashboardPinnedSavedRuns(payload: SaveDashboardPinnedSavedRunsPayload): Promise<SaveDashboardPinnedSavedRunsResponse> {
    return callService<SaveDashboardPinnedSavedRunsResponse>(RECONCILIATION.saveDashboardPinnedSavedRuns, payload)
  },
  saveSavedRunName(payload: SaveSavedRunNamePayload): Promise<SaveSavedRunNameResponse> {
    return callService<SaveSavedRunNameResponse>(RECONCILIATION.saveSavedRunName, payload)
  },
  deleteSavedRun(payload: DeleteSavedRunPayload): Promise<DeleteSavedRunResponse> {
    return callService<DeleteSavedRunResponse>(RECONCILIATION.deleteSavedRun, payload)
  },
  runSavedRunDiff(payload: RunSavedRunDiffPayload): Promise<RunSavedRunDiffResponse> {
    return callService<RunSavedRunDiffResponse>(RECONCILIATION.runSavedRunDiff, payload)
  },
  listGeneratedOutputs(payload: ListGeneratedOutputsPayload): Promise<ListGeneratedOutputsResponse> {
    return callService<ListGeneratedOutputsResponse>(RECONCILIATION.listGeneratedOutputs, payload)
  },
  getGeneratedOutput(payload: GetGeneratedOutputPayload): Promise<GetGeneratedOutputResponse> {
    return callService<GetGeneratedOutputResponse>(RECONCILIATION.getGeneratedOutput, payload)
  },
  deleteGeneratedOutput(payload: DeleteGeneratedOutputPayload): Promise<DeleteGeneratedOutputResponse> {
    return callService<DeleteGeneratedOutputResponse>(RECONCILIATION.deleteGeneratedOutput, payload)
  },
  listAutomations(payload: ListAutomationsPayload): Promise<ListAutomationsResponse> {
    return callService<ListAutomationsResponse>(RECONCILIATION.listAutomations, payload)
  },
  getAutomation(payload: GetAutomationPayload): Promise<GetAutomationResponse> {
    return callService<GetAutomationResponse>(RECONCILIATION.getAutomation, payload)
  },
  saveAutomation(payload: SaveAutomationPayload): Promise<SaveAutomationResponse> {
    return callService<SaveAutomationResponse>(RECONCILIATION.saveAutomation, payload)
  },
  deleteAutomation(payload: DeleteAutomationPayload): Promise<DeleteAutomationResponse> {
    return callService<DeleteAutomationResponse>(RECONCILIATION.deleteAutomation, payload)
  },
  pauseAutomation(payload: PauseAutomationPayload): Promise<SaveAutomationResponse> {
    return callService<SaveAutomationResponse>(RECONCILIATION.pauseAutomation, payload)
  },
  resumeAutomation(payload: ResumeAutomationPayload): Promise<SaveAutomationResponse> {
    return callService<SaveAutomationResponse>(RECONCILIATION.resumeAutomation, payload)
  },
  runAutomationNow(payload: RunAutomationNowPayload): Promise<RunAutomationNowResponse> {
    return callService<RunAutomationNowResponse>(RECONCILIATION.runAutomationNow, payload)
  },
  listAutomationExecutions(payload: ListAutomationExecutionsPayload): Promise<ListAutomationExecutionsResponse> {
    return callService<ListAutomationExecutionsResponse>(RECONCILIATION.listAutomationExecutions, payload)
  },
  listAutomationSourceOptions(): Promise<ListAutomationSourceOptionsResponse> {
    return callService<ListAutomationSourceOptionsResponse>(RECONCILIATION.listAutomationSourceOptions)
  },
}
