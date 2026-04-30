<template>
  <WorkflowPage :progress-percent="progressPercent" aria-label="Diff progress" :center-stage="shouldCenterStage">
    <InlineValidation v-if="loadError" tone="error" :message="loadError" />

    <EmptyState
      v-else-if="showEmptyState"
      title="No runs available"
      description="Create at least one saved reconciliation run before executing the diff."
    />

    <template v-else>
      <div class="reconciliation-diff-layout">
        <div ref="stepFocusRegion" class="reconciliation-diff-main">
          <WorkflowStepForm
            class="workflow-step-shell"
            :question="currentQuestion"
            :primary-label="primaryButtonLabel"
            :submit-disabled="!canContinue || running || loadingMappings"
            :show-back="currentStepIndex > 0"
            :allow-select-enter="true"
            :allow-file-enter="currentStep.id === 'file-1' || currentStep.id === 'file-2'"
            primary-test-id="reconciliation-step-primary"
            @submit="handlePrimaryAction"
            @back="goBack"
          >
            <label v-if="currentStep.id === 'run'" class="wizard-input-shell">
              <WorkflowSelect
                v-model="selectedSavedRunId"
                test-id="saved-run-select"
                :disabled="loadingMappings || savedRuns.length === 0"
                :options="savedRunOptions"
                placeholder="Select a run..."
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
                :accept="activeFileAccept"
                :data-testid="currentStep.id === 'file-1' ? 'file1-input' : 'file2-input'"
                :aria-label="currentStep.id === 'file-1' ? 'Upload file one' : 'Upload file two'"
                @change="currentStep.id === 'file-1' ? onFile1Change($event) : onFile2Change($event)"
              />
              <span :class="['wizard-answer-control', 'wizard-file-answer', { empty: !activeFile?.name }]">
                {{ activeFile?.name || activeFilePlaceholder }}
              </span>
            </label>

            <InlineValidation v-if="runError" tone="error" :message="runError" />
          </WorkflowStepForm>

          <section v-if="hasFeedbackMessages" class="workflow-feedback-board">
            <article v-if="validationErrors.length > 0" class="card workflow-panel">
              <p class="eyebrow">validation</p>
              <h4>Validation messages</h4>
              <ul class="workflow-list">
                <li v-for="(message, index) in validationErrors" :key="`validation-${index}`">{{ message }}</li>
              </ul>
            </article>

            <article v-if="processingWarnings.length > 0" class="card workflow-panel">
              <p class="eyebrow">warnings</p>
              <h4>Processing warnings</h4>
              <ul class="workflow-list">
                <li v-for="(message, index) in processingWarnings" :key="`warning-${index}`">{{ message }}</li>
              </ul>
            </article>
          </section>
        </div>

        <section v-if="showLatestSavedOutputBoard" class="reconciliation-run-history-board">
          <p v-if="latestSavedOutputLoading" class="section-note" data-testid="latest-run-result-loading">Loading saved results…</p>
          <InlineValidation v-else-if="latestSavedOutputError" tone="error" :message="latestSavedOutputError" />
          <template v-else-if="latestSavedOutput && latestSavedOutputRoute">
            <RouterLink
              class="reconciliation-run-history-card reconciliation-run-history-card--link"
              data-testid="latest-run-result"
              :to="latestSavedOutputRoute"
            >
              <div class="reconciliation-run-history-card__head">
                <span class="reconciliation-run-history-card__date">{{ formatSavedResultDateTime(latestSavedOutput.createdDate) }}</span>
              </div>
              <dl class="reconciliation-run-history-card__metrics">
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
              </dl>
            </RouterLink>
          </template>
          <RouterLink
            v-if="latestSavedOutput && runHistoryRoute"
            class="reconciliation-run-history-link"
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
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import WorkflowPage from '../../components/workflow/WorkflowPage.vue'
import WorkflowSelect from '../../components/workflow/WorkflowSelect.vue'
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { reconciliationFacade } from '../../lib/api/facade'
import type { GeneratedOutput, SavedRunSummary, SavedRunSystemOption } from '../../lib/api/types'
import {
  buildReconciliationRunHistoryRoute,
  buildReconciliationRunResultRoute,
  type ReconciliationRunRouteContext,
} from '../../lib/reconciliationRoutes'
import { formatSavedResultDateTime } from '../../lib/utils/date'

