<template>
  <WorkflowPage :progress-percent="progressPercent" aria-label="Reconciliation setup progress" center-stage>
    <InlineValidation v-if="pageError" tone="error" :message="pageError" />

    <WorkflowStepForm
      ref="stepForm"
      class="workflow-step-shell"
      :question="currentQuestion"
      :primary-label="isCreateStep ? 'Create' : 'OK'"
      :submit-disabled="isCreateStep ? !canCreateRun || loadingSelections : !canProceed || loadingSelections"
      :show-back="currentStepIndex > 0"
      :show-primary-action="!isFileTypeChoiceStep"
      :show-enter-hint="!isFileTypeChoiceStep"
      :allow-select-enter="true"
      :primary-test-id="isCreateStep ? 'create-run' : 'wizard-next'"
      @submit="handlePrimarySubmit"
      @back="goBack"
    >
      <template v-if="isFileTypeChoiceStep">
        <WorkflowShortcutChoiceCards
          :options="activeShortcutChoiceOptions"
          :selected-value="activeSelectValue"
          :test-id-prefix="activeShortcutChoiceTestPrefix"
          @choose="advanceFromFileTypeChoice"
        />
      </template>

      <template v-else-if="isSelectStep">
        <label class="wizard-input-shell">
          <WorkflowSelect
            v-model="activeSelectValue"
            :test-id="activeSelectTestId"
            :disabled="loadingSelections"
            :options="activeSelectOptions"
            :placeholder="loadingSelections ? 'Loading...' : currentPlaceholder"
          />
        </label>

        <InlineValidation v-if="activeSelectError" tone="error" :message="activeSelectError" />

        <div v-if="isSchemaSelectionStep" class="reconciliation-create-schema-choice">
          <p class="wizard-or" data-testid="create-schema-divider">Or</p>
          <button
            type="button"
            class="wizard-secondary-link reconciliation-create-schema-link"
            data-testid="create-schema-from-reconciliation"
            @click="openSchemaCreateWorkflow"
          >
            Create New Schema
          </button>
        </div>
      </template>

      <template v-else>
        <label class="wizard-input-shell">
          <input
            :name="activeTextName"
            v-model="activeTextValue"
            :class="['wizard-answer-control', { empty: showEmptyState && !activeTextValue.trim() }]"
            :placeholder="currentPlaceholder"
          />
        </label>
      </template>
    </WorkflowStepForm>
  </WorkflowPage>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch, type ComponentPublicInstance } from 'vue'
import { useRouter } from 'vue-router'
import WorkflowPage from '../../components/workflow/WorkflowPage.vue'
import WorkflowShortcutChoiceCards, {
  type WorkflowShortcutChoiceOption,
} from '../../components/workflow/WorkflowShortcutChoiceCards.vue'
import WorkflowSelect, { type WorkflowSelectOption } from '../../components/workflow/WorkflowSelect.vue'
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade, reconciliationFacade, settingsFacade } from '../../lib/api/facade'
import type { JsonSchemaField, JsonSchemaSummary } from '../../lib/api/types'
import {
  buildCreateRuleSetRunPayload,
  readReconciliationRuleSetDraftState,
  type ReconciliationRuleSetDraft,
} from '../../lib/reconciliationRuleSetDraft'
import { resolveSchemaLabel } from '../../lib/utils/schemaLabel'
import { buildWorkflowOriginState, readWorkflowOriginFromHistoryState } from '../../lib/workflowOrigin'

type StepId =
  | 'run-name'
  | 'description'
  | 'file1-system'
  | 'file1-filetype'
  | 'file1-schema'
  | 'file1-primary-id'
  | 'file2-system'
  | 'file2-filetype'
  | 'file2-schema'
  | 'file2-primary-id'

interface WizardStep {
  id: StepId
}

const FILE_TYPE_JSON = 'DftJson'
const FILE_TYPE_CSV = 'DftCsv'
const SHORTCUT_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']
const SYSTEM_LABEL_OVERRIDES: Record<string, string> = {
  NETSUITE: 'NetSuite',
  OMS: 'OMS',
  SHOPIFY: 'Shopify',
}

const router = useRouter()
const stepForm = ref<ComponentPublicInstance | null>(null)

