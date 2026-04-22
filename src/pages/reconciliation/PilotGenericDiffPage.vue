<template>
  <WorkflowPage :progress-percent="progressPercent" aria-label="Diff progress" :center-stage="shouldCenterStage">
    <InlineValidation v-if="loadError" tone="error" :message="loadError" />

    <EmptyState
      v-if="showEmptyState"
      :title="emptyStateTitle"
      :description="emptyStateDescription"
    />

    <template v-else>
      <div class="pilot-diff-layout">
        <div ref="stepFocusRegion" class="pilot-diff-main">
          <WorkflowStepForm
            class="workflow-step-shell"
            :question="currentQuestion"
            :primary-label="primaryButtonLabel"
            :submit-disabled="!canContinue || running || loadingRunOptions"
            :show-back="currentStepIndex > 0"
            :allow-select-enter="true"
            :allow-file-enter="currentStep.id === 'file-1' || currentStep.id === 'file-2'"
            primary-test-id="pilot-step-primary"
            @submit="handlePrimaryAction"
            @back="goBack"
          >
            <label v-if="currentStep.id === 'mapping'" class="wizard-input-shell">
              <WorkflowSelect
                v-model="selectedMappingId"
                test-id="mapping-select"
                :disabled="loadingRunOptions || mappings.length === 0"
                :options="mappingOptions"
                placeholder="Select a run..."
              />
            </label>

            <label v-else-if="currentStep.id === 'rule-set'" class="wizard-input-shell">
              <WorkflowSelect
                v-model="selectedRuleSetId"
                test-id="rule-set-select"
                :disabled="loadingRunOptions || ruleSetOptions.length === 0"
                :options="ruleSetOptions"
                placeholder="Select a RuleSet..."
              />
            </label>

            <label v-else-if="currentStep.id === 'compare-scope'" class="wizard-input-shell">
              <WorkflowSelect
                v-model="selectedCompareScopeId"
                test-id="compare-scope-select"
                :disabled="loadingRunOptions || compareScopeOptions.length === 0"
                :options="compareScopeOptions"
                placeholder="Select a compare scope..."
              />
            </label>

            <label
              v-else-if="currentStep.id === 'system-1' || currentStep.id === 'system-2'"
              class="wizard-input-shell"
            >
              <WorkflowSelect
                v-model="activeSystemValue"
                :test-id="currentStep.id === 'system-1' ? 'file1-system-select' : 'file2-system-select'"
                :options="systemSelectOptions"
                placeholder="Select system..."
              />
            </label>

            <label v-else class="wizard-file-shell wizard-input-shell">
              <input
                :key="`${currentStep.id}-${inputResetKey}`"
                class="wizard-file-input"
                type="file"
                :data-testid="currentStep.id === 'file-1' ? 'file1-input' : 'file2-input'"
                :aria-label="currentStep.id === 'file-1' ? 'Upload file one' : 'Upload file two'"
                @change="currentStep.id === 'file-1' ? onFile1Change($event) : onFile2Change($event)"
              />
              <span :class="['wizard-answer-control', 'wizard-file-answer', { empty: !activeFile?.name }]">
                {{ activeFile?.name || activeFilePlaceholder }}
              </span>
            </label>

            <p v-if="currentStep.id === 'compare-scope' && selectedCompareScope" class="section-note">
              {{ compareScopeContext }}
            </p>

            <InlineValidation v-if="runError" tone="error" :message="runError" />
          </WorkflowStepForm>

          <section v-if="hasFeedbackMessages" class="workflow-feedback-board">
            <article v-if="validationErrors.length > 0" class="card workflow-panel">
              <p class="eyebrow">validation</p>
              <h4>Validation messages</h4>
              <ul class="workflow-list">
                <li v-for="message in validationErrors" :key="message">{{ message }}</li>
              </ul>
            </article>

            <article v-if="processingWarnings.length > 0" class="card workflow-panel">
              <p class="eyebrow">warnings</p>
              <h4>Processing warnings</h4>
              <ul class="workflow-list">
                <li v-for="message in processingWarnings" :key="message">{{ message }}</li>
              </ul>
            </article>
          </section>
        </div>

        <section v-if="showLatestSavedOutputBoard" class="pilot-run-history-board">
          <p v-if="latestSavedOutputLoading" class="section-note" data-testid="latest-run-result-loading">Loading saved results…</p>
          <InlineValidation v-else-if="latestSavedOutputError" tone="error" :message="latestSavedOutputError" />
          <template v-else-if="latestSavedOutput && latestSavedOutputRoute">
            <RouterLink
              class="pilot-run-history-card pilot-run-history-card--link"
              data-testid="latest-run-result"
              :to="latestSavedOutputRoute"
            >
              <div class="pilot-run-history-card__head">
                <span class="pilot-run-history-card__date">{{ formatOutputCreatedDate(latestSavedOutput.createdDate) }}</span>
              </div>
              <dl class="pilot-run-history-card__metrics" :class="{ 'pilot-run-history-card__metrics--wide': showRuleDifferenceMetric(latestSavedOutput) }">
                <div>
                  <dt>Total differences</dt>
                  <dd>{{ latestSavedOutput.totalDifferences ?? 0 }}</dd>
                </div>
                <div>
                  <dt>Missing from {{ latestSavedOutput.file1Label || file1PromptSystemName }}</dt>
                  <dd>{{ latestSavedOutput.onlyInFile2Count ?? 0 }}</dd>
                </div>
                <div>
                  <dt>Missing from {{ latestSavedOutput.file2Label || file2PromptSystemName }}</dt>
                  <dd>{{ latestSavedOutput.onlyInFile1Count ?? 0 }}</dd>
                </div>
                <div v-if="showRuleDifferenceMetric(latestSavedOutput)">
                  <dt>Field mismatches</dt>
                  <dd>{{ latestSavedOutput.ruleDifferenceCount ?? 0 }}</dd>
                </div>
              </dl>
            </RouterLink>
          </template>
          <RouterLink
            v-if="latestSavedOutput && runHistoryRoute"
            class="pilot-run-history-link"
            data-testid="view-all-run-results"
            :to="runHistoryRoute"
          >
            View all previous runs
          </RouterLink>
        </section>
      </div>
    </template>
  </WorkflowPage>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import WorkflowPage from '../../components/workflow/WorkflowPage.vue'