interface UploadStep {
  id: 'run' | 'system-1' | 'file-1' | 'system-2' | 'file-2'
}

type FailedRunFeedback = {
  validationErrors: string[]
  processingWarnings: string[]
}

type ExpectedFileType = 'CSV' | 'JSON' | null

const baseUploadSteps: UploadStep[] = [
  { id: 'run' },
  { id: 'file-1' },
  { id: 'file-2' },
]
const systemUploadSteps: UploadStep[] = [
  { id: 'run' },
  { id: 'system-1' },
  { id: 'file-1' },
  { id: 'system-2' },
  { id: 'file-2' },
]

const route = useRoute()
const router = useRouter()
const savedRuns = ref<SavedRunSummary[]>([])
const loadingMappings = ref(false)
const loadError = ref<string | null>(null)
const selectedSavedRunId = ref('')
const file1SystemEnumId = ref('')
const file2SystemEnumId = ref('')
const file1 = ref<File | null>(null)
const file2 = ref<File | null>(null)
const runError = ref<string | null>(null)
const running = ref(false)
const validationErrors = ref<string[]>([])
const processingWarnings = ref<string[]>([])
const latestSavedOutput = ref<GeneratedOutput | null>(null)
const latestSavedOutputLoading = ref(false)
const latestSavedOutputError = ref<string | null>(null)
const currentStepIndex = ref(0)
const inputResetKey = ref(0)
const stepFocusRegion = ref<HTMLElement | null>(null)

