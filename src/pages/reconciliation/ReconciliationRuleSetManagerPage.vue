<template>
  <StaticPageFrame>
    <template #hero>
      <div class="ruleset-manager-hero">
        <h1>{{ heroTitle }}</h1>
      </div>
    </template>

    <InlineValidation v-if="deleteError" tone="error" :message="deleteError" />

    <StaticPageSection v-if="draft">
      <template #header>
        <div class="ruleset-manager-section-header">
          <h2 class="static-page-section-heading">Run</h2>
          <button
            type="button"
            class="app-icon-action ruleset-manager-section-edit"
            data-testid="ruleset-manager-edit-run"
            aria-label="Edit Run"
            @click="openRunEditWorkflow"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                :d="editIconPath"
                class="ruleset-manager-edit-icon-path"
              />
            </svg>
          </button>
        </div>
      </template>

      <div class="ruleset-manager-basics-grid">
        <div class="ruleset-manager-schema-row" data-testid="ruleset-manager-schema-row-file1">
          <article class="ruleset-manager-basic-card">
            <span class="static-page-summary-label">System</span>
            <strong>{{ file1Title }}</strong>
          </article>
          <article class="ruleset-manager-basic-card">
            <span class="static-page-summary-label">Schema</span>
            <span class="ruleset-manager-summary-copy">{{ file1SourceLabel }}</span>
          </article>
          <article class="ruleset-manager-basic-card">
            <span class="static-page-summary-label">Primary ID</span>
            <span>{{ file1PrimaryId }}</span>
          </article>
        </div>

        <div class="ruleset-manager-schema-row" data-testid="ruleset-manager-schema-row-file2">
          <article class="ruleset-manager-basic-card">
            <span class="static-page-summary-label">System</span>
            <strong>{{ file2Title }}</strong>
          </article>
          <article class="ruleset-manager-basic-card">
            <span class="static-page-summary-label">Schema</span>
            <span class="ruleset-manager-summary-copy">{{ file2SourceLabel }}</span>
          </article>
          <article class="ruleset-manager-basic-card">
            <span class="static-page-summary-label">Primary ID</span>
            <span>{{ file2PrimaryId }}</span>
          </article>
        </div>
      </div>
    </StaticPageSection>

    <StaticPageSection>
      <template #header>
        <div class="ruleset-manager-section-header">
          <h2 class="static-page-section-heading">Rules</h2>
          <button
            type="button"
            class="app-icon-action ruleset-manager-section-edit"
            data-testid="ruleset-manager-edit-rules"
            aria-label="Edit Rules"
            @click="openRuleEditWorkflow"
          >
            <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                :d="editIconPath"
                class="ruleset-manager-edit-icon-path"
              />
            </svg>
          </button>
        </div>
      </template>

      <template v-if="draft">
        <div class="ruleset-manager-builder">
          <section class="ruleset-manager-equation-panel" data-testid="ruleset-manager-preview" aria-label="Active comparison">
            <ol v-if="visibleRules.length" class="ruleset-manager-rule-list" data-testid="ruleset-manager-rule-list">
              <li v-for="rule in visibleRules" :key="rule.ruleId || `${rule.sequenceNum}-${rule.file1FieldPath}-${rule.file2FieldPath}`">
                <span class="ruleset-manager-rule-sequence">#{{ rule.sequenceNum }}</span>
                <span>{{ formatRulePreview(rule) }}</span>
              </li>
            </ol>
            <p v-else class="ruleset-manager-preview-line">{{ comparisonPreview }}</p>
          </section>
        </div>
      </template>

      <template v-else>
        <EmptyState
          title="No run basics defined yet"
          description="Start in reconciliation setup, then open the Ruleset Manager after defining the two sources."
        />

        <RouterLink
          class="static-page-action-tile static-page-action-tile--inline"
          :to="{ name: 'reconciliation-create' }"
        >
          Go to Run Setup
        </RouterLink>
      </template>
    </StaticPageSection>

    <template v-if="draft" #actions>
      <div class="action-row ruleset-manager-footer-row">
        <button
          type="button"
          class="app-icon-action app-icon-action--large ruleset-manager-run-action"
          data-testid="ruleset-manager-run-ruleset"
          aria-label="Run ruleset"
          @click="openRunWorkflow"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path :d="playIconPath" :transform="playIconTransform" fill="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          class="app-icon-action app-icon-action--large app-icon-action--danger ruleset-manager-delete-action"
          data-testid="ruleset-manager-delete-run"
          aria-label="Delete run"
          :disabled="deletingSavedRun"
          @click="deleteSavedRun"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path :d="trashIconPath" :transform="trashIconTransform" fill="currentColor" />
          </svg>
        </button>
      </div>
    </template>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import { ApiCallError } from '../../lib/api/client'