const loadingOptions = ref(false)
const pendingSchemaFieldLoads = ref(0)
const loadingSchemaFields = computed(() => pendingSchemaFieldLoads.value > 0)
const pageError = ref<string | null>(null)
const currentStepIndex = ref(0)
const systemOptions = ref<WorkflowSelectOption[]>([])
const fileTypeOptions = ref<WorkflowSelectOption[]>([])
const jsonSchemas = ref<JsonSchemaSummary[]>([])
const flattenedFields = ref<Record<string, JsonSchemaField[]>>({})
const runName = ref('')
const description = ref('')
const file1SystemEnumId = ref('')
const file1FileTypeEnumId = ref(FILE_TYPE_CSV)
const file1JsonSchemaId = ref('')
const file1PrimaryIdExpression = ref('')
const file2SystemEnumId = ref('')
const file2FileTypeEnumId = ref(FILE_TYPE_CSV)
const file2JsonSchemaId = ref('')
const file2PrimaryIdExpression = ref('')

const loadingSelections = computed(() => loadingOptions.value || loadingSchemaFields.value)
const file1UsesJson = computed(() => file1FileTypeEnumId.value === FILE_TYPE_JSON)
const file2UsesJson = computed(() => file2FileTypeEnumId.value === FILE_TYPE_JSON)
const selectedFile1Schema = computed(() => jsonSchemas.value.find((schema) => schema.jsonSchemaId === file1JsonSchemaId.value) ?? null)
const selectedFile2Schema = computed(() => jsonSchemas.value.find((schema) => schema.jsonSchemaId === file2JsonSchemaId.value) ?? null)
const file1SchemaLabel = computed(() => (selectedFile1Schema.value ? formatSchemaLabel(selectedFile1Schema.value) : 'source 1'))
const file2SchemaLabel = computed(() => (selectedFile2Schema.value ? formatSchemaLabel(selectedFile2Schema.value) : 'source 2'))

const steps = computed<WizardStep[]>(() => {
  const stepList: WizardStep[] = [
    { id: 'run-name' },
    { id: 'description' },
    { id: 'file1-system' },
    { id: 'file1-filetype' },
    { id: 'file1-primary-id' },
    { id: 'file2-system' },
    { id: 'file2-filetype' },
    { id: 'file2-primary-id' },
  ]

  if (file1UsesJson.value) {
    stepList.splice(stepList.findIndex((step) => step.id === 'file1-primary-id'), 0, { id: 'file1-schema' })
  }
  if (file2UsesJson.value) {
    stepList.splice(stepList.findIndex((step) => step.id === 'file2-primary-id'), 0, { id: 'file2-schema' })
  }

  return stepList
})

const currentStep = computed<WizardStep>(() => steps.value[currentStepIndex.value] ?? steps.value[steps.value.length - 1]!)
const isCreateStep = computed(() => currentStepIndex.value === steps.value.length - 1)
const progressPercent = computed(() => ((Math.max(1, currentStepIndex.value + 1) / steps.value.length) * 100).toFixed(2))
const trimmedRunName = computed(() => runName.value.trim())
const file1SystemLabel = computed(() => resolveSystemLabel(file1SystemEnumId.value))
const file2SystemLabel = computed(() => resolveSystemLabel(file2SystemEnumId.value))
const activeDraft = computed<ReconciliationRuleSetDraft>(() => ({
  runName: trimmedRunName.value,
  description: description.value.trim() || undefined,
  file1SystemEnumId: file1SystemEnumId.value,
  file1SystemLabel: file1SystemLabel.value || undefined,
  file1FileTypeEnumId: file1FileTypeEnumId.value,
  file1JsonSchemaId: file1JsonSchemaId.value || undefined,
  file1SchemaLabel: resolveSelectedSchemaLabel(file1JsonSchemaId.value),
  file1SchemaFileName: resolveSchemaFileName(file1JsonSchemaId.value),
  file1PrimaryIdExpression: file1PrimaryIdExpression.value.trim(),
  file2SystemEnumId: file2SystemEnumId.value,
  file2SystemLabel: file2SystemLabel.value || undefined,
  file2FileTypeEnumId: file2FileTypeEnumId.value,
  file2JsonSchemaId: file2JsonSchemaId.value || undefined,
  file2SchemaLabel: resolveSelectedSchemaLabel(file2JsonSchemaId.value),
  file2SchemaFileName: resolveSchemaFileName(file2JsonSchemaId.value),
  file2PrimaryIdExpression: file2PrimaryIdExpression.value.trim(),
}))

