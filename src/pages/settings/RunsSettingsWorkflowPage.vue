<template>
  <WorkflowPage :progress-percent="'100'" aria-label="Run settings edit progress" center-stage edit-surface>
    <InlineValidation v-if="error" tone="error" :message="error" />
    <InlineValidation v-else-if="!loading && validationMessage" tone="error" :message="validationMessage" />
    <p v-if="success" class="success-copy">{{ success }}</p>

    <WorkflowStepForm
      :class="['workflow-form--compact', 'workflow-form--edit-single-page']"
      question="Update the run configuration."
      primary-label="Save"
      :show-enter-hint="false"
      :show-back="false"
      :show-cancel-action="true"
      :cancel-disabled="loading"
      cancel-test-id="cancel-run-settings"
      :submit-disabled="submitDisabled"
      primary-test-id="save-run-settings"
      @submit="save"
      @cancel="cancelEdit"
    >
      <label class="wizard-input-shell">
        <span class="workflow-context-label">Run Name</span>
        <input
          name="mappingName"
          v-model="form.mappingName"
          class="wizard-answer-control"
          type="text"
          placeholder="Returns vs Shopify"
        />
      </label>

      <div class="workflow-form-grid workflow-form-grid--two" data-testid="run-source-1-row">
        <label class="wizard-input-shell">
          <span class="workflow-context-label">Source 1 Schema</span>
          <AppSelect
            v-model="form.source1.schemaId"
            :disabled="loading"
            :options="schemaOptions"
            placeholder="Select source 1 schema"
            test-id="run-schema-1"
          />
        </label>

        <label class="wizard-input-shell">
          <span class="workflow-context-label">Source 1 Field</span>
          <AppSelect
            v-model="form.source1.fieldPath"
            :disabled="loading || fieldOptions1.length === 0"
            :options="fieldOptions1"
            :placeholder="form.source1.schemaId ? 'Select source 1 field' : 'Choose a schema first'"
            test-id="run-field-1"
          />
        </label>
      </div>

      <div class="workflow-form-grid workflow-form-grid--two" data-testid="run-source-2-row">
        <label class="wizard-input-shell">
          <span class="workflow-context-label">Source 2 Schema</span>
          <AppSelect
            v-model="form.source2.schemaId"
            :disabled="loading"
            :options="schemaOptions"
            placeholder="Select source 2 schema"
            test-id="run-schema-2"
          />
        </label>

        <label class="wizard-input-shell">
          <span class="workflow-context-label">Source 2 Field</span>
          <AppSelect
            v-model="form.source2.fieldPath"
            :disabled="loading || fieldOptions2.length === 0"
            :options="fieldOptions2"
            :placeholder="form.source2.schemaId ? 'Select source 2 field' : 'Choose a schema first'"
            test-id="run-field-2"
          />
        </label>
      </div>
    </WorkflowStepForm>
  </WorkflowPage>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorkflowPage from '../../components/workflow/WorkflowPage.vue'
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import AppSelect, { type AppSelectOption } from '../../components/ui/AppSelect.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade, reconciliationFacade } from '../../lib/api/facade'
import type { JsonSchemaField, JsonSchemaSummary } from '../../lib/api/types'
import { resolveRecordLabel } from '../../lib/utils/recordLabel'
import { readWorkflowOriginFromHistoryState } from '../../lib/workflowOrigin'

interface RunSourceForm {
  schemaId: string
  fieldPath: string
}

interface RunForm {
  mappingName: string
  source1: RunSourceForm
  source2: RunSourceForm
}

const route = useRoute()
const router = useRouter()

const schemas = ref<JsonSchemaSummary[]>([])
const flattenedFields = ref<Record<string, JsonSchemaField[]>>({})
const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const form = reactive<RunForm>({
  mappingName: '',
  source1: { schemaId: '', fieldPath: '' },
  source2: { schemaId: '', fieldPath: '' },
})

const activeMappingId = computed(() => String(route.params.reconciliationMappingId ?? '').trim())
const source1Schema = computed(() => schemas.value.find((schema) => schema.jsonSchemaId === form.source1.schemaId) ?? null)
const source2Schema = computed(() => schemas.value.find((schema) => schema.jsonSchemaId === form.source2.schemaId) ?? null)
const schemaOptions = computed<AppSelectOption[]>(() => (
  schemas.value.map((schema) => ({
    value: schema.jsonSchemaId,
    label: formatSchemaLabel(schema),
  }))
))
const fieldOptions1 = computed<AppSelectOption[]>(() => buildFieldOptions(form.source1.schemaId))
const fieldOptions2 = computed<AppSelectOption[]>(() => buildFieldOptions(form.source2.schemaId))
const validationMessage = computed(() => {
  if (!activeMappingId.value) return 'Run ID is missing.'
  if (form.mappingName.trim().length === 0) return 'Run name is required.'
  if (!form.source1.schemaId || !form.source2.schemaId) return 'Choose schemas for both sources.'
  if (form.source1.schemaId === form.source2.schemaId) return 'Choose two different schemas.'
  if (!source1Schema.value?.systemEnumId || !source2Schema.value?.systemEnumId) {
    return 'Both schemas need an assigned reconciliation system.'
  }
  if (source1Schema.value.systemEnumId === source2Schema.value.systemEnumId) {
    return 'Source 2 must use a schema with a different system than source 1.'
  }
  if (!form.source1.fieldPath || !form.source2.fieldPath) return 'Choose an ID field for both sources.'
  return null
})
const submitDisabled = computed(() => loading.value || !!validationMessage.value)