const requestedSavedRunId = computed(() =>
  typeof route.query.savedRunId === 'string' ? route.query.savedRunId.trim() : '',
)
const requestedRunName = computed(() => (typeof route.query.runName === 'string' ? route.query.runName.trim() : ''))
const requestedFile1SystemLabel = computed(() =>
  typeof route.query.file1SystemLabel === 'string' ? route.query.file1SystemLabel.trim() : '',
)
const requestedFile2SystemLabel = computed(() =>
  typeof route.query.file2SystemLabel === 'string' ? route.query.file2SystemLabel.trim() : '',
)
const showEmptyState = computed(() => !loadingMappings.value && savedRuns.value.length === 0 && !loadError.value)
const selectedSavedRun = computed(() => savedRuns.value.find((savedRun) => savedRun.savedRunId === selectedSavedRunId.value) ?? null)
const savedRunOptions = computed(() =>
  savedRuns.value.map((savedRun) => ({ value: savedRun.savedRunId, label: savedRun.runName })),
)
const selectedSystemOptions = computed<SavedRunSystemOption[]>(() => selectedSavedRun.value?.systemOptions ?? [])
const systemSelectOptions = computed(() =>
  selectedSystemOptions.value.map((option) => ({
    value: option.enumId,
    label: option.label || option.enumCode || option.enumId,
  })),
)
const file1SystemOption = computed(() => resolveSystemOptionForFileSide('FILE_1', file1SystemEnumId.value))
const file2SystemOption = computed(() => resolveSystemOptionForFileSide('FILE_2', file2SystemEnumId.value))
const file1ExpectedFileType = computed<ExpectedFileType>(() => resolveExpectedFileType(file1SystemOption.value))
const file2ExpectedFileType = computed<ExpectedFileType>(() => resolveExpectedFileType(file2SystemOption.value))
const requiresSystemSelection = computed(() => selectedSavedRun.value?.requiresSystemSelection === true)
const shouldSkipMappingStep = computed(
  () => requestedSavedRunId.value.length > 0 && selectedSavedRun.value?.savedRunId === requestedSavedRunId.value,
)
const workflowSteps = computed<UploadStep[]>(() => {
  const steps = requiresSystemSelection.value ? systemUploadSteps : baseUploadSteps
  return shouldSkipMappingStep.value ? steps.filter((step) => step.id !== 'run') : steps
})
const currentStep = computed<UploadStep>(() => workflowSteps.value[currentStepIndex.value] ?? workflowSteps.value[0]!)
const progressPercent = computed(() => ((Math.max(1, currentStepIndex.value + 1) / workflowSteps.value.length) * 100).toFixed(2))
const file1SystemLabel = computed(() => {
  const option = selectedSystemOptions.value.find((systemOption) => systemOption.enumId === file1SystemEnumId.value)
  return option?.label || option?.enumCode || option?.enumId || ''
})
const file2SystemLabel = computed(() => {
  const option = selectedSystemOptions.value.find((systemOption) => systemOption.enumId === file2SystemEnumId.value)
  return option?.label || option?.enumCode || option?.enumId || ''
})
const activeRunName = computed(() => selectedSavedRun.value?.runName || requestedRunName.value || 'Selected Run')
const file1PromptSystemName = computed(() => file1SystemLabel.value || requestedFile1SystemLabel.value || 'System 1')
const file2PromptSystemName = computed(() => file2SystemLabel.value || requestedFile2SystemLabel.value || 'System 2')
const reconciliationRunRouteContext = computed<ReconciliationRunRouteContext | null>(() => {
  if (!selectedSavedRun.value) return null

  return {
    savedRunId: selectedSavedRun.value.savedRunId,
    runName: activeRunName.value,
    file1SystemLabel: file1PromptSystemName.value,
    file2SystemLabel: file2PromptSystemName.value,
  }
})
const activeFileAccept = computed(() => {
  if (currentStep.value.id === 'file-1') return acceptForExpectedFileType(file1ExpectedFileType.value)
  if (currentStep.value.id === 'file-2') return acceptForExpectedFileType(file2ExpectedFileType.value)
  return ''
})
const latestSavedOutputRoute = computed<RouteLocationRaw | null>(() => buildRunResultRoute(latestSavedOutput.value?.fileName ?? ''))
const runHistoryRoute = computed<RouteLocationRaw | null>(() => {
  return reconciliationRunRouteContext.value
    ? buildReconciliationRunHistoryRoute(reconciliationRunRouteContext.value)
    : null
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
    case 'run':
      return 'Select a Run'
    case 'system-1':
      return `Select the first system for ${activeRunName.value}`
    case 'file-1':
      return buildFileUploadQuestion(file1PromptSystemName.value, file1ExpectedFileType.value)
    case 'system-2':
      return `Select the second system for ${activeRunName.value}`
    case 'file-2':
      return buildFileUploadQuestion(file2PromptSystemName.value, file2ExpectedFileType.value)
    default:
      return 'Select a Run'
  }
})
const activeFile = computed(() => (currentStep.value.id === 'file-1' ? file1.value : file2.value))
const activeFilePlaceholder = computed(() =>
  currentStep.value.id === 'file-1'
    ? buildFilePlaceholder(file1PromptSystemName.value, file1ExpectedFileType.value)
    : buildFilePlaceholder(file2PromptSystemName.value, file2ExpectedFileType.value),
)
const canContinue = computed(() => {
  switch (currentStep.value.id) {
    case 'run':
      return !!selectedSavedRun.value
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
  () => !!selectedSavedRun.value && (latestSavedOutputLoading.value || !!latestSavedOutputError.value || !!latestSavedOutput.value),
)
const primaryButtonLabel = computed(() => {
  if (currentStep.value.id !== workflowSteps.value[workflowSteps.value.length - 1]?.id) return 'Next'
  return running.value ? 'Running…' : 'Execute'
})

const stepFocusSelectorById: Record<UploadStep['id'], string> = {
  run: '[data-testid="saved-run-select"]',
  'system-1': '[data-testid="file1-system-select"]',
  'file-1': '[data-testid="file1-input"]',
  'system-2': '[data-testid="file2-system-select"]',
  'file-2': '[data-testid="file2-input"]',
}

function buildRunResultRoute(outputFileName: string): RouteLocationRaw | null {
  const trimmedOutputFileName = outputFileName.trim()
  if (!reconciliationRunRouteContext.value || !trimmedOutputFileName) return null

  return buildReconciliationRunResultRoute(reconciliationRunRouteContext.value, trimmedOutputFileName)
}

function resolveSystemOptionForFileSide(fileSide: 'FILE_1' | 'FILE_2', systemEnumId: string): SavedRunSystemOption | null {
  const normalizedSystemEnumId = systemEnumId.trim()
  if (!normalizedSystemEnumId) return null

  return (
    selectedSystemOptions.value.find(
      (option) => option.fileSide === fileSide && option.enumId === normalizedSystemEnumId,
    ) ??
    selectedSystemOptions.value.find((option) => option.enumId === normalizedSystemEnumId) ??
    null
  )
}

function resolveExpectedFileType(option: SavedRunSystemOption | null): ExpectedFileType {
  return normalizeExpectedFileType(option?.fileTypeEnumId ?? option?.fileTypeLabel ?? null)
}

function normalizeExpectedFileType(rawType?: string | null): ExpectedFileType {
  const normalizedType = rawType?.trim().toUpperCase() ?? ''
  if (normalizedType.includes('CSV')) return 'CSV'
  if (normalizedType.includes('JSON')) return 'JSON'
  return null
}

function acceptForExpectedFileType(expectedFileType: ExpectedFileType): string {
  if (expectedFileType === 'CSV') return '.csv,text/csv'
  if (expectedFileType === 'JSON') return '.json,application/json'
  return ''
}

function buildFileUploadQuestion(systemName: string, expectedFileType: ExpectedFileType): string {
  const fileTypeLabel = expectedFileType ? ` ${expectedFileType}` : ''
  return `Upload the ${systemName}${fileTypeLabel} file`
}

function buildFilePlaceholder(systemName: string, expectedFileType: ExpectedFileType): string {
  const fileTypeLabel = expectedFileType ? ` ${expectedFileType}` : ''
  return `Choose the ${systemName}${fileTypeLabel} file to upload...`
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
  const primaryAction = stepFocusRegion.value?.querySelector<HTMLButtonElement>('[data-testid="reconciliation-step-primary"]')
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

function syncSelectedSystems(savedRun: SavedRunSummary | null): void {
  if (!savedRun) {
    file1SystemEnumId.value = ''
    file2SystemEnumId.value = ''
    return
  }

  const optionIds = savedRun.systemOptions.map((option) => option.enumId)
  if (savedRun.requiresSystemSelection) {
    if (!optionIds.includes(file1SystemEnumId.value)) {
      file1SystemEnumId.value = savedRun.defaultFile1SystemEnumId ?? optionIds[0] ?? ''
    }
    if (!optionIds.includes(file2SystemEnumId.value) || file2SystemEnumId.value === file1SystemEnumId.value) {
      file2SystemEnumId.value =
        savedRun.defaultFile2SystemEnumId ??
        optionIds.find((enumId) => enumId !== file1SystemEnumId.value) ??
        ''
    }
    return
  }

  file1SystemEnumId.value = savedRun.defaultFile1SystemEnumId ?? optionIds[0] ?? ''
  file2SystemEnumId.value =
    savedRun.defaultFile2SystemEnumId ??
    optionIds.find((enumId) => enumId !== file1SystemEnumId.value) ??
    ''
}

async function loadSavedRuns(): Promise<void> {
  loadingMappings.value = true
  loadError.value = null

  try {
    const response = await reconciliationFacade.listSavedRuns({
      pageIndex: 0,
      pageSize: 50,
      query: '',
    })
    savedRuns.value = response.savedRuns ?? []
    if (requestedSavedRunId.value && savedRuns.value.some((savedRun) => savedRun.savedRunId === requestedSavedRunId.value)) {
      selectedSavedRunId.value = requestedSavedRunId.value
    }
    syncSelectedSystems(selectedSavedRun.value)
  } catch (error) {
    loadError.value = error instanceof ApiCallError ? error.message : 'Unable to load saved runs.'
  } finally {
    loadingMappings.value = false
  }
}

async function loadLatestSavedOutput(savedRunId: string): Promise<void> {
  const normalizedSavedRunId = savedRunId.trim()
  if (!normalizedSavedRunId) {
    clearLatestSavedOutputState()
    return
  }

  latestSavedOutputLoading.value = true
  latestSavedOutputError.value = null
  latestSavedOutput.value = null

  try {
    const response = await reconciliationFacade.listGeneratedOutputs({
      savedRunId: normalizedSavedRunId,
      pageIndex: 0,
      pageSize: 1,
      query: '',
    })

    if (selectedSavedRunId.value !== normalizedSavedRunId) return
    latestSavedOutput.value = response.generatedOutputs?.[0] ?? null
  } catch (error) {
    if (selectedSavedRunId.value !== normalizedSavedRunId) return
    latestSavedOutput.value = null
    latestSavedOutputError.value = error instanceof ApiCallError ? error.message : 'Unable to load saved results.'
  } finally {
    if (selectedSavedRunId.value === normalizedSavedRunId) {
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

function looksLikeJsonText(text: string): boolean {
  const trimmedText = text.trimStart()
  return trimmedText.startsWith('{') || trimmedText.startsWith('[')
}

function looksLikeJsonSchemaText(text: string): boolean {
  const normalizedText = text.toLowerCase()
  return (
    normalizedText.includes('"$schema"') &&
    (normalizedText.includes('"properties"') ||
      normalizedText.includes('"items"') ||
      normalizedText.includes('"definitions"') ||
      normalizedText.includes('"$defs"'))
  )
}

function validateSelectedFile(
  file: File,
  fileText: string,
  systemName: string,
  expectedFileType: ExpectedFileType,
): string | null {
  if (expectedFileType === 'CSV' && looksLikeJsonText(fileText)) {
    const actualType = looksLikeJsonSchemaText(fileText) ? 'a JSON Schema file' : 'JSON'
    return `${systemName} expects CSV data for this saved run. ${file.name} looks like ${actualType}. Upload the source data file instead.`
  }

  if (expectedFileType === 'JSON' && !looksLikeJsonText(fileText)) {
    return `${systemName} expects JSON data for this saved run. ${file.name} does not look like JSON. Upload the source data file instead.`
  }

  if (expectedFileType === 'JSON' && looksLikeJsonSchemaText(fileText)) {
    return `${systemName} expects JSON record data for this saved run. ${file.name} looks like a JSON Schema file. Upload the source data file instead of the schema definition.`
  }

  return null
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
  if (!selectedSavedRun.value) {
    runError.value = 'Select a run before continuing.'
    return
  }

  if (currentStep.value.id !== 'file-2') {
    if (!canContinue.value) return
    currentStepIndex.value = Math.min(currentStepIndex.value + 1, workflowSteps.value.length - 1)
    return
  }

  await runDiff()
}

async function runDiff(): Promise<void> {
  if (!selectedSavedRun.value) {
    runError.value = 'Select a run before running the diff.'
    return
  }
  if (!file1.value || !file2.value) {
    runError.value = 'Upload both files before running the diff.'
    return
  }
  if (!file1SystemEnumId.value || !file2SystemEnumId.value || file1SystemEnumId.value === file2SystemEnumId.value) {
    runError.value = 'Choose two different systems before running the diff.'
    return
  }

  clearRunState()
  running.value = true

  try {
    const [file1Text, file2Text] = await Promise.all([readFileAsText(file1.value), readFileAsText(file2.value)])
    const file1ValidationError = validateSelectedFile(
      file1.value,
      file1Text,
      file1PromptSystemName.value,
      file1ExpectedFileType.value,
    )
    if (file1ValidationError) {
      runError.value = file1ValidationError
      return
    }

    const file2ValidationError = validateSelectedFile(
      file2.value,
      file2Text,
      file2PromptSystemName.value,
      file2ExpectedFileType.value,
    )
    if (file2ValidationError) {
      runError.value = file2ValidationError
      return
    }

    const response = await reconciliationFacade.runSavedRunDiff({
      savedRunId: selectedSavedRun.value.savedRunId,
      file1Name: file1.value.name,
      file1Text,
      file2Name: file2.value.name,
      file2Text,
      file1SystemEnumId: file1SystemEnumId.value,
      file2SystemEnumId: file2SystemEnumId.value,
      hasHeader: true,
    })

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

watch(selectedSavedRun, (savedRun) => {
  syncSelectedSystems(savedRun)
  clearRunState()
  resetWorkflow()
  void focusCurrentStepControlOnNextTick()
})

watch(selectedSavedRunId, (savedRunId) => {
  if (!savedRunId.trim()) {
    clearLatestSavedOutputState()
    return
  }

  void loadLatestSavedOutput(savedRunId)
})

watch(
  [() => currentStep.value.id, loadingMappings, showEmptyState],
  ([, isLoading, isEmptyState]) => {
    if (isLoading || isEmptyState) return
    void focusCurrentStepControlOnNextTick()
  },
  { immediate: true },
)

onMounted(() => {
  void loadSavedRuns()
})
</script>

<style scoped>
.reconciliation-diff-layout {
  width: min(var(--workflow-shell-width), 100%);
  min-height: 100%;
  display: grid;
  gap: 0;
}

.reconciliation-diff-main {
  width: 100%;
  display: grid;
  justify-items: center;
  gap: var(--space-5);
}

.reconciliation-run-history-board {
  position: fixed;
  left: 50%;
  bottom: calc(var(--floating-actions-bottom-offset) + var(--floating-actions-gap) + var(--floating-command-bubble-height));
  transform: translateX(-50%);
  display: grid;
  width: min(var(--workflow-question-width), calc(100vw - 2 * var(--space-6)));
  gap: var(--space-2);
  z-index: 10;
}

.reconciliation-run-history-card,
.reconciliation-run-history-card__head,
.reconciliation-run-history-card__metrics {
  display: grid;
  gap: var(--space-2);
}

.reconciliation-run-history-card {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: color-mix(in oklab, var(--surface-2) 82%, white);
}

.reconciliation-run-history-card--link {
  color: inherit;
  text-decoration: none;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    background 160ms ease;
}

.reconciliation-run-history-card--link:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--border-soft) 70%, var(--accent));
  background: color-mix(in oklab, var(--surface-2) 78%, var(--accent));
}

.reconciliation-run-history-card__head span {
  color: var(--text-muted);
}

.reconciliation-run-history-card__date {
  font-size: 0.95rem;
}

.reconciliation-run-history-card__metrics {
  margin: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-1);
}

.reconciliation-run-history-card__metrics div {
  display: grid;
  gap: 0.15rem;
}

.reconciliation-run-history-card__metrics dt {
  color: var(--text-muted);
  font-size: 0.86rem;
}

.reconciliation-run-history-card__metrics dd {
  margin: 0;
  font-size: 0.98rem;
}

.reconciliation-run-history-link {
  justify-self: start;
  color: var(--text-muted);
  text-decoration: none;
  font-size: 0.9rem;
}

.reconciliation-run-history-link:hover {
  color: var(--text);
  text-decoration: underline;
}

@media (max-width: 760px) {
  .reconciliation-diff-layout,
  .reconciliation-diff-main {
    gap: var(--space-4);
  }

  .reconciliation-run-history-card__metrics {
    grid-template-columns: 1fr;
  }

  .reconciliation-run-history-board {
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
