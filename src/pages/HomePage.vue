<template>
  <StaticPageFrame>
    <template #hero>
      <h1>Let's Investigate</h1>
    </template>

    <StaticPageSection title="Pinned Runs">
      <div class="static-page-drop-zone" data-testid="pinned-runs" @dragover.prevent @drop="handleDrop('pinned', $event)">
        <div v-if="pinnedFlowCards.length > 0" class="static-page-tile-grid">
          <RouterLink
            v-for="flow in pinnedFlowCards"
            :key="flow.id"
            class="static-page-tile"
            :data-flow-id="flow.id"
            :to="flow.to"
            draggable="true"
            @dragstart="handleDragStart(flow.id, $event)"
          >
            <span class="static-page-tile-title">{{ flow.title }}</span>
            <span v-if="flow.statusLabel" class="static-page-tile-status">{{ flow.statusLabel }}</span>
          </RouterLink>
        </div>
        <div v-else class="static-page-drop-hint" data-testid="pinned-empty-state">drag and drop runs to pin</div>
      </div>
    </StaticPageSection>

    <StaticPageSection title="Other Runs">
      <div
        :class="['static-page-drop-zone', { 'static-page-drop-zone--compact': !hasOtherRuns }]"
        data-testid="other-runs"
        @dragover.prevent
        @drop="handleDrop('other', $event)"
      >
        <div v-if="hasOtherRuns" class="static-page-tile-grid">
          <RouterLink
            v-for="flow in visibleOtherFlowCards"
            :key="flow.id"
            class="static-page-tile"
            :data-flow-id="flow.id"
            :to="flow.to"
            draggable="true"
            @dragstart="handleDragStart(flow.id, $event)"
          >
            <span class="static-page-tile-title">{{ flow.title }}</span>
            <span v-if="flow.statusLabel" class="static-page-tile-status">{{ flow.statusLabel }}</span>
          </RouterLink>
          <button
            v-if="hasMoreOtherRuns"
            type="button"
            class="static-page-control-tile"
            data-testid="other-runs-more"
            @click="showAllOtherRuns = true"
          >
            More...
          </button>
        </div>
        <RouterLink
          v-else
          class="static-page-action-tile static-page-action-tile--inline"
          data-testid="other-runs-empty-action"
          :to="createFlowRoute"
        >
          Create New
        </RouterLink>
      </div>
    </StaticPageSection>

    <RouterLink v-if="hasOtherRuns" class="static-page-action-tile" data-testid="dashboard-create-action" :to="createFlowRoute">
      Create New
    </RouterLink>
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import StaticPageFrame from '../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../components/ui/StaticPageSection.vue'
import { buildAuthRedirect, ensureAuthenticated } from '../lib/auth'
import { reconciliationFacade } from '../lib/api/facade'
import type { PilotMappingSummary } from '../lib/api/types'
import { buildWorkflowOriginState } from '../lib/workflowOrigin'

interface DashboardFlowCard {
  id: string
  mappingId: string
  title: string
  statusLabel?: string
  to: RouteLocationRaw
}

function resolveSystemLabel(mapping: PilotMappingSummary, enumId?: string): string {
  if (!enumId) return ''
  const option = mapping.systemOptions.find((systemOption) => systemOption.enumId === enumId)
  return option?.label || option?.enumCode || option?.enumId || ''
}

const route = useRoute()
const router = useRouter()
const mappings = ref<PilotMappingSummary[]>([])
const pinnedMappingIds = ref<string[]>([])
const showAllOtherRuns = ref(false)
const dashboardWorkflowOriginState = buildWorkflowOriginState('Dashboard', '/')
const createFlowRoute: RouteLocationRaw = {
  path: '/reconciliation/create',
  state: dashboardWorkflowOriginState,
}

const mappingCards = computed<DashboardFlowCard[]>(() =>
  mappings.value.map((mapping) => ({
    id: `mapping:${mapping.reconciliationMappingId}`,
    mappingId: mapping.reconciliationMappingId,
    title: mapping.mappingName,
    to: {
      name: 'reconciliation-pilot-diff',
      query: {
        mappingId: mapping.reconciliationMappingId,
        runName: mapping.mappingName,
        file1SystemLabel: resolveSystemLabel(mapping, mapping.defaultFile1SystemEnumId),
        file2SystemLabel: resolveSystemLabel(mapping, mapping.defaultFile2SystemEnumId),
      },
      state: dashboardWorkflowOriginState,
    },
  })),
)

const flowCards = computed<DashboardFlowCard[]>(() => mappingCards.value)

const pinnedFlowCards = computed<DashboardFlowCard[]>(() => {
  const flowCardMap = new Map(flowCards.value.map((card) => [card.mappingId, card]))
  return pinnedMappingIds.value
    .map((mappingId) => flowCardMap.get(mappingId) ?? null)
    .filter((card): card is DashboardFlowCard => card !== null)
})

const otherFlowCards = computed<DashboardFlowCard[]>(() => {
  const pinnedSet = new Set(pinnedMappingIds.value)
  return flowCards.value.filter((card) => !pinnedSet.has(card.mappingId))
})

const visibleOtherFlowCards = computed<DashboardFlowCard[]>(() => {
  return showAllOtherRuns.value ? otherFlowCards.value : otherFlowCards.value.slice(0, 5)
})

const hasMoreOtherRuns = computed(() => {
  return otherFlowCards.value.length > 5 && !showAllOtherRuns.value
})

const hasOtherRuns = computed(() => otherFlowCards.value.length > 0)

function handleDragStart(flowId: string, event: DragEvent): void {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', flowId)
}

async function savePinnedMappings(nextPinnedMappingIds: string[], previousPinnedMappingIds: string[]): Promise<void> {
  pinnedMappingIds.value = nextPinnedMappingIds

  try {
    const response = await reconciliationFacade.saveDashboardPinnedMappings({
      pinnedReconciliationMappingIds: nextPinnedMappingIds,
    })
    pinnedMappingIds.value = response.pinnedReconciliationMappingIds ?? nextPinnedMappingIds
  } catch {
    pinnedMappingIds.value = previousPinnedMappingIds
  }
}

async function handleDrop(target: 'pinned' | 'other', event: DragEvent): Promise<void> {
  const droppedFlowId = event.dataTransfer?.getData('text/plain')?.trim()
  if (!droppedFlowId) return
  const droppedCard = flowCards.value.find((card) => card.id === droppedFlowId)
  if (!droppedCard) return

  const previousPinnedMappingIds = [...pinnedMappingIds.value]
  const nextPinnedMappingIds =
    target === 'pinned'
      ? [...pinnedMappingIds.value.filter((mappingId) => mappingId !== droppedCard.mappingId), droppedCard.mappingId]
      : pinnedMappingIds.value.filter((mappingId) => mappingId !== droppedCard.mappingId)

  await savePinnedMappings(nextPinnedMappingIds, previousPinnedMappingIds)
}

async function loadDashboard(): Promise<void> {
  const authenticated = await ensureAuthenticated(true)
  if (!authenticated) {
    await router.replace(buildAuthRedirect(route.fullPath))
    return
  }

  showAllOtherRuns.value = false
  pinnedMappingIds.value = []
  mappings.value = []

  try {
    const response = await reconciliationFacade.listPilotMappings({
      pageIndex: 0,
      pageSize: 12,
      query: '',
    })
    pinnedMappingIds.value = response.pinnedReconciliationMappingIds ?? []
    mappings.value = response.mappings ?? []
  } catch {
    pinnedMappingIds.value = []
    mappings.value = []
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>
