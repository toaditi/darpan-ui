<template>
  <section class="stack-xl">
    <FormSection
      title="Schema Editor"
      description="Edit raw schema text or refine flattened fields, then save through platform services."
    >
      <div class="stack-md">
        <div class="row-between">
          <p class="muted-copy">Schema ID: <strong>{{ currentSchemaId || '-' }}</strong></p>
          <div class="action-row">
            <button type="button" @click="reload" :disabled="loading || !hasTarget">Refresh</button>
            <button type="button" @click="downloadSchema" :disabled="schemaText.trim().length === 0">Download</button>
          </div>
        </div>

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
        </div>

        <label>
          <span>Raw Schema JSON</span>
          <textarea v-model="schemaText" rows="14" required />
        </label>

        <div class="action-row">
          <button type="button" :disabled="savingText || !hasTarget" @click="saveSchemaText">Save Raw Schema</button>
        </div>
      </div>
    </FormSection>

    <FormSection
      title="Refined Fields"
      description="Refine flattened field rows and persist back as schema structure."
    >
      <div class="stack-md">
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
          <button type="button" :disabled="savingRefined || !hasTarget || fieldRows.length === 0" @click="saveRefined">
            Save Refined Fields
          </button>
        </div>
      </div>
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
import { jsonSchemaFacade } from '../../lib/api/facade'
import type { JsonSchemaField } from '../../lib/api/types'

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
const schemaText = ref('')
const fieldRows = ref<EditableFieldRow[]>([])
const loading = ref(false)
const savingText = ref(false)
const savingRefined = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const hasTarget = computed(() => currentSchemaId.value.length > 0 || schemaName.value.length > 0)

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
    schemaText.value = schemaData.schemaText ?? ''
    await loadFlattenedRows()
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load schema.'
  } finally {
    loading.value = false
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
  if (paramSchemaId) {
    currentSchemaId.value = paramSchemaId
  }
  if (querySchemaName && !schemaName.value) {
    schemaName.value = querySchemaName
  }
  void load()
})
</script>
