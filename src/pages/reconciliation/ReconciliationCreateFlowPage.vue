<template>
  <WorkflowPage :progress-percent="progressPercent" aria-label="Reconciliation setup progress" center-stage>
    <InlineValidation v-if="pageError" tone="error" :message="pageError" />

    <WorkflowStepForm
      class="workflow-step-shell"
      :question="currentQuestion"
      :primary-label="currentStep.id === 'name' ? 'Create' : 'OK'"
      :submit-disabled="currentStep.id === 'name' ? !canCreateMapping : !canProceed || loadingFields || loadingSchemas"
      :show-back="currentStepIndex > 0"
      :allow-select-enter="true"
      :primary-test-id="currentStep.id === 'name' ? 'create-mapping' : 'wizard-next'"
      @submit="handlePrimarySubmit"
      @back="goBack"
    >
      <template v-if="currentStep.id === 'schema-1' || currentStep.id === 'schema-2'">
        <label class="wizard-input-shell">
          <WorkflowSelect
            v-model="activeSchemaValue"
            test-id="schema-select"
            :disabled="loadingSchemas"
            :options="activeSchemaSelectOptions"
            :placeholder="loadingSchemas ? 'Loading...' : 'Select a schema...'"
          />
        </label>

        <InlineValidation v-if="sourceSelectionError" tone="error" :message="sourceSelectionError" />

        <p class="wizard-or">or</p>
        <RouterLink class="wizard-secondary-link" to="/schemas/infer">Create a New One</RouterLink>
      </template>

      <template v-else-if="currentStep.id === 'fields-1' || currentStep.id === 'fields-2'">
        <label class="wizard-input-shell">
          <WorkflowSelect
            v-model="activeFieldValue"
            test-id="primary-field"
            :disabled="loadingFields"
            :options="activeFieldSelectOptions"
            :placeholder="loadingFields ? 'Loading...' : 'Select a field...'"
          />
        </label>
      </template>

      <template v-else>
        <label class="wizard-input-shell">
          <input
            name="flowName"
            v-model="flowName"
            :class="['wizard-answer-control', { empty: !flowName.trim() }]"
            placeholder="Type your answer here..."
            @keydown.enter.stop="handleNameInputEnter"
          />
        </label>
      </template>
    </WorkflowStepForm>
  </WorkflowPage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import WorkflowPage from '../../components/workflow/WorkflowPage.vue'
import WorkflowSelect, { type WorkflowSelectOption } from '../../components/workflow/WorkflowSelect.vue'
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade, reconciliationFacade } from '../../lib/api/facade'
import { invokePrimaryActionOnEnter } from '../../lib/keyboard'
import type { JsonSchemaField, JsonSchemaSummary } from '../../lib/api/types'

interface WizardStep {
  id: 'schema-1' | 'fields-1' | 'schema-2' | 'fields-2' | 'name'
  title: string
}

const steps: WizardStep[] = [
  { id: 'schema-1', title: 'Select a JSON Schema' },
  { id: 'fields-1', title: 'Select a field from source 1' },
  { id: 'schema-2', title: 'Select a JSON Schema' },
  { id: 'fields-2', title: 'Select a field from source 2' },
  { id: 'name', title: 'Name this reconciliation flow' },
]

const router = useRouter()

const loadingSchemas = ref(false)
const loadingFields = ref(false)
const pageError = ref<string | null>(null)
const schemas = ref<JsonSchemaSummary[]>([])
const currentStepIndex = ref(0)
const schema1Id = ref('')
const schema2Id = ref('')
const schema1FieldPath = ref('')
const schema2FieldPath = ref('')
const flowName = ref('')
const flattenedFields = ref<Record<string, JsonSchemaField[]>>({})