import WorkflowSelect from '../../components/workflow/WorkflowSelect.vue'
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { reconciliationFacade } from '../../lib/api/facade'
import type {
  PilotGeneratedOutput,
  PilotMappingSummary,
  PilotMappingSystemOption,
  PilotRuleSetCompareScopeSummary,
} from '../../lib/api/types'

type RunMode = 'mapping' | 'ruleset'

interface UploadStep {
  id: 'mapping' | 'rule-set' | 'compare-scope' | 'system-1' | 'file-1' | 'system-2' | 'file-2'
}

type FailedRunFeedback = {
  validationErrors: string[]
  processingWarnings: string[]
}

const legacyMappingSteps: UploadStep[] = [
  { id: 'mapping' },
  { id: 'file-1' },
  { id: 'file-2' },
]
const legacyMappingSystemSteps: UploadStep[] = [
  { id: 'mapping' },
  { id: 'system-1' },
  { id: 'file-1' },
  { id: 'system-2' },
  { id: 'file-2' },
]
const ruleSetSteps: UploadStep[] = [
  { id: 'rule-set' },
  { id: 'compare-scope' },
  { id: 'file-1' },
  { id: 'file-2' },
]

const route = useRoute()
const router = useRouter()

const mappings = ref<PilotMappingSummary[]>([])
const compareScopes = ref<PilotRuleSetCompareScopeSummary[]>([])
const loadingRunOptions = ref(false)
const loadError = ref<string | null>(null)
const selectedMappingId = ref('')
const selectedRuleSetId = ref('')
const selectedCompareScopeId = ref('')
const file1SystemEnumId = ref('')
const file2SystemEnumId = ref('')
const file1 = ref<File | null>(null)
const file2 = ref<File | null>(null)
const runError = ref<string | null>(null)
const running = ref(false)
const validationErrors = ref<string[]>([])
const processingWarnings = ref<string[]>([])
const latestSavedOutput = ref<PilotGeneratedOutput | null>(null)
const latestSavedOutputLoading = ref(false)
const latestSavedOutputError = ref<string | null>(null)
const currentStepIndex = ref(0)
const inputResetKey = ref(0)
const stepFocusRegion = ref<HTMLElement | null>(null)
let loadRunOptionsRequestId = 0
let loadLatestSavedOutputRequestId = 0

