<template>
  <StaticPageFrame>
    <template #hero>
      <h1>{{ heroTitle }}</h1>
    </template>

    <p v-if="loading" class="section-note">Loading automation...</p>
    <InlineValidation v-else-if="error" tone="error" :message="error" />

    <template v-else-if="automation">
      <InlineValidation v-if="actionError" tone="error" :message="actionError" />

      <StaticPageSection>
        <template #header>
          <div class="static-page-section-header-row">
            <h2 class="static-page-section-heading">Setup</h2>
            <RouterLink
              v-if="canEditAutomation"
              :to="editRoute"
              class="app-icon-action static-page-section-edit-action"
              data-testid="automation-edit-action"
              aria-label="Edit automation"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path :d="editIconPath" />
              </svg>
            </RouterLink>
          </div>
        </template>

        <div class="automation-dashboard-setup" data-testid="automation-setup-summary">
          <div class="automation-dashboard-setup-head">
            <div class="automation-dashboard-heading-block">
              <span class="automation-dashboard-label">Based On</span>
              <RouterLink
                v-if="savedRunRoute"
                :to="savedRunRoute"
                class="automation-dashboard-run-link"
                data-testid="automation-saved-run-link"
              >
                {{ savedRunLabel }}
              </RouterLink>
              <span v-else class="automation-dashboard-run-link">{{ savedRunLabel }}</span>
            </div>
            <span
              class="automation-dashboard-status"
              :class="{ 'automation-dashboard-status--inactive': automation.active === false }"
            >
              {{ activeLabel }}
            </span>
          </div>

          <dl class="automation-dashboard-detail-grid">
            <div class="automation-dashboard-detail-item">
              <dt>Automation ID</dt>
              <dd>{{ automation.automationId }}</dd>
            </div>
            <div class="automation-dashboard-detail-item">
              <dt>Schedule</dt>
              <dd>{{ scheduleLabel }}</dd>
            </div>
            <div class="automation-dashboard-detail-item">
              <dt>Window</dt>
              <dd>{{ windowLabel }}</dd>
            </div>
            <div class="automation-dashboard-detail-item automation-dashboard-detail-item--date">
              <dt>Previous Run</dt>
              <dd data-testid="automation-previous-run">{{ formatTenantDateTime(previousRunTime) }}</dd>
            </div>
            <div class="automation-dashboard-detail-item automation-dashboard-detail-item--date">
              <dt>Next Run</dt>
              <dd data-testid="automation-next-run">{{ formatTenantDateTime(automation.nextScheduledFireTime) }}</dd>
            </div>
          </dl>
        </div>
      </StaticPageSection>

      <StaticPageSection title="Previous Runs">
        <EmptyState v-if="sortedExecutions.length === 0" title="No previous runs" />

        <template v-else>
          <AppListPager
            v-model:page-index="executionPageIndex"
            :page-count="executionPageCount"
            aria-label="Previous runs pages"
            previous-test-id="automation-executions-page-previous"
            next-test-id="automation-executions-page-next"
          />

          <AppTableFrame
            :columns="columns"
            :rows="tableRows"
            row-key="automationExecutionId"
            row-test-id="automation-execution-row"
            :row-action-label="executionRowActionLabel"
            @row-action="openExecutionResult"
          >
            <template #cell-status="{ row }">
              <StatusBadge :label="executionRow(row).statusLabel || executionRow(row).statusEnumId || 'Unknown'" :tone="statusTone(executionRow(row).statusEnumId)" />
            </template>

            <template #cell-scheduled="{ row }">
              <span class="automation-dashboard-date-text">{{ formatTenantDateTime(executionRow(row).scheduledDate) }}</span>
            </template>

            <template #cell-completed="{ row }">
              <span class="automation-dashboard-date-text">{{ formatTenantDateTime(executionRow(row).completedDate || executionRow(row).startedDate) }}</span>
            </template>

            <template #cell-counts="{ row }">
              <span>{{ executionRow(row).differenceCount ?? '-' }}</span>
            </template>
          </AppTableFrame>
        </template>
      </StaticPageSection>
    </template>

    <StaticPageSection v-else>
      <EmptyState title="Automation unavailable" />
    </StaticPageSection>

    <template v-if="automation" #actions>
      <div class="action-row settings-dashboard-footer-row">
        <RouterLink
          to="/reconciliation/automations"
          class="app-icon-action app-icon-action--large settings-dashboard-footer-action"
          data-testid="back-automations"
          aria-label="Back to Automations"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path :d="backIconPath" fill="currentColor" />
          </svg>
        </RouterLink>

        <button
          v-if="canRunAutomation"
          type="button"
          class="app-icon-action app-icon-action--large settings-dashboard-footer-action"
          data-testid="automation-run-now-action"
          aria-label="Run automation now"
          :disabled="actionInFlight"
          @click="runNow"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path d="M6 4.5v11l9-5.5-9-5.5Z" fill="currentColor" />
          </svg>
        </button>

        <button
          v-if="canDeleteAutomation"
          type="button"
          class="app-icon-action app-icon-action--large app-icon-action--danger settings-dashboard-footer-action"
          data-testid="automation-delete-action"
          aria-label="Delete automation"
          :disabled="actionInFlight"
          @click="deleteAutomation"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path :d="trashIconPath" :transform="trashIconTransform" fill="currentColor" />
          </svg>
        </button>
      </div>
    </template>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import AppListPager from '../../components/ui/AppListPager.vue'
