<template>
  <WorkflowPage :progress-percent="progressPercent" aria-label="SFTP server setup progress" center-stage>
    <InlineValidation v-if="error" tone="error" :message="error" />
    <p v-if="success" class="success-copy">{{ success }}</p>

    <WorkflowStepForm
      :class="[
        'workflow-form--compact',
        {
          'workflow-form--edit-single-page': isEditing,
        },
      ]"
      :question="currentQuestion"
      :primary-label="primaryLabel"
      :show-enter-hint="!isEditing"
      :show-back="showBack"
      :show-cancel-action="isEditing"
      :allow-select-enter="isCreateSelectStep"
      :cancel-disabled="loading"
      cancel-test-id="cancel-sftp-server"
      :submit-disabled="submitDisabled"
      :primary-test-id="primaryTestId"
      @submit="handlePrimarySubmit"
      @back="goBack"
      @cancel="cancelEdit"
    >
      <template v-if="isEditing">
        <div class="workflow-form-grid workflow-form-grid--two">
          <label class="wizard-input-shell">
            <span class="workflow-context-label">Server ID</span>
            <input
              name="sftpServerId"
              v-model="form.sftpServerId"
              class="wizard-answer-control"
              type="text"
              placeholder="primary_sftp"
            />
          </label>

          <label class="wizard-input-shell">
            <span class="workflow-context-label">Description</span>
            <input
              name="description"
              v-model="form.description"
              class="wizard-answer-control"
              type="text"
              placeholder="Primary SFTP"
            />
          </label>
        </div>

        <div class="workflow-form-grid" data-testid="sftp-host-row">
          <label class="wizard-input-shell">
            <span class="workflow-context-label">Host</span>
            <input
              name="host"
              v-model="form.host"
              class="wizard-answer-control"
              type="text"
              placeholder="sftp.example.com"
            />
          </label>
        </div>

        <div class="workflow-form-grid workflow-form-grid--compact" data-testid="sftp-compact-row">
          <label class="wizard-input-shell">
            <span class="workflow-context-label">Username</span>
            <input
              name="username"
              v-model="form.username"
              class="wizard-answer-control"
              type="text"
              placeholder="etl-user"
            />
          </label>

          <label class="wizard-input-shell">
            <span class="workflow-context-label">Port</span>
            <input
              name="port"
              v-model.number="form.port"
              class="wizard-answer-control"
              type="number"
              min="1"
            />
          </label>

          <label class="wizard-input-shell">
            <span class="workflow-context-label">Remote Attributes</span>
            <AppSelect
              v-model="form.remoteAttributes"
              placeholder="Select remote attributes"
              :options="remoteAttributeOptions"
              test-id="sftp-remote-attributes"
            />
          </label>
        </div>

        <label class="wizard-input-shell">
          <span class="workflow-context-label">Password (optional)</span>
          <input
            name="password"
            v-model="form.password"
            class="wizard-answer-control"
            type="password"
            autocomplete="off"
            placeholder="Leave blank to keep existing"
          />
        </label>

        <label class="wizard-input-shell">
          <span class="workflow-context-label">Private Key (optional)</span>
          <textarea
            name="privateKey"
            v-model="form.privateKey"
            class="wizard-answer-control workflow-form-textarea workflow-form-textarea--single-row"
            rows="1"
            placeholder="Paste a private key only when needed"
          />
        </label>
      </template>

      <template v-else>
        <label v-if="currentCreateStep.id === 'host'" class="wizard-input-shell">
          <input
            name="host"
            v-model="form.host"
            :class="['wizard-answer-control', { empty: !form.host.trim() }]"
            type="text"
            placeholder="sftp.example.com"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'port'" class="wizard-input-shell">
          <input
            name="port"
            v-model.number="form.port"
            class="wizard-answer-control"
            type="number"
            min="1"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'username'" class="wizard-input-shell">
          <input
            name="username"
            v-model="form.username"
            :class="['wizard-answer-control', { empty: !form.username.trim() }]"
            type="text"
            placeholder="etl-user"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'remoteAttributes'" class="wizard-input-shell">
          <WorkflowSelect
            v-model="form.remoteAttributes"
            placeholder="Select remote attributes"
            :options="remoteAttributeOptions"
            test-id="sftp-remote-attributes"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'password'" class="wizard-input-shell">
          <input
            name="password"
            v-model="form.password"
            class="wizard-answer-control"
            type="password"
            autocomplete="off"
            placeholder="Enter password if needed"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'privateKey'" class="wizard-input-shell">
          <textarea
            name="privateKey"
            v-model="form.privateKey"
            :class="[
              'wizard-answer-control',
              'workflow-form-textarea',
              'workflow-form-textarea--single-row',
              { empty: !form.privateKey.trim() },
            ]"
            rows="1"
            placeholder="Paste a private key only when needed"
          />
        </label>

        <label v-else-if="currentCreateStep.id === 'description'" class="wizard-input-shell">
          <input
            name="description"
            v-model="form.description"
            class="wizard-answer-control"
            type="text"
            placeholder="Primary SFTP"
          />
        </label>

        <label v-else class="wizard-input-shell">
          <input
            name="sftpServerId"
            v-model="form.sftpServerId"
            :class="['wizard-answer-control', { empty: !form.sftpServerId.trim() }]"
            type="text"
            placeholder="primary_sftp"
          />
        </label>
      </template>
    </WorkflowStepForm>
  </WorkflowPage>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorkflowPage from '../../components/workflow/WorkflowPage.vue'