const currentQuestion = computed(() => {
  switch (currentStep.value.id) {
    case 'run-name':
      return 'What should this run be called?'
    case 'description':
      return 'What description should this run use?'
    case 'file1-system':
      return 'Which system provides the first file?'
    case 'file1-filetype':
      return `What file type does ${file1SystemLabel.value || 'source 1'} use?`
    case 'file1-schema':
      return `Which saved schema describes the ${file1SystemLabel.value || 'source 1'} JSON?`
    case 'file1-primary-id':
      return file1UsesJson.value
        ? `Which field identifies each record in ${file1SchemaLabel.value}?`
        : `What primary ID expression identifies each record in ${file1SystemLabel.value || 'source 1'}?`
    case 'file2-system':
      return 'Which system provides the second file?'
    case 'file2-filetype':
      return `What file type does ${file2SystemLabel.value || 'source 2'} use?`
    case 'file2-schema':
      return `Which saved schema describes the ${file2SystemLabel.value || 'source 2'} JSON?`
    case 'file2-primary-id':
      return file2UsesJson.value
        ? `Which field identifies each record in ${file2SchemaLabel.value}?`
        : `What primary ID expression identifies each record in ${file2SystemLabel.value || 'source 2'}?`
    default:
      return ''
  }
})

const isSelectStep = computed(() => {
  switch (currentStep.value.id) {
    case 'file1-system':
    case 'file1-filetype':
    case 'file1-schema':
    case 'file2-system':
    case 'file2-filetype':
    case 'file2-schema':
      return true
    case 'file1-primary-id':
      return file1UsesJson.value
    case 'file2-primary-id':
      return file2UsesJson.value
    default:
      return false
  }
})

const activeSelectValue = computed({
  get: () => {
    switch (currentStep.value.id) {
      case 'file1-system':
        return file1SystemEnumId.value
      case 'file1-filetype':
        return file1FileTypeEnumId.value
      case 'file1-schema':
        return file1JsonSchemaId.value
      case 'file1-primary-id':
        return file1UsesJson.value ? file1PrimaryIdExpression.value : ''
      case 'file2-system':
        return file2SystemEnumId.value
      case 'file2-filetype':
        return file2FileTypeEnumId.value
      case 'file2-schema':
        return file2JsonSchemaId.value
      case 'file2-primary-id':
        return file2UsesJson.value ? file2PrimaryIdExpression.value : ''
      default:
        return ''
    }
  },
  set: (value: string) => {
    switch (currentStep.value.id) {
      case 'file1-system':
        file1SystemEnumId.value = value
        file1JsonSchemaId.value = ''
        if (file1UsesJson.value) file1PrimaryIdExpression.value = ''
        break
      case 'file1-filetype':
        file1FileTypeEnumId.value = value
        file1JsonSchemaId.value = ''
        file1PrimaryIdExpression.value = ''
        break
      case 'file1-schema':
        file1JsonSchemaId.value = value
        file1PrimaryIdExpression.value = ''
        break
      case 'file1-primary-id':
        if (file1UsesJson.value) file1PrimaryIdExpression.value = value
        break
      case 'file2-system':
        file2SystemEnumId.value = value
        file2JsonSchemaId.value = ''
        if (file2UsesJson.value) file2PrimaryIdExpression.value = ''
        break
      case 'file2-filetype':
        file2FileTypeEnumId.value = value
        file2JsonSchemaId.value = ''
        file2PrimaryIdExpression.value = ''
        break
      case 'file2-schema':
        file2JsonSchemaId.value = value
        file2PrimaryIdExpression.value = ''
        break
      case 'file2-primary-id':
        if (file2UsesJson.value) file2PrimaryIdExpression.value = value
        break
    }
  },
})

