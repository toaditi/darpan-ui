export interface ApiEnvelope {
  ok: boolean
  messages: string[]
  errors: string[]
}

export type SessionScopeType = 'GLOBAL' | 'COMPANY' | 'ANONYMOUS'

export interface SessionCompanyOption {
  userGroupId: string
  label?: string
}

export interface ApiResult<T> extends ApiEnvelope {
  data?: T
}

export interface PaginationMeta {
  pageIndex: number
  pageSize: number
  totalCount: number
  pageCount: number
}

export interface EnumOption {
  enumId: string
  enumCode?: string
  description?: string
  sequenceNum?: number
  label?: string
}

export interface SessionInfo {
  userId: string
  username?: string
  locale?: string
  timeZone?: string
  scopeType?: SessionScopeType
  customerScopeId?: string | null
  activeCompanyUserGroupId?: string | null
  activeCompanyLabel?: string | null
  availableCompanies?: SessionCompanyOption[]
  isSuperAdmin?: boolean
}

export interface AuthTokenContract {
  authToken?: string
  authTokenType?: string
  authTokenHeaderName?: string
  authTokenExpiresInSeconds?: number
}

export interface SessionInfoResponse extends ApiEnvelope {
  authenticated: boolean
  sessionInfo?: SessionInfo | null
}

export interface SaveActiveCompanyResponse extends ApiEnvelope {
  authenticated: boolean
  sessionInfo?: SessionInfo | null
}

export interface LoginSessionResponse extends ApiEnvelope, AuthTokenContract {
  authenticated: boolean
  sessionInfo?: SessionInfo | null
}

export interface LogoutSessionResponse extends ApiEnvelope {
  authenticated: boolean
  authTokenRevoked?: boolean
}

export interface ListEnumOptionsResponse extends ApiEnvelope {
  options: EnumOption[]
}

export interface LlmSettings {
  activeProvider: string
  llmProvider: string
  llmModel: string
  llmBaseUrl: string
  llmTimeoutSeconds: string
  llmEnabled: string
  hasStoredLlmApiKey?: boolean
  hasFallbackLlmApiKey?: boolean
  fallbackLlmKeyEnvName?: string
}

export interface LlmSettingsResponse extends ApiEnvelope {
  llmSettings?: LlmSettings
}

export interface SaveLlmSettingsResponse extends ApiEnvelope {
  llmSettings?: LlmSettings
}

export interface SftpServerRecord {
  sftpServerId: string
  description?: string
  companyUserGroupId?: string
  companyLabel?: string
  host: string
  port: number
  username: string
  remoteAttributes?: string
  hasPassword: boolean
  hasPrivateKey: boolean
}

export interface SaveSftpServerResponse extends ApiEnvelope {
  savedServer?: SftpServerRecord
}

export interface NsAuthConfigRecord {
  nsAuthConfigId: string
  description?: string
  companyUserGroupId?: string
  companyLabel?: string
  authType: string
  username?: string
  tokenUrl?: string
  clientId?: string
  certId?: string
  scope?: string
  isActive: string
  hasPassword: boolean
  hasApiToken: boolean
  hasPrivateKeyPem: boolean
}

export interface SaveNsAuthConfigResponse extends ApiEnvelope {
  savedAuthConfig?: NsAuthConfigRecord
}

export interface NsRestletConfigRecord {
  nsRestletConfigId: string
  description?: string
  companyUserGroupId?: string
  companyLabel?: string
  endpointUrl: string
  httpMethod: string
  nsAuthConfigId: string
  authDescription?: string
  authType?: string
  authIsActive?: string
  headersJson?: string
  connectTimeoutSeconds: number
  readTimeoutSeconds: number
  isActive: string
}

export interface SaveNsRestletConfigResponse extends ApiEnvelope {
  savedRestletConfig?: NsRestletConfigRecord
}

export interface PaginatedResponse extends ApiEnvelope {
  pagination: PaginationMeta
}

export interface PilotMappingSystemOption {
  enumId: string
  enumCode?: string
  description?: string
  label?: string
  fileTypeEnumId?: string
  fileTypeLabel?: string
  idFieldExpression?: string
  schemaFileName?: string
}

export interface PilotMappingSummary {
  reconciliationMappingId: string
  mappingName: string
  description?: string
  companyUserGroupId?: string
  companyLabel?: string
  requiresSystemSelection: boolean
  defaultFile1SystemEnumId?: string
  defaultFile2SystemEnumId?: string
  systemOptions: PilotMappingSystemOption[]
}

export interface PilotRuleSetCompareScopeSummary {
  ruleSetId: string
  ruleSetName: string
  ruleSetDescription?: string
  compareScopeId: string
  compareScopeDescription?: string
  objectType?: string
  file1SystemEnumId?: string
  file1SystemLabel?: string
  file1FileTypeEnumId?: string
  file1FileTypeLabel?: string
  file1PrimaryIdExpression?: string
  file1SchemaFileName?: string
  file2SystemEnumId?: string
  file2SystemLabel?: string
  file2FileTypeEnumId?: string
  file2FileTypeLabel?: string
  file2PrimaryIdExpression?: string
  file2SchemaFileName?: string
}

export interface PilotMappingDetailMember {
  mappingMemberId: string
  systemEnumId?: string
  systemLabel?: string
  jsonSchemaId?: string
  schemaName?: string
  fieldPath?: string
}

export interface PilotMappingDetail {
  reconciliationMappingId: string
  mappingName: string
  members: PilotMappingDetailMember[]
}

