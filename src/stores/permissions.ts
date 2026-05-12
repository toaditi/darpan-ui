import { computed } from 'vue'
import { defineStore } from 'pinia'
import { buildUiPermissionPolicy, useAuthStore } from './auth'

export const usePermissionsStore = defineStore('permissions', () => {
  const authStore = useAuthStore()

  const policy = computed(() => buildUiPermissionPolicy(authStore.sessionInfo))

  const canViewTenantSettings = computed(() => policy.value.canViewTenantSettings)
  const canRunActiveTenantReconciliation = computed(() => policy.value.canRunActiveTenantReconciliation)
  const canEditTenantSettings = computed(() => policy.value.canEditTenantSettings)
  const canManageGlobalSettings = computed(() => policy.value.canManageGlobalSettings)

  return {
    canViewTenantSettings,
    canRunActiveTenantReconciliation,
    canEditTenantSettings,
    canManageGlobalSettings,
  }
})