const requestedRunType = computed<RunMode | ''>(() => (route.query.runType === 'mapping' || route.query.runType === 'ruleset' ? route.query.runType : ''))
const requestedMappingId = computed(() =>
  typeof route.query.mappingId === 'string' ? route.query.mappingId.trim() : '',
)
const requestedRuleSetId = computed(() =>
  typeof route.query.ruleSetId === 'string' ? route.query.ruleSetId.trim() : '',
)
const requestedCompareScopeId = computed(() =>
  typeof route.query.compareScopeId === 'string' ? route.query.compareScopeId.trim() : '',
)
const requestedRunName = computed(() => (typeof route.query.runName === 'string' ? route.query.runName.trim() : ''))
const requestedFile1SystemLabel = computed(() =>
  typeof route.query.file1SystemLabel === 'string' ? route.query.file1SystemLabel.trim() : '',
)
const requestedFile2SystemLabel = computed(() =>
  typeof route.query.file2SystemLabel === 'string' ? route.query.file2SystemLabel.trim() : '',
)
const isLegacyMappingMode = computed(() => {
  if (requestedRunType.value === 'mapping') return true
  if (requestedRunType.value === 'ruleset') return false
  return requestedMappingId.value.length > 0 && !requestedRuleSetId.value && !requestedCompareScopeId.value
})
const selectedMode = computed<RunMode>(() => (isLegacyMappingMode.value ? 'mapping' : 'ruleset'))
const showEmptyState = computed(() =>
  !loadingRunOptions.value &&
  !loadError.value &&
  (selectedMode.value === 'mapping' ? mappings.value.length === 0 : compareScopes.value.length === 0),
)
const emptyStateTitle = computed(() => (selectedMode.value === 'mapping' ? 'No mappings available' : 'No RuleSets available'))
const emptyStateDescription = computed(() =>
  selectedMode.value === 'mapping'
    ? 'Create or seed at least one reconciliation mapping before running the diff.'
    : 'Create or seed at least one RuleSet compare scope before running the diff.',
)