const activeSelectOptions = computed(() => {
  switch (currentStep.value.id) {
    case 'file1-system':
    case 'file2-system':
      return systemOptions.value
    case 'file1-filetype':
    case 'file2-filetype':
      return fileTypeOptions.value
    case 'file1-schema':
      return buildSchemaOptions(file1SystemEnumId.value)
    case 'file1-primary-id':
      return file1UsesJson.value ? buildFieldOptions(file1JsonSchemaId.value) : []
    case 'file2-schema':
      return buildSchemaOptions(file2SystemEnumId.value)
    case 'file2-primary-id':
      return file2UsesJson.value ? buildFieldOptions(file2JsonSchemaId.value) : []
    default:
      return []
  }
})

const activeSelectTestId = computed(() => {
  switch (currentStep.value.id) {
    case 'file1-system':
      return 'file1-system-select'
    case 'file1-filetype':
      return 'file1-filetype-select'
    case 'file1-schema':
      return 'file1-schema-select'
    case 'file1-primary-id':
      return 'file1-field-select'
    case 'file2-system':
      return 'file2-system-select'
    case 'file2-filetype':
      return 'file2-filetype-select'
    case 'file2-schema':
      return 'file2-schema-select'
    case 'file2-primary-id':
      return 'file2-field-select'
    default:
      return 'workflow-select'
  }
})

const activeTextValue = computed({
  get: () => {
    switch (currentStep.value.id) {
      case 'run-name':
        return runName.value
      case 'description':
        return description.value
      case 'file1-primary-id':
        return file1UsesJson.value ? '' : file1PrimaryIdExpression.value
      case 'file2-primary-id':
        return file2UsesJson.value ? '' : file2PrimaryIdExpression.value
      default:
        return ''
    }
  },
  set: (value: string) => {
    switch (currentStep.value.id) {
      case 'run-name':
        runName.value = value
        break
      case 'description':
        description.value = value
        break
      case 'file1-primary-id':
        if (!file1UsesJson.value) file1PrimaryIdExpression.value = value
        break
      case 'file2-primary-id':
        if (!file2UsesJson.value) file2PrimaryIdExpression.value = value
        break
    }
  },
})

const activeTextName = computed(() => {
  switch (currentStep.value.id) {
    case 'run-name':
      return 'runName'
    case 'description':
      return 'description'
    case 'file1-primary-id':
      return 'file1PrimaryIdExpression'
    case 'file2-primary-id':
      return 'file2PrimaryIdExpression'
    default:
      return 'workflowInput'
  }
})

const currentPlaceholder = computed(() => {
  switch (currentStep.value.id) {
    case 'run-name':
      return 'Orders vs Shopify'
    case 'description':
      return 'Optional context for this run...'
    case 'file1-system':
    case 'file2-system':
      return 'Select system...'
    case 'file1-filetype':
    case 'file2-filetype':
      return 'Select file type...'
    case 'file1-schema':
    case 'file2-schema':
      return 'Select schema...'
    case 'file1-primary-id':
      return file1UsesJson.value
        ? (file1JsonSchemaId.value ? 'Select ID field...' : 'Choose a schema first')
        : 'order_id'
    case 'file2-primary-id':
      return file2UsesJson.value
        ? (file2JsonSchemaId.value ? 'Select ID field...' : 'Choose a schema first')
        : 'order_id'
    default:
      return ''
  }
})

const showEmptyState = computed(() =>
  ['run-name', 'file1-primary-id', 'file2-primary-id'].includes(currentStep.value.id) &&
  !isSelectStep.value,
)

const isFileTypeChoiceStep = computed(() => currentStep.value.id === 'file1-filetype' || currentStep.value.id === 'file2-filetype')
const isSchemaSelectionStep = computed(() => currentStep.value.id === 'file1-schema' || currentStep.value.id === 'file2-schema')

const activeShortcutChoiceTestPrefix = computed(() => {
  switch (currentStep.value.id) {
    case 'file1-filetype':
      return 'file1-filetype-choice'
    case 'file2-filetype':
      return 'file2-filetype-choice'
    default:
      return 'workflow-choice'
  }
})

const activeShortcutChoiceOptions = computed<WorkflowShortcutChoiceOption[]>(() =>
  activeSelectOptions.value.map((option, index) => ({
    value: option.value,
    label: option.label,
    shortcutKey: SHORTCUT_KEYS[index] ?? String(index + 1),
  })),
)

