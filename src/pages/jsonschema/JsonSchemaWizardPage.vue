<template>
  <WorkflowPage :progress-percent="progressPercent" aria-label="Schema setup progress" center-stage>
    <InlineValidation v-if="pageError" tone="error" :message="pageError" />

    <WorkflowStepForm
      :question="currentQuestion"
      :primary-label="currentStep.id === 'name' ? 'Save' : 'OK'"
      :submit-disabled="submitDisabled"
      :show-back="currentStepIndex > 0"
      :show-primary-action="currentStep.id !== 'upload-intent'"
      :show-enter-hint="currentStep.id !== 'upload-intent'"
      :primary-test-id="currentStep.id === 'name' ? 'save-schema' : 'wizard-next'"
      @submit="handlePrimarySubmit"
      @back="goBack"
    >
      <template v-if="currentStep.id === 'upload-intent'">
        <div class="schema-kind-grid">
          <button
            v-for="option in uploadIntentOptions"
            :key="option.value"
            :class="[
              'schema-kind-card',
              {
                'schema-kind-card--active': selectedUploadIntent === option.value,
              },
            ]"
            :data-testid="`upload-intent-${option.value}`"
            :aria-keyshortcuts="option.shortcutKey.toLowerCase()"
            type="button"
            @click="advanceFromUploadIntent(option.value)"
          >
            <div class="schema-kind-card__header">
              <span class="schema-kind-card__key">{{ option.shortcutKey }}</span>
              <span class="schema-kind-card__label">{{ option.label }}</span>
            </div>
          </button>
        </div>
      </template>

      <template v-else-if="currentStep.id === 'upload'">
        <label class="wizard-input-shell wizard-file-shell">
          <input
            class="wizard-file-input"
            type="file"
            :accept="uploadAccept"
            @change="onFileChange"
          />
          <span :class="['wizard-answer-control', 'wizard-file-answer', { empty: !selectedFileName }]">
            {{ selectedFileName || uploadPlaceholder }}
          </span>
        </label>
      </template>

      <template v-else-if="currentStep.id === 'verify'">
        <div class="wizard-input-shell">
          <EmptyState
            v-if="fieldRows.length === 0"
            title="No refined fields available"
            description="Upload a sample JSON file to preview the inferred field list."
          />

          <AppTableFrame v-else :columns="fieldColumns" :rows="fieldRowsAsRows">
            <template #cell-required="{ row }">
              <StatusBadge :label="row.required ? 'Required' : 'Optional'" :tone="row.required ? 'success' : 'neutral'" />
            </template>
          </AppTableFrame>
        </div>
      </template>

      <template v-else>
        <label class="wizard-input-shell">
          <input
            name="schemaName"
            v-model="schemaName"
            :class="['wizard-answer-control', { empty: !schemaName.trim() }]"
            placeholder="Type your answer here..."
            @keydown.enter.stop="handleNameInputEnter"
          />
        </label>
      </template>
    </WorkflowStepForm>
  </WorkflowPage>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import WorkflowPage from '../../components/workflow/WorkflowPage.vue'
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import AppTableFrame from '../../components/ui/AppTableFrame.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade } from '../../lib/api/facade'
import { invokePrimaryActionOnEnter } from '../../lib/keyboard'
import type { JsonSchemaField } from '../../lib/api/types'

type SchemaWorkflowStep = 'upload-intent' | 'upload' | 'verify' | 'name'
type SchemaUploadIntent = 'schema' | 'sample'

interface WorkflowStep {
  id: SchemaWorkflowStep
  title: string
}

interface UploadIntentOption {
  value: SchemaUploadIntent
  label: string
  shortcutKey: string
}

const uploadIntentOptions: UploadIntentOption[] = [
  {
    value: 'schema',
    label: 'Schema file',
    shortcutKey: 'A',
  },
  {
    value: 'sample',
    label: 'Sample file',
    shortcutKey: 'B',
  },
]

const fieldColumns = [
  { key: 'fieldPath', label: 'Field Path' },
  { key: 'type', label: 'Type' },
  { key: 'required', label: 'Required' },
]