import { jsonSchemaFacade, reconciliationFacade } from '../../lib/api/facade'
import {
  buildReconciliationRuleSetDraftState,
  readReconciliationRuleSetDraftState,
  type ReconciliationRuleSetDraft,
  type ReconciliationRuleSetDraftRule,
} from '../../lib/reconciliationRuleSetDraft'
import { buildReconciliationDiffRoute } from '../../lib/reconciliationRoutes'
import { resolveSchemaLabel } from '../../lib/utils/schemaLabel'
import { buildWorkflowOriginState, readWorkflowOriginFromHistoryState } from '../../lib/workflowOrigin'

const route = useRoute()
const router = useRouter()
const schemaLabels = ref<Record<string, string>>({})
const deletingSavedRun = ref(false)
const deleteError = ref<string | null>(null)
const editIconPath =
  'M14.73 2.73a1.75 1.75 0 0 1 2.48 2.48l-1.2 1.2-2.48-2.48 1.2-1.2ZM12.47 4.99 4.8 12.66l-1.18 3.72 3.72-1.18 7.67-7.67-2.54-2.54Z'
const playIconPath =
  'M6.75 4.2c0-.91.99-1.48 1.78-1.01l7.1 4.25a1.18 1.18 0 0 1 0 2.02l-7.1 4.25a1.18 1.18 0 0 1-1.78-1.01V4.2Z'
const playIconTransform = 'translate(0 1.5)'
const trashIconPath =
  'M7.5 3.5A1.5 1.5 0 0 1 9 2h2a1.5 1.5 0 0 1 1.5 1.5V4H15a.75.75 0 0 1 0 1.5h-.57l-.58 9.17A1.75 1.75 0 0 1 12.1 16.5H7.9a1.75 1.75 0 0 1-1.75-1.33L5.57 5.5H5a.75.75 0 0 1 0-1.5h2.5v-.5ZM11 3.5h-2V4h2v-.5ZM7.07 5.5l.56 8.89c.02.19.13.31.27.31h4.2c.14 0 .25-.12.27-.31l.56-8.89H7.07Zm1.68 1.75a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Zm2.5 0a.75.75 0 0 1 .75.75v4a.75.75 0 0 1-1.5 0v-4a.75.75 0 0 1 .75-.75Z'
const trashIconTransform = 'translate(0 0.75)'

const draftState = computed(() => readReconciliationRuleSetDraftState(typeof window === 'undefined' ? null : window.history.state))
const draft = computed<ReconciliationRuleSetDraft | null>(() => draftState.value?.draft ?? null)
const savedRunId = computed(() => draft.value?.savedRunId?.trim() ?? '')
const heroTitle = computed(() => draft.value?.runName || 'Run')
const file1Title = computed(() => draft.value?.file1SystemLabel || draft.value?.file1SystemEnumId || 'System 1')
const file2Title = computed(() => draft.value?.file2SystemLabel || draft.value?.file2SystemEnumId || 'System 2')
const file1SourceLabel = computed(() => summarizeSource(draft.value, 'file1'))
const file2SourceLabel = computed(() => summarizeSource(draft.value, 'file2'))
const file1PrimaryId = computed(() => formatFieldKey(draft.value?.file1PrimaryIdExpression))
const file2PrimaryId = computed(() => formatFieldKey(draft.value?.file2PrimaryIdExpression))
const comparisonPreview = computed(() => {
  if (!draft.value) return 'Select fields to draft a comparison'
  return `${file1PrimaryId.value} = ${file2PrimaryId.value}`
})
const basicDiffRule = computed<ReconciliationRuleSetDraftRule | null>(() => {
  if (!draft.value) return null

  const storedBasicDiffRule = (draft.value.rules ?? []).find((rule) => rule.sequenceNum === 0)
  if (storedBasicDiffRule) return storedBasicDiffRule

  return {
    ruleId: 'basic-diff',
    file1FieldPath: draft.value.file1PrimaryIdExpression,
    file2FieldPath: draft.value.file2PrimaryIdExpression,
    operator: '=',
    sequenceNum: 0,
  }
})
const visibleRules = computed(() => [
  ...(basicDiffRule.value ? [basicDiffRule.value] : []),
  ...(draft.value?.rules ?? []).filter((rule) => rule.sequenceNum > 0),
].sort((left, right) => left.sequenceNum - right.sequenceNum))