const systemSelectionError = computed(() => {
  if (currentStep.value.id !== 'file2-system') return ''
  if (!file2SystemEnumId.value) return ''
  if (file1SystemEnumId.value === file2SystemEnumId.value) {
    return 'Source 2 must use a different system than source 1.'
  }
  return ''
})

const schemaSelectionError = computed(() => {
  switch (currentStep.value.id) {
    case 'file1-schema':
      return buildSchemaOptions(file1SystemEnumId.value).length === 0
        ? `No saved JSON schemas are available for ${file1SystemLabel.value || 'source 1'}.`
        : ''
    case 'file2-schema':
      return buildSchemaOptions(file2SystemEnumId.value).length === 0
        ? `No saved JSON schemas are available for ${file2SystemLabel.value || 'source 2'}.`
        : ''
    default:
      return ''
  }
})

const schemaFieldSelectionError = computed(() => {
  switch (currentStep.value.id) {
    case 'file1-primary-id':
      if (!file1UsesJson.value) return ''
      if (!file1JsonSchemaId.value) return 'Choose a schema first.'
      return buildFieldOptions(file1JsonSchemaId.value).length === 0
        ? `No comparable fields are available in ${file1SchemaLabel.value}.`
        : ''
    case 'file2-primary-id':
      if (!file2UsesJson.value) return ''
      if (!file2JsonSchemaId.value) return 'Choose a schema first.'
      return buildFieldOptions(file2JsonSchemaId.value).length === 0
        ? `No comparable fields are available in ${file2SchemaLabel.value}.`
        : ''
    default:
      return ''
  }
})

const activeSelectError = computed(() => systemSelectionError.value || schemaSelectionError.value || schemaFieldSelectionError.value)

const canProceed = computed(() => {
  switch (currentStep.value.id) {
    case 'run-name':
      return trimmedRunName.value.length > 0
    case 'description':
      return true
    case 'file1-system':
      return file1SystemEnumId.value.length > 0
    case 'file1-filetype':
      return file1FileTypeEnumId.value.length > 0
    case 'file1-schema':
      return file1JsonSchemaId.value.length > 0 && !schemaSelectionError.value
    case 'file1-primary-id':
      return file1PrimaryIdExpression.value.trim().length > 0 && !schemaFieldSelectionError.value
    case 'file2-system':
      return file2SystemEnumId.value.length > 0 && file2SystemEnumId.value !== file1SystemEnumId.value
    case 'file2-filetype':
      return file2FileTypeEnumId.value.length > 0
    case 'file2-schema':
      return file2JsonSchemaId.value.length > 0 && !schemaSelectionError.value
    case 'file2-primary-id':
      return file2PrimaryIdExpression.value.trim().length > 0 && !schemaFieldSelectionError.value
    default:
      return false
  }
})

const canCreateRun = computed(() => {
  return (
    trimmedRunName.value.length > 0 &&
    file1SystemEnumId.value.length > 0 &&
    file1FileTypeEnumId.value.length > 0 &&
    (!file1UsesJson.value || !!resolveSchemaFileName(file1JsonSchemaId.value)) &&
    file1PrimaryIdExpression.value.trim().length > 0 &&
    file2SystemEnumId.value.length > 0 &&
    file2FileTypeEnumId.value.length > 0 &&
    (!file2UsesJson.value || !!resolveSchemaFileName(file2JsonSchemaId.value)) &&
    file2PrimaryIdExpression.value.trim().length > 0 &&
    file1SystemEnumId.value !== file2SystemEnumId.value
  )
})

watch(
  () => steps.value.length,
  (nextLength) => {
    if (currentStepIndex.value >= nextLength) {
      currentStepIndex.value = Math.max(0, nextLength - 1)
    }
  },
)

watch(file1JsonSchemaId, async (nextSchemaId) => {
  if (!file1UsesJson.value || !nextSchemaId) return
  await ensureFieldsLoaded(nextSchemaId)
  if (currentStep.value.id === 'file1-schema' && file1JsonSchemaId.value === nextSchemaId) {
    await focusActiveSelectTrigger()
  }
})

watch(file2JsonSchemaId, async (nextSchemaId) => {
  if (!file2UsesJson.value || !nextSchemaId) return
  await ensureFieldsLoaded(nextSchemaId)
  if (currentStep.value.id === 'file2-schema' && file2JsonSchemaId.value === nextSchemaId) {
    await focusActiveSelectTrigger()
  }
})

