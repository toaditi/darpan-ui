<template>
  <section class="stack-xl">
    <FormSection
      title="Infer Schema From JSON"
      description="Paste JSON or upload a file to infer a schema, then persist it in Schema Studio."
    >
      <form class="stack-md" @submit.prevent="inferSchema">
        <label>
          <span>Sample JSON File (optional)</span>
          <input type="file" accept=".json,application/json" @change="onJsonFileChange" />
        </label>

        <label>
          <span>Sample JSON Payload</span>
          <textarea v-model="sampleJsonText" rows="12" required />
        </label>

        <div class="action-row">
          <button type="submit" :disabled="loading">Infer Schema</button>
        </div>
      </form>

      <InlineValidation v-if="error" tone="error" :message="error" />
      <p v-if="success" class="success-copy">{{ success }}</p>
    </FormSection>

    <FormSection
      title="Save Inferred Schema"
      description="Review inferred schema text and save it through authenticated platform services."
    >
      <form class="stack-md" @submit.prevent="saveInferredSchema">
        <div class="field-grid two">
          <label>
            <span>Schema Name</span>
            <input v-model="schemaName" type="text" placeholder="generated-schema" required />
          </label>
          <label>
            <span>Description</span>
            <input v-model="description" type="text" placeholder="Inferred from sample payload" />
          </label>
        </div>

        <label>
          <span>Inferred JSON Schema</span>
          <textarea v-model="inferredSchemaText" rows="14" :readonly="fields.length > 0" required />
        </label>

        <div class="action-row">
          <button type="submit" :disabled="saving || inferredSchemaText.trim().length === 0">Save Schema</button>
          <button type="button" :disabled="inferredSchemaText.trim().length === 0" @click="downloadInferred">
            Download
          </button>
        </div>
      </form>
    </FormSection>

    <FormSection title="Flattened Field Preview" description="The inferred flattened fields that can be refined in the editor.">
      <EmptyState
        v-if="fields.length === 0"
        title="No inferred fields"
        description="Run inference above to preview the flattened schema field paths."
      />

      <SparseTable v-else :columns="columns" :rows="fieldsAsRows">
        <template #cell-required="{ row }">
          <StatusBadge :label="row.required ? 'Required' : 'Optional'" :tone="row.required ? 'success' : 'neutral'" />
        </template>
      </SparseTable>
    </FormSection>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import FormSection from '../../components/ui/FormSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import SparseTable from '../../components/ui/SparseTable.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade } from '../../lib/api/facade'
import type { JsonSchemaField } from '../../lib/api/types'

const columns = [
  { key: 'fieldPath', label: 'Field Path' },
  { key: 'type', label: 'Type' },
  { key: 'required', label: 'Required' },
]

const sampleJsonText = ref('')
const schemaName = ref('')
const description = ref('')
const inferredSchemaText = ref('')
const fields = ref<JsonSchemaField[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const fieldsAsRows = computed(() => fields.value as Array<Record<string, unknown>>)

function deriveSchemaNameFromJson(raw: string): string {
  const sanitized = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return sanitized || 'inferred_schema'
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsText(file)
  })
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

async function inferSchema(): Promise<void> {
  loading.value = true
  error.value = null
  success.value = null

  try {
    const response = await jsonSchemaFacade.inferFromText({ jsonText: sampleJsonText.value })
    inferredSchemaText.value = response.jsonSchemaString ?? ''
    fields.value = response.fieldList ?? []

    if (!schemaName.value.trim()) {
      schemaName.value = deriveSchemaNameFromJson('schema')
    }
    success.value = 'Schema inferred from sample JSON.'
  } catch (inferError) {
    error.value = inferError instanceof ApiCallError ? inferError.message : 'Unable to infer schema.'
  } finally {
    loading.value = false
  }
}

async function saveInferredSchema(): Promise<void> {
  saving.value = true
  error.value = null
  success.value = null

  try {
    const response = await jsonSchemaFacade.saveText({
      schemaName: schemaName.value,
      description: description.value,
      schemaText: inferredSchemaText.value,
      overwrite: false,
    })
    success.value = response.messages?.[0] ?? `Saved schema ${schemaName.value}.`
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Unable to save inferred schema.'
  } finally {
    saving.value = false
  }
}

function downloadInferred(): void {
  const fileName = `${deriveSchemaNameFromJson(schemaName.value || 'inferred_schema')}.json`
  downloadText(fileName, inferredSchemaText.value)
}

async function onJsonFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    sampleJsonText.value = await readFileAsText(file)
    if (!schemaName.value.trim()) {
      const base = file.name.replace(/\.json$/i, '')
      schemaName.value = deriveSchemaNameFromJson(base)
    }
  } catch {
    error.value = 'Unable to read JSON file.'
  }
}
</script>
