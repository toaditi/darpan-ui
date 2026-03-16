<template>
  <main class="page-root">
    <FormSection title="SFTP Settings" description="Manage SFTP server credentials for reconciliation automation.">
      <form class="stack-lg" @submit.prevent="save">
        <div class="field-grid two">
          <label>
            <span>Server ID</span>
            <input ref="serverIdInput" v-model="form.sftpServerId" type="text" required />
          </label>
          <label>
            <span>Description</span>
            <input v-model="form.description" type="text" />
          </label>
        </div>

        <div class="field-grid two">
          <label>
            <span>Host</span>
            <input v-model="form.host" type="text" required />
          </label>
          <label>
            <span>Port</span>
            <input v-model.number="form.port" type="number" min="1" required />
          </label>
        </div>

        <div class="field-grid two">
          <label>
            <span>Username</span>
            <input v-model="form.username" type="text" required />
          </label>
          <label>
            <span>Remote Attributes</span>
            <select v-model="form.remoteAttributes">
              <option value="Y">Yes</option>
              <option value="N">No</option>
            </select>
          </label>
        </div>

        <label>
          <span>Password (optional)</span>
          <input v-model="form.password" type="password" autocomplete="off" />
        </label>

        <label>
          <span>Private Key (optional)</span>
          <textarea v-model="form.privateKey" rows="4" />
        </label>

        <div class="action-row">
          <button type="submit" :disabled="loading">Save Server</button>
        </div>
      </form>

      <InlineValidation v-if="error" tone="error" :message="error" />
      <p v-if="success" class="success-copy">{{ success }}</p>

      <div class="stack-md">
        <div class="row-between">
          <h3>Existing SFTP Servers</h3>
          <div class="page-controls">
            <button type="button" @click="prevPage" :disabled="pageIndex <= 0">Prev</button>
            <span>Page {{ pageIndex + 1 }} / {{ pageCount }}</span>
            <button type="button" @click="nextPage" :disabled="pageIndex + 1 >= pageCount">Next</button>
          </div>
        </div>

        <EmptyState
          v-if="rows.length === 0"
          title="No SFTP servers"
          description="Add a server above to start using automation remotes."
        />

        <SparseTable v-else :columns="columns" :rows="rows" row-key="sftpServerId">
          <template #cell-hasPassword="{ row }">
            <StatusBadge :label="row.hasPassword ? 'Yes' : 'No'" :tone="row.hasPassword ? 'success' : 'neutral'" />
          </template>
          <template #cell-hasPrivateKey="{ row }">
            <StatusBadge
              :label="row.hasPrivateKey ? 'Yes' : 'No'"
              :tone="row.hasPrivateKey ? 'success' : 'neutral'"
            />
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
import type { SftpServerRecord } from '../../lib/api/types'

interface SftpForm {
  sftpServerId: string
  description: string
  host: string
  port: number
  username: string
  password: string
  privateKey: string
  remoteAttributes: string
}

const form = reactive<SftpForm>({
  sftpServerId: '',
  description: '',
  host: '',
  port: 22,
  username: '',
  password: '',
  privateKey: '',
  remoteAttributes: 'Y',
})
const route = useRoute()
const serverIdInput = ref<HTMLInputElement | null>(null)

const columns = [
  { key: 'sftpServerId', label: 'Server ID' },
  { key: 'description', label: 'Description' },
  { key: 'host', label: 'Host' },
  { key: 'port', label: 'Port' },
  { key: 'username', label: 'Username' },
  { key: 'hasPassword', label: 'Password' },
  { key: 'hasPrivateKey', label: 'Private Key' },
  { key: 'actions', label: '' },
]

const rows = ref<SftpServerRecord[]>([])
const pageIndex = ref(0)
const pageSize = ref(10)
const pageCount = ref(1)

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

function setForm(record: Partial<SftpForm>): void {
  form.sftpServerId = record.sftpServerId ?? ''
  form.description = record.description ?? ''
  form.host = record.host ?? ''
  form.port = record.port ?? 22
  form.username = record.username ?? ''
  form.password = ''
  form.privateKey = ''
  form.remoteAttributes = record.remoteAttributes ?? 'Y'
}

function editRow(row: Record<string, unknown>): void {
  setForm({
    sftpServerId: String(row.sftpServerId ?? ''),
    description: String(row.description ?? ''),
    host: String(row.host ?? ''),
    port: Number(row.port ?? 22),
    username: String(row.username ?? ''),
    remoteAttributes: String(row.remoteAttributes ?? 'Y'),
  })
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await settingsFacade.listSftpServers({
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
    })
    rows.value = response.servers ?? []
    pageCount.value = response.pagination?.pageCount ?? 1
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load servers.'
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  loading.value = true
  error.value = null
  success.value = null
  try {
    const response = await settingsFacade.saveSftpServer({
      sftpServerId: form.sftpServerId,
      description: form.description,
      host: form.host,
      port: form.port,
      username: form.username,
      password: form.password,
      privateKey: form.privateKey,
      remoteAttributes: form.remoteAttributes,
    })
    success.value = response.messages?.[0] ?? 'Saved SFTP server.'
    form.password = ''
    form.privateKey = ''
    await load()
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save server.'
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
  serverIdInput.value?.focus()
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
