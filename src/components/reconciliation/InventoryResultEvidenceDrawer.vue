<template>
  <Teleport to="body">
    <div v-if="open" class="inventory-drawer-overlay" @click.self="emit('close')">
      <aside class="inventory-drawer" role="dialog" aria-modal="true" :aria-label="drawerLabel">
        <header class="inventory-drawer-head">
          <div class="stack-sm">
            <p class="eyebrow">Evidence drawer</p>
            <h2>{{ pairLabel }}</h2>
            <p class="muted-copy">{{ runLabel }}</p>
          </div>
          <button type="button" class="ghost-btn" @click="emit('close')">Close</button>
        </header>

        <div v-if="loading" class="stack-md">
          <div class="empty-state compact">
            <h3>Loading evidence</h3>
            <p>Fetching the selected row from the backend summary cache.</p>
          </div>
        </div>

        <div v-else-if="error" class="stack-sm">
          <InlineValidation tone="error" :message="error" />
          <button type="button" @click="emit('retry')">Retry</button>
        </div>

        <div v-else-if="detail" class="inventory-drawer-body">
          <section class="inventory-drawer-section">
            <h3>Conclusion</h3>
            <p class="inventory-drawer-conclusion">{{ detail.conclusion || detail.reasonText || 'No conclusion available.' }}</p>
            <p class="mono-copy">Reason code: {{ detail.reasonCode || 'Unknown' }}</p>
          </section>

          <section class="inventory-drawer-section" v-if="aggregateEntries.length > 0">
            <h3>Aggregate context</h3>
            <dl class="inventory-drawer-grid">
              <template v-for="item in aggregateEntries" :key="item.key">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </template>
            </dl>
          </section>

          <section class="inventory-drawer-section" v-if="toLifecycleEntries.length > 0">
            <h3>Transfer order lifecycle</h3>
            <dl class="inventory-drawer-grid">
              <template v-for="item in toLifecycleEntries" :key="item.key">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </template>
            </dl>
          </section>

          <section class="inventory-drawer-section" v-if="observationSteps.length > 0">
            <div class="row-between">
              <h3>Observation steps</h3>
              <span class="mono-copy">{{ observationSteps.length }} step(s)</span>
            </div>
            <ol class="inventory-step-list">
              <li v-for="(step, index) in observationSteps" :key="`${index}-${step}`">
                {{ step }}
              </li>
            </ol>
          </section>

          <section class="inventory-drawer-section" v-if="supportingFindings.length > 0">
            <div class="row-between">
              <h3>Supporting findings</h3>
              <span class="mono-copy">{{ supportingFindings.length }} finding(s)</span>
            </div>
            <ul class="inventory-step-list">
              <li v-for="(finding, index) in supportingFindings" :key="`${index}-${finding.code}`">
                {{ finding.label }}
              </li>
            </ul>
          </section>

          <section class="inventory-drawer-section" v-if="causeDataEntries.length > 0">
            <h3>Cause data points</h3>
            <dl class="inventory-drawer-grid">
              <template v-for="item in causeDataEntries" :key="item.key">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </template>
            </dl>
          </section>

          <section class="inventory-drawer-section" v-if="signalBadges.length > 0">
            <h3>Signal flags</h3>
            <div class="actions-tight">
              <StatusBadge v-for="signal in signalBadges" :key="signal.label" :label="signal.label" :tone="signal.tone" />
            </div>
          </section>

          <section class="inventory-drawer-section" v-if="sampleIdEntries.length > 0">
            <h3>Sample IDs</h3>
            <dl class="inventory-drawer-grid">
              <template v-for="item in sampleIdEntries" :key="item.key">
                <dt>{{ item.label }}</dt>
                <dd>{{ item.value }}</dd>
              </template>
            </dl>
          </section>

          <section class="inventory-drawer-section" v-if="timelineEntries.length > 0">
            <div class="row-between">
              <h3>Event timeline</h3>
              <span class="mono-copy">{{ timelineEntries.length }} event(s)</span>
            </div>
            <ol class="inventory-step-list">
              <li v-for="(event, index) in timelineEntries" :key="`${index}-${event.key}`">
                {{ event.label }}
              </li>
            </ol>
          </section>

          <section class="inventory-drawer-section" v-if="rawTabs.length > 0">
            <h3>Raw evidence tabs</h3>
            <div class="actions-tight">
              <button
                v-for="tab in rawTabs"
                :key="tab.key"
                type="button"
                @click="activeRawTab = tab.key"
                :disabled="activeRawTab === tab.key"
              >
                {{ tab.label }}
              </button>
            </div>
            <p v-if="activeRawTabData?.isEmpty" class="mono-copy">{{ activeRawTabData?.emptyMessage }}</p>
            <pre class="inventory-raw-json">{{ activeRawTabData?.serialized || '[]' }}</pre>
          </section>
        </div>

        <EmptyState
          v-else
          title="No detail loaded"
          description="Select a row to inspect the evidence captured for that discrepancy."
        />
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import EmptyState from '../ui/EmptyState.vue'
import InlineValidation from '../ui/InlineValidation.vue'
import StatusBadge from '../ui/StatusBadge.vue'
import type {
  InventoryResultCauseDataPoints,
  InventoryResultDetail,
  InventoryResultSignalFlags,
  InventorySupportingFinding,
  InventoryTimelineEvent,
  InventoryToLifecycle,
} from '../../lib/api/types'