const router = useRouter()

const currentStepIndex = ref(0)
const selectedUploadIntent = ref<SchemaUploadIntent | ''>('')
const selectedFile = ref<File | null>(null)
const selectedFileName = ref('')
const schemaName = ref('')
const schemaTextToSave = ref('')
const fieldRows = ref<JsonSchemaField[]>([])
const loading = ref(false)
const saving = ref(false)
const pageError = ref<string | null>(null)

function buildWorkflowSteps(uploadIntent: SchemaUploadIntent | ''): WorkflowStep[] {
  const steps: WorkflowStep[] = [
    { id: 'upload-intent', title: 'Are you uploading a schema file or a sample file?' },
    {
      id: 'upload',
      title: uploadIntent === 'schema' ? 'Upload the schema file' : uploadIntent === 'sample' ? 'Upload the sample file' : 'Upload the file',
    },
  ]

  if (uploadIntent !== 'schema') {
    steps.push({ id: 'verify', title: 'Verify the schema' })
  }

  steps.push({ id: 'name', title: 'Name the schema' })
  return steps
}

function resolveUploadIntentByKey(key: string): SchemaUploadIntent | null {
  const normalizedKey = key.trim().toLowerCase()
  if (!normalizedKey) return null

  const matchedOption = uploadIntentOptions.find((option) => option.shortcutKey.toLowerCase() === normalizedKey)
  return matchedOption?.value ?? null
}

const workflowSteps = computed<WorkflowStep[]>(() => buildWorkflowSteps(selectedUploadIntent.value))
const currentStep = computed<WorkflowStep>(() => {
  const lastStepIndex = Math.max(0, workflowSteps.value.length - 1)
  return workflowSteps.value[Math.min(currentStepIndex.value, lastStepIndex)] ?? workflowSteps.value[0]!
})
const currentQuestion = computed(() => currentStep.value.title)
const progressPercent = computed(() => ((Math.max(1, currentStepIndex.value + 1) / workflowSteps.value.length) * 100).toFixed(2))
const fieldRowsAsRows = computed(() => fieldRows.value as Array<Record<string, unknown>>)
const uploadPlaceholder = computed(() => {
  if (selectedUploadIntent.value === 'schema') return 'Choose a schema file to upload...'
  if (selectedUploadIntent.value === 'sample') return 'Choose a sample file to upload...'
  return 'Choose a file to upload...'
})
const submitDisabled = computed(() => {
  switch (currentStep.value.id) {
    case 'upload-intent':
      return !selectedUploadIntent.value
    case 'upload':
      return !selectedFile.value || loading.value
    case 'verify':
      return fieldRows.value.length === 0
    case 'name':
      return !schemaName.value.trim() || !schemaTextToSave.value.trim() || saving.value
    default:
      return true
  }
})
const uploadAccept = computed(() => '.json,application/json,application/schema+json')

function deriveSchemaName(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, '')
  return baseName.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'schema'
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsText(file)
  })
}

function selectUploadIntent(uploadIntent: SchemaUploadIntent): void {
  const previousFileName = selectedFileName.value
  const shouldResetDerivedName = previousFileName
    && schemaName.value.trim()
    && schemaName.value.trim() === deriveSchemaName(previousFileName)

  selectedUploadIntent.value = uploadIntent
  selectedFile.value = null
  selectedFileName.value = ''
  schemaTextToSave.value = ''
  fieldRows.value = []
  pageError.value = null

  if (shouldResetDerivedName) {
    schemaName.value = ''
  }
}

function advanceFromUploadIntent(uploadIntent: SchemaUploadIntent): void {
  selectUploadIntent(uploadIntent)
  currentStepIndex.value = Math.min(currentStepIndex.value + 1, workflowSteps.value.length - 1)
}

function onFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  selectedFile.value = file
  selectedFileName.value = file?.name ?? ''
  schemaTextToSave.value = ''
  fieldRows.value = []
  pageError.value = null

  if (file && !schemaName.value.trim()) {
    schemaName.value = deriveSchemaName(file.name)
  }
}

