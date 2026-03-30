<template>
  <main class="page-root">
    <section class="module-intro">
      <p class="eyebrow">[wave_1] clear_task_flow</p>
      <h1>Clear task flow</h1>
      <p class="muted-copy">Connections -> Schema Studio -> Roadmap &amp; Requests.</p>
    </section>

    <section class="card-grid three hub-grid">
      <article class="card hub-card">
        <div class="stack-sm">
          <p class="eyebrow">Active</p>
          <h3>Connections</h3>
          <p>LLM, SFTP, NetSuite, and Read DB profiles.</p>
        </div>
        <div class="actions-tight">
          <RouterLink class="ghost-link" to="/connections/llm">LLM</RouterLink>
          <RouterLink class="ghost-link" to="/connections/sftp?focus=create">Add SFTP</RouterLink>
          <RouterLink class="ghost-link" to="/connections/netsuite/auth?focus=create">Add NetSuite Auth</RouterLink>
          <RouterLink class="ghost-link" to="/connections/netsuite/endpoints?focus=create">Add Endpoint</RouterLink>
          <RouterLink class="ghost-link" to="/connections/read-db?focus=create">Add Read DB</RouterLink>
        </div>
      </article>

      <article class="card hub-card">
        <div class="stack-sm">
          <p class="eyebrow">Active</p>
          <h3>Schema Studio</h3>
          <p>Library, infer, validate, and refine schema records.</p>
        </div>
        <div class="actions-tight">
          <RouterLink class="ghost-link" to="/schemas/library">Library</RouterLink>
          <RouterLink class="ghost-link" to="/schemas/library?focus=upload">Upload Schema</RouterLink>
          <RouterLink class="ghost-link" to="/schemas/infer">Infer</RouterLink>
          <RouterLink class="ghost-link" to="/schemas/editor">Editor</RouterLink>
        </div>
      </article>

      <article class="card hub-card roadmap">
        <div class="stack-sm">
          <p class="eyebrow">Roadmap</p>
          <h3>Reconciliation</h3>
          <p>Customer roadmap access and request intake are available here, and results remain in a dedicated workspace.</p>
        </div>
        <div class="actions-tight">
          <RouterLink class="ghost-link" to="/roadmap/reconciliation">Open Roadmap &amp; Requests</RouterLink>
          <RouterLink class="ghost-link" to="/reconciliation/results">Open Results Workspace</RouterLink>
        </div>
      </article>
    </section>

    <FormSection title="Startup action track" description="Three operational milestones for first-time setup.">
      <div class="stack-md">
        <div class="row-between">
          <p class="muted-copy">Runtime status inferred from platform service records.</p>
          <button type="button" @click="loadReadiness" :disabled="loading">Refresh Status</button>
        </div>

        <InlineValidation v-if="statusMessage" :tone="statusMessageTone" :message="statusMessage" />

        <ol class="action-track">
          <li v-for="step in readiness" :key="step.id" class="action-track-item">
            <div class="stack-sm">
              <p class="action-track-title">{{ step.label }}</p>
              <p class="mono-copy">{{ step.detail }}</p>
            </div>
            <StatusBadge :label="statusLabel(step.status)" :tone="statusTone(step.status)" />
          </li>
        </ol>
      </div>
    </FormSection>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import FormSection from '../components/ui/FormSection.vue'
import InlineValidation from '../components/ui/InlineValidation.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import { ensureAuthenticated } from '../lib/auth'
import { jsonSchemaFacade, settingsFacade } from '../lib/api/facade'
import type { HubReadinessState, ReadinessStatus } from '../lib/types/ux'

const readiness = ref<HubReadinessState[]>([
  {
    id: 'connections',
    label: 'Step 1: Add at least one connection profile',
    status: 'pending',
    detail: 'Checking connection profile inventory...',
  },
  {
    id: 'schema',
    label: 'Step 2: Create or infer first schema',
    status: 'pending',
    detail: 'Checking schema library inventory...',
  },
  {
    id: 'rollout',
    label: 'Step 3: Ready for reconciliation rollout',
    status: 'pending',
    detail: 'Waiting for prerequisite steps to complete.',
  },
])

const loading = ref(false)
const statusMessage = ref<string | null>(null)
const statusMessageTone = ref<'error' | 'info'>('info')
const route = useRoute()
const router = useRouter()

function statusLabel(status: ReadinessStatus): string {
  if (status === 'complete') return 'Complete'
  if (status === 'unknown') return 'Unknown'
  return 'Pending'
}

function statusTone(status: ReadinessStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'complete') return 'success'
  if (status === 'unknown') return 'warning'
  return 'neutral'
}

function parseTotalCount(result: PromiseSettledResult<{ pagination?: { totalCount?: number } }>): number | null {
  if (result.status === 'rejected') return null
  return Number(result.value.pagination?.totalCount ?? 0)
}

function parseLlmConfigured(
  result: PromiseSettledResult<{
    llmSettings?: {
      llmEnabled?: string
      llmModel?: string
      hasStoredLlmApiKey?: boolean
      hasFallbackLlmApiKey?: boolean
    }
  }>,
): number | null {
  if (result.status === 'rejected') return null
  const settings = result.value.llmSettings
  if (!settings) return 0

  const enabled = String(settings.llmEnabled ?? 'N') === 'Y'
  const hasKey = settings.hasStoredLlmApiKey === true || settings.hasFallbackLlmApiKey === true
  const hasModel = String(settings.llmModel ?? '').trim().length > 0

  return enabled || hasKey || hasModel ? 1 : 0
}