interface DrawerSignalBadge {
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'danger'
}

interface DrawerEntry {
  key: string
  label: string
  value: string
}

interface RawTab {
  key: string
  label: string
  serialized: string
  isEmpty: boolean
  emptyMessage: string
}

interface TimelineEntry {
  key: string
  label: string
}

interface FindingEntry {
  code: string
  label: string
}

const props = defineProps<{
  open: boolean
  loading: boolean
  error: string | null
  detail: InventoryResultDetail | null
  pairLabel: string
  runLabel: string
}>()

const emit = defineEmits<{
  close: []
  retry: []
}>()

const drawerLabel = computed(() => `Inventory evidence for ${props.pairLabel}`)
const activeRawTab = ref<string>('netSuitePrimaryRaw')

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => formatValue(item)).join(' | ') : 'None'
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'None'
  if (value === null || value === undefined || String(value).trim().length === 0) return 'None'
  return String(value)
}

function hasMeaningfulValue(value: string): boolean {
  return value !== 'None'
}

function serializeSection(value: unknown): string {
  if (value === null || value === undefined) return '[]'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const observationSteps = computed(() => {
  const raw = props.detail?.observationSteps as string | string[] | undefined
  if (Array.isArray(raw)) return raw.filter((step) => String(step).trim().length > 0).map((step) => String(step))
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw
      .split(/\s*=>\s*/)
      .map((step: string) => step.trim())
      .filter((step: string) => step.length > 0)
  }
  return []
})

const aggregateEntries = computed<DrawerEntry[]>(() => {
  const aggregate = (props.detail?.aggregateContext ?? {}) as Record<string, unknown>
  const row = props.detail
  if (!row) return []
  return [
    { key: 'qohDiff', label: 'QOH diff', value: formatValue(aggregate.qohDiff ?? row.qoh_diff) },
    { key: 'mismatchDirection', label: 'Mismatch direction', value: formatValue(aggregate.mismatchDirection) },
    { key: 'omsRecordCount', label: 'OMS rows', value: formatValue(aggregate.omsRecordCount ?? row.omsRecordCount) },
    { key: 'nsRecordCount', label: 'NS transactions', value: formatValue(aggregate.nsRecordCount ?? row.nsRecordCount) },
    { key: 'quantityDelta', label: 'Quantity delta', value: formatValue(aggregate.quantityDelta ?? row.quantityDelta) },
    { key: 'recordCountDelta', label: 'Record count delta', value: formatValue(aggregate.recordCountDelta ?? row.recordCountDelta) },
  ].filter((entry) => hasMeaningfulValue(entry.value))
})

const toLifecycleEntries = computed<DrawerEntry[]>(() => {
  const lifecycle = (props.detail?.toLifecycle ?? {}) as InventoryToLifecycle
  const ns = (lifecycle.ns ?? {}) as Record<string, unknown>
  const hc = (lifecycle.hc ?? {}) as Record<string, unknown>

  return [
    { key: 'state', label: 'Lifecycle state', value: formatValue(lifecycle.state) },
    { key: 'nsReceived', label: 'NS received', value: formatValue(ns.received) },
    { key: 'hcReceived', label: 'HC received', value: formatValue(hc.received) },
    { key: 'nsStatuses', label: 'NS statuses', value: formatValue(ns.statuses) },
    { key: 'nsTransferredQty', label: 'NS transferred qty', value: formatValue(ns.transferredQty) },
    { key: 'nsReceivedQty', label: 'NS received qty', value: formatValue(ns.receivedQty) },
    { key: 'hcShipments', label: 'HC shipment count', value: formatValue(hc.shipmentEventCount) },
    { key: 'hcReceipts', label: 'HC receipt count', value: formatValue(hc.receiptEventCount) },
  ].filter((entry) => hasMeaningfulValue(entry.value))
})

