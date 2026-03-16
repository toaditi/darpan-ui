<template>
  <section class="stack-xl">
    <FormSection title="Upload Schema" description="Create a schema library entry from a JSON schema document.">
      <form class="stack-md" @submit.prevent="uploadSchema">
        <div class="field-grid two">
          <label>
            <span>Schema Name</span>
            <input ref="uploadNameInput" v-model="upload.schemaName" type="text" placeholder="inventory-schema" />
          </label>
          <label>
            <span>Description</span>
            <input v-model="upload.description" type="text" placeholder="Inventory payload schema" />
          </label>
        </div>

        <label>
          <span>Schema File (.json)</span>
          <input type="file" accept=".json,application/json" @change="onSchemaFileChange" />
        </label>

        <div class="action-row">
          <button type="submit" :disabled="uploading || !upload.file">Upload Schema</button>
        </div>
      </form>
    </FormSection>

    <FormSection title="Schema List" description="Browse active schemas, edit/refine, download, and remove records.">
      <div class="stack-md">
        <div class="row-between">
          <div class="field-inline">
            <label>
              <span class="sr-only">Search schemas</span>
              <input
                v-model="query"
                type="search"
                placeholder="Search schema name or description"
                @keydown.enter.prevent="refresh"
              />
            </label>
            <button type="button" @click="refresh" :disabled="loading">Search</button>
          </div>
          <div class="page-controls">
            <button type="button" @click="prevPage" :disabled="pageIndex <= 0 || loading">Prev</button>
            <span>Page {{ pageIndex + 1 }} / {{ pageCount }}</span>
            <button type="button" @click="nextPage" :disabled="pageIndex + 1 >= pageCount || loading">Next</button>
          </div>
        </div>

        <InlineValidation v-if="error" tone="error" :message="error" />
        <p v-if="success" class="success-copy">{{ success }}</p>

        <EmptyState
          v-if="rows.length === 0 && !loading"
          title="No schemas found"
          description="Upload a schema above or use the Infer tab to generate one from sample JSON."
        />

        <SparseTable v-else :columns="columns" :rows="rows" row-key="jsonSchemaId">
          <template #cell-statusId="{ row }">
            <StatusBadge
              :label="row.statusId === 'Active' ? 'Active' : String(row.statusId || 'Unknown')"
              :tone="row.statusId === 'Active' ? 'success' : 'neutral'"
            />
          </template>
          <template #cell-lastUpdatedStamp="{ row }">
            {{ formatDate(row.lastUpdatedStamp) }}
          </template>
          <template #cell-actions="{ row }">
            <div class="actions-tight">
              <button type="button" @click="editSchema(row)">Edit</button>
              <button type="button" @click="downloadSchema(row)">Download</button>
              <button type="button" class="danger-text" @click="deleteSchema(row)">Delete</button>
            </div>
          </template>
        </SparseTable>
      </div>
    </FormSection>

    <FormSection title="Validate JSON" description="Validate JSON text/file against a selected saved schema.">
      <form class="stack-md" @submit.prevent="validateJson">
        <label>
          <span>Schema</span>
          <select v-model="validation.jsonSchemaId" required>
            <option value="">Select schema</option>
            <option v-for="item in schemaOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </option>
          </select>
        </label>

        <label>
          <span>JSON File (optional)</span>
          <input type="file" accept=".json,application/json" @change="onPayloadFileChange" />
        </label>

        <label>
          <span>JSON Payload</span>
          <textarea v-model="validation.jsonText" rows="10" required />
        </label>

        <div class="action-row">
          <button type="submit" :disabled="validating">Validate</button>
        </div>
      </form>

      <InlineValidation v-if="validation.error" tone="error" :message="validation.error" />
      <p v-if="validation.result" class="muted-copy">{{ validation.result }}</p>
      <ul v-if="validation.errorMessages.length > 0" class="stack-sm mono-list">
        <li v-for="message in validation.errorMessages" :key="message">{{ message }}</li>
      </ul>
    </FormSection>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../../components/ui/EmptyState.vue'
import FormSection from '../../components/ui/FormSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import SparseTable from '../../components/ui/SparseTable.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade } from '../../lib/api/facade'
import type { JsonSchemaSummary } from '../../lib/api/types'

interface UploadState {
  schemaName: string
  description: string
  file: File | null
}

interface ValidationState {
  jsonSchemaId: string
  jsonText: string
  result: string
  error: string | null
  errorMessages: string[]
}

const router = useRouter()
const route = useRoute()
const uploadNameInput = ref<HTMLInputElement | null>(null)

const columns = [
  { key: 'schemaName', label: 'Schema Name' },
  { key: 'description', label: 'Description' },
  { key: 'statusId', label: 'Status' },
  { key: 'lastUpdatedStamp', label: 'Updated' },
  { key: 'actions', label: '' },
]

const rows = ref<JsonSchemaSummary[]>([])
const schemaOptions = computed(() =>
  rows.value.map((row) => ({
    value: row.jsonSchemaId,
    label: row.description ? `${row.schemaName} - ${row.description}` : row.schemaName,
  })),
)