function formatSchemaLabel(schema: JsonSchemaSummary): string {
  const schemaLabel = resolveRecordLabel({
    description: schema.description,
    primary: schema.schemaName,
  })
  const systemLabel = schema.systemLabel?.trim() || schema.systemEnumId?.trim() || ''

  return systemLabel ? `${schemaLabel} - ${systemLabel}` : schemaLabel
}

function normalizeFieldPathValue(rawFieldPath: string): string {
  const trimmed = rawFieldPath.trim()
  if (!trimmed) return ''

  const withoutSuffix = trimmed.split('|', 1)[0]?.trim() ?? ''
  if (!withoutSuffix) return ''

  return withoutSuffix
    .replace(/\[(\d+)\]/g, '[*]')
    .replace('.[*]', '[*]')
}

function buildFieldPathAliases(rawFieldPath: string): Set<string> {
  const normalized = normalizeFieldPathValue(rawFieldPath)
  if (!normalized) return new Set()

  const aliases = new Set<string>([normalized])
  if (normalized.startsWith('$.')) aliases.add(normalized.slice(2))
  else if (normalized.startsWith('$[')) aliases.add(normalized.slice(1))
  else if (!normalized.startsWith('$')) aliases.add(normalized.startsWith('[') ? `$${normalized}` : `$.${normalized}`)

  return aliases
}

function resolveSelectedFieldPath(schemaId: string, rawFieldPath: string): string | null {
  if (!schemaId || !rawFieldPath) return null

  const savedAliases = buildFieldPathAliases(rawFieldPath)
  const matchingField = (flattenedFields.value[schemaId] ?? []).find((field) => {
    const fieldAliases = buildFieldPathAliases(field.fieldPath)
    return [...fieldAliases].some((alias) => savedAliases.has(alias))
  })

  return matchingField?.fieldPath ?? null
}

function buildFieldOptions(schemaId: string): AppSelectOption[] {
  return (flattenedFields.value[schemaId] ?? []).map((field) => ({
    value: field.fieldPath,
    label: field.fieldPath,
  }))
}

function resolveOriginPath(): string {
  return readWorkflowOriginFromHistoryState()?.path ?? '/settings/runs'
}

async function ensureFieldsLoaded(schemaId: string): Promise<void> {
  if (!schemaId || flattenedFields.value[schemaId]) return

  const response = await jsonSchemaFacade.flatten({ jsonSchemaId: schemaId })
  const comparableFields = (response.fieldList ?? []).filter((field) => field.type !== 'object' && field.type !== 'array')
  flattenedFields.value = {
    ...flattenedFields.value,
    [schemaId]: comparableFields,
  }
}

async function syncFieldOptions(sourceKey: 'source1' | 'source2'): Promise<void> {
  const source = form[sourceKey]
  if (!source.schemaId) {
    source.fieldPath = ''
    return
  }

  try {
    await ensureFieldsLoaded(source.schemaId)
    if (source.fieldPath) {
      source.fieldPath = resolveSelectedFieldPath(source.schemaId, source.fieldPath) ?? ''
    }
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load schema fields.'
  }
}

async function load(): Promise<void> {
  if (!activeMappingId.value) {
    error.value = 'Run ID is missing.'
    return
  }

  loading.value = true
  error.value = null
  success.value = null

  try {
    const [schemasResponse, mappingResponse] = await Promise.all([
      jsonSchemaFacade.list({
        pageIndex: 0,
        pageSize: 200,
        query: '',
      }),
      reconciliationFacade.getPilotMapping({
        reconciliationMappingId: activeMappingId.value,
      }),
    ])

    schemas.value = schemasResponse.schemas ?? []

    const mapping = mappingResponse.pilotMapping
    if (!mapping) {
      error.value = `Unable to find run "${activeMappingId.value}".`
      return
    }
    if ((mapping.members?.length ?? 0) !== 2) {
      error.value = 'Only two-source runs can be edited in this workflow.'
      return
    }

    form.mappingName = mapping.mappingName ?? ''
    form.source1.schemaId = mapping.members[0]?.jsonSchemaId ?? ''
    form.source1.fieldPath = mapping.members[0]?.fieldPath ?? ''
    form.source2.schemaId = mapping.members[1]?.jsonSchemaId ?? ''
    form.source2.fieldPath = mapping.members[1]?.fieldPath ?? ''

    await Promise.all([
      syncFieldOptions('source1'),
      syncFieldOptions('source2'),
    ])
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load run settings.'
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (submitDisabled.value) return

  loading.value = true
  error.value = null
  success.value = null

  try {
    const response = await reconciliationFacade.savePilotMapping({
      reconciliationMappingId: activeMappingId.value,
      mappingName: form.mappingName.trim(),
      schema1Id: form.source1.schemaId,
      schema2Id: form.source2.schemaId,
      schema1FieldPath: form.source1.fieldPath,
      schema2FieldPath: form.source2.fieldPath,
    })
    success.value = response.messages?.[0] ?? 'Saved run.'
    await router.push(resolveOriginPath())
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save run settings.'
  } finally {
    loading.value = false
  }
}

async function cancelEdit(): Promise<void> {
  if (loading.value) return
  await router.push(resolveOriginPath())
}

watch(() => form.source1.schemaId, () => {
  void syncFieldOptions('source1')
})

watch(() => form.source2.schemaId, () => {
  void syncFieldOptions('source2')
})

onMounted(() => {
  void load()
})
</script>