import AppTableFrame from '../../components/ui/AppTableFrame.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import { ApiCallError } from '../../lib/api/client'
import { reconciliationFacade } from '../../lib/api/facade'
import type { AutomationExecutionSummary, AutomationRecord } from '../../lib/api/types'
import { useAuthState, useUiPermissions } from '../../lib/auth'
import {
  AUTOMATION_WINDOW_CUSTOM,
  AUTOMATION_WINDOW_LAST_DAYS,
  AUTOMATION_WINDOW_LAST_MONTHS,
  AUTOMATION_WINDOW_LAST_WEEKS,
  AUTOMATION_WINDOW_PREVIOUS_DAY,
  AUTOMATION_WINDOW_PREVIOUS_MONTH,
  AUTOMATION_WINDOW_PREVIOUS_WEEK,
} from '../../lib/reconciliationAutomationDraft'
import {
  buildReconciliationRunResultRoute,
  type ReconciliationRunRouteContext,
} from '../../lib/reconciliationRoutes'
import { useListPagination } from '../../lib/listPagination'
import { buildSavedRunEditorRoute } from '../../lib/savedRunEditorRoute'
import { formatDateTime } from '../../lib/utils/date'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const columns = [
  { key: 'status', label: 'Status', colStyle: { width: '16%' } },
  { key: 'scheduled', label: 'Scheduled', colStyle: { width: '34%' } },
  { key: 'completed', label: 'Completed', colStyle: { width: '34%' } },
  { key: 'counts', label: 'Differences', colStyle: { width: '16%' } },
]

const route = useRoute()
const router = useRouter()
const authState = useAuthState()
const permissions = useUiPermissions()
const automation = ref<AutomationRecord | null>(null)
const executions = ref<AutomationExecutionSummary[]>([])
const loading = ref(false)
const actionInFlight = ref(false)
const error = ref<string | null>(null)
const actionError = ref<string | null>(null)
const editIconPath =
  'M14.73 2.73a1.75 1.75 0 0 1 2.48 2.48l-1.2 1.2-2.48-2.48 1.2-1.2ZM12.47 4.99 4.8 12.66l-1.18 3.72 3.72-1.18 7.67-7.67-2.54-2.54Z'
const trashIconPath =
  'M7.5 3.5A1.5 1.5 0 0 1 9 2h2a1.5 1.5 0 0 1 1.5 1.5V4H15a.75.75 0 0 1 0 1.5h-.57l-.58 9.17A1.75 1.75 0 0 1 12.1 16.5H7.9a1.75 1.75 0 0 1-1.75-1.33L5.57 5.5H5a.75.75 0 0 1 0-1.5h2.5v-.5ZM11 3.5h-2V4h2v-.5ZM7.07 5.5l.56 8.89c.02.19.13.31.27.31h4.2c.14 0 .25-.12.27-.31l.56-8.89H7.07Zm1.68 1.75a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Zm2.5 0a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Z'