const currentStep = computed<WizardStep>(() => steps[currentStepIndex.value] ?? steps[0]!)
const progressPercent = computed(() => ((Math.max(1, currentStepIndex.value + 1) / steps.length) * 100).toFixed(2))
const selectedSchema1 = computed(() => schemas.value.find((schema) => schema.jsonSchemaId === schema1Id.value) ?? null)
const selectedSchema2 = computed(() => schemas.value.find((schema) => schema.jsonSchemaId === schema2Id.value) ?? null)
const currentQuestion = computed(() => {
  if (currentStep.value.id === 'fields-1') {
    return `Select a field from ${getSchemaSystemName(selectedSchema1.value, 'source 1')}`
  }
  if (currentStep.value.id === 'fields-2') {
    return `Select a field from ${getSchemaSystemName(selectedSchema2.value, 'source 2')}`
  }
  return currentStep.value.title
})
const schema2Choices = computed(() => schemas.value.filter((schema) => schema.jsonSchemaId !== schema1Id.value))
const schemaOptions = computed<WorkflowSelectOption[]>(() =>
  schemas.value.map((schema) => ({
    value: schema.jsonSchemaId,
    label: schema.systemLabel ? `${schema.schemaName} - ${schema.systemLabel}` : `${schema.schemaName} - system missing`,
  })),
)
const schema2Options = computed<WorkflowSelectOption[]>(() =>
  schema2Choices.value.map((schema) => ({
    value: schema.jsonSchemaId,
    label: schema.systemLabel ? `${schema.schemaName} - ${schema.systemLabel}` : `${schema.schemaName} - system missing`,
  })),
)
const activeSchemaId = computed(() => (currentStep.value.id === 'schema-1' ? schema1Id.value : schema2Id.value))
const activeSchemaSelectOptions = computed<WorkflowSelectOption[]>(() =>
  currentStep.value.id === 'schema-1' ? schemaOptions.value : schema2Options.value,
)
const activeSelectedSchema = computed(() => (currentStep.value.id === 'schema-1' ? selectedSchema1.value : selectedSchema2.value))
const sourceSelectionError = computed(() => {
  if (currentStep.value.id !== 'schema-1' && currentStep.value.id !== 'schema-2') return ''
  const activeSchema = activeSelectedSchema.value
  if (!activeSchema) return ''
  if (!activeSchema.systemEnumId) {
    return 'Assign a reconciliation system to this schema in Schema Studio before using it in reconciliation.'
  }
  if (currentStep.value.id === 'schema-2' && activeSchema.systemEnumId === selectedSchema1.value?.systemEnumId) {
    return 'Source 2 must use a schema with a different system than source 1.'
  }
  return ''
})
const activeFieldSchemaId = computed(() => (currentStep.value.id === 'fields-1' ? schema1Id.value : schema2Id.value))
const activeFieldOptions = computed(() => flattenedFields.value[activeFieldSchemaId.value] ?? [])
const activeFieldPath = computed(() => (currentStep.value.id === 'fields-1' ? schema1FieldPath.value : schema2FieldPath.value))
const activeFieldSelectOptions = computed<WorkflowSelectOption[]>(() =>
  activeFieldOptions.value.map((field) => ({ value: field.fieldPath, label: field.fieldPath })),
)
const activeFieldValue = computed({
  get: () => activeFieldPath.value,
  set: (value: string) => {
    if (currentStep.value.id === 'fields-1') {
      schema1FieldPath.value = value
      return
    }
    schema2FieldPath.value = value
  },
})
const activeSchemaValue = computed({
  get: () => activeSchemaId.value,
  set: (value: string) => {
    if (currentStep.value.id === 'schema-1') {
      schema1Id.value = value
      return
    }
    schema2Id.value = value
  },
})
const canProceed = computed(() => {
  switch (currentStep.value.id) {
    case 'schema-1':
      return schema1Id.value.length > 0 && sourceSelectionError.value.length === 0
    case 'schema-2':
      return schema2Id.value.length > 0 && schema2Id.value !== schema1Id.value && sourceSelectionError.value.length === 0
    case 'fields-1':
      return schema1FieldPath.value.length > 0
    case 'fields-2':
      return schema2FieldPath.value.length > 0
    default:
      return false
  }
})
const canCreateMapping = computed(() => {
  return (
    flowName.value.trim().length > 0 &&
    schema1Id.value.length > 0 &&
    schema2Id.value.length > 0 &&
    schema1FieldPath.value.length > 0 &&
    schema2FieldPath.value.length > 0 &&
    !!selectedSchema1.value?.systemEnumId &&
    !!selectedSchema2.value?.systemEnumId &&
    selectedSchema1.value.systemEnumId !== selectedSchema2.value.systemEnumId
  )
})

