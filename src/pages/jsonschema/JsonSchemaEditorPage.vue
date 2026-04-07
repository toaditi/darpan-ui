<template>
  <section class="stack-xl">
    <FormSection
      title="Schema Editor"
      description="Edit raw schema text or refine flattened fields, then save through platform services."
    >
      <form class="stack-md" @submit.prevent="saveSchemaText" @keydown.enter="requestSubmitOnEnter">
        <div class="row-between">
          <p class="muted-copy">Schema ID: <strong>{{ currentSchemaId || '-' }}</strong></p>
          <div class="action-row">
            <button type="button" @click="reload" :disabled="loading || !hasTarget">Refresh</button>
            <button type="button" @click="downloadSchema" :disabled="schemaText.trim().length === 0 || showInitialLoadFailureState">
              Download
            </button>
          </div>
        </div>

        <template v-if="showInitialLoadFailureState">
          <EmptyState
            title="Unable to load this schema"
            description="Retry loading before making changes."
          />

          <div class="action-row">
            <button type="button" @click="reload" :disabled="loading">Retry Loading Schema</button>
          </div>
        </template>

        <template v-else>
          <EmptyState
            v-if="!hasTarget"
            title="No schema selected"
            description="Open a schema from Library or Infer and then return here for direct editor updates."
          />

          <div class="field-grid two">
            <label>
              <span>Schema Name</span>
              <input v-model="schemaName" type="text" required />
            </label>
            <label>
              <span>Description</span>
              <input v-model="description" type="text" />
            </label>
            <label>
              <span>System</span>
              <select v-model="systemEnumId" required>
                <option value="">Select system</option>
                <option v-for="option in systemOptions" :key="option.enumId" :value="option.enumId">
                  {{ option.label || option.description || option.enumId }}
                </option>
              </select>
            </label>
          </div>

          <label>
            <span>Raw Schema JSON</span>
            <textarea v-model="schemaText" rows="14" required />
          </label>

          <div class="action-row">
            <button type="submit" :disabled="savingText || !canSaveSchemaText">Save Raw Schema</button>
          </div>
        </template>
      </form>
    </FormSection>

    <FormSection
      v-if="!showInitialLoadFailureState"
      title="Refined Fields"
      description="Refine flattened field rows and persist back as schema structure."
    >
      <form class="stack-md" @submit.prevent="saveRefined" @keydown.enter="requestSubmitOnEnter">
        <div class="row-between">
          <h3>Field Rows</h3>
          <button type="button" @click="addFieldRow">Add Row</button>
        </div>

        <EmptyState
          v-if="fieldRows.length === 0"
          title="No flattened fields"
          description="Use the Wizard to infer fields or load an existing schema with flatten data."
        />

        <div v-else class="sparse-table-wrap">
          <table class="sparse-table">
            <thead>
              <tr>
                <th>Field Path</th>
                <th>Type</th>
                <th>Required</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in fieldRows" :key="`${row.fieldPath}-${index}`">
                <td><input v-model="row.fieldPath" type="text" placeholder="order.items[].sku" /></td>
                <td>
                  <select v-model="row.type">
                    <option v-for="fieldType in fieldTypes" :key="fieldType" :value="fieldType">
                      {{ fieldType }}
                    </option>
                  </select>
                </td>
                <td>
                  <label class="checkbox-inline">
                    <input v-model="row.required" type="checkbox" />
                    <span>{{ row.required ? 'Yes' : 'No' }}</span>
                  </label>
                </td>
                <td class="cell-actions">
                  <button type="button" class="danger-text" @click="removeFieldRow(index)">Remove</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="action-row">
          <button type="submit" :disabled="savingRefined || !canEditTarget || fieldRows.length === 0">
            Save Refined Fields
          </button>
        </div>
      </form>
    </FormSection>

    <InlineValidation v-if="error" tone="error" :message="error" />
    <p v-if="success" class="success-copy">{{ success }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import EmptyState from '../../components/ui/EmptyState.vue'
import FormSection from '../../components/ui/FormSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade, settingsFacade } from '../../lib/api/facade'
import { requestSubmitOnEnter } from '../../lib/keyboard'
import type { EnumOption, JsonSchemaField } from '../../lib/api/types'

interface EditableFieldRow {
  fieldPath: string
  type: JsonSchemaField['type']
  required: boolean
}

const fieldTypes: JsonSchemaField['type'][] = ['string', 'integer', 'number', 'boolean', 'object', 'array']

const props = defineProps<{
  jsonSchemaId?: string
}>()

const route = useRoute()

const currentSchemaId = ref(props.jsonSchemaId ?? '')
const schemaName = ref('')
const description = ref('')
const systemEnumId = ref('')
const schemaText = ref('')
const fieldRows = ref<EditableFieldRow[]>([])
const loading = ref(false)
const savingText = ref(false)
const savingRefined = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const initialLoadCompleted = ref(false)
const initialLoadSucceeded = ref(false)
const requestedSchemaId = ref('')
const requestedSchemaName = ref('')
const systemOptions = ref<EnumOption[]>([])

const hasTarget = computed(() => currentSchemaId.value.length > 0 || schemaName.value.length > 0)
const hasRequestedTarget = computed(() => requestedSchemaId.value.length > 0 || requestedSchemaName.value.length > 0)
const canEditTarget = computed(() => {
  if (!hasRequestedTarget.value) return hasTarget.value
  return initialLoadSucceeded.value
})
const canSaveSchemaText = computed(() => canEditTarget.value && hasTarget.value)
const showInitialLoadFailureState = computed(() => {
  return hasRequestedTarget.value && initialLoadCompleted.value && !initialLoadSucceeded.value
})

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['y', 'yes', 'true', '1'].includes(value.toLowerCase())
  return false
}