const trashIconTransform = 'translate(0 0.75)'
const backIconPath =
  'M9.53 4.47a.75.75 0 0 1 0 1.06L6.81 8.25H15a.75.75 0 0 1 0 1.5H6.81l2.72 2.72a.75.75 0 1 1-1.06 1.06l-4-4a.75.75 0 0 1 0-1.06l4-4a.75.75 0 0 1 1.06 0Z'

const automationId = computed(() => (typeof route.params.automationId === 'string' ? route.params.automationId.trim() : ''))
const heroTitle = computed(() => automation.value?.automationName || 'Automation')
const workflowOriginState = computed(() => buildWorkflowOriginState(heroTitle.value, route.fullPath || `/reconciliation/automations/${automationId.value}`))
const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)
const canRunActiveTenantReconciliation = computed(() => permissions.canRunActiveTenantReconciliation)
const canEditAutomation = computed(() => canEditTenantSettings.value && automation.value?.permissions?.canEdit !== false)
const canDeleteAutomation = computed(() => canEditTenantSettings.value && automation.value?.permissions?.canDelete === true)
const canRunAutomation = computed(() => canRunActiveTenantReconciliation.value && automation.value?.permissions?.canRunNow !== false)
const activeLabel = computed(() => (automation.value?.active === false ? 'Paused' : 'Active'))
const savedRunLabel = computed(() => automation.value?.savedRunName || automation.value?.savedRunId || 'Selected run')
const scheduleLabel = computed(() => scheduleDisplayLabel(automation.value))
const windowLabel = computed(() => {
  const row = automation.value
  if (!row) return '-'
  if (row.customWindowStartDate || row.customWindowEndDate) {
    return `${formatTenantDateTime(row.customWindowStartDate, 'Start')} - ${formatTenantDateTime(row.customWindowEndDate, 'End')}`
  }
  return windowDisplayLabel(row)
})
const tenantTimeZone = computed(() => normalizeText(authState.sessionInfo?.timeZone))
const previousRunTime = computed(() => (
  automation.value?.lastExecution?.scheduledDate ||
  automation.value?.lastExecution?.completedDate ||
  automation.value?.lastExecution?.startedDate ||
  automation.value?.lastScheduledFireTime
))
const savedRunRoute = computed<RouteLocationRaw | null>(() => {
  if (automation.value?.savedRun) return buildSavedRunEditorRoute(automation.value.savedRun, workflowOriginState.value)

  const savedRunId = automation.value?.reconciliationMappingId || automation.value?.ruleSetId || automation.value?.savedRunId
  if (!savedRunId) return null
  return {
    name: 'settings-runs-edit',
    params: { reconciliationMappingId: savedRunId },
    state: workflowOriginState.value,
  }
})
const reconciliationRunRouteContext = computed<ReconciliationRunRouteContext | null>(() => {
  const row = automation.value
  const savedRunId = normalizeText(row?.savedRun?.savedRunId || row?.savedRunId || row?.reconciliationMappingId || row?.ruleSetId)
  if (!row || !savedRunId) return null

  return {
    savedRunId,
    runName: normalizeText(row.savedRun?.runName || row.savedRunName || row.automationName) || 'Selected Run',
    file1SystemLabel: automationSystemLabel('FILE_1', 'System 1'),
    file2SystemLabel: automationSystemLabel('FILE_2', 'System 2'),
  }
})
const editRoute = computed<RouteLocationRaw>(() => ({
  name: 'reconciliation-automation-edit',
  params: { automationId: automationId.value },
  state: workflowOriginState.value,
}))
const sortedExecutions = computed(() => [...executions.value].sort((left, right) => executionTime(right) - executionTime(left)))
const {
  pageIndex: executionPageIndex,
  pageCount: executionPageCount,
  pagedItems: pagedExecutions,
  resetPage: resetExecutionsPage,
} = useListPagination(sortedExecutions)
const tableRows = computed(() => pagedExecutions.value as unknown as Array<Record<string, unknown>>)