const pageIndex = ref(0)
const pageSize = ref(10)
const pageCount = ref(1)
const query = ref('')
const loading = ref(false)
const uploading = ref(false)
const validating = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const upload = reactive<UploadState>({
  schemaName: '',
  description: '',
  file: null,
})

const validation = reactive<ValidationState>({
  jsonSchemaId: '',
  jsonText: '',
  result: '',
  error: null,
  errorMessages: [],
})

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

function deriveSchemaName(fileName: string): string {
  const withoutExt = fileName.replace(/\.json$/i, '')
  return withoutExt.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'schema'
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

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(String(reader.result ?? ''))
    }
    reader.onerror = () => {
      reject(new Error('Unable to read file'))
    }
    reader.readAsText(file)
  })
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await jsonSchemaFacade.list({
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
      query: query.value,
    })
    rows.value = response.schemas ?? []
    pageCount.value = response.pagination?.pageCount ?? 1
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load schemas.'
  } finally {
    loading.value = false
  }
}

async function refresh(): Promise<void> {
  pageIndex.value = 0
  await load()
}

async function uploadSchema(): Promise<void> {
  if (!upload.file) return

  uploading.value = true
  error.value = null
  success.value = null

  try {
    const schemaText = await readFileAsText(upload.file)
    const schemaName = upload.schemaName.trim() || deriveSchemaName(upload.file.name)
    const response = await jsonSchemaFacade.saveText({
      schemaName,
      description: upload.description,
      schemaText,
      overwrite: false,
    })

    success.value = response.messages?.[0] ?? `Uploaded schema ${schemaName}.`
    upload.schemaName = ''
    upload.description = ''
    upload.file = null
    await load()
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Unable to upload schema.'
  } finally {
    uploading.value = false
  }
}

async function editSchema(row: Record<string, unknown>): Promise<void> {
  const jsonSchemaId = String(row.jsonSchemaId ?? '')
  if (!jsonSchemaId) return
  await router.push({ name: 'schemas-editor', params: { jsonSchemaId } })
}

async function downloadSchema(row: Record<string, unknown>): Promise<void> {
  const jsonSchemaId = String(row.jsonSchemaId ?? '')
  const schemaName = String(row.schemaName ?? 'schema')
  if (!jsonSchemaId) return

  try {
    const response = await jsonSchemaFacade.get({ jsonSchemaId })
    const schemaText = response.schemaData?.schemaText
    if (!schemaText) {
      error.value = 'Schema text not available for download.'
      return
    }
    downloadText(`${schemaName}.json`, schemaText)
  } catch (downloadError) {
    error.value = downloadError instanceof ApiCallError ? downloadError.message : 'Unable to download schema.'
  }
}

async function deleteSchema(row: Record<string, unknown>): Promise<void> {
  const jsonSchemaId = String(row.jsonSchemaId ?? '')
  const schemaName = String(row.schemaName ?? '')
  if (!jsonSchemaId) return

  const confirmed = window.confirm(`Delete schema "${schemaName || jsonSchemaId}"?`)
  if (!confirmed) return

  try {
    await jsonSchemaFacade.delete({ jsonSchemaId })
    success.value = `Deleted schema ${schemaName || jsonSchemaId}.`
    await load()
  } catch (deleteError) {
    error.value = deleteError instanceof ApiCallError ? deleteError.message : 'Unable to delete schema.'
  }
}

async function validateJson(): Promise<void> {
  validating.value = true
  validation.error = null
  validation.result = ''
  validation.errorMessages = []

  try {
    const response = await jsonSchemaFacade.validateText({
      jsonSchemaId: validation.jsonSchemaId,
      jsonText: validation.jsonText,
    })
    const valid = response.valid === true
    validation.result = valid
      ? 'Validation passed.'
      : `Validation failed with ${response.errorCount ?? 0} issue(s).`
    validation.errorMessages = response.errorMessages ?? []
  } catch (validateError) {
    validation.error = validateError instanceof ApiCallError ? validateError.message : 'Validation failed.'
  } finally {
    validating.value = false
  }
}

function onSchemaFileChange(event: Event): void {
  const input = event.target as HTMLInputElement
  upload.file = input.files?.[0] ?? null
}

function focusUploadIfRequested(): void {
  if (String(route.query.focus ?? '') !== 'upload') return
  uploadNameInput.value?.focus()
}

async function onPayloadFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    validation.jsonText = await readFileAsText(file)
    validation.error = null
  } catch {
    validation.error = 'Unable to read payload file.'
  }
}

function prevPage(): void {
  if (pageIndex.value > 0) {
    pageIndex.value -= 1
    void load()
  }
}

function nextPage(): void {
  if (pageIndex.value + 1 < pageCount.value) {
    pageIndex.value += 1
    void load()
  }
}

onMounted(() => {
  focusUploadIfRequested()
  void load()
})

watch(
  () => route.query.focus,
  () => {
    focusUploadIfRequested()
  },
)
</script>
