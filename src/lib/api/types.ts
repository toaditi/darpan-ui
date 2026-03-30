export interface ApiEnvelope {
  ok: boolean
  messages: string[]
  errors: string[]
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
}

export interface SessionInfoResponse extends ApiEnvelope {
  authenticated: boolean
  sessionInfo?: SessionInfo
}

export interface LoginSessionResponse extends ApiEnvelope {
  authenticated: boolean
  sessionInfo?: SessionInfo
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

export interface HcReadDbConfigRecord {
  hcReadDbConfigId: string
  displayName?: string
  host: string
  port: number
  databaseName: string
  additionalParameters?: string
  jdbcUrl?: string
  username: string
  dbDriver?: string
  defaultTableName?: string
  itemIdColumn?: string
  locationIdColumn?: string
  transactionDateColumn?: string
  connectionPropertiesJson?: string
  isActive: string
  hasPassword: boolean
}

export interface SaveHcReadDbConfigResponse extends ApiEnvelope {
  savedConfig?: HcReadDbConfigRecord
}

export interface PaginatedResponse extends ApiEnvelope {
  pagination: PaginationMeta
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

export interface ListHcReadDbConfigsResponse extends PaginatedResponse {
  configs: HcReadDbConfigRecord[]
}

export interface JsonSchemaSummary {
  jsonSchemaId: string
  schemaName: string
  description?: string
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
