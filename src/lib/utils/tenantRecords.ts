interface TenantOwnedRecord {
  companyUserGroupId?: string | null
}

function normalizeTenantId(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized ? normalized : null
}

export function filterRecordsForActiveTenant<T extends TenantOwnedRecord>(
  records: T[],
  activeTenantUserGroupId?: string | null,
): T[] {
  const activeTenantId = normalizeTenantId(activeTenantUserGroupId)
  if (!activeTenantId) return records

  return records.filter((record) => normalizeTenantId(record.companyUserGroupId) === activeTenantId)
}
