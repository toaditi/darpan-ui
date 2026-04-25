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
      :allow-file-enter="currentStep.id === 'upload'"
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
            <template #cell-fieldPath="{ row, index }">
              <span
                class="schema-wizard-field-path"
                :title="String(row.fieldPath ?? '')"
                :data-testid="`schema-verify-field-path-${index}`"
              >
                {{ row.fieldPath }}
              </span>
            </template>
            <template #cell-required="{ row, index }">
              <div class="app-table__control-wrap app-table__control-wrap--start">
                <label class="checkbox-inline checkbox-inline--control-only">
                  <input
                    v-model="row.required"
                    class="app-table__checkbox"
                    type="checkbox"
                    aria-label="Required field"
                    :data-testid="`schema-verify-required-${index}`"
                  />
                </label>
              </div>
            </template>
          </AppTableFrame>
        </div>
      </template>

      <template v-else-if="currentStep.id === 'system'">
        <div class="workflow-form-grid">
          <label class="wizard-input-shell">
            <span class="workflow-context-label">System</span>
            <AppSelect
              v-model="systemEnumId"
              :options="systemOptions"
              placeholder="Select system"
              test-id="schema-wizard-system"
              submit-on-enter
            />
          </label>
        </div>
      </template>

      <template v-else-if="currentStep.id === 'name'">
        <div class="workflow-form-grid">
          <label class="wizard-input-shell">
            <span class="workflow-context-label">Schema Name</span>
            <input
              name="schemaName"
              v-model="schemaName"
              :class="['wizard-answer-control', { empty: !schemaName.trim() }]"
              placeholder="Type your answer here..."
              @keydown.enter.stop="handleNameInputEnter"
            />
          </label>
        </div>
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
import AppSelect, { type AppSelectOption } from '../../components/ui/AppSelect.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade, settingsFacade } from '../../lib/api/facade'
import { invokePrimaryActionOnEnter } from '../../lib/keyboard'
import type { EnumOption, JsonSchemaField } from '../../lib/api/types'

type SchemaWorkflowStep = 'upload-intent' | 'upload' | 'verify' | 'system' | 'name'
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
  { key: 'fieldPath', label: 'Field Path', colStyle: { width: 'calc(100% - 15rem)' } },
  { key: 'type', label: 'Type', colStyle: { width: '8.5rem' } },
  { key: 'required', label: 'Required', colStyle: { width: '6.5rem' }, cellClass: 'app-table__control-cell' },
]

const router = useRouter()

const currentStepIndex = ref(0)
const selectedUploadIntent = ref<SchemaUploadIntent | ''>('')
const selectedFile = ref<File | null>(null)
const selectedFileName = ref('')
const schemaName = ref('')
const systemEnumId = ref('')
const schemaTextToSave = ref('')
const fieldRows = ref<JsonSchemaField[]>([])
const loading = ref(false)
const saving = ref(false)
const pageError = ref<string | null>(null)
const systemOptions = ref<AppSelectOption[]>([])

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

  steps.push({ id: 'system', title: 'Assign the system' })
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
    case 'system':
      return !systemEnumId.value
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseFieldPathTokens(fieldPath: string): string[] | null {
  let remaining = fieldPath.trim()
  if (!remaining) return null

  if (remaining === '$') return []
  if (remaining.startsWith('$.')) remaining = remaining.slice(2)
  else if (remaining.startsWith('$[')) remaining = remaining.slice(1)
  else if (remaining.startsWith('$')) remaining = remaining.slice(1)

  if (!remaining) return []
  if (remaining.startsWith('.') || remaining.endsWith('.') || remaining.includes('..')) return null

  const tokens: string[] = []
  while (remaining) {
    if (remaining.startsWith('[')) {
      const match = remaining.match(/^\[(\d+)\](.*)$/)
      if (!match) return null
      tokens.push(`[${match[1]}]`)
      remaining = match[2] ?? ''
    } else {
      const match = remaining.match(/^([^.[\]]+)(.*)$/)
      if (!match) return null
      tokens.push(match[1] ?? '')
      remaining = match[2] ?? ''
    }

    if (remaining.startsWith('.')) remaining = remaining.slice(1)
  }

  return tokens
}