const selectedMapping = computed(() => mappings.value.find((mapping) => mapping.reconciliationMappingId === selectedMappingId.value) ?? null)
const mappingOptions = computed(() =>
  mappings.value.map((mapping) => ({ value: mapping.reconciliationMappingId, label: mapping.mappingName })),
)
const selectedSystemOptions = computed<PilotMappingSystemOption[]>(() => selectedMapping.value?.systemOptions ?? [])
const systemSelectOptions = computed(() =>
  selectedSystemOptions.value.map((option) => ({
    value: option.enumId,
    label: option.label || option.enumCode || option.enumId,
  })),
)
const requiresSystemSelection = computed(() => selectedMapping.value?.requiresSystemSelection === true)
const selectedRuleSetCompareScopes = computed(() =>
  compareScopes.value.filter((scope) => scope.ruleSetId === selectedRuleSetId.value),
)
const selectedCompareScope = computed(
  () =>
    selectedRuleSetCompareScopes.value.find((scope) => scope.compareScopeId === selectedCompareScopeId.value) ??
    compareScopes.value.find((scope) => scope.compareScopeId === selectedCompareScopeId.value) ??
    null,
)
const ruleSetOptions = computed(() => {
  const seen = new Set<string>()
  return compareScopes.value
    .filter((scope) => {
      if (seen.has(scope.ruleSetId)) return false
      seen.add(scope.ruleSetId)
      return true
    })
    .map((scope) => ({
      value: scope.ruleSetId,
      label: scope.ruleSetName,
    }))
})
const compareScopeOptions = computed(() =>
  selectedRuleSetCompareScopes.value.map((scope) => ({
    value: scope.compareScopeId,
    label: scope.compareScopeDescription || scope.objectType || scope.compareScopeId,
  })),
)
const shouldSkipMappingStep = computed(
  () => isLegacyMappingMode.value && requestedMappingId.value.length > 0 && selectedMapping.value?.reconciliationMappingId === requestedMappingId.value,
)
const shouldSkipRuleSetStep = computed(
  () => !isLegacyMappingMode.value && requestedRuleSetId.value.length > 0 && selectedRuleSetId.value === requestedRuleSetId.value,
)
const shouldSkipCompareScopeStep = computed(() => {
  if (isLegacyMappingMode.value || !selectedCompareScope.value) return false
  if (selectedRuleSetCompareScopes.value.length <= 1) return true
  return requestedCompareScopeId.value.length > 0 && selectedCompareScope.value.compareScopeId === requestedCompareScopeId.value
})
const workflowSteps = computed<UploadStep[]>(() => {
  if (isLegacyMappingMode.value) {
    const steps = requiresSystemSelection.value ? legacyMappingSystemSteps : legacyMappingSteps
    return shouldSkipMappingStep.value ? steps.filter((step) => step.id !== 'mapping') : steps
  }

  let steps = ruleSetSteps
  if (shouldSkipRuleSetStep.value) steps = steps.filter((step) => step.id !== 'rule-set')
  if (shouldSkipCompareScopeStep.value) steps = steps.filter((step) => step.id !== 'compare-scope')
  return steps
})
const currentStep = computed<UploadStep>(() => workflowSteps.value[currentStepIndex.value] ?? workflowSteps.value[0]!)
const progressPercent = computed(() => ((Math.max(1, currentStepIndex.value + 1) / workflowSteps.value.length) * 100).toFixed(2))
const selectedRuleSetName = computed(() => selectedRuleSetCompareScopes.value[0]?.ruleSetName || '')
const activeRunName = computed(() => {
  if (selectedMode.value === 'mapping') return selectedMapping.value?.mappingName || requestedRunName.value || 'Selected Run'
  return selectedCompareScope.value?.compareScopeDescription || selectedRuleSetName.value || requestedRunName.value || 'Selected Run'
})
const file1PromptSystemName = computed(() => {
  if (selectedMode.value === 'ruleset') {
    return selectedCompareScope.value?.file1SystemLabel || requestedFile1SystemLabel.value || 'File 1'
  }
  const option = selectedSystemOptions.value.find((systemOption) => systemOption.enumId === file1SystemEnumId.value)
  return option?.label || option?.enumCode || option?.enumId || requestedFile1SystemLabel.value || 'System 1'
})
const file2PromptSystemName = computed(() => {
  if (selectedMode.value === 'ruleset') {
    return selectedCompareScope.value?.file2SystemLabel || requestedFile2SystemLabel.value || 'File 2'
  }
  const option = selectedSystemOptions.value.find((systemOption) => systemOption.enumId === file2SystemEnumId.value)
  return option?.label || option?.enumCode || option?.enumId || requestedFile2SystemLabel.value || 'System 2'
})
const compareScopeContext = computed(() => {
  if (!selectedCompareScope.value) return ''
  return `${selectedCompareScope.value.objectType || 'Object'} by ${selectedCompareScope.value.file1PrimaryIdExpression || 'primary id'} and ${selectedCompareScope.value.file2PrimaryIdExpression || 'primary id'}`
})
const selectedRunScopeId = computed(() => (selectedMode.value === 'mapping' ? selectedMapping.value?.reconciliationMappingId || '' : selectedCompareScope.value?.compareScopeId || ''))
const latestSavedOutputRoute = computed<RouteLocationRaw | null>(() => buildRunResultRoute(latestSavedOutput.value?.fileName ?? ''))
const runHistoryRoute = computed<RouteLocationRaw | null>(() => {
  if (!selectedRunScopeId.value) return null

  return {
    name: 'reconciliation-run-history',
    params: {
      runScopeId: selectedRunScopeId.value,
    },
    query: buildRunRouteQuery(),
  }
})
const activeSystemValue = computed({
  get: () => (currentStep.value.id === 'system-1' ? file1SystemEnumId.value : file2SystemEnumId.value),
  set: (value: string) => {
    if (currentStep.value.id === 'system-1') {
      file1SystemEnumId.value = value
      return
    }
    file2SystemEnumId.value = value
  },
})
const currentQuestion = computed(() => {
  switch (currentStep.value.id) {
    case 'mapping':
      return 'Select a Run'
    case 'rule-set':
      return 'Select a RuleSet'
    case 'compare-scope':
      return `Select the compare scope for ${selectedRuleSetName.value || 'this RuleSet'}`
    case 'system-1':
      return `Select the first system for ${activeRunName.value}`
    case 'file-1':
      return `Upload the ${file1PromptSystemName.value} file`
    case 'system-2':
      return `Select the second system for ${activeRunName.value}`
    case 'file-2':
      return `Upload the ${file2PromptSystemName.value} file`
    default:
      return 'Select a Run'
  }
})
const activeFile = computed(() => (currentStep.value.id === 'file-1' ? file1.value : file2.value))
const activeFilePlaceholder = computed(() =>
  currentStep.value.id === 'file-1'
    ? `Choose the ${file1PromptSystemName.value} file to upload...`
    : `Choose the ${file2PromptSystemName.value} file to upload...`,
)
const canContinue = computed(() => {
  switch (currentStep.value.id) {
    case 'mapping':
      return !!selectedMapping.value
    case 'rule-set':
      return !!selectedRuleSetId.value
    case 'compare-scope':
      return !!selectedCompareScope.value
    case 'system-1':
      return !!file1SystemEnumId.value
    case 'file-1':
      return !!file1.value
    case 'system-2':
      return !!file2SystemEnumId.value && file2SystemEnumId.value !== file1SystemEnumId.value
    case 'file-2':
      return !!file2.value
    default:
      return false
  }
})
const hasFeedbackMessages = computed(() => validationErrors.value.length > 0 || processingWarnings.value.length > 0)
const shouldCenterStage = computed(() => !showEmptyState.value && !hasFeedbackMessages.value)
const showLatestSavedOutputBoard = computed(
  () => !!selectedRunScopeId.value && (latestSavedOutputLoading.value || !!latestSavedOutputError.value || !!latestSavedOutput.value),
)
const primaryButtonLabel = computed(() => {
  if (currentStep.value.id !== workflowSteps.value[workflowSteps.value.length - 1]?.id) return 'Next'
  return running.value ? 'Running…' : 'Execute'
})