function normalizeFieldType(value: unknown): JsonSchemaField['type'] {
  const raw = String(value ?? '').toLowerCase()
  if (fieldTypes.includes(raw as JsonSchemaField['type'])) {
    return raw as JsonSchemaField['type']
  }
  return 'string'
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function getTargetParams(): Record<string, string> {
  const params: Record<string, string> = {}
  if (currentSchemaId.value.trim()) params.jsonSchemaId = currentSchemaId.value.trim()
  if (!params.jsonSchemaId && schemaName.value.trim()) params.schemaName = schemaName.value.trim()
  return params
}

function addFieldRow(): void {
  fieldRows.value.push({
    fieldPath: '',
    type: 'string',
    required: false,
  })
}

function removeFieldRow(index: number): void {
  fieldRows.value.splice(index, 1)
}

async function loadFlattenedRows(): Promise<void> {
  const params = getTargetParams()
  if (!params.jsonSchemaId && !params.schemaName) return

  const flattened = await jsonSchemaFacade.flatten(params)
  fieldRows.value = (flattened.fieldList ?? []).map((item) => ({
    fieldPath: String(item.fieldPath ?? ''),
    type: normalizeFieldType(item.type),
    required: parseBoolean(item.required),
  }))
}

async function load(): Promise<void> {
  const params = getTargetParams()
  if (!params.jsonSchemaId && !params.schemaName) return

  loading.value = true
  error.value = null

  try {
    const schemaResponse = await jsonSchemaFacade.get(params)
    const schemaData = schemaResponse.schemaData
    if (!schemaData) {
      error.value = 'Schema not found.'
      return
    }

    currentSchemaId.value = schemaData.jsonSchemaId
    schemaName.value = schemaData.schemaName
    description.value = schemaData.description ?? ''
    systemEnumId.value = schemaData.systemEnumId ?? ''
    schemaText.value = schemaData.schemaText ?? ''
    await loadFlattenedRows()
    initialLoadSucceeded.value = true
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load schema.'
  } finally {
    if (hasRequestedTarget.value && !initialLoadCompleted.value) {
      initialLoadCompleted.value = true
    }
    loading.value = false
  }
}

async function loadSystemOptions(): Promise<void> {
  try {
    const response = await settingsFacade.listEnumOptions('DarpanSystemSource')
    systemOptions.value = response.options ?? []
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load reconciliation systems.'
  }
}

async function saveSchemaText(): Promise<void> {
  savingText.value = true
  error.value = null
  success.value = null

  try {
    const response = await jsonSchemaFacade.saveText({
      jsonSchemaId: currentSchemaId.value,
      schemaName: schemaName.value,
      description: description.value,
      systemEnumId: systemEnumId.value,
      schemaText: schemaText.value,
    })
    success.value = response.messages?.[0] ?? `Saved schema ${schemaName.value}.`
    await load()
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Unable to save schema text.'
  } finally {
    savingText.value = false
  }
}

async function saveRefined(): Promise<void> {
  savingRefined.value = true
  error.value = null
  success.value = null

  try {
    const response = await jsonSchemaFacade.saveRefined({
      jsonSchemaId: currentSchemaId.value,
      schemaName: schemaName.value,
      description: description.value,
      systemEnumId: systemEnumId.value,
      fieldList: fieldRows.value.map((row) => ({
        fieldPath: row.fieldPath.trim(),
        type: row.type,
        required: row.required,
      })),
    })
    success.value = response.messages?.[0] ?? `Saved refined schema ${schemaName.value}.`
    await load()
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Unable to save refined schema.'
  } finally {
    savingRefined.value = false
  }
}

async function reload(): Promise<void> {
  await load()
}

function downloadSchema(): void {
  const filename = `${(schemaName.value || 'schema').replace(/[^a-zA-Z0-9_-]+/g, '_')}.json`
  downloadText(filename, schemaText.value)
}

onMounted(() => {
  const paramSchemaId = String(route.params.jsonSchemaId ?? '')
  const querySchemaName = String(route.query.schemaName ?? '')
  requestedSchemaId.value = paramSchemaId
  requestedSchemaName.value = querySchemaName
  if (paramSchemaId) {
    currentSchemaId.value = paramSchemaId
  }
  if (querySchemaName && !schemaName.value) {
    schemaName.value = querySchemaName
  }
  void Promise.all([loadSystemOptions(), load()])
})
</script>