function resolveSystemLabel(enumId: string): string {
  const option = systemOptions.value.find((systemOption) => systemOption.value === enumId)
  return softenSystemLabel(option?.label || enumId)
}

function formatSchemaLabel(schema: JsonSchemaSummary): string {
  return resolveSchemaLabel({
    ...schema,
    systemLabel: softenSystemLabel(schema.systemLabel || schema.systemEnumId || ''),
  })
}

function buildSchemaOptions(systemEnumId: string): WorkflowSelectOption[] {
  return jsonSchemas.value
    .filter((schema) => !systemEnumId || schema.systemEnumId === systemEnumId)
    .map((schema) => ({
      value: schema.jsonSchemaId,
      label: formatSchemaLabel(schema),
    }))
}

function buildFieldOptions(schemaId: string): WorkflowSelectOption[] {
  return (flattenedFields.value[schemaId] ?? []).map((field) => ({
    value: field.fieldPath,
    label: field.fieldPath,
  }))
}

function resolveSchemaFileName(schemaId: string): string | undefined {
  const schema = jsonSchemas.value.find((candidate) => candidate.jsonSchemaId === schemaId)
  return schema?.schemaName || undefined
}

function resolveSelectedSchemaLabel(schemaId: string): string | undefined {
  const schema = jsonSchemas.value.find((candidate) => candidate.jsonSchemaId === schemaId)
  return schema ? formatSchemaLabel(schema) : undefined
}

function softenSystemLabel(label: string): string {
  const trimmedLabel = label.trim()
  if (!trimmedLabel) return ''

  const override = SYSTEM_LABEL_OVERRIDES[trimmedLabel.toUpperCase()]
  if (override) return override

  if (trimmedLabel === trimmedLabel.toUpperCase() && trimmedLabel.length > 3) {
    return trimmedLabel.toLowerCase().replace(/\b[a-z]/g, (character) => character.toUpperCase())
  }

  return trimmedLabel
}

async function ensureFieldsLoaded(schemaId: string): Promise<void> {
  if (!schemaId || flattenedFields.value[schemaId]) return

  pendingSchemaFieldLoads.value += 1
  pageError.value = null

  try {
    const response = await jsonSchemaFacade.flatten({ jsonSchemaId: schemaId })
    const comparableFields = (response.fieldList ?? []).filter((field) => field.type !== 'object' && field.type !== 'array')
    flattenedFields.value = {
      ...flattenedFields.value,
      [schemaId]: comparableFields,
    }
  } catch (error) {
    pageError.value = error instanceof ApiCallError ? error.message : 'Unable to load schema fields.'
  } finally {
    pendingSchemaFieldLoads.value = Math.max(0, pendingSchemaFieldLoads.value - 1)
  }
}

async function focusActiveSelectTrigger(): Promise<void> {
  await nextTick()

  const formRoot = stepForm.value?.$el
  if (!(formRoot instanceof HTMLElement)) return

  const activeTrigger = formRoot.querySelector<HTMLElement>(`[data-testid="${activeSelectTestId.value}"]`)
  if (!activeTrigger) return

  activeTrigger.focus()
}

function resolveActiveShortcutChoiceByKey(key: string): string | null {
  const normalizedKey = key.trim().toLowerCase()
  if (!normalizedKey) return null

  const matchedOption = activeShortcutChoiceOptions.value.find((option) => option.shortcutKey.toLowerCase() === normalizedKey)
  return matchedOption?.value ?? null
}

function advanceFromFileTypeChoice(value: string): void {
  if (!isFileTypeChoiceStep.value || loadingSelections.value) return

  activeSelectValue.value = value
  if (!canProceed.value) return

  currentStepIndex.value = Math.min(currentStepIndex.value + 1, steps.value.length - 1)
}

function handleFileTypeChoiceKeydown(event: KeyboardEvent): void {
  if (!isFileTypeChoiceStep.value) return
  if (event.defaultPrevented || event.repeat || event.isComposing) return
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

  const matchedChoice = resolveActiveShortcutChoiceByKey(event.key)
  if (!matchedChoice) return

  event.preventDefault()
  advanceFromFileTypeChoice(matchedChoice)
}

