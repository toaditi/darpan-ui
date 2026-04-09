<template>
  <StaticPageFrame>
    <template #hero>
      <h1>SFTP Servers</h1>
    </template>

    <StaticPageSection title="Saved Servers">
      <div v-if="pageCount > 1" class="static-page-pager">
        <button type="button" @click="prevPage" :disabled="pageIndex <= 0">Prev</button>
        <span>Page {{ pageIndex + 1 }} / {{ pageCount }}</span>
        <button type="button" @click="nextPage" :disabled="pageIndex + 1 >= pageCount">Next</button>
      </div>

      <p v-if="loading" class="section-note">Loading servers...</p>
      <InlineValidation v-else-if="error" tone="error" :message="error" />

      <EmptyState
        v-else-if="rows.length === 0"
        title="No SFTP servers"
      />

      <div
        v-else
        class="static-page-tile-grid static-page-record-grid static-page-record-grid--fixed"
        data-testid="saved-sftp-servers"
      >
        <RouterLink
          v-for="row in rows"
          :key="row.sftpServerId"
          :to="buildEditRoute(row.sftpServerId)"
          class="static-page-tile static-page-record-tile"
          data-testid="sftp-server-tile"
        >
          <span class="static-page-tile-title">{{ savedServerName(row) }}</span>
        </RouterLink>
      </div>

      <RouterLink
        v-if="rows.length === 0 && !loading && !error"
        :to="createRoute"
        class="static-page-action-tile static-page-action-tile--inline"
        data-testid="sftp-empty-create-action"
      >
        Create New Server
      </RouterLink>
    </StaticPageSection>

    <RouterLink
      v-if="rows.length > 0"
      :to="createRoute"
      class="static-page-action-tile static-page-create-action"
      data-testid="sftp-create-action"
    >
      Create New Server
    </RouterLink>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import EmptyState from '../../components/ui/EmptyState.vue'
import InlineValidation from '../../components/ui/InlineValidation.vue'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'
import { ApiCallError } from '../../lib/api/client'
import { settingsFacade } from '../../lib/api/facade'
import type { SftpServerRecord } from '../../lib/api/types'
import { resolveRecordLabel } from '../../lib/utils/recordLabel'
import { buildWorkflowOriginState } from '../../lib/workflowOrigin'

const route = useRoute()

const rows = ref<SftpServerRecord[]>([])
const pageIndex = ref(0)
const pageSize = ref(12)
const pageCount = ref(1)

const loading = ref(false)
const error = ref<string | null>(null)

const createRoute = computed(() => ({
  path: '/settings/sftp/create',
  state: buildWorkflowOriginState('SFTP Servers', route.fullPath || '/settings/sftp'),
}))

function savedServerName(row: SftpServerRecord): string {
  return resolveRecordLabel({
    description: row.description,
    fallbackId: row.sftpServerId,
  })
}

function buildEditRoute(sftpServerId: string): { name: string; params: { sftpServerId: string }; state: Record<string, string> } {
  return {
    name: 'settings-sftp-edit',
    params: { sftpServerId },
    state: buildWorkflowOriginState('SFTP Servers', route.fullPath || '/settings/sftp'),
  }
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
  void load()
})
</script>