function executionRow(row: Record<string, unknown>): AutomationExecutionSummary {
  return row as unknown as AutomationExecutionSummary
}

function normalizeText(value: string | undefined): string {
  return value?.trim() || ''
}

function formatTenantDateTime(value: unknown, fallback = '-'): string {
  return formatDateTime(value, {
    fallback,
    timeZone: tenantTimeZone.value || undefined,
  })
}

function automationSystemLabel(fileSide: string, fallback: string): string {
  const savedRunOption = automation.value?.savedRun?.systemOptions?.find((option) => option.fileSide === fileSide)
  if (savedRunOption) return savedRunOption.label || savedRunOption.enumCode || savedRunOption.enumId || fallback

  const source = automation.value?.sources?.find((option) => option.fileSide === fileSide)
  return source?.systemLabel || source?.systemEnumId || fallback
}

function scheduleDisplayLabel(row: AutomationRecord | null): string {
  if (!row) return '-'
  const parsedExpression = scheduleLabelFromCron(row.scheduleExpr)
  if (parsedExpression) return parsedExpression

  const summary = row.scheduleSummary?.trim()
  const summaryExpression = summary?.match(/^Cron:\s*(.+)$/i)?.[1]
  const parsedSummaryExpression = scheduleLabelFromCron(summaryExpression)
  if (parsedSummaryExpression) return parsedSummaryExpression
  if (summary && !summary.match(/^Cron:/i)) return summary

  return row.scheduleExpr ? 'Custom schedule' : '-'
}

function scheduleLabelFromCron(expression: string | undefined): string | null {
  const parts = expression?.trim().split(/\s+/) ?? []
  if (parts.length !== 6 || parts[0] !== '0') return null

  const minute = Number(parts[1])
  const hour = Number(parts[2])
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null

  if (parts[2] === '*' && parts[3] === '*' && parts[4] === '*' && parts[5] === '?') {
    return minute === 0 ? 'Hourly on the hour' : `Hourly at :${minute.toString().padStart(2, '0')}`
  }

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null
  const timeLabel = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  if (parts[3] === '*' && parts[4] === '*' && parts[5] === '?') return `Daily at ${timeLabel}`

  const weekdayLabel = weekdayDisplayLabel(parts[5])
  if (parts[3] === '?' && parts[4] === '*' && weekdayLabel) return `Weekly on ${weekdayLabel} at ${timeLabel}`

  const monthDay = Number(parts[3])
  if (Number.isInteger(monthDay) && monthDay >= 1 && monthDay <= 31 && parts[4] === '*' && parts[5] === '?') {
    return `Monthly on day ${monthDay} at ${timeLabel}`
  }

  return null
}

function weekdayDisplayLabel(value: string | undefined): string | null {
  const labels: Record<string, string> = {
    MON: 'Monday',
    TUE: 'Tuesday',
    WED: 'Wednesday',
    THU: 'Thursday',
    FRI: 'Friday',
    SAT: 'Saturday',
    SUN: 'Sunday',
  }
  return value ? labels[value] ?? null : null
}

function windowDisplayLabel(row: AutomationRecord): string {
  const count = row.relativeWindowCount
  const windowId = row.relativeWindowTypeEnumId || row.relativeWindowLabel
  switch (windowId) {
    case AUTOMATION_WINDOW_PREVIOUS_DAY:
      return 'Previous day'
    case AUTOMATION_WINDOW_PREVIOUS_WEEK:
      return 'Previous week'
    case AUTOMATION_WINDOW_PREVIOUS_MONTH:
      return 'Previous month'
    case AUTOMATION_WINDOW_LAST_DAYS:
    case 'LAST_N_DAYS':
      return countedWindowLabel('Last', count, 'day')
    case AUTOMATION_WINDOW_LAST_WEEKS:
    case 'LAST_N_WEEKS':
      return countedWindowLabel('Last', count, 'week')
    case AUTOMATION_WINDOW_LAST_MONTHS:
    case 'LAST_N_MONTHS':
      return countedWindowLabel('Last', count, 'month')
    case AUTOMATION_WINDOW_CUSTOM:
      return 'Custom range'
    default: {
      const label = humanizeToken(row.relativeWindowLabel || row.relativeWindowTypeEnumId)
      return count !== undefined && count !== null ? `${label}: ${count}` : label || '-'
    }
  }
}

