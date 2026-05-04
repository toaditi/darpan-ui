<template>
  <StaticPageFrame>
    <template #hero>
      <h1>Automations</h1>
    </template>

    <StaticPageSection title="Automation Runs">
      <p v-if="loading" class="section-note" data-testid="automation-loading">Loading automations...</p>
      <InlineValidation v-else-if="error" tone="error" :message="error" />

      <EmptyState
        v-else-if="automations.length === 0"
        title="No automations"
      />

      <div
        v-else
        class="static-page-tile-grid static-page-record-grid static-page-record-grid--fixed"
        data-testid="saved-automations"
      >
        <RouterLink
          v-for="automation in automations"
          :key="automation.automationId"
          :to="buildAutomationDashboardRoute(automation)"
          class="static-page-tile static-page-record-tile"
          data-testid="automation-tile"
        >
          <span class="static-page-tile-title">{{ automation.automationName }}</span>
        </RouterLink>
      </div>

      <RouterLink
        v-if="canEditTenantSettings && automations.length === 0 && !loading && !error"
        :to="createRoute"
        class="static-page-action-tile static-page-action-tile--inline"
        data-testid="automation-create-action"
      >
        Create Automation
      </RouterLink>
    </StaticPageSection>

    <RouterLink
      v-if="canEditTenantSettings && automations.length > 0"
      :to="createRoute"
      class="static-page-action-tile static-page-create-action"
      data-testid="automation-create-action"
    >
      Create Automation
    </RouterLink>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, type RouteLocationRaw } from 'vue-router'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import { ApiCallError } from '../../lib/api/client'
import { reconciliationFacade } from '../../lib/api/facade'
import type { AutomationRecord } from '../../lib/api/types'
import { useUiPermissions } from '../../lib/auth'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const route = useRoute()
const permissions = useUiPermissions()
const automations = ref<AutomationRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)
const workflowOriginState = computed(() => buildWorkflowOriginState('Automations', route.fullPath || '/reconciliation/automations'))
const createRoute = computed<RouteLocationRaw>(() => ({
  name: 'reconciliation-automation-create',
  state: workflowOriginState.value,
}))

function buildAutomationDashboardRoute(automation: AutomationRecord): RouteLocationRaw {
  return {
    name: 'reconciliation-automation-dashboard',
    params: { automationId: automation.automationId },
    state: workflowOriginState.value,
  }
}

async function loadAutomations(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await reconciliationFacade.listAutomations({
      pageIndex: 0,
      pageSize: 200,
      query: '',
    })
    automations.value = response.automations ?? []
  } catch (loadError) {
    automations.value = []
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load automations.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadAutomations()
})
</script>