function goBack(): void {
  pageError.value = null
  currentStepIndex.value = Math.max(currentStepIndex.value - 1, 0)
}

async function restoreDraftFromHistoryState(): Promise<void> {
  const draftState = readReconciliationRuleSetDraftState(typeof window === 'undefined' ? null : window.history.state)
  if (!draftState) return

  runName.value = draftState.draft.runName
  description.value = draftState.draft.description ?? ''
  file1SystemEnumId.value = draftState.draft.file1SystemEnumId
  file1FileTypeEnumId.value = draftState.draft.file1FileTypeEnumId
  file1JsonSchemaId.value = draftState.draft.file1JsonSchemaId ?? ''
  file1PrimaryIdExpression.value = draftState.draft.file1PrimaryIdExpression
  file2SystemEnumId.value = draftState.draft.file2SystemEnumId
  file2FileTypeEnumId.value = draftState.draft.file2FileTypeEnumId
  file2JsonSchemaId.value = draftState.draft.file2JsonSchemaId ?? ''
  file2PrimaryIdExpression.value = draftState.draft.file2PrimaryIdExpression

  const targetStepId = draftState.resumeStepId ?? steps.value[steps.value.length - 1]?.id
  const targetStepIndex = steps.value.findIndex((step) => step.id === targetStepId)
  currentStepIndex.value = targetStepIndex >= 0 ? targetStepIndex : Math.max(0, steps.value.length - 1)

  await Promise.all([
    file1JsonSchemaId.value ? ensureFieldsLoaded(file1JsonSchemaId.value) : Promise.resolve(),
    file2JsonSchemaId.value ? ensureFieldsLoaded(file2JsonSchemaId.value) : Promise.resolve(),
  ])
}

async function loadOptions(): Promise<void> {
  loadingOptions.value = true
  pageError.value = null

  try {
    const [systemsResponse, fileTypesResponse, schemasResponse] = await Promise.all([
      settingsFacade.listEnumOptions('DarpanSystemSource'),
      settingsFacade.listEnumOptions('DarpanFileType'),
      jsonSchemaFacade.list({
        pageIndex: 0,
        pageSize: 200,
        query: '',
      }),
    ])

    systemOptions.value = (systemsResponse.options ?? []).map((option) => ({
      value: option.enumId,
      label: option.label || option.enumId,
    }))
    fileTypeOptions.value = (fileTypesResponse.options ?? []).map((option) => ({
      value: option.enumId,
      label: option.label || option.enumCode || option.enumId,
    }))
    jsonSchemas.value = schemasResponse.schemas ?? []
  } catch (error) {
    pageError.value = error instanceof ApiCallError ? error.message : 'Unable to load reconciliation setup options.'
  } finally {
    loadingOptions.value = false
  }
}

async function handlePrimarySubmit(): Promise<void> {
  if (isCreateStep.value) {
    await createRun()
    return
  }

  if (!canProceed.value) return
  currentStepIndex.value = Math.min(currentStepIndex.value + 1, steps.value.length - 1)
}

async function openSchemaCreateWorkflow(): Promise<void> {
  await router.push({
    path: '/schemas/create',
    state: buildWorkflowOriginState('Reconciliation Setup', '/reconciliation/create'),
  })
}

async function createRun(): Promise<void> {
  if (!canCreateRun.value) return

  pageError.value = null

  try {
    const response = await reconciliationFacade.createRuleSetRun(buildCreateRuleSetRunPayload(activeDraft.value))
    if (!response.savedRun?.savedRunId) {
      throw new Error('Missing saved run identifier.')
    }
    const workflowOrigin = readWorkflowOriginFromHistoryState()
    await router.push(workflowOrigin?.path ?? { name: 'hub' })
  } catch (error) {
    pageError.value = error instanceof ApiCallError ? error.message : 'Unable to create reconciliation flow.'
  }
}

onMounted(async () => {
  await loadOptions()
  await restoreDraftFromHistoryState()
})

onMounted(() => {
  window.addEventListener('keydown', handleFileTypeChoiceKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleFileTypeChoiceKeydown)
})
</script>

<style scoped>
.reconciliation-create-schema-choice {
  display: grid;
  gap: 0.35rem;
  justify-items: start;
}

.reconciliation-create-schema-link {
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}
</style>
