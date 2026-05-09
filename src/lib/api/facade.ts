import { callService } from './client'
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

const API_RESPONSE_CACHE_TTL_MS = 15_000

interface ApiResponseCacheEntry<T> {
  expiresAt: number
  promise: Promise<T>
}

const apiResponseCache = new Map<string, ApiResponseCacheEntry<unknown>>()

function stableCacheValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableCacheValue)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, item]) => [key, stableCacheValue(item)]),
  )
}

function apiResponseCacheKey(method: string, params: Record<string, unknown> = {}): string {
  return `${method}:${JSON.stringify(stableCacheValue(params))}`
}

function callCachedService<T>(
  method: string,
  params: Record<string, unknown> = {},
  ttlMs = API_RESPONSE_CACHE_TTL_MS,
): Promise<T> {
  const now = Date.now()
  const key = apiResponseCacheKey(method, params)
  const cached = apiResponseCache.get(key) as ApiResponseCacheEntry<T> | undefined
  if (cached && cached.expiresAt > now) return cached.promise

  const promise = callService<T>(method, params).catch((error) => {
    if (apiResponseCache.get(key)?.promise === promise) {
      apiResponseCache.delete(key)
    }
    throw error
  })
  apiResponseCache.set(key, {
    expiresAt: now + ttlMs,
    promise,
  })
  return promise
}

export function clearApiResponseCache(): void {
  apiResponseCache.clear()
}