function getSchemaSystemName(schema: JsonSchemaSummary | null, fallback: string): string {
  return schema?.systemLabel?.trim() || schema?.systemEnumId?.trim() || fallback
}

async function loadSchemas(): Promise<void> {
  loadingSchemas.value = true
  pageError.value = null

  try {
    const response = await jsonSchemaFacade.list({
      pageIndex: 0,
      pageSize: 100,
      query: '',
    })
    schemas.value = response.schemas ?? []
  } catch (error) {
    pageError.value = error instanceof ApiCallError ? error.message : 'Unable to load schema library.'
  } finally {
    loadingSchemas.value = false
  }
}

async function ensureFieldsLoaded(schemaId: string): Promise<boolean> {
  if (!schemaId) return false
  if ((flattenedFields.value[schemaId] ?? []).length > 0) return true

  loadingFields.value = true
  pageError.value = null

  try {
    const response = await jsonSchemaFacade.flatten({ jsonSchemaId: schemaId })
    const comparableFields = (response.fieldList ?? []).filter((field) => field.type !== 'object' && field.type !== 'array')
    if (comparableFields.length === 0) {
      pageError.value = 'No comparable fields were found for the selected schema.'
      return false
    }

    flattenedFields.value = {
      ...flattenedFields.value,
      [schemaId]: comparableFields,
    }
    return true
  } catch (error) {
    pageError.value = error instanceof ApiCallError ? error.message : 'Unable to load schema fields.'
    return false
  } finally {
    loadingFields.value = false
  }
}

async function goNext(): Promise<void> {
  if (!canProceed.value) return

  if (currentStep.value.id === 'schema-1') {
    schema1FieldPath.value = ''
    const ready = await ensureFieldsLoaded(schema1Id.value)
    if (!ready) return
  }

  if (currentStep.value.id === 'schema-2') {
    schema2FieldPath.value = ''
    const ready = await ensureFieldsLoaded(schema2Id.value)
    if (!ready) return
  }

  currentStepIndex.value = Math.min(currentStepIndex.value + 1, steps.length - 1)
}

async function handlePrimarySubmit(): Promise<void> {
  if (currentStep.value.id === 'name') {
    await createMapping()
    return
  }

  await goNext()
}

function goBack(): void {
  pageError.value = null
  currentStepIndex.value = Math.max(currentStepIndex.value - 1, 0)
}

function handleNameInputEnter(event: KeyboardEvent): void {
  invokePrimaryActionOnEnter(event, handlePrimarySubmit, {
    disabled: !canCreateMapping.value,
  })
}

async function createMapping(): Promise<void> {
  if (!canCreateMapping.value || !selectedSchema1.value || !selectedSchema2.value) return

  pageError.value = null

  try {
    const response = await reconciliationFacade.createPilotMapping({
      mappingName: flowName.value.trim(),
      schema1Id: selectedSchema1.value.jsonSchemaId,
      schema2Id: selectedSchema2.value.jsonSchemaId,
      schema1FieldPath: schema1FieldPath.value,
      schema2FieldPath: schema2FieldPath.value,
    })
    if (!response.savedMapping?.reconciliationMappingId) {
      throw new Error('Missing saved mapping identifier.')
    }
    await router.push({ name: 'hub' })
  } catch (error) {
    pageError.value = error instanceof ApiCallError ? error.message : 'Unable to create reconciliation flow.'
  }
}

onMounted(async () => {
  await loadSchemas()
})
</script>
