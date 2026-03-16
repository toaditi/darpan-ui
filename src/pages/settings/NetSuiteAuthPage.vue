<template>
  <main class="page-root">
    <FormSection title="NetSuite Auth Settings" description="Create reusable auth profiles for NetSuite endpoint configs.">
      <form class="stack-lg" @submit.prevent="save">
        <div class="field-grid two">
          <label>
            <span>Auth Config ID</span>
            <input ref="authConfigIdInput" v-model="form.nsAuthConfigId" type="text" required />
          </label>
          <label>
            <span>Description</span>
            <input v-model="form.description" type="text" />
          </label>
        </div>

        <div class="field-grid two">
          <label>
            <span>Auth Type</span>
            <select v-model="form.authType">
              <option value="NONE">None</option>
              <option value="BASIC">Basic</option>
              <option value="BEARER">Bearer</option>
              <option value="OAUTH2_M2M_JWT">OAuth2 M2M JWT</option>
            </select>
          </label>
          <label>
            <span>Active</span>
            <select v-model="form.isActive">
              <option value="Y">Yes</option>
              <option value="N">No</option>
            </select>
          </label>
        </div>

        <p class="mono-copy">Expected inputs: {{ expectedAuthInputs }}</p>

        <div v-if="isBasicAuth" class="field-grid two">
          <label>
            <span>Username</span>
            <input v-model="form.username" type="text" required />
          </label>
          <label>
            <span>Password (leave blank to keep existing)</span>
            <input v-model="form.password" type="password" autocomplete="off" />
          </label>
        </div>

        <label v-else-if="isBearerAuth">
          <span>API Token (leave blank to keep existing)</span>
          <input v-model="form.apiToken" type="password" autocomplete="off" />
        </label>

        <div v-else-if="isOauthAuth" class="field-grid two">
          <label>
            <span>Token URL</span>
            <input v-model="form.tokenUrl" type="url" required />
          </label>
          <label>
            <span>Client ID</span>
            <input v-model="form.clientId" type="text" required />
          </label>
        </div>

        <div v-if="isOauthAuth" class="field-grid two">
          <label>
            <span>Cert ID</span>
            <input v-model="form.certId" type="text" required />
          </label>
          <label>
            <span>Scope</span>
            <input v-model="form.scope" type="text" />
          </label>
        </div>

        <label v-if="isOauthAuth">
          <span>Private Key PEM (leave blank to keep existing)</span>
          <textarea v-model="form.privateKeyPem" rows="5" />
        </label>

        <p v-if="isNoAuth" class="muted-copy">No credentials are required for Auth Type: None.</p>

        <div class="action-row">
          <button type="submit" :disabled="loading">Save Auth Config</button>
        </div>
      </form>

      <InlineValidation v-if="error" tone="error" :message="error" />
      <p v-if="success" class="success-copy">{{ success }}</p>

      <div class="stack-md">
        <div class="row-between">
          <h3>Existing Auth Configs</h3>
          <div class="page-controls">
            <button type="button" @click="prevPage" :disabled="pageIndex <= 0">Prev</button>
            <span>Page {{ pageIndex + 1 }} / {{ pageCount }}</span>
            <button type="button" @click="nextPage" :disabled="pageIndex + 1 >= pageCount">Next</button>
          </div>
        </div>

        <EmptyState
          v-if="rows.length === 0"
          title="No auth configs"
          description="Create one above and reuse it across endpoint settings."
        />

        <SparseTable v-else :columns="columns" :rows="rows" row-key="nsAuthConfigId">
          <template #cell-hasPassword="{ row }">
            <StatusBadge :label="row.hasPassword ? 'Yes' : 'No'" :tone="row.hasPassword ? 'success' : 'neutral'" />
          </template>
          <template #cell-hasApiToken="{ row }">
            <StatusBadge :label="row.hasApiToken ? 'Yes' : 'No'" :tone="row.hasApiToken ? 'success' : 'neutral'" />
          </template>
          <template #cell-hasPrivateKeyPem="{ row }">
            <StatusBadge
              :label="row.hasPrivateKeyPem ? 'Yes' : 'No'"
              :tone="row.hasPrivateKeyPem ? 'success' : 'neutral'"
            />
          </template>
          <template #cell-isActive="{ row }">
            <StatusBadge :label="row.isActive === 'Y' ? 'Active' : 'Inactive'" :tone="row.isActive === 'Y' ? 'success' : 'warning'" />
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import EmptyState from '../../components/ui/EmptyState.vue'
import FormSection from '../../components/ui/FormSection.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import SparseTable from '../../components/ui/SparseTable.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import type { NsAuthConfigRecord } from '../../lib/api/types'

type AuthType = 'NONE' | 'BASIC' | 'BEARER' | 'OAUTH2_M2M_JWT'