function formatFieldKey(fieldPath: string | undefined): string {
  const trimmedFieldPath = fieldPath?.trim()
  if (!trimmedFieldPath) return 'Field pending'

  const normalizedFieldPath = trimmedFieldPath
    .replace(/\[(?:\*|\d+)\]/g, '')
    .replace(/\[['"]?([A-Za-z_$][\w$-]*)['"]?\]/g, '.$1')
  const pathSegments = normalizedFieldPath
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== '$')

  return pathSegments.at(-1) || trimmedFieldPath
}

function formatRulePreview(rule: ReconciliationRuleSetDraftRule): string {
  return `${formatFieldKey(rule.file1FieldPath)} ${rule.operator?.trim() || '='} ${formatFieldKey(rule.file2FieldPath)}`
}

function summarizeSource(draftValue: ReconciliationRuleSetDraft | null, side: 'file1' | 'file2'): string {
  if (!draftValue) return 'Source pending'

  const fileTypeEnumId = side === 'file1' ? draftValue.file1FileTypeEnumId : draftValue.file2FileTypeEnumId
  return fileTypeEnumId === 'DftJson'
    ? resolveDraftSchemaLabel(draftValue, side)
    : 'CSV source'
}

function resolveDraftSchemaLabel(draftValue: ReconciliationRuleSetDraft, side: 'file1' | 'file2'): string {
  const draftSchemaLabel = side === 'file1' ? draftValue.file1SchemaLabel : draftValue.file2SchemaLabel
  const systemLabel = side === 'file1' ? file1Title.value : file2Title.value
  if (draftSchemaLabel?.trim()) return withoutSystemSuffix(draftSchemaLabel.trim(), systemLabel)

  const jsonSchemaId = side === 'file1' ? draftValue.file1JsonSchemaId : draftValue.file2JsonSchemaId
  const schemaFileName = side === 'file1' ? draftValue.file1SchemaFileName : draftValue.file2SchemaFileName
  const lookupKey = schemaLabelLookupKey(jsonSchemaId, schemaFileName)
  if (lookupKey && schemaLabels.value[lookupKey]) return withoutSystemSuffix(schemaLabels.value[lookupKey], systemLabel)

  return schemaFileName || 'JSON schema pending'
}

function withoutSystemSuffix(label: string, systemLabel: string): string {
  const suffix = systemLabel.trim() ? ` - ${systemLabel.trim()}` : ''
  return suffix && label.endsWith(suffix) ? label.slice(0, -suffix.length).trim() : label
}

function schemaLabelLookupKey(schemaId: string | undefined, schemaName: string | undefined): string {
  if (schemaId?.trim()) return `id:${schemaId.trim()}`
  if (schemaName?.trim()) return `name:${schemaName.trim()}`
  return ''
}

async function ensureSchemaLabel(schemaId: string | undefined, schemaName: string | undefined, currentLabel: string | undefined): Promise<void> {
  const lookupKey = schemaLabelLookupKey(schemaId, schemaName)
  if (!lookupKey || currentLabel?.trim() || schemaLabels.value[lookupKey]) return

  try {
    const response = await jsonSchemaFacade.get(schemaId?.trim() ? { jsonSchemaId: schemaId.trim() } : { schemaName })
    if (!response.schemaData) return

    schemaLabels.value = {
      ...schemaLabels.value,
      [lookupKey]: resolveSchemaLabel(response.schemaData),
    }
  } catch {
    // Display falls back to the stored schema name when the label cannot be resolved.
  }
}

async function loadRunSchemaLabels(): Promise<void> {
  if (!draft.value) return

  await Promise.all([
    ensureSchemaLabel(draft.value.file1JsonSchemaId, draft.value.file1SchemaFileName, draft.value.file1SchemaLabel),
    ensureSchemaLabel(draft.value.file2JsonSchemaId, draft.value.file2SchemaFileName, draft.value.file2SchemaLabel),
  ])
}

function getRunDeleteLabel(): string {
  return heroTitle.value.trim() || savedRunId.value || 'this run'
}

async function openRunEditWorkflow(): Promise<void> {
  if (!draft.value || !savedRunId.value) return

  const runDetailsState = buildReconciliationRuleSetDraftState(draft.value)
  await router.push({
    name: 'settings-runs-edit',
    params: { reconciliationMappingId: savedRunId.value },
    state: {
      ...buildWorkflowOriginState('Run Details', route.fullPath || '/reconciliation/ruleset-manager', runDetailsState),
      ...runDetailsState,
    },
  })
}

async function openRuleEditWorkflow(): Promise<void> {
  if (!draft.value) return

  const runDetailsState = buildReconciliationRuleSetDraftState(draft.value, 'ruleset-manager')
  await router.push({
    name: 'reconciliation-ruleset-editor',
    state: {
      ...buildWorkflowOriginState('Run Details', route.fullPath || '/reconciliation/ruleset-manager', runDetailsState),
      ...runDetailsState,
    },
  })
}

async function openRunWorkflow(): Promise<void> {
  deleteError.value = null
  if (!draft.value || !savedRunId.value) {
    deleteError.value = 'Saved run ID is missing.'
    return
  }

  await router.push(
    buildReconciliationDiffRoute(
      {
        savedRunId: savedRunId.value,
        runName: heroTitle.value,
        file1SystemLabel: file1Title.value,
        file2SystemLabel: file2Title.value,
      },
      buildWorkflowOriginState('Run Details', route.fullPath || '/reconciliation/ruleset-manager'),
    ),
  )
}

async function deleteSavedRun(): Promise<void> {
  if (deletingSavedRun.value) return

  deleteError.value = null
  if (!savedRunId.value) {
    deleteError.value = 'Saved run ID is missing.'
    return
  }

  if (!window.confirm(`Delete run "${getRunDeleteLabel()}"?`)) return

  deletingSavedRun.value = true
  try {
    await reconciliationFacade.deleteSavedRun({ savedRunId: savedRunId.value })
    await router.push(readWorkflowOriginFromHistoryState()?.path ?? '/settings/runs')
  } catch (error) {
    deleteError.value = error instanceof ApiCallError ? error.message : 'Unable to delete run.'
  } finally {
    deletingSavedRun.value = false
  }
}

onMounted(() => {
  void loadRunSchemaLabels()
})
</script>

<style scoped>
.ruleset-manager-hero {
  display: grid;
  gap: 0.45rem;
}

.ruleset-manager-hero h1 {
  margin: 0;
}

.ruleset-manager-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.ruleset-manager-section-edit {
  flex: 0 0 auto;
  width: 2.2rem;
  min-height: 2.2rem;
}

.ruleset-manager-edit-icon-path {
  fill: currentColor;
}

.ruleset-manager-footer-row {
  gap: 0.7rem;
  justify-content: center;
}

.ruleset-manager-summary-copy {
  color: var(--text-soft);
}

.ruleset-manager-basics-grid {
  display: grid;
  gap: 0.9rem;
}

.ruleset-manager-schema-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.ruleset-manager-basic-card {
  display: grid;
  min-width: 0;
  gap: 0.45rem;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--static-surface-radius);
  background: var(--surface-2);
}

.ruleset-manager-basic-card strong,
.ruleset-manager-summary-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}

.ruleset-manager-builder {
  display: grid;
  gap: var(--space-4);
}

.ruleset-manager-equation-panel {
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--static-surface-radius);
  background: var(--surface-2);
}

.ruleset-manager-preview-line {
  margin: 0;
  color: var(--text-soft);
  overflow-wrap: anywhere;
  line-height: 1.35;
}

.ruleset-manager-rule-list {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ruleset-manager-rule-list li {
  display: flex;
  gap: 0.65rem;
  align-items: baseline;
  min-width: 0;
  color: var(--text-soft);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.ruleset-manager-rule-sequence {
  flex: 0 0 auto;
  color: var(--text-muted);
}

@media (max-width: 980px) {
  .ruleset-manager-schema-row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
