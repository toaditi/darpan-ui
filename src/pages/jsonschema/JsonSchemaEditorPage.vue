<template>
  <StaticPageFrame>
    <template #hero>
      <div class="stack-sm">
        <h1>{{ heroTitle }}</h1>
      </div>
    </template>

    <StaticPageSection>
      <p v-if="loading && !initialLoadCompleted" class="section-note" data-testid="schema-editor-loading">Loading schema...</p>

      <template v-else-if="showInitialLoadFailureState">
        <InlineValidation v-if="error" tone="error" :message="error" />
        <EmptyState
          title="Unable to load this schema"
          description="Retry loading before refining any fields."
        />

        <div class="action-row">
          <button type="button" @click="reload" :disabled="loading">Retry Loading Schema</button>
        </div>
      </template>

      <template v-else-if="!hasTarget">
        <EmptyState
          title="No schema selected"
          description="Open a schema from the library to review and refine its fields."
        />

        <RouterLink class="static-page-action-tile static-page-action-tile--inline" :to="{ name: 'schemas-library' }">
          Go to Schema Library
        </RouterLink>
      </template>

      <template v-else>
        <div class="static-page-summary-grid">
          <article class="static-page-summary-card">
            <span class="static-page-summary-label">Schema ID</span>
            <strong>{{ currentSchemaId }}</strong>
          </article>
          <article class="static-page-summary-card">
            <span class="static-page-summary-label">System</span>
            <strong>{{ systemLabel || systemEnumId || 'Unassigned' }}</strong>
          </article>
          <article class="static-page-summary-card">
            <span class="static-page-summary-label">Updated</span>
            <strong>{{ formatDate(lastUpdatedStamp) }}</strong>
          </article>
        </div>
      </template>
    </StaticPageSection>

    <StaticPageSection v-if="!showInitialLoadFailureState && hasTarget">
      <form class="stack-md" @submit.prevent="saveRefinedFields">
        <AppTableFrame :columns="refinedFieldColumns" :rows="refinedFieldRows">
          <template #header-actions>
            <button
              type="button"
              class="app-table__header-action"
              data-testid="schema-editor-download"
              aria-label="Download schema JSON"
              :disabled="!schemaText.trim()"
              @click="downloadSchema"
            >
              <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                <path
                  d="M10 2.5a.75.75 0 0 1 .75.75v7.19l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V3.25A.75.75 0 0 1 10 2.5Zm-5 11a.75.75 0 0 1 .75.75v1.5c0 .14.11.25.25.25h8c.14 0 .25-.11.25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 14 17.5H6A1.75 1.75 0 0 1 4.25 15.75v-1.5A.75.75 0 0 1 5 13.5Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </template>

          <template #cell-fieldPath="{ row }">
            <input v-model="row.fieldPath" type="text" placeholder="$.order.id" />
          </template>

          <template #cell-type="{ row }">
            <AppSelect
              :model-value="String(row.type ?? '')"
              :options="fieldTypeOptions"
              @update:model-value="row.type = $event as JsonSchemaField['type']"
            />
          </template>

          <template #cell-required="{ row }">
            <div class="app-table__control-wrap app-table__control-wrap--start">
              <label class="checkbox-inline checkbox-inline--control-only">
                <input v-model="row.required" class="app-table__checkbox" type="checkbox" aria-label="Required field" />
              </label>
            </div>
          </template>

          <template #cell-actions="{ index }">
            <div class="app-table__control-wrap app-table__control-wrap--end">
              <button
                type="button"
                :class="rowDeleteActionClass"
                aria-label="Remove field row"
                @click="removeFieldRow(index)"
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path :d="trashIconPath" fill="currentColor" />
                </svg>
              </button>
            </div>
          </template>

          <template #append-row="{ columnCount }">
            <tr>
              <td :colspan="columnCount" class="app-table__append-cell">
                <div class="app-table__append-action">
                  <button
                    type="button"
                    class="app-table__icon-action"
                    data-testid="schema-editor-add-row"
                    aria-label="Add field row"
                    @click="addFieldRow"
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                      <path
                        d="M10 4.25a.75.75 0 0 1 .75.75v4.25H15a.75.75 0 0 1 0 1.5h-4.25V15a.75.75 0 0 1-1.5 0v-4.25H5a.75.75 0 0 1 0-1.5h4.25V5a.75.75 0 0 1 .75-.75Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </template>
        </AppTableFrame>

        <div class="action-row schema-editor-footer-row">
          <AppSaveAction
            type="submit"
            class="schema-editor-footer-action"
            test-id="save-refined-fields"
            label="Save refined fields"
            :disabled="footerActionsDisabled"
          />
          <button
            type="button"
            :class="footerDeleteActionClass"
            data-testid="delete-schema"
            aria-label="Delete schema"
            :disabled="footerActionsDisabled"
            @click="deleteSchema"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path :d="trashIconPath" :transform="footerTrashIconTransform" fill="currentColor" />
            </svg>
          </button>
        </div>
      </form>
    </StaticPageSection>

    <InlineValidation v-if="error && !showInitialLoadFailureState" tone="error" :message="error" />
    <p v-if="success" class="success-copy">{{ success }}</p>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppTableFrame from '../../components/ui/AppTableFrame.vue'
