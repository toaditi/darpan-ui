export interface ApiEnvelope {
  ok: boolean
  messages: string[]
  errors: string[]
}

export type SessionScopeType = 'GLOBAL' | 'TENANT' | 'ANONYMOUS'

export interface SessionTenantOption {
  userGroupId: string
  label?: string
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
  activeTenantUserGroupId?: string | null
  activeTenantLabel?: string | null
  availableTenants?: SessionTenantOption[]
  activeTenantPermissionGroupIds?: string[]
  canEditActiveTenantData?: boolean
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

export interface SaveActiveTenantResponse extends ApiEnvelope {
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

export interface MappingSystemOption {
  enumId: string
  enumCode?: string
  description?: string
  label?: string
  fileTypeEnumId?: string
  fileTypeLabel?: string
  idFieldExpression?: string
  schemaFileName?: string
}

export interface SavedRunSystemOption extends MappingSystemOption {
  fileSide?: string
}

export interface SavedRunRule {
  ruleId?: string
  sequenceNum?: number
  ruleText?: string
  ruleLogic?: string
  ruleType?: string
  expression?: string
  enabled?: string
  severity?: string
  file1FieldPath?: string
  file2FieldPath?: string
  operator?: string
  preActions?: Array<string | { fieldSide?: string, action?: string, preAction?: string }>
}

export interface SavedRunSummary {
  savedRunId: string
  runName: string
  description?: string
  companyUserGroupId?: string
  companyLabel?: string
  runType?: string
  reconciliationMappingId?: string
  ruleSetId?: string
  compareScopeId?: string
  requiresSystemSelection: boolean
  defaultFile1SystemEnumId?: string
  defaultFile2SystemEnumId?: string
  systemOptions: SavedRunSystemOption[]
  rules?: SavedRunRule[]
}

export interface MappingSummary {
  reconciliationMappingId: string
  mappingName: string
  description?: string
  companyUserGroupId?: string
  companyLabel?: string
  requiresSystemSelection: boolean
  defaultFile1SystemEnumId?: string
  defaultFile2SystemEnumId?: string
  systemOptions: MappingSystemOption[]
}

export interface MappingDetailMember {
  mappingMemberId: string
  systemEnumId?: string
  systemLabel?: string
  jsonSchemaId?: string
  schemaName?: string
  fieldPath?: string
}

export interface MappingDetail {
  reconciliationMappingId: string
  mappingName: string
  members: MappingDetailMember[]
}

export interface SavedMapping {
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

export interface GeneratedOutput {
  fileName: string
  sourceFormat: string
  availableFormats: string[]
  preferredDownloadFormat?: string
  savedRunId?: string
  savedRunName?: string
  savedRunType?: string
  reconciliationMappingId?: string
  mappingName?: string
  ruleSetId?: string
  compareScopeId?: string
  reconciliationType?: string
  file1Label?: string
  file2Label?: string
  totalDifferences?: number
  onlyInFile1Count?: number
  onlyInFile2Count?: number
  createdDate?: string
  sizeBytes?: number
}

export interface RunSavedRunDiffResult {
  savedRunId: string
  runName?: string
  runType?: string
  reconciliationMappingId?: string
  ruleSetId?: string
  compareScopeId?: string
  file1Name?: string
  file2Name?: string
  file1SystemEnumId?: string
  file1SystemLabel?: string
  file2SystemEnumId?: string
  file2SystemLabel?: string
  validationErrors?: string[]
  processingWarnings?: string[]
  generatedOutput?: GeneratedOutput
}

export interface GetGeneratedOutputFile {
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

export interface ListMappingsResponse extends PaginatedResponse {
  pinnedReconciliationMappingIds?: string[]
  mappings: MappingSummary[]
}

export interface ListSavedRunsResponse extends PaginatedResponse {
  pinnedSavedRunIds?: string[]
  savedRuns: SavedRunSummary[]
}

export interface SaveDashboardPinnedMappingsResponse extends ApiEnvelope {
  pinnedReconciliationMappingIds?: string[]
}

export interface SaveDashboardPinnedSavedRunsResponse extends ApiEnvelope {
  pinnedSavedRunIds?: string[]
}

export interface SaveSavedRunNameResponse extends ApiEnvelope {
  savedRun?: SavedRunSummary
}

export interface DeleteSavedRunResponse extends ApiEnvelope {
  deleted?: boolean
  deletedSavedRunId?: string
  deletedRunType?: string
  deletedGeneratedOutputCount?: number
  deletedRuleCount?: number
  deletedCompareScopeCount?: number
  deletedCompareSourceCount?: number
  deletedMappingMemberCount?: number
}

export interface RunSavedRunDiffResponse extends ApiEnvelope {
  validationErrors?: string[]
  processingWarnings?: string[]
  runResult?: RunSavedRunDiffResult
}

export interface CreateMappingResponse extends ApiEnvelope {
  savedMapping?: SavedMapping
}

export interface CreateRuleSetRunResponse extends ApiEnvelope {
  savedRun?: SavedRunSummary
}

export interface SaveRuleSetRunResponse extends ApiEnvelope {
  savedRun?: SavedRunSummary
}

export interface CreateCsvRunResponse extends ApiEnvelope {
  savedRun?: SavedRunSummary
}

export interface GetMappingResponse extends ApiEnvelope {
  mapping?: MappingDetail
}

export interface SaveMappingResponse extends ApiEnvelope {
  savedMapping?: SavedMapping
}

export interface ListGeneratedOutputsResponse extends PaginatedResponse {
  generatedOutputs: GeneratedOutput[]
}

export interface GetGeneratedOutputResponse extends ApiEnvelope {
  outputFile?: GetGeneratedOutputFile
}

export interface DeleteGeneratedOutputResponse extends ApiEnvelope {
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