async function callMutatingService<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
  try {
    return await callService<T>(method, params)
  } finally {
    clearApiResponseCache()
  }
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
  saveUserSettings(payload: Record<string, unknown>): Promise<SaveUserSettingsResponse> {
    return callService<SaveUserSettingsResponse>(AUTH.saveUserSettings, payload)
  },
  verifyOwnPassword(payload: Record<string, unknown>): Promise<VerifyOwnPasswordResponse> {
    return callService<VerifyOwnPasswordResponse>(AUTH.verifyOwnPassword, payload)
  },
  changeOwnPassword(payload: Record<string, unknown>): Promise<ChangeOwnPasswordResponse> {
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
  getLlmSettings(payload?: Record<string, unknown>): Promise<LlmSettingsResponse> {
    return callService<LlmSettingsResponse>(SETTINGS.getLlmSettings, payload)
  },
  saveLlmSettings(payload: Record<string, unknown>): Promise<SaveLlmSettingsResponse> {
    return callService<SaveLlmSettingsResponse>(SETTINGS.saveLlmSettings, payload)
  },
  getTenantSettings(): Promise<GetTenantSettingsResponse> {
    return callService<GetTenantSettingsResponse>(SETTINGS.getTenantSettings)
  },
  saveTenantSettings(payload: Record<string, unknown>): Promise<SaveTenantSettingsResponse> {
    return callService<SaveTenantSettingsResponse>(SETTINGS.saveTenantSettings, payload)
  },
  getTenantNotificationSettings(): Promise<GetTenantNotificationSettingsResponse> {
    return callService<GetTenantNotificationSettingsResponse>(SETTINGS.getTenantNotificationSettings)
  },
  saveTenantNotificationSettings(payload: Record<string, unknown>): Promise<SaveTenantNotificationSettingsResponse> {
    return callService<SaveTenantNotificationSettingsResponse>(SETTINGS.saveTenantNotificationSettings, payload)
  },
  listSftpServers(payload: Record<string, unknown>): Promise<ListSftpServersResponse> {
    return callCachedService<ListSftpServersResponse>(SETTINGS.listSftpServers, payload)
  },
  saveSftpServer(payload: Record<string, unknown>): Promise<SaveSftpServerResponse> {
    return callMutatingService<SaveSftpServerResponse>(SETTINGS.saveSftpServer, payload)
  },
  listNsAuthConfigs(payload: Record<string, unknown>): Promise<ListNsAuthConfigsResponse> {
    return callCachedService<ListNsAuthConfigsResponse>(SETTINGS.listNsAuthConfigs, payload)
  },
  saveNsAuthConfig(payload: Record<string, unknown>): Promise<SaveNsAuthConfigResponse> {
    return callMutatingService<SaveNsAuthConfigResponse>(SETTINGS.saveNsAuthConfig, payload)
  },
  listNsRestletConfigs(payload: Record<string, unknown>): Promise<ListNsRestletConfigsResponse> {
    return callCachedService<ListNsRestletConfigsResponse>(SETTINGS.listNsRestletConfigs, payload)
  },
  saveNsRestletConfig(payload: Record<string, unknown>): Promise<SaveNsRestletConfigResponse> {
    return callMutatingService<SaveNsRestletConfigResponse>(SETTINGS.saveNsRestletConfig, payload)
  },
  listShopifyAuthConfigs(payload: Record<string, unknown>): Promise<ListShopifyAuthConfigsResponse> {
    return callCachedService<ListShopifyAuthConfigsResponse>(SETTINGS.listShopifyAuthConfigs, payload)
  },
  getShopifyAuthConfig(payload: Record<string, unknown>): Promise<GetShopifyAuthConfigResponse> {
    return callService<GetShopifyAuthConfigResponse>(SETTINGS.getShopifyAuthConfig, payload)
  },
  saveShopifyAuthConfig(payload: Record<string, unknown>): Promise<SaveShopifyAuthConfigResponse> {
    return callMutatingService<SaveShopifyAuthConfigResponse>(SETTINGS.saveShopifyAuthConfig, payload)
  },
  deleteShopifyAuthConfig(payload: Record<string, unknown>): Promise<DeleteShopifyAuthConfigResponse> {
    return callMutatingService<DeleteShopifyAuthConfigResponse>(SETTINGS.deleteShopifyAuthConfig, payload)
  },
  listOmsRestSourceConfigs(payload: Record<string, unknown>): Promise<ListOmsRestSourceConfigsResponse> {
    return callCachedService<ListOmsRestSourceConfigsResponse>(SETTINGS.listOmsRestSourceConfigs, payload)
  },
  saveOmsRestSourceConfig(payload: Record<string, unknown>): Promise<SaveOmsRestSourceConfigResponse> {
    return callMutatingService<SaveOmsRestSourceConfigResponse>(SETTINGS.saveOmsRestSourceConfig, payload)
  },
  deleteOmsRestSourceConfig(payload: Record<string, unknown>): Promise<DeleteOmsRestSourceConfigResponse> {
    return callMutatingService<DeleteOmsRestSourceConfigResponse>(SETTINGS.deleteOmsRestSourceConfig, payload)
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
    return callMutatingService<CreateRuleSetRunResponse>(RECONCILIATION.createRuleSetRun, payload)
  },
  saveRuleSetRun(payload: Record<string, unknown>): Promise<SaveRuleSetRunResponse> {
    return callMutatingService<SaveRuleSetRunResponse>(RECONCILIATION.saveRuleSetRun, payload)
  },
  createCsvRun(payload: Record<string, unknown>): Promise<CreateCsvRunResponse> {
    return callMutatingService<CreateCsvRunResponse>(RECONCILIATION.createCsvRun, payload)
  },
  listSavedRuns(payload: Record<string, unknown>): Promise<ListSavedRunsResponse> {
    return callCachedService<ListSavedRunsResponse>(RECONCILIATION.listSavedRuns, payload)
  },
  createMapping(payload: Record<string, unknown>): Promise<CreateMappingResponse> {
    return callMutatingService<CreateMappingResponse>(RECONCILIATION.createMapping, payload)
  },
  listMappings(payload: Record<string, unknown>): Promise<ListMappingsResponse> {
    return callService<ListMappingsResponse>(RECONCILIATION.listMappings, payload)
  },
  getMapping(payload: Record<string, unknown>): Promise<GetMappingResponse> {
    return callService<GetMappingResponse>(RECONCILIATION.getMapping, payload)
  },
  saveMapping(payload: Record<string, unknown>): Promise<SaveMappingResponse> {
    return callMutatingService<SaveMappingResponse>(RECONCILIATION.saveMapping, payload)
  },
  saveDashboardPinnedMappings(payload: Record<string, unknown>): Promise<SaveDashboardPinnedMappingsResponse> {
    return callMutatingService<SaveDashboardPinnedMappingsResponse>(RECONCILIATION.saveDashboardPinnedMappings, payload)
  },
  saveDashboardPinnedSavedRuns(payload: Record<string, unknown>): Promise<SaveDashboardPinnedSavedRunsResponse> {
    return callMutatingService<SaveDashboardPinnedSavedRunsResponse>(RECONCILIATION.saveDashboardPinnedSavedRuns, payload)
  },
  saveSavedRunName(payload: Record<string, unknown>): Promise<SaveSavedRunNameResponse> {
    return callMutatingService<SaveSavedRunNameResponse>(RECONCILIATION.saveSavedRunName, payload)
  },
  deleteSavedRun(payload: Record<string, unknown>): Promise<DeleteSavedRunResponse> {
    return callMutatingService<DeleteSavedRunResponse>(RECONCILIATION.deleteSavedRun, payload)
  },
  runSavedRunDiff(payload: Record<string, unknown>): Promise<RunSavedRunDiffResponse> {
    return callMutatingService<RunSavedRunDiffResponse>(RECONCILIATION.runSavedRunDiff, payload)
  },
  listGeneratedOutputs(payload: Record<string, unknown>): Promise<ListGeneratedOutputsResponse> {
    return callCachedService<ListGeneratedOutputsResponse>(RECONCILIATION.listGeneratedOutputs, payload)
  },
  getGeneratedOutput(payload: Record<string, unknown>): Promise<GetGeneratedOutputResponse> {
    return callService<GetGeneratedOutputResponse>(RECONCILIATION.getGeneratedOutput, payload)
  },
  deleteGeneratedOutput(payload: Record<string, unknown>): Promise<DeleteGeneratedOutputResponse> {
    return callMutatingService<DeleteGeneratedOutputResponse>(RECONCILIATION.deleteGeneratedOutput, payload)
  },
  listAutomations(payload: Record<string, unknown>): Promise<ListAutomationsResponse> {
    return callService<ListAutomationsResponse>(RECONCILIATION.listAutomations, payload)
  },
  getAutomation(payload: Record<string, unknown>): Promise<GetAutomationResponse> {
    return callService<GetAutomationResponse>(RECONCILIATION.getAutomation, payload)
  },
  saveAutomation(payload: Record<string, unknown>): Promise<SaveAutomationResponse> {
    return callMutatingService<SaveAutomationResponse>(RECONCILIATION.saveAutomation, payload)
  },
  deleteAutomation(payload: Record<string, unknown>): Promise<DeleteAutomationResponse> {
    return callMutatingService<DeleteAutomationResponse>(RECONCILIATION.deleteAutomation, payload)
  },
  pauseAutomation(payload: Record<string, unknown>): Promise<SaveAutomationResponse> {
    return callMutatingService<SaveAutomationResponse>(RECONCILIATION.pauseAutomation, payload)
  },
  resumeAutomation(payload: Record<string, unknown>): Promise<SaveAutomationResponse> {
    return callMutatingService<SaveAutomationResponse>(RECONCILIATION.resumeAutomation, payload)
  },
  runAutomationNow(payload: Record<string, unknown>): Promise<RunAutomationNowResponse> {
    return callMutatingService<RunAutomationNowResponse>(RECONCILIATION.runAutomationNow, payload)
  },
  listAutomationExecutions(payload: Record<string, unknown>): Promise<ListAutomationExecutionsResponse> {
    return callService<ListAutomationExecutionsResponse>(RECONCILIATION.listAutomationExecutions, payload)
  },
  listAutomationSourceOptions(): Promise<ListAutomationSourceOptionsResponse> {
    return callService<ListAutomationSourceOptionsResponse>(RECONCILIATION.listAutomationSourceOptions)
  },
}