const stepFocusSelectorById: Record<UploadStep['id'], string> = {
  mapping: '[data-testid="mapping-select"]',
  'rule-set': '[data-testid="rule-set-select"]',
  'compare-scope': '[data-testid="compare-scope-select"]',
  'system-1': '[data-testid="file1-system-select"]',
  'file-1': '[data-testid="file1-input"]',
  'system-2': '[data-testid="file2-system-select"]',
  'file-2': '[data-testid="file2-input"]',
}

function buildRunRouteQuery(): Record<string, string> {
  if (selectedMode.value === 'mapping') {
    return {
      runType: 'mapping',
      mappingId: selectedMapping.value?.reconciliationMappingId || requestedMappingId.value,
      runName: activeRunName.value,
      file1SystemLabel: file1PromptSystemName.value,
      file2SystemLabel: file2PromptSystemName.value,
    }
  }

  return {
    runType: 'ruleset',
    ruleSetId: selectedCompareScope.value?.ruleSetId || selectedRuleSetId.value || requestedRuleSetId.value,
    compareScopeId: selectedCompareScope.value?.compareScopeId || requestedCompareScopeId.value,
    runName: activeRunName.value,
    objectType: selectedCompareScope.value?.objectType || '',
    file1SystemLabel: file1PromptSystemName.value,
    file2SystemLabel: file2PromptSystemName.value,
  }
}

function buildRunResultRoute(outputFileName: string): RouteLocationRaw | null {
  if (!selectedRunScopeId.value || !outputFileName.trim()) return null

  return {
    name: 'reconciliation-run-result',
    params: {
      runScopeId: selectedRunScopeId.value,
      outputFileName: outputFileName.trim(),
    },
    query: buildRunRouteQuery(),
  }
}

function clearRunState(): void {
  runError.value = null
  validationErrors.value = []
  processingWarnings.value = []
}

function clearLatestSavedOutputState(): void {
  latestSavedOutput.value = null
  latestSavedOutputLoading.value = false
  latestSavedOutputError.value = null
}

function readFailedRunFeedback(error: ApiCallError): FailedRunFeedback {
  const details = (error.details ?? {}) as {
    result?: {
      validationErrors?: unknown
      processingWarnings?: unknown
    }
  }

  return {
    validationErrors: Array.isArray(details.result?.validationErrors)
      ? details.result.validationErrors.map((item) => String(item))
      : [],
    processingWarnings: Array.isArray(details.result?.processingWarnings)
      ? details.result.processingWarnings.map((item) => String(item))
      : [],
  }
}

function focusCurrentStepControl(): void {
  const selector = stepFocusSelectorById[currentStep.value.id]
  const focusTarget = selector ? stepFocusRegion.value?.querySelector<HTMLElement>(selector) : null
  focusTarget?.focus()
}

function focusPrimaryAction(): void {
  const primaryAction = stepFocusRegion.value?.querySelector<HTMLButtonElement>('[data-testid="pilot-step-primary"]')
  if (!primaryAction || primaryAction.disabled) return
  primaryAction.focus()
}

async function focusCurrentStepControlOnNextTick(): Promise<void> {
  await nextTick()
  focusCurrentStepControl()
}

async function focusPrimaryActionOnNextTick(): Promise<void> {
  await nextTick()
  focusPrimaryAction()
}

function resetWorkflow(): void {
  currentStepIndex.value = 0
  file1.value = null
  file2.value = null
  inputResetKey.value += 1
}