async function prepareSchemaFileUpload(): Promise<boolean> {
  if (!selectedFile.value) return false

  loading.value = true
  pageError.value = null

  try {
    const jsonText = await readFileAsText(selectedFile.value)
    JSON.parse(jsonText)
    schemaTextToSave.value = jsonText
    return true
  } catch (uploadError) {
    pageError.value = uploadError instanceof SyntaxError ? 'Schema file must contain valid JSON.' : 'Unable to read schema file.'
    return false
  } finally {
    loading.value = false
  }
}

async function inferSchemaFromSampleUpload(): Promise<boolean> {
  if (!selectedFile.value) return false

  loading.value = true
  pageError.value = null

  try {
    const jsonText = await readFileAsText(selectedFile.value)
    const response = await jsonSchemaFacade.inferFromText({ jsonText })
    schemaTextToSave.value = response.jsonSchemaString ?? ''
    fieldRows.value = response.fieldList ?? []

    if (!schemaTextToSave.value.trim() || fieldRows.value.length === 0) {
      pageError.value = 'No refined fields were returned for the uploaded sample file.'
      return false
    }

    return true
  } catch (inferError) {
    pageError.value = inferError instanceof ApiCallError ? inferError.message : 'Unable to infer schema from the sample file.'
    return false
  } finally {
    loading.value = false
  }
}

async function saveSchema(): Promise<void> {
  if (!schemaName.value.trim() || !schemaTextToSave.value.trim()) return

  saving.value = true
  pageError.value = null

  try {
    await jsonSchemaFacade.saveText({
      schemaName: schemaName.value.trim(),
      schemaText: schemaTextToSave.value,
      overwrite: false,
    })
    await router.push({ name: 'schemas-library' })
  } catch (saveError) {
    pageError.value = saveError instanceof ApiCallError ? saveError.message : 'Unable to save schema.'
  } finally {
    saving.value = false
  }
}

async function handlePrimarySubmit(): Promise<void> {
  if (currentStep.value.id === 'name') {
    await saveSchema()
    return
  }

  if (currentStep.value.id === 'upload') {
    const uploadPrepared = selectedUploadIntent.value === 'schema'
      ? await prepareSchemaFileUpload()
      : await inferSchemaFromSampleUpload()
    if (!uploadPrepared) return
  }

  currentStepIndex.value = Math.min(currentStepIndex.value + 1, workflowSteps.value.length - 1)
}

function handleUploadIntentKeydown(event: KeyboardEvent): void {
  if (currentStep.value.id !== 'upload-intent') return
  if (event.defaultPrevented || event.repeat || event.isComposing) return
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

  const matchedUploadIntent = resolveUploadIntentByKey(event.key)
  if (!matchedUploadIntent) return

  event.preventDefault()
  advanceFromUploadIntent(matchedUploadIntent)
}

function goBack(): void {
  pageError.value = null
  currentStepIndex.value = Math.max(currentStepIndex.value - 1, 0)
}

function handleNameInputEnter(event: KeyboardEvent): void {
  invokePrimaryActionOnEnter(event, handlePrimarySubmit, {
    disabled: submitDisabled.value,
  })
}

onMounted(() => {
  window.addEventListener('keydown', handleUploadIntentKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleUploadIntentKeydown)
})
</script>

<style scoped>
.schema-kind-grid {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.85rem;
  max-width: 34rem;
}

.schema-kind-card {
  width: 100%;
  display: grid;
  gap: 0.45rem;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--surface-2);
  color: var(--text);
  text-align: left;
}

.schema-kind-card--active {
  border-color: var(--text);
  background: color-mix(in oklab, var(--surface-2) 72%, var(--surface));
}

.schema-kind-card__header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.schema-kind-card__key {
  min-width: 1.75rem;
  min-height: 1.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in oklab, var(--text) 20%, transparent);
  border-radius: 0.45rem;
  color: color-mix(in oklab, var(--text) 72%, transparent);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1;
}

.schema-kind-card__label {
  font-size: 1rem;
  font-weight: 600;
}

</style>