function resolvePropertyContainer(node: Record<string, unknown>): Record<string, unknown> | null {
  if (isRecord(node.properties)) return node

  for (const key of ['anyOf', 'oneOf', 'allOf']) {
    const options = node[key]
    if (!Array.isArray(options)) continue

    const matchedOption = options.find((option) => isRecord(option) && isRecord(option.properties))
    if (isRecord(matchedOption)) return matchedOption
  }

  return null
}

function getChildSchemaNode(node: Record<string, unknown>, token: string): Record<string, unknown> | null {
  if (token.startsWith('[')) {
    if (isRecord(node.items)) return node.items
    if (Array.isArray(node.items)) {
      const matchedItem = node.items.find((item) => isRecord(item))
      return isRecord(matchedItem) ? matchedItem : null
    }
    return null
  }

  const propertyContainer = resolvePropertyContainer(node)
  if (!propertyContainer || !isRecord(propertyContainer.properties)) return null

  const childNode = propertyContainer.properties[token]
  return isRecord(childNode) ? childNode : null
}

function applyRequiredFlagsToSchemaText(rawSchemaText: string): string {
  const parsedSchema = JSON.parse(rawSchemaText) as unknown
  if (!isRecord(parsedSchema)) return rawSchemaText

  for (const row of fieldRows.value) {
    const tokens = parseFieldPathTokens(String(row.fieldPath ?? ''))
    if (!tokens || tokens.length === 0) continue

    let currentNode: Record<string, unknown> | null = parsedSchema

    for (let index = 0; index < tokens.length && currentNode; index += 1) {
      const token = tokens[index]!
      const isLastToken = index === tokens.length - 1

      if (token.startsWith('[')) {
        currentNode = getChildSchemaNode(currentNode, token)
        continue
      }

      const propertyContainer = resolvePropertyContainer(currentNode)
      if (!propertyContainer) break

      if (isLastToken) {
        const requiredList = Array.isArray(propertyContainer.required)
          ? propertyContainer.required.filter((item): item is string => typeof item === 'string')
          : []
        const nextRequired = new Set(requiredList)

        if (row.required) nextRequired.add(token)
        else nextRequired.delete(token)

        if (nextRequired.size > 0) propertyContainer.required = Array.from(nextRequired)
        else delete propertyContainer.required
        break
      }

      currentNode = getChildSchemaNode(currentNode, token)
    }
  }

  return JSON.stringify(parsedSchema)
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
  if (!schemaName.value.trim() || !systemEnumId.value || !schemaTextToSave.value.trim()) return

  saving.value = true
  pageError.value = null

  try {
    const schemaTextPayload = selectedUploadIntent.value === 'sample'
      ? applyRequiredFlagsToSchemaText(schemaTextToSave.value)
      : schemaTextToSave.value
    await jsonSchemaFacade.saveText({
      schemaName: schemaName.value.trim(),
      systemEnumId: systemEnumId.value,
      schemaText: schemaTextPayload,
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

function toSystemOption(option: EnumOption): AppSelectOption {
  return {
    value: option.enumId,
    label: option.label || option.enumCode || option.description || option.enumId,
  }
}

async function loadSystemOptions(): Promise<void> {
  try {
    const response = await settingsFacade.listEnumOptions('DarpanSystemSource')
    systemOptions.value = (response.options ?? []).map(toSystemOption)
  } catch (loadError) {
    pageError.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load reconciliation systems.'
  }
}

onMounted(() => {
  void loadSystemOptions()
  window.addEventListener('keydown', handleUploadIntentKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleUploadIntentKeydown)
})
</script>

<style scoped>
.schema-wizard-field-path {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

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
  font-weight: 400;
}

</style>