export interface SavedPilotMapping {
  reconciliationMappingId: string
  mappingName: string
  companyUserGroupId?: string
  companyLabel?: string
  file1SystemEnumId?: string
  file2SystemEnumId?: string
  file1SchemaName?: string
  file2SchemaName?: string
  file1FieldPath?: string
  file2FieldPath?: string
}

export interface PilotGeneratedOutput {
  fileName: string
  sourceFormat: string
  availableFormats: string[]
  preferredDownloadFormat?: string
  runType?: 'mapping' | 'ruleset'
  runName?: string
  reconciliationMappingId?: string
  mappingName?: string
  ruleSetId?: string
  ruleSetName?: string
  compareScopeId?: string
  compareScopeDescription?: string
  objectType?: string
  reconciliationType?: string
  file1Label?: string
  file2Label?: string
  totalDifferences?: number
  onlyInFile1Count?: number
  onlyInFile2Count?: number
  missingObjectDifferenceCount?: number
  ruleDifferenceCount?: number
  createdDate?: string
  sizeBytes?: number
}

export interface RunPilotGenericDiffResult {
  runType?: 'mapping' | 'ruleset'
  runName?: string
  reconciliationMappingId?: string
  mappingName?: string
  ruleSetId?: string
  ruleSetName?: string
  compareScopeId?: string
  compareScopeDescription?: string
  objectType?: string
  file1Name?: string
  file2Name?: string
  file1SystemEnumId?: string
  file1SystemLabel?: string
  file2SystemEnumId?: string
  file2SystemLabel?: string
  validationErrors?: string[]
  processingWarnings?: string[]
  generatedOutput?: PilotGeneratedOutput
}

export interface GetPilotGeneratedOutputFile {
  fileName: string
  downloadFileName: string
  sourceFormat: string
  format: string
  contentType: string
  contentText: string
}

export interface ListSftpServersResponse extends PaginatedResponse {
  servers: SftpServerRecord[]
}

export interface ListNsAuthConfigsResponse extends PaginatedResponse {
  authConfigs: NsAuthConfigRecord[]
}

export interface ListNsRestletConfigsResponse extends PaginatedResponse {
  restletConfigs: NsRestletConfigRecord[]
}

export interface ListPilotMappingsResponse extends PaginatedResponse {
  pinnedReconciliationMappingIds?: string[]
  mappings: PilotMappingSummary[]
}

export interface ListPilotRuleSetCompareScopesResponse extends PaginatedResponse {
  compareScopes: PilotRuleSetCompareScopeSummary[]
}

export interface SaveDashboardPinnedMappingsResponse extends ApiEnvelope {
  pinnedReconciliationMappingIds?: string[]
}

export interface RunPilotGenericDiffResponse extends ApiEnvelope {
  validationErrors?: string[]
  processingWarnings?: string[]
  runResult?: RunPilotGenericDiffResult
}

export interface CreatePilotMappingResponse extends ApiEnvelope {
  savedMapping?: SavedPilotMapping
}

export interface GetPilotMappingResponse extends ApiEnvelope {
  pilotMapping?: PilotMappingDetail
}

export interface SavePilotMappingResponse extends ApiEnvelope {
  savedMapping?: SavedPilotMapping
}

export interface ListPilotGeneratedOutputsResponse extends PaginatedResponse {
  generatedOutputs: PilotGeneratedOutput[]
}

export interface GetPilotGeneratedOutputResponse extends ApiEnvelope {
  outputFile?: GetPilotGeneratedOutputFile
}

export interface DeletePilotGeneratedOutputResponse extends ApiEnvelope {
  deleted?: boolean
  deletedFileName?: string
  statusMessage?: string
}

export interface JsonSchemaSummary {
  jsonSchemaId: string
  schemaName: string
  description?: string
  systemEnumId?: string
  systemLabel?: string
  companyUserGroupId?: string
  companyLabel?: string
  statusId?: string
  createdDate?: string
  lastUpdatedStamp?: string
}

export interface JsonSchemaData extends JsonSchemaSummary {
  schemaText: string
}

export interface ListJsonSchemasResponse extends ApiEnvelope {
  pagination: PaginationMeta
  schemas: JsonSchemaSummary[]
}

export interface SaveJsonSchemaTextResponse extends ApiEnvelope {
  savedSchema?: JsonSchemaSummary
}

export interface GetJsonSchemaResponse extends ApiEnvelope {
  schemaData?: JsonSchemaData
}

export interface InferJsonSchemaResponse extends ApiEnvelope {
  jsonSchemaString?: string
  fieldList?: JsonSchemaField[]
}

export interface ValidateJsonResponse extends ApiEnvelope {
  valid?: boolean
  errorCount?: number
  errorMessages?: string[]
}

export interface FlattenJsonSchemaResponse extends ApiEnvelope {
  jsonSchemaString?: string
  fieldList?: JsonSchemaField[]
}

export interface SaveRefinedSchemaResponse extends ApiEnvelope {
  savedSchema?: {
    jsonSchemaId: string
    schemaName: string
    filename?: string
  }
}

export interface DeleteJsonSchemaResponse extends ApiEnvelope {
  deleted?: boolean
}

export interface JsonSchemaField {
  fieldPath: string
  type: 'string' | 'integer' | 'number' | 'boolean' | 'object' | 'array'
  required: boolean
  depth?: number
  fieldName?: string
  indentLevel?: number
  [key: string]: unknown
}
