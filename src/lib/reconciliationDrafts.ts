const STORAGE_KEY = 'darpan-ui-reconciliation-drafts'

function canUseStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof localStorage !== 'undefined' &&
    typeof localStorage.removeItem === 'function'
  )
}

export function purgeLegacyReconciliationDrafts(): void {
  if (!canUseStorage()) return
  localStorage.removeItem(STORAGE_KEY)
}