import AppSaveAction from '../../components/ui/AppSaveAction.vue'
import AppSelect, { type AppSelectOption } from '../../components/ui/AppSelect.vue'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade } from '../../lib/api/facade'
import type { JsonSchemaField } from '../../lib/api/types'

interface EditableFieldRow {
  fieldPath: string
  type: JsonSchemaField['type']
  required: boolean
}

const fieldTypes: JsonSchemaField['type'][] = ['string', 'integer', 'number', 'boolean', 'object', 'array']
const fieldTypeOptions: AppSelectOption[] = fieldTypes.map((fieldType) => ({ value: fieldType, label: fieldType }))
const rowDeleteActionClass = 'app-table__icon-action app-table__icon-action--danger schema-editor-row-delete-action'
const footerDeleteActionClass =
  'app-icon-action app-icon-action--large app-icon-action--danger schema-editor-footer-action'
const trashIconPath =
  'M7.5 3.5A1.5 1.5 0 0 1 9 2h2a1.5 1.5 0 0 1 1.5 1.5V4H15a.75.75 0 0 1 0 1.5h-.57l-.58 9.17A1.75 1.75 0 0 1 12.1 16.5H7.9a1.75 1.75 0 0 1-1.75-1.33L5.57 5.5H5a.75.75 0 0 1 0-1.5h2.5v-.5ZM11 3.5h-2V4h2v-.5ZM7.07 5.5l.56 8.89c.02.19.13.31.27.31h4.2c.14 0 .25-.12.27-.31l.56-8.89H7.07Zm1.68 1.75a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Zm2.5 0a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Z'
const footerTrashIconTransform = 'translate(0 0.75)'

const props = defineProps<{
  jsonSchemaId?: string
}>()

const route = useRoute()
const router = useRouter()

const currentSchemaId = ref(props.jsonSchemaId ?? String(route.params.jsonSchemaId ?? '').trim())
const schemaName = ref('')
const description = ref('')
const systemEnumId = ref('')
const systemLabel = ref('')
const lastUpdatedStamp = ref('')
const schemaText = ref('')
const fieldRows = ref<EditableFieldRow[]>([])
const loading = ref(false)
const savingRefined = ref(false)
const deletingSchema = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const initialLoadCompleted = ref(false)
const initialLoadSucceeded = ref(false)

