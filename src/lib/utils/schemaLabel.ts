import { resolveRecordLabel } from './recordLabel'

export interface SchemaLabelInput {
  jsonSchemaId?: string | null
  schemaName?: string | null
  description?: string | null
  systemEnumId?: string | null
  systemLabel?: string | null
}

export function resolveSchemaLabel(schema: SchemaLabelInput): string {
  const schemaLabel = resolveRecordLabel({
    description: schema.description ?? undefined,
    primary: schema.schemaName ?? undefined,
    fallbackId: schema.jsonSchemaId ?? undefined,
  })
  const systemLabel = schema.systemLabel?.trim() || schema.systemEnumId?.trim() || ''
  return systemLabel ? `${schemaLabel} - ${systemLabel}` : schemaLabel
}