function syncSelectedSystems(mapping: PilotMappingSummary | null): void {
  if (!mapping) {
    file1SystemEnumId.value = ''
    file2SystemEnumId.value = ''
    return
  }

  const optionIds = mapping.systemOptions.map((option) => option.enumId)
  if (mapping.requiresSystemSelection) {
    if (!optionIds.includes(file1SystemEnumId.value)) {
      file1SystemEnumId.value = mapping.defaultFile1SystemEnumId ?? optionIds[0] ?? ''
    }
    if (!optionIds.includes(file2SystemEnumId.value) || file2SystemEnumId.value === file1SystemEnumId.value) {
      file2SystemEnumId.value =
        mapping.defaultFile2SystemEnumId ??
        optionIds.find((enumId) => enumId !== file1SystemEnumId.value) ??
        ''
    }
    return
  }

  file1SystemEnumId.value = mapping.defaultFile1SystemEnumId ?? optionIds[0] ?? ''
  file2SystemEnumId.value =
    mapping.defaultFile2SystemEnumId ??
    optionIds.find((enumId) => enumId !== file1SystemEnumId.value) ??
    ''
}

function syncSelectedCompareScope(ruleSetId: string): void {
  const scopes = compareScopes.value.filter((scope) => scope.ruleSetId === ruleSetId)
  if (scopes.length === 0) {
    selectedCompareScopeId.value = ''
    return
  }

  if (requestedCompareScopeId.value && scopes.some((scope) => scope.compareScopeId === requestedCompareScopeId.value)) {
    selectedCompareScopeId.value = requestedCompareScopeId.value
    return
  }

  if (scopes.length === 1) {
    selectedCompareScopeId.value = scopes[0]!.compareScopeId
    return
  }

  if (!scopes.some((scope) => scope.compareScopeId === selectedCompareScopeId.value)) {
    selectedCompareScopeId.value = ''
  }
}

async function loadRunOptions(): Promise<void> {
  const requestId = ++loadRunOptionsRequestId
  const requestedMode = selectedMode.value
  const requestedMappingIdValue = requestedMappingId.value
  const requestedRuleSetIdValue = requestedRuleSetId.value
  const requestedCompareScopeIdValue = requestedCompareScopeId.value
  loadingRunOptions.value = true
  loadError.value = null
  mappings.value = []
  compareScopes.value = []
  clearLatestSavedOutputState()

  try {
    if (requestedMode === 'mapping') {
      const response = await reconciliationFacade.listPilotMappings({
        pageIndex: 0,
        pageSize: 50,
        query: '',
      })
      if (requestId !== loadRunOptionsRequestId) return
      mappings.value = response.mappings ?? []
      if (requestedMappingIdValue && mappings.value.some((mapping) => mapping.reconciliationMappingId === requestedMappingIdValue)) {
        selectedMappingId.value = requestedMappingIdValue
      } else {
        selectedMappingId.value = ''
      }
      syncSelectedSystems(selectedMapping.value)
      return
    }

    const response = await reconciliationFacade.listPilotRuleSetCompareScopes({
      pageIndex: 0,
      pageSize: 100,
      query: '',
    })
    if (requestId !== loadRunOptionsRequestId) return
    compareScopes.value = response.compareScopes ?? []

    if (requestedCompareScopeIdValue) {
      const requestedScope = compareScopes.value.find((scope) => scope.compareScopeId === requestedCompareScopeIdValue)
      if (requestedScope) {
        selectedRuleSetId.value = requestedScope.ruleSetId
        selectedCompareScopeId.value = requestedScope.compareScopeId
        return
      }
    }

    if (requestedRuleSetIdValue && compareScopes.value.some((scope) => scope.ruleSetId === requestedRuleSetIdValue)) {
      selectedRuleSetId.value = requestedRuleSetIdValue
      syncSelectedCompareScope(selectedRuleSetId.value)
      return
    }

    selectedRuleSetId.value = ''
    selectedCompareScopeId.value = ''
  } catch (error) {
    if (requestId !== loadRunOptionsRequestId) return
    loadError.value = error instanceof ApiCallError ? error.message : `Unable to load ${requestedMode === 'mapping' ? 'mappings' : 'RuleSets'}.`
  } finally {
    if (requestId === loadRunOptionsRequestId) {
      loadingRunOptions.value = false
    }
  }
}