const causeDataEntries = computed<DrawerEntry[]>(() => {
  const causeData = (props.detail?.causeDataPoints ?? {}) as InventoryResultCauseDataPoints

  return [
    { key: 'facilityName', label: 'Facility', value: formatValue(causeData.facilityName ?? props.detail?.facility_name) },
    { key: 'productName', label: 'Product', value: formatValue(causeData.productName ?? props.detail?.product_name) },
    { key: 'discrepancyOmsQoh', label: 'OMS QOH', value: formatValue(causeData.discrepancyOmsQoh ?? props.detail?.hotwax_qoh) },
    { key: 'discrepancyNsQoh', label: 'NS QOH', value: formatValue(causeData.discrepancyNsQoh ?? props.detail?.netsuite_qoh) },
    { key: 'discrepancyQohDiff', label: 'QOH diff', value: formatValue(causeData.discrepancyQohDiff ?? props.detail?.qoh_diff) },
    { key: 'omsRecordCount', label: 'OMS record count', value: formatValue(causeData.omsRecordCount ?? props.detail?.omsRecordCount) },
    { key: 'nsRecordCount', label: 'NS record count', value: formatValue(causeData.nsRecordCount ?? props.detail?.nsRecordCount) },
    { key: 'quantityDelta', label: 'Quantity delta', value: formatValue(causeData.quantityDelta ?? props.detail?.quantityDelta) },
    { key: 'recordCountDelta', label: 'Record count delta', value: formatValue(causeData.recordCountDelta ?? props.detail?.recordCountDelta) },
  ].filter((entry) => hasMeaningfulValue(entry.value))
})

const supportingFindings = computed<FindingEntry[]>(() => {
  const findings = Array.isArray(props.detail?.supportingFindings)
    ? ((props.detail?.supportingFindings as InventorySupportingFinding[]) ?? [])
    : []
  return findings.map((finding) => {
    const status = finding.passed === true ? 'PASS' : finding.passed === false ? 'FAIL' : 'INFO'
    const parts = [status, formatValue(finding.code), formatValue(finding.detail), formatValue(finding.value)].filter(
      (entry) => entry && entry !== 'None',
    )
    return {
      code: String(finding.code ?? parts.join('-')),
      label: parts.join(' · '),
    }
  })
})

const timelineEntries = computed<TimelineEntry[]>(() => {
  const timeline = Array.isArray(props.detail?.eventTimeline)
    ? ((props.detail?.eventTimeline as InventoryTimelineEvent[]) ?? [])
    : []
  return timeline.map((event, index) => {
    const parts = [
      formatValue(event.txnDate),
      formatValue(event.source),
      formatValue(event.eventType),
      formatValue(event.id),
      formatValue(event.tranid),
      formatValue(event.status),
      formatValue(event.qty),
    ].filter((part) => part !== 'None')
    return {
      key: `${index}-${event.source}-${event.id}-${event.tranid}`,
      label: parts.join(' · '),
    }
  })
})

const signalBadges = computed<DrawerSignalBadge[]>(() => {
  const flags = (props.detail?.signalFlags ?? {}) as InventoryResultSignalFlags
  const candidates: Array<{ enabled: boolean | undefined; label: string; tone: DrawerSignalBadge['tone'] }> = [
    { enabled: flags.hasSalesOrderSignal, label: 'Sales order yes', tone: 'success' },
    { enabled: flags.hasItemFulfillmentSignal, label: 'Item fulfillment yes', tone: 'success' },
    { enabled: flags.hasCreditMemoSignal, label: 'Credit memo yes', tone: 'success' },
    { enabled: flags.hasTransferSignal, label: 'Transfer yes', tone: 'success' },
    { enabled: flags.hasInventoryAdjustmentSignal, label: 'Inventory adjustment yes', tone: 'success' },
    { enabled: flags.hasOmsReturnSignal, label: 'OMS return yes', tone: 'success' },
    { enabled: flags.hasOmsShipmentSignal, label: 'OMS shipment yes', tone: 'success' },
    { enabled: flags.hasPhysicalInventorySignal, label: 'Physical inventory yes', tone: 'success' },
    { enabled: flags.strictCycleCountSignal, label: 'Strict cycle yes', tone: 'warning' },
    { enabled: flags.kitSingleNarrativeSignal, label: 'Kit/single yes', tone: 'warning' },
  ]
  return candidates.filter((item) => item.enabled === true).map((item) => ({ label: item.label, tone: item.tone }))
})