function summarizeConnections(connectionCounts: Array<number | null>): {
  status: ReadinessStatus
  detail: string
} {
  const known = connectionCounts.filter((count): count is number => count !== null)
  const knownTotal = known.reduce((sum, count) => sum + count, 0)
  const hasAny = known.some((count) => count > 0)
  const hasUnknown = connectionCounts.some((count) => count === null)

  if (hasAny) {
    return {
      status: 'complete',
      detail: `Detected ${knownTotal} connection profile record(s) across available modules.`,
    }
  }
  if (known.length === connectionCounts.length) {
    return {
      status: 'pending',
      detail: 'No connection profiles detected yet. Create at least one profile in Connections.',
    }
  }
  if (hasUnknown) {
    return {
      status: 'unknown',
      detail: 'Unable to read one or more connection modules. Retry after backend stabilization.',
    }
  }
  return {
    status: 'pending',
    detail: 'No connection profiles detected yet.',
  }
}

function summarizeSchema(schemaCount: number | null): {
  status: ReadinessStatus
  detail: string
} {
  if (schemaCount === null) {
    return {
      status: 'unknown',
      detail: 'Unable to fetch schema library status. Retry after backend stabilization.',
    }
  }
  if (schemaCount > 0) {
    return {
      status: 'complete',
      detail: `Detected ${schemaCount} schema record(s) in the library.`,
    }
  }
  return {
    status: 'pending',
    detail: 'No schemas found yet. Upload or infer your first schema.',
  }
}

function summarizeRollout(connections: ReadinessStatus, schema: ReadinessStatus): {
  status: ReadinessStatus
  detail: string
} {
  if (connections === 'complete' && schema === 'complete') {
    return {
      status: 'complete',
      detail: 'Prerequisites complete. Continue with roadmap tracking until reconciliation UI is released.',
    }
  }
  if (connections === 'unknown' || schema === 'unknown') {
    return {
      status: 'unknown',
      detail: 'Prerequisite status is partially unknown due to unavailable module checks.',
    }
  }
  return {
    status: 'pending',
    detail: 'Complete Step 1 and Step 2 before reconciliation rollout readiness.',
  }
}

async function loadReadiness(): Promise<void> {
  loading.value = true
  statusMessage.value = null

  try {
    const authenticated = await ensureAuthenticated(true)
    if (!authenticated) {
      await router.replace({
        name: 'login',
        query: { redirect: route.fullPath },
      })
      return
    }

    const [llm, sftp, nsAuth, nsEndpoints, readDb, schemas] = await Promise.allSettled([
      settingsFacade.getLlmSettings(),
      settingsFacade.listSftpServers({ pageIndex: 0, pageSize: 1 }),
      settingsFacade.listNsAuthConfigs({ pageIndex: 0, pageSize: 1 }),
      settingsFacade.listNsRestletConfigs({ pageIndex: 0, pageSize: 1 }),
      settingsFacade.listHcReadDbConfigs({ pageIndex: 0, pageSize: 1 }),
      jsonSchemaFacade.list({ pageIndex: 0, pageSize: 1, query: '' }),
    ])

    const connectionSummary = summarizeConnections([
      parseLlmConfigured(llm),
      parseTotalCount(sftp),
      parseTotalCount(nsAuth),
      parseTotalCount(nsEndpoints),
      parseTotalCount(readDb),
    ])

    const schemaSummary = summarizeSchema(parseTotalCount(schemas))

    const rolloutSummary = summarizeRollout(connectionSummary.status, schemaSummary.status)
    const readinessStates: ReadinessStatus[] = [connectionSummary.status, schemaSummary.status, rolloutSummary.status]
    const hasUnknownState = readinessStates.includes('unknown')

    readiness.value = [
      {
        id: 'connections',
        label: 'Step 1: Add at least one connection profile',
        status: connectionSummary.status,
        detail: connectionSummary.detail,
      },
      {
        id: 'schema',
        label: 'Step 2: Create or infer first schema',
        status: schemaSummary.status,
        detail: schemaSummary.detail,
      },
      {
        id: 'rollout',
        label: 'Step 3: Ready for reconciliation rollout',
        status: rolloutSummary.status,
        detail: rolloutSummary.detail,
      },
    ]

    const checks = [
      { label: 'LLM settings', result: llm },
      { label: 'SFTP servers', result: sftp },
      { label: 'NetSuite auth', result: nsAuth },
      { label: 'NetSuite endpoints', result: nsEndpoints },
      { label: 'Read DB profiles', result: readDb },
      { label: 'Schema library', result: schemas },
    ]
    const failedChecks = checks
      .filter((check) => check.result.status === 'rejected')
      .map((check) => check.label)

    if (failedChecks.length > 0 && hasUnknownState) {
      statusMessageTone.value = 'info'
      if (failedChecks.length === checks.length) {
        statusMessage.value =
          'Readiness checks are temporarily unavailable. Unknown statuses are shown where data could not be confirmed.'
      } else {
        const preview = failedChecks.slice(0, 2).join(', ')
        const remaining = failedChecks.length - 2
        const suffix = remaining > 0 ? `, +${remaining} more` : ''
        statusMessage.value =
          `Some readiness checks are unavailable (${preview}${suffix}). ` +
          'Unknown statuses are shown where data could not be confirmed.'
      }
    }
  } catch {
    statusMessageTone.value = 'error'
    statusMessage.value = 'Unable to load readiness states right now.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadReadiness()
})
</script>