interface NsAuthForm {
  nsAuthConfigId: string
  description: string
  authType: AuthType
  username: string
  password: string
  apiToken: string
  tokenUrl: string
  clientId: string
  certId: string
  scope: string
  privateKeyPem: string
  isActive: string
}

const form = reactive<NsAuthForm>({
  nsAuthConfigId: '',
  description: '',
  authType: 'NONE',
  username: '',
  password: '',
  apiToken: '',
  tokenUrl: '',
  clientId: '',
  certId: '',
  scope: 'restlets rest_webservices',
  privateKeyPem: '',
  isActive: 'Y',
})
const route = useRoute()
const authConfigIdInput = ref<HTMLInputElement | null>(null)

const isNoAuth = computed(() => form.authType === 'NONE')
const isBasicAuth = computed(() => form.authType === 'BASIC')
const isBearerAuth = computed(() => form.authType === 'BEARER')
const isOauthAuth = computed(() => form.authType === 'OAUTH2_M2M_JWT')

const expectedAuthInputs = computed(() => {
  if (isBasicAuth.value) return 'username, password'
  if (isBearerAuth.value) return 'api token'
  if (isOauthAuth.value) return 'token url, client id, cert id, scope, private key'
  return 'none'
})

const columns = [
  { key: 'nsAuthConfigId', label: 'Auth ID' },
  { key: 'description', label: 'Description' },
  { key: 'authType', label: 'Type' },
  { key: 'username', label: 'Username' },
  { key: 'isActive', label: 'Status' },
  { key: 'hasPassword', label: 'Password' },
  { key: 'hasApiToken', label: 'API Token' },
  { key: 'hasPrivateKeyPem', label: 'Private Key' },
  { key: 'actions', label: '' },
]

const rows = ref<NsAuthConfigRecord[]>([])
const pageIndex = ref(0)
const pageSize = ref(10)
const pageCount = ref(1)

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

function editRow(row: Record<string, unknown>): void {
  form.nsAuthConfigId = String(row.nsAuthConfigId ?? '')
  form.description = String(row.description ?? '')
  form.authType = normalizeAuthType(row.authType)
  form.username = String(row.username ?? '')
  form.password = ''
  form.apiToken = ''
  form.tokenUrl = String(row.tokenUrl ?? '')
  form.clientId = String(row.clientId ?? '')
  form.certId = String(row.certId ?? '')
  form.scope = String(row.scope ?? 'restlets rest_webservices')
  form.privateKeyPem = ''
  form.isActive = String(row.isActive ?? 'Y')
}

function normalizeAuthType(raw: unknown): AuthType {
  const value = String(raw ?? '').toUpperCase()
  if (value === 'BASIC') return 'BASIC'
  if (value === 'BEARER') return 'BEARER'
  if (value === 'OAUTH2_M2M_JWT') return 'OAUTH2_M2M_JWT'
  return 'NONE'
}

function buildPayloadForAuthType(): Record<string, unknown> {
  const basePayload = {
    nsAuthConfigId: form.nsAuthConfigId,
    description: form.description,
    authType: form.authType,
    isActive: form.isActive,
  }

  if (isBasicAuth.value) {
    return {
      ...basePayload,
      username: form.username,
      password: form.password,
      apiToken: '',
      tokenUrl: '',
      clientId: '',
      certId: '',
      scope: '',
      privateKeyPem: '',
    }
  }

  if (isBearerAuth.value) {
    return {
      ...basePayload,
      username: '',
      password: '',
      apiToken: form.apiToken,
      tokenUrl: '',
      clientId: '',
      certId: '',
      scope: '',
      privateKeyPem: '',
    }
  }

  if (isOauthAuth.value) {
    return {
      ...basePayload,
      username: '',
      password: '',
      apiToken: '',
      tokenUrl: form.tokenUrl,
      clientId: form.clientId,
      certId: form.certId,
      scope: form.scope,
      privateKeyPem: form.privateKeyPem,
    }
  }

  return {
    ...basePayload,
    username: '',
    password: '',
    apiToken: '',
    tokenUrl: '',
    clientId: '',
    certId: '',
    scope: '',
    privateKeyPem: '',
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await settingsFacade.listNsAuthConfigs({
      pageIndex: pageIndex.value,
      pageSize: pageSize.value,
    })
    rows.value = response.authConfigs ?? []
    pageCount.value = response.pagination?.pageCount ?? 1
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load NetSuite auth configs.'
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  loading.value = true
  error.value = null
  success.value = null

  try {
    const response = await settingsFacade.saveNsAuthConfig(buildPayloadForAuthType())
    form.password = ''
    form.apiToken = ''
    form.privateKeyPem = ''
    success.value = response.messages?.[0] ?? 'Saved auth config.'
    await load()
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save auth config.'
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
  authConfigIdInput.value?.focus()
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
