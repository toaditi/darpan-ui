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

export interface InventoryReasonCount {
  reasonCode: string
  count: number
}

export interface InventoryResultSignalFlags {
  hasSalesOrderSignal?: boolean
  hasItemFulfillmentSignal?: boolean
  hasCreditMemoSignal?: boolean
  hasTransferSignal?: boolean
  hasInventoryAdjustmentSignal?: boolean
  hasOmsReturnSignal?: boolean
  hasOmsShipmentSignal?: boolean
  hasPhysicalInventorySignal?: boolean
  strictCycleCountSignal?: boolean
  kitSingleNarrativeSignal?: boolean
}

export interface InventoryResultCauseDataPoints {
  facilityId?: string
  facilityName?: string
  productId?: string
  netsuiteProductId?: string
  productName?: string
  discrepancyOmsQoh?: number
  discrepancyNsQoh?: number
  discrepancyQohDiff?: number
  omsRecordCount?: number
  nsRecordCount?: number
  omsQuantityTotal?: number
  nsQuantityTotal?: number
  quantityDelta?: number
  recordCountDelta?: number
  orderEventCount?: number
  returnEventCount?: number
  shipmentEventCount?: number
  receiptEventCount?: number
  physicalInventoryEventCount?: number
  itemIssuanceEventCount?: number
  reasonEnumEventCount?: number
  orderQtyAbsMax?: number
  nsFulfillmentQtyAbsMax?: number
  nsTransactionTypes?: string[]
  nsTransactionRefs?: InventoryTransactionRef[]
  toLifecycleState?: string
  sampleOrderIds?: string[]
  sampleReturnIds?: string[]
  sampleShipmentIds?: string[]
  sampleReceiptIds?: string[]
  samplePhysicalInventoryIds?: string[]
}

export interface InventoryTransactionRef {
  id?: string
  tranid?: string
  type?: string
  date?: string
  qty?: string | number
}

export interface InventoryToLifecycle {
  state?: string
  ns?: Record<string, unknown>
  hc?: Record<string, unknown>
}

export interface InventoryTimelineEvent {
  source?: string
  eventType?: string
  txnDate?: string
  id?: string
  tranid?: string
  status?: string
  qty?: string | number
}

export interface InventorySupportingFinding {
  code?: string
  passed?: boolean
  value?: unknown
  detail?: string
}

export interface InventoryRawEvidenceScoped {
  scope?: Record<string, unknown>
  netSuitePrimaryRaw?: Array<Record<string, unknown>>
  netSuiteDetailRaw?: Array<Record<string, unknown>>
  omsHcRaw?: Array<Record<string, unknown>>
  discrepancyRaw?: Array<Record<string, unknown>>
}

export interface InventoryReviewerOutcome {
  pairId: string
  decision: string
  selectedReason?: string
  selectedSubReason?: string
  reviewerId: string
  reviewedAt: string
  note?: string
  previousReason?: string
  previousSubReason?: string
  evidenceRefs?: string[]
}

export interface InventoryResultRunSummary {
  runId: string
  generatedAt: string
  processedItemCount?: number
  reasonCounts?: InventoryReasonCount[]
  summaryFileName?: string
  summaryLocation?: string
  reviewCsvLocation?: string
  hasReviewCsv?: boolean
  strictCycleConfirmedCount?: number
  strictCycleGuardReclassifiedCount?: number
  reviewerOutcomes?: InventoryReviewerOutcome[]
}

export interface InventoryReviewRow {
  pairId: string
  facility_id?: string
  facility_name?: string
  netsuite_product_id?: string
  product_id?: string
  product_name?: string
  hotwax_qoh?: number | string
  netsuite_qoh?: number | string
  qoh_diff?: number | string
  compareStatus?: string
  reasonCode?: string
  subReasonCode?: string
  reasonText?: string
  confidenceScore?: number
  confidenceTier?: string
  scoreBreakdown?: Record<string, unknown>
  conclusion?: string
  strictCycleCountSignal?: boolean
  kitSingleNarrativeSignal?: boolean
  omsRecordCount?: number
  nsRecordCount?: number
  omsQuantityTotal?: number | string
  nsQuantityTotal?: number | string
  quantityDelta?: number | string
  recordCountDelta?: number
  hasSalesOrderSignal?: boolean
  hasItemFulfillmentSignal?: boolean
  hasCreditMemoSignal?: boolean
  hasTransferSignal?: boolean
  hasInventoryAdjustmentSignal?: boolean
  hasOmsReturnSignal?: boolean
  hasOmsShipmentSignal?: boolean
  hasPhysicalInventorySignal?: boolean
  orderEventCount?: number
  returnEventCount?: number
  shipmentEventCount?: number
  receiptEventCount?: number
  physicalInventoryEventCount?: number
  orderQtyAbsMax?: number | string
  nsFulfillmentQtyAbsMax?: number | string
  toLifecycleState?: string
  toLifecycleNsReceived?: boolean
  toLifecycleHcReceived?: boolean
  toLifecycleNsStatuses?: string
  sampleOrderIds?: string
  sampleReturnIds?: string
  sampleShipmentIds?: string
  sampleReceiptIds?: string
  samplePhysicalInventoryIds?: string
  nsTransactionTypes?: string
  nsTransactionRefs?: string | InventoryTransactionRef[]
  timelineEventCount?: number
  supportingFindingsCount?: number
  matchedRuleIds?: string
  observationSteps?: string | string[]
  signalFlags?: InventoryResultSignalFlags
  causeDataPoints?: InventoryResultCauseDataPoints
  toLifecycle?: InventoryToLifecycle
  eventTimeline?: InventoryTimelineEvent[]
  supportingFindings?: InventorySupportingFinding[]
  aggregateContext?: Record<string, unknown>
  nsSecondaryDetails?: Record<string, unknown>
  rawEvidenceScoped?: InventoryRawEvidenceScoped
  discrepancyRows?: Array<Record<string, unknown>>
  omsDetailRows?: Array<Record<string, unknown>>
  nsRecords?: Array<Record<string, unknown>>
  readDbRecords?: Array<Record<string, unknown>>
  nsError?: string
  readDbError?: string
}

export interface InventoryResultDetail extends InventoryReviewRow {
  observationSteps?: string | string[]
  causeDataPoints?: InventoryResultCauseDataPoints
  signalFlags?: InventoryResultSignalFlags
  toLifecycle?: InventoryToLifecycle
  eventTimeline?: InventoryTimelineEvent[]
  supportingFindings?: InventorySupportingFinding[]
  aggregateContext?: Record<string, unknown>
  rawEvidenceScoped?: InventoryRawEvidenceScoped
  discrepancyRows?: Array<Record<string, unknown>>
  omsDetailRows?: Array<Record<string, unknown>>
  nsRecords?: Array<Record<string, unknown>>
  readDbRecords?: Array<Record<string, unknown>>
}

export interface ListInventoryResultRunsResponse extends ApiEnvelope {
  pagination: PaginationMeta
  runs: InventoryResultRunSummary[]
}

export interface GetInventoryResultRunResponse extends ApiEnvelope {
  runMeta?: InventoryResultRunSummary
  summary?: Record<string, unknown>
  reviewRows?: InventoryReviewRow[]
}

export interface GetInventoryResultDetailResponse extends ApiEnvelope {
  detail?: InventoryResultDetail
}

export interface DownloadInventoryResultReviewCsvResponse extends ApiEnvelope {
  runMeta?: InventoryResultRunSummary
  fileName?: string
  contentType?: string
  csvContent?: string
  csvByteCount?: number
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
