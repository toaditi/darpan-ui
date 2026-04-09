interface RecordLabelInput {
  description?: string | null
  primary?: string | null
  fallbackId?: string | null
}

export function resolveRecordLabel({ description, primary, fallbackId }: RecordLabelInput): string {
  const descriptionLabel = description?.trim()
  if (descriptionLabel) return descriptionLabel

  const primaryLabel = primary?.trim()
  if (primaryLabel) return primaryLabel

  return fallbackId?.trim() || ''
}
