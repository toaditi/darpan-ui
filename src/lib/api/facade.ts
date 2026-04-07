import { callService } from './client'
import type {
  CreatePilotMappingResponse,
  DeleteJsonSchemaResponse,
  DeletePilotGeneratedOutputResponse,
  FlattenJsonSchemaResponse,
  GetPilotGeneratedOutputResponse,
  GetJsonSchemaResponse,
  InferJsonSchemaResponse,
  ListEnumOptionsResponse,
  ListJsonSchemasResponse,
  ListNsAuthConfigsResponse,
  ListNsRestletConfigsResponse,
  ListPilotGeneratedOutputsResponse,
  ListPilotMappingsResponse,
  ListSftpServersResponse,
  LoginSessionResponse,
  LlmSettingsResponse,
  LogoutSessionResponse,
  RunPilotGenericDiffResponse,
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
  createPilotMapping: 'facade.ReconciliationFacadeServices.create#PilotMapping',
  listPilotMappings: 'facade.ReconciliationFacadeServices.list#PilotMappings',
  runPilotGenericDiff: 'facade.ReconciliationFacadeServices.run#PilotGenericDiff',
  listPilotGeneratedOutputs: 'facade.ReconciliationFacadeServices.list#PilotGeneratedOutputs',
  getPilotGeneratedOutput: 'facade.ReconciliationFacadeServices.get#PilotGeneratedOutput',
  deletePilotGeneratedOutput: 'facade.ReconciliationFacadeServices.delete#PilotGeneratedOutput',
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
  createPilotMapping(payload: Record<string, unknown>): Promise<CreatePilotMappingResponse> {
    return callService<CreatePilotMappingResponse>(RECONCILIATION.createPilotMapping, payload)
  },
  listPilotMappings(payload: Record<string, unknown>): Promise<ListPilotMappingsResponse> {
    return callService<ListPilotMappingsResponse>(RECONCILIATION.listPilotMappings, payload)
  },
  runPilotGenericDiff(payload: Record<string, unknown>): Promise<RunPilotGenericDiffResponse> {
    return callService<RunPilotGenericDiffResponse>(RECONCILIATION.runPilotGenericDiff, payload)
  },
  listPilotGeneratedOutputs(payload: Record<string, unknown>): Promise<ListPilotGeneratedOutputsResponse> {
    return callService<ListPilotGeneratedOutputsResponse>(RECONCILIATION.listPilotGeneratedOutputs, payload)
  },
  getPilotGeneratedOutput(payload: Record<string, unknown>): Promise<GetPilotGeneratedOutputResponse> {
    return callService<GetPilotGeneratedOutputResponse>(RECONCILIATION.getPilotGeneratedOutput, payload)
  },
  deletePilotGeneratedOutput(payload: Record<string, unknown>): Promise<DeletePilotGeneratedOutputResponse> {
    return callService<DeletePilotGeneratedOutputResponse>(RECONCILIATION.deletePilotGeneratedOutput, payload)
  },
}
