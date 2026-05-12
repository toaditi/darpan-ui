// Auth state and actions have moved to src/stores/auth.ts.
// This file re-exports the full public API so existing page imports continue to work.
import { reactive } from 'vue'
import { useAuthStore, buildUiPermissionPolicy } from '../stores/auth'
export type { AuthStatus, UiPermissionPolicy } from '../stores/auth'
export { buildAuthRedirect, buildUiPermissionPolicy } from '../stores/auth'

/** Reactive auth state — equivalent to calling useAuthStore() directly. */
export function useAuthState() {
  return useAuthStore()
}

/** Reactive UI permission policy derived from the active session. */
export function useUiPermissions() {
  const store = useAuthStore()
  return reactive({
    get canViewTenantSettings() { return buildUiPermissionPolicy(store.sessionInfo).canViewTenantSettings },
    get canRunActiveTenantReconciliation() { return buildUiPermissionPolicy(store.sessionInfo).canRunActiveTenantReconciliation },
    get canEditTenantSettings() { return buildUiPermissionPolicy(store.sessionInfo).canEditTenantSettings },
    get canManageGlobalSettings() { return buildUiPermissionPolicy(store.sessionInfo).canManageGlobalSettings },
  })
}

export function ensureAuthenticated(force?: boolean): Promise<boolean> {
  return useAuthStore().ensureAuthenticated(force)
}

export function loginWithCredentials(username: string, password: string): Promise<boolean> {
  return useAuthStore().loginWithCredentials(username, password)
}

export function logoutSession(): Promise<boolean> {
  return useAuthStore().logoutSession()
}

export function saveActiveTenant(activeTenantUserGroupId: string): Promise<boolean> {
  return useAuthStore().saveActiveTenant(activeTenantUserGroupId)
}

export function saveUserSettings(payload: { displayName?: string }): Promise<boolean> {
  return useAuthStore().saveUserSettings(payload)
}

export function saveTenantSettings(payload: { timeZone?: string }): ReturnType<ReturnType<typeof useAuthStore>['saveTenantSettings']> {
  return useAuthStore().saveTenantSettings(payload)
}

export function changeOwnPassword(payload: { currentPassword: string; newPassword: string; newPasswordVerify: string }): Promise<boolean> {
  return useAuthStore().changeOwnPassword(payload)
}

export function verifyOwnPassword(currentPassword: string): Promise<boolean> {
  return useAuthStore().verifyOwnPassword(currentPassword)
}