const hasTarget = computed(() => currentSchemaId.value.length > 0)
const canEditTarget = computed(() => hasTarget.value && initialLoadSucceeded.value)
const showInitialLoadFailureState = computed(() => hasTarget.value && initialLoadCompleted.value && !initialLoadSucceeded.value)
const footerActionsDisabled = computed(() => !canEditTarget.value || savingRefined.value || deletingSchema.value)
const heroTitle = computed(() => {
  if (description.value.trim()) return description.value.trim()
  if (schemaName.value.trim()) return schemaName.value.trim()
  return 'Schema Editor'
})
const refinedFieldColumns = [
  { key: 'fieldPath', label: 'Field Path', cellClass: 'app-table__control-cell' },
  { key: 'type', label: 'Type', colStyle: { width: '10rem' }, cellClass: 'app-table__control-cell' },
  { key: 'required', label: 'Required', colStyle: { width: '6.5rem' }, cellClass: 'app-table__control-cell' },
  {
    key: 'actions',
    label: '',
    headerAlign: 'end' as const,
    colClass: 'app-table__action-column',
    colStyle: { width: '4rem' },
    headerClass: 'app-table__action-header',
    cellClass: 'app-table__action-cell',
  },
]
const refinedFieldRows = computed(() => fieldRows.value as Array<Record<string, unknown>>)

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

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
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

function downloadSchema(): void {
  if (!schemaText.value.trim()) return
  downloadText(`${schemaName.value || 'schema'}.json`, schemaText.value)
}

function getSchemaDeleteLabel(): string {
  return description.value.trim() || schemaName.value.trim() || currentSchemaId.value
}

async function loadFlattenedRows(): Promise<void> {
  const response = await jsonSchemaFacade.flatten({ jsonSchemaId: currentSchemaId.value })
  fieldRows.value = (response.fieldList ?? []).map((item) => ({
    fieldPath: String(item.fieldPath ?? ''),
    type: normalizeFieldType(item.type),
    required: parseBoolean(item.required),
  }))
}

async function loadSchema(): Promise<void> {
  if (!hasTarget.value) {
    initialLoadCompleted.value = true
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await jsonSchemaFacade.get({ jsonSchemaId: currentSchemaId.value })
    const schemaData = response.schemaData

    if (!schemaData) {
      error.value = 'Schema not found.'
      return
    }

    currentSchemaId.value = schemaData.jsonSchemaId
    schemaName.value = schemaData.schemaName
    description.value = schemaData.description ?? ''
    systemEnumId.value = schemaData.systemEnumId ?? ''
    systemLabel.value = schemaData.systemLabel ?? ''
    lastUpdatedStamp.value = schemaData.lastUpdatedStamp ?? ''
    schemaText.value = schemaData.schemaText ?? ''

    await loadFlattenedRows()
    initialLoadSucceeded.value = true
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Unable to load schema.'
  } finally {
    initialLoadCompleted.value = true
    loading.value = false
  }
}

async function reload(): Promise<void> {
  initialLoadCompleted.value = false
  initialLoadSucceeded.value = false
  await loadSchema()
}

async function saveRefinedFields(): Promise<void> {
  if (!canEditTarget.value) return

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
    await router.push({ name: 'schemas-library' })
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Unable to save refined fields.'
  } finally {
    savingRefined.value = false
  }
}

async function deleteSchema(): Promise<void> {
  if (!canEditTarget.value || deletingSchema.value) return

  const confirmed = window.confirm(`Delete schema "${getSchemaDeleteLabel()}"?`)
  if (!confirmed) return

  deletingSchema.value = true
  error.value = null
  success.value = null

  try {
    await jsonSchemaFacade.delete({ jsonSchemaId: currentSchemaId.value })
    await router.push({ name: 'schemas-library' })
  } catch (deleteError) {
    error.value = deleteError instanceof ApiCallError ? deleteError.message : 'Unable to delete schema.'
  } finally {
    deletingSchema.value = false
  }
}

onMounted(() => {
  void loadSchema()
})
</script>

<style scoped>
.schema-editor-footer-row {
  justify-content: center;
}

.schema-editor-row-delete-action {
  width: 2.2rem;
  min-height: 2.2rem;
}
</style>
