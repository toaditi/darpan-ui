import { callService } from './client'
import type {
  DeleteJsonSchemaResponse,
  FlattenJsonSchemaResponse,
  GetJsonSchemaResponse,
  InferJsonSchemaResponse,
  ListEnumOptionsResponse,
  ListHcReadDbConfigsResponse,
  ListJsonSchemasResponse,
  ListNsAuthConfigsResponse,
  ListNsRestletConfigsResponse,
  ListSftpServersResponse,
  LoginSessionResponse,
  LlmSettingsResponse,
  LogoutSessionResponse,
  SaveHcReadDbConfigResponse,
  SaveJsonSchemaTextResponse,
  SaveLlmSettingsResponse,
  SaveNsAuthConfigResponse,
  SaveNsRestletConfigResponse,
  SaveRefinedSchemaResponse,
  SaveSftpServerResponse,
  SessionInfoResponse,
  ValidateJsonResponse,
} from './types'

const AUTH = {
  loginSession: 'facade.AuthFacadeServices.login#Session',
  getSessionInfo: 'facade.AuthFacadeServices.get#SessionInfo',
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
  listHcReadDbConfigs: 'facade.SettingsFacadeServices.list#HcReadDbConfigs',
  saveHcReadDbConfig: 'facade.SettingsFacadeServices.save#HcReadDbConfig',
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

export const authFacade = {
  loginSession(username: string, password: string): Promise<LoginSessionResponse> {
    return callService<LoginSessionResponse>(AUTH.loginSession, { username, password })
  },
  getSessionInfo(): Promise<SessionInfoResponse> {
    return callService<SessionInfoResponse>(AUTH.getSessionInfo)
  },
  logoutSession(): Promise<LogoutSessionResponse> {
    return callService<LogoutSessionResponse>(AUTH.logoutSession)
  },
}

export const settingsFacade = {
  listEnumOptions(enumTypeId: string): Promise<ListEnumOptionsResponse> {
    return callService<ListEnumOptionsResponse>(SETTINGS.listEnumOptions, { enumTypeId })
  },
  getLlmSettings(): Promise<LlmSettingsResponse> {
    return callService<LlmSettingsResponse>(SETTINGS.getLlmSettings)
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
  listHcReadDbConfigs(payload: Record<string, unknown>): Promise<ListHcReadDbConfigsResponse> {
    return callService<ListHcReadDbConfigsResponse>(SETTINGS.listHcReadDbConfigs, payload)
  },
  saveHcReadDbConfig(payload: Record<string, unknown>): Promise<SaveHcReadDbConfigResponse> {
    return callService<SaveHcReadDbConfigResponse>(SETTINGS.saveHcReadDbConfig, payload)
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