import WorkflowStepForm from '../../components/workflow/WorkflowStepForm.vue'
import WorkflowSelect from '../../components/workflow/WorkflowSelect.vue'
import AppSelect, { type AppSelectOption } from '../../components/ui/AppSelect.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import type { SftpServerRecord } from '../../lib/api/types'

type SftpCreateStepId =
  | 'host'
  | 'port'
  | 'username'
  | 'remoteAttributes'
  | 'password'
  | 'privateKey'
  | 'description'
  | 'sftpServerId'

interface SftpCreateStep {
  id: SftpCreateStepId
  title: string
  kind: 'text' | 'number' | 'select' | 'password' | 'textarea'
}

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

const route = useRoute()
const router = useRouter()

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

const loading = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const currentStepIndex = ref(0)
const remoteAttributeOptions: AppSelectOption[] = [
  { value: 'Y', label: 'Yes' },
  { value: 'N', label: 'No' },
]
const createSteps: SftpCreateStep[] = [
  { id: 'host', title: 'What host should this SFTP server use?', kind: 'text' },
  { id: 'port', title: 'What port should this SFTP server use?', kind: 'number' },
  { id: 'username', title: 'What username should this SFTP server use?', kind: 'text' },
  { id: 'remoteAttributes', title: 'Should this SFTP server use remote attributes?', kind: 'select' },
  { id: 'password', title: 'What password should this SFTP server use?', kind: 'password' },
  { id: 'privateKey', title: 'What private key should this SFTP server use?', kind: 'textarea' },
  { id: 'description', title: 'What label should Darpan show for this server?', kind: 'text' },
  { id: 'sftpServerId', title: 'What should the server name / ID be?', kind: 'text' },
]

const activeServerId = computed(() => String(route.params.sftpServerId ?? '').trim())
const isEditing = computed(() => activeServerId.value.length > 0)
const currentCreateStep = computed<SftpCreateStep>(() => {
  const lastStepIndex = Math.max(0, createSteps.length - 1)
  return createSteps[Math.min(currentStepIndex.value, lastStepIndex)] ?? createSteps[0]!
})
const progressPercent = computed(() => (
  isEditing.value
    ? '100'
    : ((Math.max(1, currentStepIndex.value + 1) / createSteps.length) * 100).toFixed(2)
))
const currentQuestion = computed(() => (
  isEditing.value
    ? 'Update the SFTP server details.'
    : currentCreateStep.value.title
))
const primaryLabel = computed(() => (
  isEditing.value || currentCreateStep.value.id === 'sftpServerId'
    ? 'Save'
    : 'OK'
))
const primaryTestId = computed(() => (
  isEditing.value || currentCreateStep.value.id === 'sftpServerId'
    ? 'save-sftp-server'
    : 'wizard-next'
))
const showBack = computed(() => !isEditing.value && currentStepIndex.value > 0)
const isCreateSelectStep = computed(() => !isEditing.value && currentCreateStep.value.kind === 'select')
const submitDisabled = computed(() => {
  if (loading.value) return true
  if (isEditing.value) return false

  switch (currentCreateStep.value.id) {
    case 'host':
      return form.host.trim().length === 0
    case 'port':
      return !Number.isFinite(form.port) || form.port < 1
    case 'username':
      return form.username.trim().length === 0
    case 'sftpServerId':
      return form.sftpServerId.trim().length === 0
    default:
      return false
  }
})

function applyRecord(record: SftpServerRecord): void {
  form.sftpServerId = record.sftpServerId
  form.description = record.description ?? ''
  form.host = record.host
  form.port = record.port
  form.username = record.username
  form.password = ''
  form.privateKey = ''
  form.remoteAttributes = record.remoteAttributes ?? 'Y'
}

async function loadServer(): Promise<void> {
  if (!isEditing.value) return

  loading.value = true
  error.value = null
  try {
    const response = await settingsFacade.listSftpServers({ pageIndex: 0, pageSize: 200 })
    const matchingServer = (response.servers ?? []).find((server) => server.sftpServerId === activeServerId.value)
    if (!matchingServer) {
      error.value = `Unable to find SFTP server "${activeServerId.value}".`
      return
    }
    applyRecord(matchingServer)
  } catch (loadError) {
    error.value = loadError instanceof ApiCallError ? loadError.message : 'Failed to load server.'
  } finally {
    loading.value = false
  }
}

function goNext(): void {
  currentStepIndex.value = Math.min(currentStepIndex.value + 1, createSteps.length - 1)
}

function goBack(): void {
  error.value = null
  currentStepIndex.value = Math.max(currentStepIndex.value - 1, 0)
}

async function handlePrimarySubmit(): Promise<void> {
  if (isEditing.value || currentCreateStep.value.id === 'sftpServerId') {
    await save()
    return
  }

  goNext()
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
    form.password = ''
    form.privateKey = ''
    success.value = response.messages?.[0] ?? 'Saved SFTP server.'
    await router.push('/settings/sftp')
  } catch (saveError) {
    error.value = saveError instanceof ApiCallError ? saveError.message : 'Failed to save server.'
  } finally {
    loading.value = false
  }
}

async function cancelEdit(): Promise<void> {
  if (!isEditing.value || loading.value) return
  await router.push('/settings/sftp')
}

onMounted(() => {
  void loadServer()
})
</script>