const sampleIdEntries = computed<DrawerEntry[]>(() => {
  const detail = props.detail
  if (!detail) return []
  const causeData = (detail.causeDataPoints ?? {}) as InventoryResultCauseDataPoints

  return [
    {
      key: 'sampleOrderIds',
      label: 'Order IDs',
      value: formatValue(detail.sampleOrderIds ?? causeData.sampleOrderIds),
    },
    {
      key: 'sampleReturnIds',
      label: 'Return IDs',
      value: formatValue(detail.sampleReturnIds ?? causeData.sampleReturnIds),
    },
    {
      key: 'sampleShipmentIds',
      label: 'Shipment IDs',
      value: formatValue(detail.sampleShipmentIds ?? causeData.sampleShipmentIds),
    },
    {
      key: 'sampleReceiptIds',
      label: 'Receipt IDs',
      value: formatValue(detail.sampleReceiptIds ?? causeData.sampleReceiptIds),
    },
    {
      key: 'samplePhysicalInventoryIds',
      label: 'Physical inventory IDs',
      value: formatValue(detail.samplePhysicalInventoryIds ?? causeData.samplePhysicalInventoryIds),
    },
  ].filter((entry) => hasMeaningfulValue(entry.value))
})

const rawTabs = computed<RawTab[]>(() => {
  const detail = props.detail
  if (!detail) return []

  const scoped = (detail.rawEvidenceScoped ?? {}) as Record<string, unknown>
  const nsPrimary = Array.isArray(scoped.netSuitePrimaryRaw)
    ? (scoped.netSuitePrimaryRaw as Array<Record<string, unknown>>)
    : Array.isArray(detail.nsRecords)
      ? detail.nsRecords
      : []
  const nsDetail = Array.isArray(scoped.netSuiteDetailRaw)
    ? (scoped.netSuiteDetailRaw as Array<Record<string, unknown>>)
    : Array.isArray((detail.nsSecondaryDetails as Record<string, unknown> | undefined)?.detailRows)
      ? (((detail.nsSecondaryDetails as Record<string, unknown>).detailRows as Array<Record<string, unknown>>) ?? [])
      : []
  const omsHc = Array.isArray(scoped.omsHcRaw)
    ? (scoped.omsHcRaw as Array<Record<string, unknown>>)
    : Array.isArray(detail.omsDetailRows)
      ? detail.omsDetailRows
      : []
  const discrepancy = Array.isArray(scoped.discrepancyRaw)
    ? (scoped.discrepancyRaw as Array<Record<string, unknown>>)
    : Array.isArray(detail.discrepancyRows)
      ? detail.discrepancyRows
      : []

  return [
    {
      key: 'netSuitePrimaryRaw',
      label: `NS primary (${nsPrimary.length})`,
      serialized: serializeSection(nsPrimary),
      isEmpty: nsPrimary.length === 0,
      emptyMessage: 'No NetSuite primary records were persisted for this pair.',
    },
    {
      key: 'netSuiteDetailRaw',
      label: `NS detail (${nsDetail.length})`,
      serialized: serializeSection(nsDetail),
      isEmpty: nsDetail.length === 0,
      emptyMessage: 'No NetSuite secondary detail records were persisted for this pair.',
    },
    {
      key: 'omsHcRaw',
      label: `OMS/HC raw (${omsHc.length})`,
      serialized: serializeSection(omsHc),
      isEmpty: omsHc.length === 0,
      emptyMessage: 'No OMS/HC rows were persisted for this pair.',
    },
    {
      key: 'discrepancyRaw',
      label: `Discrepancy raw (${discrepancy.length})`,
      serialized: serializeSection(discrepancy),
      isEmpty: discrepancy.length === 0,
      emptyMessage: 'No discrepancy snapshots were persisted for this pair.',
    },
  ].filter((tab) => !tab.isEmpty)
})

watch(
  rawTabs,
  (tabs) => {
    if (tabs.length === 0) {
      activeRawTab.value = ''
      return
    }
    if (!tabs.some((tab) => tab.key === activeRawTab.value)) {
      activeRawTab.value = tabs[0]?.key ?? ''
    }
  },
  { immediate: true },
)

const activeRawTabData = computed(() => {
  return rawTabs.value.find((tab) => tab.key === activeRawTab.value) ?? null
})
</script>
