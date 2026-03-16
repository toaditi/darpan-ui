<template>
  <main class="page-root">
    <FormSection title="Read DB Settings" description="Manage read-only database connection profiles for reconciliation retrieval.">
      <form class="stack-lg" @submit.prevent="save">
        <div class="field-grid two">
          <label>
            <span>Config ID (optional)</span>
            <input v-model="form.hcReadDbConfigId" type="text" />
          </label>
          <label>
            <span>Display Name</span>
            <input ref="displayNameInput" v-model="form.displayName" type="text" />
          </label>
        </div>

        <div class="field-grid three">
          <label>
            <span>Host</span>
            <input v-model="form.host" type="text" required />
          </label>
          <label>
            <span>Port</span>
            <input v-model.number="form.port" type="number" min="1" required />
          </label>
          <label>
            <span>Database Name</span>
            <input v-model="form.databaseName" type="text" required />
          </label>
        </div>

        <div class="field-grid two">
          <label>
            <span>Username</span>
            <input v-model="form.username" type="text" required />
          </label>
          <label>
            <span>Password (optional)</span>
            <input v-model="form.password" type="password" autocomplete="off" />
          </label>
        </div>

        <label>
          <span>Additional Parameters</span>
          <input v-model="form.additionalParameters" type="text" placeholder="useSSL=true&amp;serverTimezone=UTC" />
        </label>

        <div class="field-grid two">
          <label>
            <span>DB Driver</span>
            <input v-model="form.dbDriver" type="text" />
          </label>
          <label>
            <span>Default Table</span>
            <input v-model="form.defaultTableName" type="text" />
          </label>
        </div>

        <div class="field-grid three">
          <label>
            <span>Item ID Column</span>
            <input v-model="form.itemIdColumn" type="text" />
          </label>
          <label>
            <span>Location ID Column</span>
            <input v-model="form.locationIdColumn" type="text" />
          </label>
          <label>
            <span>Date Column</span>
            <input v-model="form.transactionDateColumn" type="text" />
          </label>
        </div>

        <label>
          <span>Connection Properties JSON</span>
          <textarea v-model="form.connectionPropertiesJson" rows="3" />
        </label>

        <label>
          <span>Active</span>
          <select v-model="form.isActive">
            <option value="Y">Yes</option>
            <option value="N">No</option>
          </select>
        </label>

        <div class="action-row">
          <button type="submit" :disabled="loading">Save Read DB Config</button>
        </div>
      </form>

      <InlineValidation v-if="error" tone="error" :message="error" />
      <p v-if="success" class="success-copy">{{ success }}</p>

      <div class="stack-md">
        <div class="row-between">
          <h3>Existing Read DB Configs</h3>
          <div class="page-controls">
            <button type="button" @click="prevPage" :disabled="pageIndex <= 0">Prev</button>
            <span>Page {{ pageIndex + 1 }} / {{ pageCount }}</span>
            <button type="button" @click="nextPage" :disabled="pageIndex + 1 >= pageCount">Next</button>
          </div>
        </div>

        <EmptyState
          v-if="rows.length === 0"
          title="No Read DB configs"
          description="Create one above. Config ID auto-generates if left blank."
        />

        <SparseTable v-else :columns="columns" :rows="rows" row-key="hcReadDbConfigId">
          <template #cell-isActive="{ row }">
            <StatusBadge :label="row.isActive === 'Y' ? 'Active' : 'Inactive'" :tone="row.isActive === 'Y' ? 'success' : 'warning'" />
          </template>
          <template #cell-hasPassword="{ row }">
            <StatusBadge :label="row.hasPassword ? 'Yes' : 'No'" :tone="row.hasPassword ? 'success' : 'neutral'" />
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
import type { HcReadDbConfigRecord } from '../../lib/api/types'

interface HcForm {
  hcReadDbConfigId: string
  displayName: string
  host: string
  port: number
  databaseName: string
  username: string
  password: string
  additionalParameters: string
  dbDriver: string
  defaultTableName: string
  itemIdColumn: string
  locationIdColumn: string
  transactionDateColumn: string
  connectionPropertiesJson: string
  isActive: string
}

const form = reactive<HcForm>({
  hcReadDbConfigId: '',
  displayName: '',
  host: '',
  port: 3306,
  databaseName: '',
  username: '',
  password: '',
  additionalParameters: '',
  dbDriver: 'com.mysql.cj.jdbc.Driver',
  defaultTableName: 'inventory_item_detail',
  itemIdColumn: 'product_id',
  locationIdColumn: 'facility_id',
  transactionDateColumn: 'effective_date',
  connectionPropertiesJson: '',
  isActive: 'Y',
})
const route = useRoute()
const displayNameInput = ref<HTMLInputElement | null>(null)

const columns = [
  { key: 'hcReadDbConfigId', label: 'Config ID' },
  { key: 'displayName', label: 'Display Name' },
  { key: 'host', label: 'Host' },
  { key: 'databaseName', label: 'Database' },
  { key: 'username', label: 'Username' },
  { key: 'isActive', label: 'Status' },
  { key: 'hasPassword', label: 'Password' },
  { key: 'actions', label: '' },
]

const rows = ref<HcReadDbConfigRecord[]>([])
const pageIndex = ref(0)
const pageSize = ref(10)
const pageCount = ref(1)

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

function editRow(row: Record<string, unknown>): void {
  form.hcReadDbConfigId = String(row.hcReadDbConfigId ?? '')
  form.displayName = String(row.displayName ?? '')
  form.host = String(row.host ?? '')
  form.port = Number(row.port ?? 3306)
  form.databaseName = String(row.databaseName ?? '')
  form.username = String(row.username ?? '')
  form.password = ''
  form.additionalParameters = String(row.additionalParameters ?? '')
  form.dbDriver = String(row.dbDriver ?? 'com.mysql.cj.jdbc.Driver')
  form.defaultTableName = String(row.defaultTableName ?? 'inventory_item_detail')
  form.itemIdColumn = String(row.itemIdColumn ?? 'product_id')
  form.locationIdColumn = String(row.locationIdColumn ?? 'facility_id')
  form.transactionDateColumn = String(row.transactionDateColumn ?? 'effective_date')
  form.connectionPropertiesJson = String(row.connectionPropertiesJson ?? '')
  form.isActive = String(row.isActive ?? 'Y')
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null

  try {
    const response = await settingsFacade.listHcReadDbConfigs({
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
    })

    rows.value = response.configs ?? []
    pageCount.value = response.pagination?.pageCount ?? 1
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load Read DB configs.'
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  loading.value = true
  error.value = null
  success.value = null
  try {
    const response = await settingsFacade.saveHcReadDbConfig({
      hcReadDbConfigId: form.hcReadDbConfigId,
      displayName: form.displayName,
      host: form.host,
      port: form.port,
      databaseName: form.databaseName,
      username: form.username,
      password: form.password,
      additionalParameters: form.additionalParameters,
      dbDriver: form.dbDriver,
      defaultTableName: form.defaultTableName,
      itemIdColumn: form.itemIdColumn,
      locationIdColumn: form.locationIdColumn,
      transactionDateColumn: form.transactionDateColumn,
      connectionPropertiesJson: form.connectionPropertiesJson,
      isActive: form.isActive,
    })
    form.password = ''
    success.value = response.messages?.[0] ?? 'Saved Read DB config.'
    await load()
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save Read DB config.'
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
  displayNameInput.value?.focus()
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