async function loadLatestSavedOutput(): Promise<void> {
  const requestId = ++loadLatestSavedOutputRequestId
  const requestedMode = selectedMode.value
  const requestedScopeId = selectedRunScopeId.value
  const requestedRuleSetIdValue = selectedCompareScope.value?.ruleSetId || requestedRuleSetId.value

  if (!requestedScopeId) {
    clearLatestSavedOutputState()
    return
  }

  latestSavedOutputLoading.value = true
  latestSavedOutputError.value = null
  latestSavedOutput.value = null

  try {
    const response =
      requestedMode === 'mapping'
        ? await reconciliationFacade.listPilotGeneratedOutputs({
          reconciliationMappingId: requestedScopeId,
          pageIndex: 0,
          pageSize: 1,
          query: '',
        })
        : await reconciliationFacade.listPilotGeneratedOutputs({
          ruleSetId: requestedRuleSetIdValue,
          compareScopeId: requestedScopeId,
          pageIndex: 0,
          pageSize: 1,
          query: '',
        })

    if (requestId !== loadLatestSavedOutputRequestId) return
    latestSavedOutput.value = response.generatedOutputs?.[0] ?? null
  } catch (error) {
    if (requestId !== loadLatestSavedOutputRequestId) return
    latestSavedOutput.value = null
    latestSavedOutputError.value = error instanceof ApiCallError ? error.message : 'Unable to load saved results.'
  } finally {
    if (requestId === loadLatestSavedOutputRequestId) {
      latestSavedOutputLoading.value = false
    }
  }
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(String(reader.result ?? ''))
    }
    reader.onerror = () => {
      reject(new Error(`Unable to read ${file.name}`))
    }
    reader.readAsText(file)
  })
}

function onFile1Change(event: Event): void {
  const input = event.target as HTMLInputElement
  file1.value = input.files?.[0] ?? null
  clearRunState()
  void focusPrimaryActionOnNextTick()
}

function onFile2Change(event: Event): void {
  const input = event.target as HTMLInputElement
  file2.value = input.files?.[0] ?? null
  clearRunState()
  void focusPrimaryActionOnNextTick()
}

function goBack(): void {
  runError.value = null
  currentStepIndex.value = Math.max(currentStepIndex.value - 1, 0)
}

async function handlePrimaryAction(): Promise<void> {
  if (selectedMode.value === 'mapping' && !selectedMapping.value) {
    runError.value = 'Select a mapping before continuing.'
    return
  }
  if (selectedMode.value === 'ruleset') {
    if (!selectedRuleSetId.value) {
      runError.value = 'Select a RuleSet before continuing.'
      return
    }
    if ((currentStep.value.id === 'compare-scope' || currentStep.value.id === 'file-1' || currentStep.value.id === 'file-2') && !selectedCompareScope.value) {
      runError.value = 'Select a compare scope before continuing.'
      return
    }
  }

  if (currentStep.value.id !== workflowSteps.value[workflowSteps.value.length - 1]?.id) {
    if (!canContinue.value) return
    currentStepIndex.value = Math.min(currentStepIndex.value + 1, workflowSteps.value.length - 1)
    return
  }

  await runDiff()
}

async function runDiff(): Promise<void> {
  if (selectedMode.value === 'mapping' && !selectedMapping.value) {
    runError.value = 'Select a mapping before running the diff.'
    return
  }
  if (selectedMode.value === 'ruleset' && !selectedCompareScope.value) {
    runError.value = 'Select a compare scope before running the diff.'
    return
  }
  if (!file1.value || !file2.value) {
    runError.value = 'Upload both files before running the diff.'
    return
  }
  if (
    selectedMode.value === 'mapping' &&
    (!file1SystemEnumId.value || !file2SystemEnumId.value || file1SystemEnumId.value === file2SystemEnumId.value)
  ) {
    runError.value = 'Choose two different systems before running the diff.'
    return
  }

  clearRunState()
  running.value = true

  try {
    const [file1Text, file2Text] = await Promise.all([readFileAsText(file1.value), readFileAsText(file2.value)])
    const payload: Record<string, unknown> = {
      file1Name: file1.value.name,
      file1Text,
      file2Name: file2.value.name,
      file2Text,
      hasHeader: true,
    }

    if (selectedMode.value === 'mapping' && selectedMapping.value) {
      payload.reconciliationMappingId = selectedMapping.value.reconciliationMappingId
      payload.file1SystemEnumId = file1SystemEnumId.value
      payload.file2SystemEnumId = file2SystemEnumId.value
    } else if (selectedCompareScope.value) {
      payload.ruleSetId = selectedCompareScope.value.ruleSetId
      payload.compareScopeId = selectedCompareScope.value.compareScopeId
    }

    const response = await reconciliationFacade.runPilotGenericDiff(payload)

    validationErrors.value = response.runResult?.validationErrors ?? []
    processingWarnings.value = response.runResult?.processingWarnings ?? []

    const generatedOutput = response.runResult?.generatedOutput ?? null
    if (!generatedOutput?.fileName?.trim()) {
      runError.value = response.errors?.[0] ?? 'Diff did not return a saved result.'
      return
    }

    const resultRoute = buildRunResultRoute(generatedOutput.fileName)
    if (!resultRoute) {
      runError.value = 'Diff completed without a saved result route.'
      return
    }

    await router.push(resultRoute)
  } catch (error) {
    if (error instanceof ApiCallError) {
      const failedFeedback = readFailedRunFeedback(error)
      validationErrors.value = failedFeedback.validationErrors
      processingWarnings.value = failedFeedback.processingWarnings
      runError.value = error.message
    } else {
      runError.value = 'Unable to run the diff.'
    }
  } finally {
    running.value = false
  }
}