function countedWindowLabel(prefix: string, count: number | undefined, unit: string): string {
  if (count === undefined || count === null) return `${prefix} ${unit}s`
  return `${prefix} ${count} ${unit}${count === 1 ? '' : 's'}`
}

function humanizeToken(value: string | undefined): string {
  if (!value) return ''
  return value
    .replace(/^AUT_(IN|WIN)_/, '')
    .replace(/^API_/, 'API ')
    .replace(/^SFTP_/, 'SFTP ')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b(api|sftp|utc)\b/g, (match) => match.toUpperCase())
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

function executionTime(execution: AutomationExecutionSummary): number {
  const value = execution.scheduledDate || execution.completedDate || execution.startedDate || execution.createdDate
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function statusTone(statusEnumId: string | undefined): 'neutral' | 'success' | 'warning' | 'danger' {
  if (!statusEnumId) return 'neutral'
  if (statusEnumId.includes('SUCCESS') || statusEnumId.includes('DONE')) return 'success'
  if (statusEnumId.includes('FAIL') || statusEnumId.includes('CANCEL')) return 'danger'
  if (statusEnumId.includes('RUN') || statusEnumId.includes('PENDING') || statusEnumId.includes('SCHED')) return 'warning'
  return 'neutral'
}

function isSuccessfulExecution(execution: AutomationExecutionSummary): boolean {
  const status = execution.statusEnumId?.toUpperCase() || ''
  return status.includes('SUCCESS') || status.includes('DONE')
}

function executionResultPath(execution: AutomationExecutionSummary): string {
  if (!isSuccessfulExecution(execution)) return ''
  return normalizeText(execution.resultDataManagerPath) || normalizeText(execution.resultFileName)
}

function fileNameFromPath(value: string | undefined): string {
  const normalized = normalizeText(value)
  if (!normalized) return ''
  return normalized.split('/').filter(Boolean).pop() || normalized
}

function executionResultLabel(execution: AutomationExecutionSummary): string {
  return normalizeText(execution.resultFileName) || fileNameFromPath(execution.resultDataManagerPath) || 'Open result'
}

function executionResultRoute(execution: AutomationExecutionSummary): RouteLocationRaw | null {
  const routeContext = reconciliationRunRouteContext.value
  const outputFileName = executionResultPath(execution)
  if (!routeContext || !outputFileName) return null
  return buildReconciliationRunResultRoute(routeContext, outputFileName)
}

function executionRowActionLabel(row: Record<string, unknown>): string | null {
  const execution = executionRow(row)
  if (!executionResultRoute(execution)) return null
  return `Open result ${executionResultLabel(execution)}`
}

function openExecutionResult(payload: { row: Record<string, unknown> }): void {
  const route = executionResultRoute(executionRow(payload.row))
  if (!route) return
  void router.push(route)
}

async function loadExecutions(): Promise<void> {
  const response = await reconciliationFacade.listAutomationExecutions({
    automationId: automationId.value,
    pageIndex: 0,
    pageSize: 200,
  })
  executions.value = response.executions ?? []
  resetExecutionsPage()
}

async function load(): Promise<void> {
  if (!automationId.value) {
    error.value = 'Automation ID is missing.'
    return
  }

  loading.value = true
  error.value = null
  automation.value = null
  executions.value = []
  try {
    const [automationResponse] = await Promise.all([
      reconciliationFacade.getAutomation({ automationId: automationId.value }),
      loadExecutions(),
    ])
    if (!automationResponse.automation) {
      error.value = `Unable to find automation "${automationId.value}".`
      return
    }
    automation.value = automationResponse.automation
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load automation.'
  } finally {
    loading.value = false
  }
}

async function runNow(): Promise<void> {
  if (!automation.value || !canRunAutomation.value || actionInFlight.value) return
  actionInFlight.value = true
  actionError.value = null
  try {
    const response = await reconciliationFacade.runAutomationNow({ automationId: automation.value.automationId })
    if (response.automation) automation.value = response.automation
    await loadExecutions()
  } catch (runError) {
    actionError.value = runError instanceof ApiCallError ? runError.message : 'Unable to run automation.'
  } finally {
    actionInFlight.value = false
  }
}

async function deleteAutomation(): Promise<void> {
  if (!automation.value || !canDeleteAutomation.value || actionInFlight.value) return
  if (!window.confirm(`Delete automation "${automation.value.automationName}"?`)) return
  actionInFlight.value = true
  actionError.value = null
  try {
    await reconciliationFacade.deleteAutomation({ automationId: automation.value.automationId })
    await router.push('/reconciliation/automations')
  } catch (deleteError) {
    actionError.value = deleteError instanceof ApiCallError ? deleteError.message : 'Unable to delete automation.'
  } finally {
    actionInFlight.value = false
  }
}

watch(automationId, () => {
  void load()
})

onMounted(() => {
  void load()
})
</script>

<style scoped>
.automation-dashboard-setup {
  display: grid;
  gap: 0.5rem;
}

.automation-dashboard-setup-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.automation-dashboard-heading-block {
  display: grid;
  gap: 0.3rem;
  min-width: 0;
}

.automation-dashboard-label,
.automation-dashboard-detail-item dt {
  color: var(--text-soft);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.automation-dashboard-run-link {
  min-width: 0;
  max-width: 100%;
  color: var(--text);
  font-size: 1.08rem;
  font-weight: 400;
  line-height: 1.35;
  text-decoration: none;
  overflow-wrap: anywhere;
}

.automation-dashboard-date-text {
  white-space: nowrap;
}

.automation-dashboard-status {
  flex: 0 0 auto;
  min-height: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.8rem;
  border: 1px solid color-mix(in oklab, var(--accent) 36%, var(--border));
  border-radius: 999px;
  color: var(--text);
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  font-size: 0.9rem;
}

.automation-dashboard-status--inactive {
  border-color: var(--border);
  color: var(--text-soft);
  background: transparent;
}

.automation-dashboard-detail-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0;
  margin: 0;
}

.automation-dashboard-detail-item {
  grid-column: span 2;
  min-width: 0;
  display: grid;
  gap: 0.35rem;
  align-content: start;
  padding: 0.45rem 1rem 0.45rem 0;
  border-bottom: 1px solid color-mix(in oklab, var(--border) 78%, transparent);
}

.automation-dashboard-detail-item--wide {
  grid-column: span 2;
}

.automation-dashboard-detail-item--date {
  grid-column: span 3;
}

.automation-dashboard-detail-item dt,
.automation-dashboard-detail-item dd {
  margin: 0;
}

.automation-dashboard-detail-item dd {
  min-width: 0;
  max-width: 100%;
  font-weight: 400;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.automation-dashboard-detail-item--date dd {
  white-space: nowrap;
}

@media (max-width: 960px) {
  .automation-dashboard-detail-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .automation-dashboard-detail-item,
  .automation-dashboard-detail-item--date {
    grid-column: span 1;
  }
}

@media (max-width: 640px) {
  .automation-dashboard-setup-head {
    display: grid;
  }

  .automation-dashboard-status {
    justify-self: start;
  }

  .automation-dashboard-detail-grid {
    grid-template-columns: 1fr;
  }

  .automation-dashboard-detail-item--wide,
  .automation-dashboard-detail-item--date {
    grid-column: auto;
  }

  .automation-dashboard-detail-item--date dd {
    white-space: normal;
  }
}
</style>
