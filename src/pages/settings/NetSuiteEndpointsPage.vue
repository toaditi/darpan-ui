<template>
  <main class="page-root">
    <FormSection title="NetSuite Endpoint Settings" description="Configure endpoint URLs and attach reusable auth profiles.">
      <form class="stack-lg" @submit.prevent="save">
        <div class="field-grid two">
          <label>
            <span>Endpoint Config ID</span>
            <input ref="endpointConfigIdInput" v-model="form.nsRestletConfigId" type="text" required />
          </label>
          <label>
            <span>Description</span>
            <input v-model="form.description" type="text" />
          </label>
        </div>

        <label>
          <span>Endpoint URL</span>
          <input v-model="form.endpointUrl" type="url" required />
        </label>

        <div class="field-grid two">
          <label>
            <span>HTTP Method</span>
            <select v-model="form.httpMethod">
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="GET">GET</option>
            </select>
          </label>
          <label>
            <span>Auth Config</span>
            <select v-model="form.nsAuthConfigId">
              <option value="">Select auth config</option>
              <option v-for="option in authOptions" :key="option.nsAuthConfigId" :value="option.nsAuthConfigId">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>

        <label>
          <span>Headers JSON</span>
          <textarea v-model="form.headersJson" rows="3" />
        </label>

        <div class="field-grid three">
          <label>
            <span>Connect Timeout</span>
            <input v-model.number="form.connectTimeoutSeconds" type="number" min="1" />
          </label>
          <label>
            <span>Read Timeout</span>
            <input v-model.number="form.readTimeoutSeconds" type="number" min="1" />
          </label>
          <label>
            <span>Active</span>
            <select v-model="form.isActive">
              <option value="Y">Yes</option>
              <option value="N">No</option>
            </select>
          </label>
        </div>

        <div class="action-row">
          <button type="submit" :disabled="loading">Save Endpoint Config</button>
        </div>
      </form>

      <InlineValidation v-if="error" tone="error" :message="error" />
      <p v-if="success" class="success-copy">{{ success }}</p>

      <div class="stack-md">
        <div class="row-between">
          <h3>Existing Endpoint Configs</h3>
          <div class="page-controls">
            <button type="button" @click="prevPage" :disabled="pageIndex <= 0">Prev</button>
            <span>Page {{ pageIndex + 1 }} / {{ pageCount }}</span>
            <button type="button" @click="nextPage" :disabled="pageIndex + 1 >= pageCount">Next</button>
          </div>
        </div>

        <EmptyState
          v-if="rows.length === 0"
          title="No endpoint configs"
          description="Add one above and link it to a NetSuite auth profile."
        />

        <SparseTable v-else :columns="columns" :rows="rows" row-key="nsRestletConfigId">
          <template #cell-isActive="{ row }">
            <StatusBadge :label="row.isActive === 'Y' ? 'Active' : 'Inactive'" :tone="row.isActive === 'Y' ? 'success' : 'warning'" />
          </template>
          <template #cell-authType="{ row }">
            <StatusBadge :label="String(row.authType ?? 'Unknown')" tone="neutral" />
          </template>
          <template #cell-actions="{ row }">
            <button type="button" @click="editRow(row)">Edit</button>
          </template>
        </SparseTable>
      </div>
    </FormSection>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import EmptyState from '../../components/ui/EmptyState.vue'
import FormSection from '../../components/ui/FormSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import SparseTable from '../../components/ui/SparseTable.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import type { NsRestletConfigRecord } from '../../lib/api/types'
import { enumLabel } from '../../lib/utils/enumLabel'

interface EndpointForm {
  nsRestletConfigId: string
  description: string
  endpointUrl: string
  httpMethod: string
  nsAuthConfigId: string
  headersJson: string
  connectTimeoutSeconds: number
  readTimeoutSeconds: number
  isActive: string
}

const form = reactive<EndpointForm>({
  nsRestletConfigId: '',
  description: '',
  endpointUrl: '',
  httpMethod: 'POST',
  nsAuthConfigId: '',
  headersJson: '',
  connectTimeoutSeconds: 30,
  readTimeoutSeconds: 60,
  isActive: 'Y',
})
const route = useRoute()
const endpointConfigIdInput = ref<HTMLInputElement | null>(null)

const columns = [
  { key: 'nsRestletConfigId', label: 'Endpoint ID' },
  { key: 'description', label: 'Description' },
  { key: 'endpointUrl', label: 'Endpoint URL' },
  { key: 'httpMethod', label: 'Method' },
  { key: 'nsAuthConfigId', label: 'Auth Config' },
  { key: 'authType', label: 'Auth Type' },
  { key: 'isActive', label: 'Status' },
  { key: 'actions', label: '' },
]

const rows = ref<NsRestletConfigRecord[]>([])
const authOptions = ref<Array<{ nsAuthConfigId: string; label: string }>>([])

const pageIndex = ref(0)
const pageSize = ref(10)
const pageCount = ref(1)

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

function editRow(row: Record<string, unknown>): void {
  form.nsRestletConfigId = String(row.nsRestletConfigId ?? '')
  form.description = String(row.description ?? '')
  form.endpointUrl = String(row.endpointUrl ?? '')
  form.httpMethod = String(row.httpMethod ?? 'POST')
  form.nsAuthConfigId = String(row.nsAuthConfigId ?? '')
  form.headersJson = String(row.headersJson ?? '')
  form.connectTimeoutSeconds = Number(row.connectTimeoutSeconds ?? 30)
  form.readTimeoutSeconds = Number(row.readTimeoutSeconds ?? 60)
  form.isActive = String(row.isActive ?? 'Y')
}

async function loadAuthOptions(): Promise<void> {
  const response = await settingsFacade.listNsAuthConfigs({ pageIndex: 0, pageSize: 200 })
  authOptions.value = (response.authConfigs ?? []).map((item) => ({
    nsAuthConfigId: item.nsAuthConfigId,
    label: enumLabel({ enumCode: item.nsAuthConfigId, description: item.description, enumId: item.nsAuthConfigId }),
  }))
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const [restletResponse] = await Promise.all([
      settingsFacade.listNsRestletConfigs({ pageIndex: pageIndex.value, pageSize: pageSize.value }),
      loadAuthOptions(),
    ])
    rows.value = restletResponse.restletConfigs ?? []
    pageCount.value = restletResponse.pagination?.pageCount ?? 1
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load endpoint configs.'
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  loading.value = true
  error.value = null
  success.value = null
  try {
    const response = await settingsFacade.saveNsRestletConfig({
      nsRestletConfigId: form.nsRestletConfigId,
      description: form.description,
      endpointUrl: form.endpointUrl,
      httpMethod: form.httpMethod,
      nsAuthConfigId: form.nsAuthConfigId,
      headersJson: form.headersJson,
      connectTimeoutSeconds: form.connectTimeoutSeconds,
      readTimeoutSeconds: form.readTimeoutSeconds,
      isActive: form.isActive,
    })
    success.value = response.messages?.[0] ?? 'Saved endpoint config.'
    await load()
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save endpoint config.'
  } finally {
    loading.value = false
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

function focusCreateIfRequested(): void {
  if (String(route.query.focus ?? '') !== 'create') return
  endpointConfigIdInput.value?.focus()
}

onMounted(() => {
  focusCreateIfRequested()
  void load()
})

watch(
  () => route.query.focus,
  () => {
    focusCreateIfRequested()
  },
)
</script>