function formatOutputCreatedDate(createdDate?: string): string {
  if (!createdDate) return 'Saved result'

  const parsedDate = new Date(createdDate)
  if (Number.isNaN(parsedDate.getTime())) return createdDate

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsedDate)
}

function showRuleDifferenceMetric(output: PilotGeneratedOutput | null): boolean {
  return (output?.ruleDifferenceCount ?? 0) > 0
}

watch([isLegacyMappingMode, requestedMappingId, requestedRuleSetId, requestedCompareScopeId], () => {
  selectedMappingId.value = ''
  selectedRuleSetId.value = ''
  selectedCompareScopeId.value = ''
  clearRunState()
  resetWorkflow()
  void loadRunOptions()
}, { immediate: true })

watch(selectedMapping, (mapping) => {
  if (!isLegacyMappingMode.value) return
  syncSelectedSystems(mapping)
  clearRunState()
  resetWorkflow()
  void focusCurrentStepControlOnNextTick()
})

watch(selectedRuleSetId, (ruleSetId) => {
  if (isLegacyMappingMode.value) return
  syncSelectedCompareScope(ruleSetId)
  clearRunState()
  resetWorkflow()
  void focusCurrentStepControlOnNextTick()
})

watch(selectedCompareScopeId, () => {
  if (isLegacyMappingMode.value) return
  clearRunState()
  resetWorkflow()
  void focusCurrentStepControlOnNextTick()
})

watch(selectedRunScopeId, () => {
  void loadLatestSavedOutput()
})

watch(
  [() => currentStep.value.id, loadingRunOptions, showEmptyState],
  ([, isLoading, isEmptyState]) => {
    if (isLoading || isEmptyState) return
    void focusCurrentStepControlOnNextTick()
  },
  { immediate: true },
)
</script>

<style scoped>
.pilot-diff-layout {
  width: min(var(--workflow-shell-width), 100%);
  min-height: 100%;
  display: grid;
  gap: 0;
}

.pilot-diff-main {
  width: 100%;
  display: grid;
  justify-items: center;
  gap: var(--space-5);
}

.pilot-run-history-board {
  position: fixed;
  left: 50%;
  bottom: calc(var(--floating-actions-bottom-offset) + var(--floating-actions-gap) + var(--floating-command-bubble-height));
  transform: translateX(-50%);
  display: grid;
  width: min(var(--workflow-question-width), calc(100vw - 2 * var(--space-6)));
  gap: var(--space-2);
  z-index: 10;
}

.pilot-run-history-card,
.pilot-run-history-card__head,
.pilot-run-history-card__metrics {
  display: grid;
  gap: var(--space-2);
}

.pilot-run-history-card {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: color-mix(in oklab, var(--surface-2) 82%, white);
}

.pilot-run-history-card--link {
  color: inherit;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    background 160ms ease;
}

.pilot-run-history-card--link:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--border-soft) 70%, var(--accent));
  background: color-mix(in oklab, var(--surface-2) 78%, var(--accent));
}

.pilot-run-history-card__head span {
  color: var(--text-muted);
}

.pilot-run-history-card__date {
  font-size: 0.95rem;
}

.pilot-run-history-card__metrics {
  margin: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-1);
}

.pilot-run-history-card__metrics--wide {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.pilot-run-history-card__metrics div {
  display: grid;
  gap: 0.15rem;
}

.pilot-run-history-card__metrics dt {
  color: var(--text-muted);
  font-size: 0.86rem;
}

.pilot-run-history-card__metrics dd {
  margin: 0;
  font-size: 0.98rem;
}

.pilot-run-history-link {
  justify-self: start;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
}

.pilot-run-history-link:hover {
  color: var(--text);
  text-decoration: underline;
}

@media (max-width: 760px) {
  .pilot-diff-layout,
  .pilot-diff-main {
    gap: var(--space-4);
  }

  .pilot-run-history-card__metrics,
  .pilot-run-history-card__metrics--wide {
    grid-template-columns: 1fr;
  }

  .pilot-run-history-board {
    position: static;
    left: auto;
    bottom: auto;
    transform: none;
    width: min(var(--workflow-question-width), 100%);
    justify-self: center;
    margin-top: var(--space-6);
  }
}
</style>
