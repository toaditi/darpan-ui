<template>
  <main class="page-root">
    <section class="module-intro">
      <p class="eyebrow">[mockup] create_ruleset</p>
      <h1>Create RuleSet</h1>
      <p class="muted-copy">
        Test case canvas with drag/drop associations, per-rule custom compare logic popup, and hover-triggered
        normalizer popup for individual values.
      </p>
      <div class="actions-tight">
        <RouterLink class="ghost-link" to="/roadmap/reconciliation">Back to Reconciliation Roadmap</RouterLink>
      </div>
    </section>

    <FormSection title="RuleSet details" description="Mockup-only controls for naming and setup context.">
      <div class="field-grid three">
        <label>
          <span>RuleSet name</span>
          <input v-model="ruleSetForm.name" type="text" />
        </label>
        <label>
          <span>Version</span>
          <input v-model="ruleSetForm.version" type="text" />
        </label>
        <label>
          <span>Status</span>
          <select v-model="ruleSetForm.status">
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
      </div>

      <div class="field-grid two">
        <label>
          <span>Source JSON schema</span>
          <input v-model="ruleSetForm.sourceSchema" type="text" />
        </label>
        <label>
          <span>Target JSON schema</span>
          <input v-model="ruleSetForm.targetSchema" type="text" />
        </label>
      </div>
    </FormSection>

    <FormSection
      title="Popup Playground"
      description="Use these controls to open and test popup behavior directly from this screen."
    >
      <div class="card-grid two">
        <article class="card stack-sm">
          <h3>Quick open</h3>
          <p class="section-note">Instantly open popups for the active rule lane.</p>
          <div class="actions-tight">
            <button type="button" @click="openLogicModal">Open custom logic popup</button>
            <button type="button" @click="openNormalizerForSide('left')">Open source normalizer popup</button>
            <button type="button" @click="openNormalizerForSide('right')">Open target normalizer popup</button>
          </div>
        </article>

        <article class="card stack-sm">
          <h3>Normalizer picker</h3>
          <p class="section-note">Choose side and field, then open the normalizer popup.</p>

          <div class="field-grid two">
            <label>
              <span>Side</span>
              <select v-model="playgroundNormalizerSide">
                <option value="left">Source (JSON 1)</option>
                <option value="right">Target (JSON 2)</option>
              </select>
            </label>

            <label>
              <span>Field</span>
              <select v-model="playgroundNormalizerFieldId">
                <option v-for="field in playgroundNormalizerFields" :key="field.id" :value="field.id">
                  {{ field.label }}
                </option>
              </select>
            </label>
          </div>

          <div class="actions-tight">
            <button type="button" @click="openNormalizerPlayground">Open normalizer popup</button>
          </div>
        </article>
      </div>
    </FormSection>

    <FormSection
      title="Test Case Details"
      description="Drag from JSON 1 to JSON 2 for association. The Rule node controls compare behavior for that lane."
    >
      <div class="row-between">
        <p class="mono-copy">Active lane: Rule {{ activeLaneNumber }} of {{ associationLanes.length }}</p>
        <div class="actions-tight">
          <button type="button" class="ghost-btn" @click="addAssociationLane">Add lane</button>
          <button
            type="button"
            class="ghost-btn danger-text"
            :disabled="associationLanes.length === 1"
            @click="removeActiveLane"
          >
            Remove active lane
          </button>
        </div>
      </div>

      <div class="association-tabs" role="tablist" aria-label="Association rule lanes">
        <button
          v-for="(lane, index) in associationLanes"
          :key="lane.id"
          type="button"
          class="lane-tab"
          :class="{ active: lane.id === activeLane.id }"
          @click="setActiveLane(lane.id)"
        >
          Rule {{ index + 1 }}
        </button>
      </div>

      <div class="sketch-divider" aria-hidden="true"></div>

      <section ref="canvasEl" class="test-case-canvas">
        <svg
          v-if="hasWireOverlay"
          class="association-wire-overlay"
          :viewBox="`0 0 ${wireOverlay.width} ${wireOverlay.height}`"
          :width="wireOverlay.width"
          :height="wireOverlay.height"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="association-wire-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L8,4 L0,8 z" class="association-wire-arrow" />
            </marker>
          </defs>

          <path
            v-if="wireOverlay.leftPath"
            :d="wireOverlay.leftPath"
            class="association-wire-path"
            marker-end="url(#association-wire-arrow)"
          />
          <path
            v-if="wireOverlay.rightPath"
            :d="wireOverlay.rightPath"
            class="association-wire-path"
            marker-end="url(#association-wire-arrow)"
          />

          <circle v-if="wireOverlay.sourcePoint" :cx="wireOverlay.sourcePoint.x" :cy="wireOverlay.sourcePoint.y" r="4" class="association-wire-dot" />
          <circle v-if="wireOverlay.ruleLeftPoint" :cx="wireOverlay.ruleLeftPoint.x" :cy="wireOverlay.ruleLeftPoint.y" r="4" class="association-wire-dot" />
          <circle v-if="wireOverlay.ruleRightPoint" :cx="wireOverlay.ruleRightPoint.x" :cy="wireOverlay.ruleRightPoint.y" r="4" class="association-wire-dot" />
          <circle v-if="wireOverlay.targetPoint" :cx="wireOverlay.targetPoint.x" :cy="wireOverlay.targetPoint.y" r="4" class="association-wire-dot" />
        </svg>

        <article class="json-panel">
          <div class="json-head">
            <h3>JSON 1</h3>
            <p class="mono-copy">{{ ruleSetForm.sourceSchema }}</p>
          </div>

          <ul class="field-list">
            <li
              v-for="field in sourceFields"
              :key="field.id"
              class="json-field-row"
              :ref="(el) => setFieldRowRef('left', field.id, el)"
              :class="{
                'is-selected': isFieldSelected(field, 'left'),
                'is-drop-target': isFieldDropTarget(field, 'left'),
              }"
              @dragover.prevent="setFieldDropTarget(field, 'left')"
              @dragleave="clearDropTarget"
              @drop.prevent="dropOnField(field, 'left')"
            >
              <button
                type="button"
                class="json-field-btn"
                draggable="true"
                @click="chooseField('left', field)"
                @dragstart="handleFieldDragStart(field, $event)"
                @dragend="clearDragState"
              >
                <span class="field-arrow" aria-hidden="true">→</span>
                <span>{{ field.label }}</span>
              </button>

              <button
                type="button"
                class="normalizer-hover-btn"
                @click="openNormalizerFromField('left', field)"
              >
                Normalizer
              </button>
            </li>
          </ul>
        </article>

        <section class="rule-panel">
          <button
            ref="ruleNodeEl"
            type="button"
            class="rule-node"
            :class="{ 'is-drop-target': ruleDropActive }"
            @dragover.prevent="setRuleDropTarget"
            @dragleave="clearDropTarget"
            @drop.prevent="dropOnRule"
          >
            <span class="eyebrow">Rule</span>
            <span class="rule-label">{{ compareModeLabels[activeLane.compareMode] }}</span>
            <span class="mono-copy">{{ activeLane.compareConfig || 'Strict compare default' }}</span>
          </button>

          <div class="actions-tight rule-actions">
            <button type="button" @click="openLogicModal">Custom logic</button>
          </div>

          <p class="mono-copy wire-summary">
            {{ connectionSummary }}
          </p>

          <p class="mono-copy hover-copy">Hover a field row and use the “Normalizer” popup for individual value rules.</p>
        </section>

        <article class="json-panel">
          <div class="json-head">
            <h3>JSON 2</h3>
            <p class="mono-copy">{{ ruleSetForm.targetSchema }}</p>
          </div>

          <ul class="field-list">
            <li
              v-for="field in targetFields"
              :key="field.id"
              class="json-field-row"
              :ref="(el) => setFieldRowRef('right', field.id, el)"
              :class="{
                'is-selected': isFieldSelected(field, 'right'),
                'is-drop-target': isFieldDropTarget(field, 'right'),
              }"
              @dragover.prevent="setFieldDropTarget(field, 'right')"
              @dragleave="clearDropTarget"
              @drop.prevent="dropOnField(field, 'right')"
            >
              <button
                type="button"
                class="json-field-btn"
                draggable="true"
                @click="chooseField('right', field)"
                @dragstart="handleFieldDragStart(field, $event)"
                @dragend="clearDragState"
              >
                <span class="field-arrow" aria-hidden="true">→</span>
                <span>{{ field.label }}</span>
              </button>

              <button
                type="button"
                class="normalizer-hover-btn"
                @click="openNormalizerFromField('right', field)"
              >
                Normalizer
              </button>
            </li>
          </ul>
        </article>
      </section>

      <article class="card stack-sm lane-summary-card">
        <p class="eyebrow">Lane summary</p>
        <p class="mono-copy">Compare: {{ compareSummary(activeLane) }}</p>
        <p class="mono-copy">Source normalizers: {{ formatNormalizerSummary(activeLane.leftNormalizers) }}</p>
        <p class="mono-copy">Target normalizers: {{ formatNormalizerSummary(activeLane.rightNormalizers) }}</p>
      </article>
    </FormSection>

    <FormSection title="RuleSet preview" description="Aggregate preview for walkthrough and review.">
      <article class="card stack-md">
        <div class="card-grid three">
          <div class="metric-card">
            <p class="eyebrow">Linked lanes</p>
            <p class="metric-value">{{ linkedAssociations }}/{{ associationLanes.length }}</p>
          </div>
          <div class="metric-card">
            <p class="eyebrow">Custom compare lanes</p>
            <p class="metric-value">{{ customLogicLanes }}</p>
          </div>
          <div class="metric-card">
            <p class="eyebrow">Total normalizers</p>
            <p class="metric-value">{{ totalNormalizers }}</p>
          </div>
        </div>

        <div class="actions-tight">
          <button type="button" disabled title="Mockup action. Persistence is not wired yet.">Save Draft</button>
          <button type="button" class="ghost-btn" disabled title="Mockup action. Validation service is not wired yet.">
            Validate RuleSet
          </button>
          <button type="button" class="ghost-btn" disabled title="Mockup action. Export is not wired yet.">
            Export RuleSet JSON
          </button>
        </div>
      </article>
    </FormSection>
  </main>

  <Teleport to="body">
    <div v-if="logicModal.open" class="mockup-modal-overlay" @click.self="closeLogicModal" @keydown.esc.stop.prevent>
      <section class="mockup-modal" role="dialog" aria-modal="true" aria-labelledby="logic-modal-title">
        <header class="row-between modal-header">
          <h3 id="logic-modal-title">Custom compare logic</h3>
          <button type="button" class="ghost-btn" @click="closeLogicModal">Close</button>
        </header>

        <p class="section-note">
          Rule {{ activeLaneNumber }} settings. Use this popup for logic other than strict compare.
        </p>

        <div class="stack-md">
          <label>
            <span>Compare strategy</span>
            <select v-model="logicModal.compareMode">
              <option v-for="option in compareModeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            <span>Config / expression</span>
            <input
              v-model="logicModal.compareConfig"
              type="text"
              placeholder="Example: tolerance=3 | regex=^[A-Z0-9]{6}$ | expr=abs(a-b) <= 2"
            />
          </label>

          <label>
            <span>Notes</span>
            <textarea
              v-model="logicModal.compareNotes"
              rows="3"
              placeholder="Optional rationale for reviewers and maintainers."
            ></textarea>
          </label>
        </div>

        <div class="actions-tight">
          <button type="button" @click="saveLogicModal">Save logic</button>
          <button type="button" class="ghost-btn" @click="closeLogicModal">Cancel</button>
        </div>
      </section>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="normalizerModal.open" class="mockup-modal-overlay" @click.self="closeNormalizerModal" @keydown.esc.stop.prevent>
      <section class="mockup-modal" role="dialog" aria-modal="true" aria-labelledby="normalizer-modal-title">
        <header class="row-between modal-header">
          <h3 id="normalizer-modal-title">Normalize {{ sideLabel(normalizerModal.side) }} value</h3>
          <button type="button" class="ghost-btn" @click="closeNormalizerModal">Done</button>
        </header>

        <p class="section-note">
          Rule {{ activeLaneNumber }} · {{ normalizerFieldLabel }}. Add normalization as an alternative to ID normalizer.
        </p>

        <div class="stack-md">
          <label>
            <span>Normalizer type</span>
            <select v-model="normalizerModal.type">
              <option v-for="option in normalizerTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>

          <label>
            <span>Config</span>
            <input
              v-model="normalizerModal.config"
              type="text"
              placeholder="Example: map={&quot;blk&quot;:&quot;black&quot;} | regex=^0+ | format=YYYY-MM-DD"
            />
          </label>
        </div>

        <div class="actions-tight">
          <button type="button" @click="addNormalizer">Add normalizer</button>
          <button type="button" class="ghost-btn" @click="closeNormalizerModal">Close</button>
        </div>

        <div class="stack-sm">
          <p class="eyebrow">Current normalizers</p>
          <ul v-if="activeNormalizerList.length > 0" class="normalizer-list">
            <li v-for="item in activeNormalizerList" :key="item.id" class="normalizer-item">
              <div class="stack-sm">
                <p class="normalizer-name">{{ normalizerTypeLabels[item.type] }}</p>
                <p class="mono-copy">{{ item.config || 'default profile' }}</p>
              </div>
              <button type="button" class="ghost-btn danger-text" @click="removeNormalizer(item.id)">Remove</button>
            </li>
          </ul>
          <div v-else class="empty-state compact">
            <h3>No normalizers added</h3>
            <p>Add a normalizer step for this side.</p>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
  type ComponentPublicInstance,
} from 'vue'
import { RouterLink } from 'vue-router'
import FormSection from '../../components/ui/FormSection.vue'

type LaneSide = 'left' | 'right'
type CompareMode = 'strict' | 'contains' | 'regex' | 'numericTolerance' | 'scriptExpression'
type NormalizerType = 'trimUppercase' | 'stripLeadingZeros' | 'regexRewrite' | 'valueMap' | 'dateCanonical'

interface FieldToken {
  id: string
  label: string
  path: string
  side: LaneSide
}

interface LaneNormalizer {
  id: number
  type: NormalizerType
  config: string
}

interface AssociationLane {
  id: number
  leftField: FieldToken | null
  rightField: FieldToken | null
  compareMode: CompareMode
  compareConfig: string
  compareNotes: string
  leftNormalizers: LaneNormalizer[]
  rightNormalizers: LaneNormalizer[]
}

interface CanvasPoint {
  x: number
  y: number
}

const compareModeOptions: Array<{ value: CompareMode; label: string }> = [
  { value: 'strict', label: 'Strict compare (default)' },
  { value: 'contains', label: 'Contains text' },
  { value: 'regex', label: 'Regex match' },
  { value: 'numericTolerance', label: 'Numeric tolerance' },
  { value: 'scriptExpression', label: 'Custom expression' },
]

const compareModeLabels: Record<CompareMode, string> = {
  strict: 'Strict compare',
  contains: 'Contains text',
  regex: 'Regex match',
  numericTolerance: 'Numeric tolerance',
  scriptExpression: 'Custom expression',
}

const normalizerTypeOptions: Array<{ value: NormalizerType; label: string }> = [
  { value: 'trimUppercase', label: 'Trim + uppercase' },
  { value: 'stripLeadingZeros', label: 'Strip leading zeros' },
  { value: 'regexRewrite', label: 'Regex rewrite' },
  { value: 'valueMap', label: 'Value map' },
  { value: 'dateCanonical', label: 'Date canonical format' },
]

const normalizerTypeLabels: Record<NormalizerType, string> = {
  trimUppercase: 'Trim + uppercase',
  stripLeadingZeros: 'Strip leading zeros',
  regexRewrite: 'Regex rewrite',
  valueMap: 'Value map',
  dateCanonical: 'Date canonical format',
}

const sourceFields: FieldToken[] = [
  { id: 'source-field-1', label: 'Field 1', path: 'json1.customer.id', side: 'left' },
  { id: 'source-field-2', label: 'Field 2', path: 'json1.customer.email', side: 'left' },
  { id: 'source-field-3', label: 'Field 3', path: 'json1.customer.phone', side: 'left' },
]

const targetFields: FieldToken[] = [
  { id: 'target-field-1', label: 'Field 1', path: 'json2.entity.externalId', side: 'right' },
  { id: 'target-field-2', label: 'Field 2', path: 'json2.entity.emailAddress', side: 'right' },
  { id: 'target-field-3', label: 'Field 3', path: 'json2.entity.phoneMobile', side: 'right' },
]

let laneCounter = 0
let normalizerCounter = 0

const ruleSetForm = reactive({
  name: 'test-case-ruleset',
  version: '1.0',
  status: 'DRAFT',
  sourceSchema: 'json_1_schema',
  targetSchema: 'json_2_schema',
})

function createAssociationLane(): AssociationLane {
  laneCounter += 1
  return {
    id: laneCounter,
    leftField: null,
    rightField: null,
    compareMode: 'strict',
    compareConfig: '',
    compareNotes: '',
    leftNormalizers: [],
    rightNormalizers: [],
  }
}

const initialLane = createAssociationLane()
const associationLanes = ref<AssociationLane[]>([initialLane])
const activeLaneId = ref(initialLane.id)

const activeLane = computed<AssociationLane>(() => {
  const found = associationLanes.value.find((lane) => lane.id === activeLaneId.value)
  return found ?? associationLanes.value[0]!
})

const activeLaneNumber = computed(() => {
  return associationLanes.value.findIndex((lane) => lane.id === activeLane.value.id) + 1
})

function setActiveLane(laneId: number): void {
  activeLaneId.value = laneId
  scheduleWireOverlayRefresh()
}

function addAssociationLane(): void {
  const lane = createAssociationLane()
  associationLanes.value.push(lane)
  activeLaneId.value = lane.id
  scheduleWireOverlayRefresh()
}

function removeActiveLane(): void {
  if (associationLanes.value.length === 1) return
  const laneIdToRemove = activeLane.value.id
  associationLanes.value = associationLanes.value.filter((lane) => lane.id !== laneIdToRemove)
  activeLaneId.value = associationLanes.value[0]!.id

  if (logicModal.open && logicModal.laneId === laneIdToRemove) {
    closeLogicModal()
  }
  if (normalizerModal.open && normalizerModal.laneId === laneIdToRemove) {
    closeNormalizerModal()
  }

  scheduleWireOverlayRefresh()
}

function assignLaneField(lane: AssociationLane, side: LaneSide, field: FieldToken): void {
  const previous = side === 'left' ? lane.leftField : lane.rightField
  if (previous?.id !== field.id) {
    if (side === 'left') {
      lane.leftNormalizers = []
    } else {
      lane.rightNormalizers = []
    }
  }

  if (side === 'left') {
    lane.leftField = field
  } else {
    lane.rightField = field
  }
}

function chooseField(side: LaneSide, field: FieldToken): void {
  assignLaneField(activeLane.value, side, field)
  scheduleWireOverlayRefresh()
}

function isFieldSelected(field: FieldToken, side: LaneSide): boolean {
  const lane = activeLane.value
  if (side === 'left') return lane.leftField?.id === field.id
  return lane.rightField?.id === field.id
}

const dragState = ref<FieldToken | null>(null)
const dropTarget = ref<string | null>(null)
const ruleDropActive = ref(false)

const canvasEl = ref<HTMLElement | null>(null)
const ruleNodeEl = ref<HTMLElement | null>(null)
const leftFieldRowRefs = ref<Record<string, HTMLElement>>({})
const rightFieldRowRefs = ref<Record<string, HTMLElement>>({})

const wireOverlay = reactive<{
  width: number
  height: number
  leftPath: string
  rightPath: string
  sourcePoint: CanvasPoint | null
  ruleLeftPoint: CanvasPoint | null
  ruleRightPoint: CanvasPoint | null
  targetPoint: CanvasPoint | null
}>({
  width: 0,
  height: 0,
  leftPath: '',
  rightPath: '',
  sourcePoint: null,
  ruleLeftPoint: null,
  ruleRightPoint: null,
  targetPoint: null,
})

const hasWireOverlay = computed(() => {
  return wireOverlay.leftPath.length > 0 || wireOverlay.rightPath.length > 0
})

let canvasResizeObserver: ResizeObserver | null = null

function setFieldRowRef(side: LaneSide, fieldId: string, el: Element | ComponentPublicInstance | null): void {
  const rowMap = side === 'left' ? leftFieldRowRefs.value : rightFieldRowRefs.value
  const element =
    el instanceof HTMLElement ? el : el && '$el' in el && el.$el instanceof HTMLElement ? el.$el : null

  if (element) {
    rowMap[fieldId] = element
  } else {
    delete rowMap[fieldId]
  }

  scheduleWireOverlayRefresh()
}

function scheduleWireOverlayRefresh(): void {
  void nextTick(refreshWireOverlay)
}

function toCanvasPointFromRect(
  elementRect: DOMRect,
  canvasRect: DOMRect,
  horizontalAnchor: 'left' | 'center' | 'right',
): CanvasPoint {
  let x = elementRect.left - canvasRect.left
  if (horizontalAnchor === 'center') x += elementRect.width / 2
  if (horizontalAnchor === 'right') x += elementRect.width

  return {
    x,
    y: elementRect.top - canvasRect.top + elementRect.height / 2,
  }
}

function buildWirePath(from: CanvasPoint, to: CanvasPoint): string {
  const curve = Math.max(46, Math.abs(to.x - from.x) * 0.42)
  return `M ${from.x} ${from.y} C ${from.x + curve} ${from.y}, ${to.x - curve} ${to.y}, ${to.x} ${to.y}`
}

function resetWireOverlay(): void {
  wireOverlay.leftPath = ''
  wireOverlay.rightPath = ''
  wireOverlay.sourcePoint = null
  wireOverlay.ruleLeftPoint = null
  wireOverlay.ruleRightPoint = null
  wireOverlay.targetPoint = null
}

function refreshWireOverlay(): void {
  const canvas = canvasEl.value
  const ruleNode = ruleNodeEl.value
  if (!canvas || !ruleNode) return

  const canvasRect = canvas.getBoundingClientRect()
  wireOverlay.width = Math.max(1, Math.round(canvasRect.width))
  wireOverlay.height = Math.max(1, Math.round(canvasRect.height))

  const ruleRect = ruleNode.getBoundingClientRect()
  const ruleLeftPoint = toCanvasPointFromRect(ruleRect, canvasRect, 'left')
  const ruleRightPoint = toCanvasPointFromRect(ruleRect, canvasRect, 'right')

  resetWireOverlay()
  wireOverlay.ruleLeftPoint = ruleLeftPoint
  wireOverlay.ruleRightPoint = ruleRightPoint

  const leftFieldId = activeLane.value.leftField?.id
  const rightFieldId = activeLane.value.rightField?.id

  if (leftFieldId) {
    const leftRow = leftFieldRowRefs.value[leftFieldId]
    if (leftRow) {
      const sourcePoint = toCanvasPointFromRect(leftRow.getBoundingClientRect(), canvasRect, 'right')
      wireOverlay.sourcePoint = sourcePoint
      wireOverlay.leftPath = buildWirePath(sourcePoint, ruleLeftPoint)
    }
  }

  if (rightFieldId) {
    const rightRow = rightFieldRowRefs.value[rightFieldId]
    if (rightRow) {
      const targetPoint = toCanvasPointFromRect(rightRow.getBoundingClientRect(), canvasRect, 'left')
      wireOverlay.targetPoint = targetPoint
      wireOverlay.rightPath = buildWirePath(ruleRightPoint, targetPoint)
    }
  }
}

function handleFieldDragStart(field: FieldToken, event: DragEvent): void {
  dragState.value = field
  event.dataTransfer?.setData('text/plain', field.id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
  }
}

function clearDragState(): void {
  dragState.value = null
  dropTarget.value = null
  ruleDropActive.value = false
}

function setFieldDropTarget(targetField: FieldToken, targetSide: LaneSide): void {
  const dragging = dragState.value
  if (!dragging || dragging.side === targetSide) return

  dropTarget.value = `${targetSide}:${targetField.id}`
  ruleDropActive.value = false
}

function isFieldDropTarget(targetField: FieldToken, targetSide: LaneSide): boolean {
  return dropTarget.value === `${targetSide}:${targetField.id}`
}

function setRuleDropTarget(): void {
  if (!dragState.value) return
  ruleDropActive.value = true
  dropTarget.value = null
}

function clearDropTarget(): void {
  dropTarget.value = null
  ruleDropActive.value = false
}

function dropOnRule(): void {
  const dragging = dragState.value
  if (!dragging) return

  assignLaneField(activeLane.value, dragging.side, dragging)
  clearDragState()
  scheduleWireOverlayRefresh()
}

function dropOnField(targetField: FieldToken, targetSide: LaneSide): void {
  const dragging = dragState.value
  if (!dragging) return

  const lane = activeLane.value
  assignLaneField(lane, dragging.side, dragging)
  assignLaneField(lane, targetSide, targetField)
  clearDragState()
  scheduleWireOverlayRefresh()
}

const connectionSummary = computed(() => {
  const left = activeLane.value.leftField?.label ?? 'Field ?'
  const right = activeLane.value.rightField?.label ?? 'Field ?'
  return `${left} → Rule → ${right}`
})

const logicModal = reactive<{
  open: boolean
  laneId: number | null
  compareMode: CompareMode
  compareConfig: string
  compareNotes: string
}>({
  open: false,
  laneId: null,
  compareMode: 'strict',
  compareConfig: '',
  compareNotes: '',
})

function openLogicModal(): void {
  const lane = activeLane.value
  logicModal.open = true
  logicModal.laneId = lane.id
  logicModal.compareMode = lane.compareMode
  logicModal.compareConfig = lane.compareConfig
  logicModal.compareNotes = lane.compareNotes
}

function closeLogicModal(): void {
  logicModal.open = false
  logicModal.laneId = null
  logicModal.compareMode = 'strict'
  logicModal.compareConfig = ''
  logicModal.compareNotes = ''
}

function saveLogicModal(): void {
  const lane = associationLanes.value.find((item) => item.id === logicModal.laneId)
  if (!lane) return

  lane.compareMode = logicModal.compareMode
  lane.compareConfig = logicModal.compareConfig.trim()
  lane.compareNotes = logicModal.compareNotes.trim()
  closeLogicModal()
}

const normalizerModal = reactive<{
  open: boolean
  laneId: number | null
  side: LaneSide
  type: NormalizerType
  config: string
}>({
  open: false,
  laneId: null,
  side: 'left',
  type: 'trimUppercase',
  config: '',
})

function openNormalizerFromField(side: LaneSide, field: FieldToken): void {
  assignLaneField(activeLane.value, side, field)

  normalizerModal.open = true
  normalizerModal.laneId = activeLane.value.id
  normalizerModal.side = side
  normalizerModal.type = 'trimUppercase'
  normalizerModal.config = ''
}

function closeNormalizerModal(): void {
  normalizerModal.open = false
  normalizerModal.laneId = null
  normalizerModal.side = 'left'
  normalizerModal.type = 'trimUppercase'
  normalizerModal.config = ''
}

const activeNormalizerLane = computed(() => {
  if (normalizerModal.laneId === null) return null
  return associationLanes.value.find((lane) => lane.id === normalizerModal.laneId) ?? null
})

const activeNormalizerList = computed<LaneNormalizer[]>(() => {
  const lane = activeNormalizerLane.value
  if (!lane) return []
  return normalizerModal.side === 'left' ? lane.leftNormalizers : lane.rightNormalizers
})

const normalizerFieldLabel = computed(() => {
  const lane = activeNormalizerLane.value
  if (!lane) return 'No field selected'

  const field = normalizerModal.side === 'left' ? lane.leftField : lane.rightField
  return field?.label ?? 'No field selected'
})

function addNormalizer(): void {
  const lane = activeNormalizerLane.value
  if (!lane) return

  normalizerCounter += 1
  const next: LaneNormalizer = {
    id: normalizerCounter,
    type: normalizerModal.type,
    config: normalizerModal.config.trim(),
  }

  if (normalizerModal.side === 'left') {
    lane.leftNormalizers.push(next)
  } else {
    lane.rightNormalizers.push(next)
  }

  normalizerModal.config = ''
}

function removeNormalizer(normalizerId: number): void {
  const lane = activeNormalizerLane.value
  if (!lane) return

  const list = normalizerModal.side === 'left' ? lane.leftNormalizers : lane.rightNormalizers
  const index = list.findIndex((item) => item.id === normalizerId)
  if (index >= 0) list.splice(index, 1)
}

function sideLabel(side: LaneSide): string {
  return side === 'left' ? 'source' : 'target'
}

function compareSummary(lane: AssociationLane): string {
  const mode = compareModeLabels[lane.compareMode]
  const config = lane.compareConfig ? ` | ${lane.compareConfig}` : ''
  const note = lane.compareNotes ? ` | ${lane.compareNotes}` : ''
  return `${mode}${config}${note}`
}

function formatNormalizerSummary(normalizers: LaneNormalizer[]): string {
  if (normalizers.length === 0) return 'none'
  return normalizers
    .map((item) => {
      const label = normalizerTypeLabels[item.type]
      return item.config.length > 0 ? `${label} (${item.config})` : label
    })
    .join(', ')
}

const linkedAssociations = computed(() => {
  return associationLanes.value.filter((lane) => lane.leftField !== null && lane.rightField !== null).length
})

const customLogicLanes = computed(() => {
  return associationLanes.value.filter((lane) => lane.compareMode !== 'strict').length
})

const totalNormalizers = computed(() => {
  return associationLanes.value.reduce((sum, lane) => {
    return sum + lane.leftNormalizers.length + lane.rightNormalizers.length
  }, 0)
})
const isAnyModalOpen = computed(() => logicModal.open || normalizerModal.open)

const playgroundNormalizerSide = ref<LaneSide>('left')
const playgroundNormalizerFieldId = ref(sourceFields[0]?.id ?? '')

const playgroundNormalizerFields = computed<FieldToken[]>(() => {
  return playgroundNormalizerSide.value === 'left' ? sourceFields : targetFields
})

function openNormalizerPlayground(): void {
  const fields = playgroundNormalizerFields.value
  const selected = fields.find((field) => field.id === playgroundNormalizerFieldId.value)
  const field = selected ?? fields[0]
  if (!field) return

  playgroundNormalizerFieldId.value = field.id
  openNormalizerFromField(playgroundNormalizerSide.value, field)
}

function openNormalizerForSide(side: LaneSide): void {
  const lane = activeLane.value
  const fields = side === 'left' ? sourceFields : targetFields
  const existingField = side === 'left' ? lane.leftField : lane.rightField
  const selectedField = fields.find((field) => field.id === playgroundNormalizerFieldId.value)
  const field = existingField ?? selectedField ?? fields[0]
  if (!field) return

  playgroundNormalizerSide.value = side
  playgroundNormalizerFieldId.value = field.id
  openNormalizerFromField(side, field)
}

function handleModalEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return

  if (normalizerModal.open) {
    event.preventDefault()
    closeNormalizerModal()
    return
  }

  if (logicModal.open) {
    event.preventDefault()
    closeLogicModal()
  }
}

let bodyOverflowBeforeModal = ''
function updateBodyScrollLock(locked: boolean): void {
  if (typeof document === 'undefined') return

  if (locked) {
    bodyOverflowBeforeModal = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return
  }

  document.body.style.overflow = bodyOverflowBeforeModal
}

watch(
  () => [activeLaneId.value, activeLane.value.leftField?.id, activeLane.value.rightField?.id, associationLanes.value.length],
  () => {
    scheduleWireOverlayRefresh()
  },
  { flush: 'post' },
)

watch(
  () => playgroundNormalizerSide.value,
  () => {
    const first = playgroundNormalizerFields.value[0]
    playgroundNormalizerFieldId.value = first?.id ?? ''
  },
)

watch(
  () => isAnyModalOpen.value,
  (open) => {
    updateBodyScrollLock(open)
  },
)

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    canvasResizeObserver = new ResizeObserver(() => {
      refreshWireOverlay()
    })

    if (canvasEl.value) {
      canvasResizeObserver.observe(canvasEl.value)
    }
    if (ruleNodeEl.value) {
      canvasResizeObserver.observe(ruleNodeEl.value)
    }
  }

  window.addEventListener('keydown', handleModalEscape)
  window.addEventListener('resize', refreshWireOverlay)
  scheduleWireOverlayRefresh()
})

onBeforeUnmount(() => {
  canvasResizeObserver?.disconnect()
  canvasResizeObserver = null
  window.removeEventListener('keydown', handleModalEscape)
  window.removeEventListener('resize', refreshWireOverlay)
  updateBodyScrollLock(false)
})
</script>

<style scoped>
.association-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.lane-tab {
  min-height: 2.15rem;
  padding: 0.35rem 0.72rem;
  background: var(--surface-2);
}

.lane-tab.active {
  border-color: color-mix(in oklab, var(--accent) 45%, var(--border));
  background: color-mix(in oklab, var(--surface-2) 82%, var(--accent));
}

.sketch-divider {
  border-top: 1px solid var(--border);
  margin-top: calc(-1 * var(--space-1));
}

.test-case-canvas {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.8fr) minmax(0, 1fr);
  gap: var(--space-3);
  align-items: start;
}

.association-wire-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: visible;
}

.association-wire-path {
  fill: none;
  stroke: color-mix(in oklab, var(--accent) 76%, var(--text-dim));
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.25));
}

.association-wire-dot {
  fill: color-mix(in oklab, var(--accent) 82%, var(--text));
  stroke: var(--surface);
  stroke-width: 1.5;
}

.association-wire-arrow {
  fill: color-mix(in oklab, var(--accent) 76%, var(--text-dim));
}

.json-panel {
  position: relative;
  z-index: 1;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-3);
}

.json-head {
  display: grid;
  gap: var(--space-1);
}

.json-head h3 {
  margin: 0;
}

.field-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--space-2);
}

.json-field-row {
  position: relative;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  transition: border-color 150ms ease, background-color 150ms ease;
}

.json-field-row.is-selected {
  border-color: color-mix(in oklab, var(--accent) 42%, var(--border));
  background: color-mix(in oklab, var(--surface) 84%, var(--accent));
}

.json-field-row.is-drop-target {
  border-color: color-mix(in oklab, var(--accent) 66%, var(--border));
  background: color-mix(in oklab, var(--surface) 72%, var(--accent));
}

.json-field-btn {
  flex: 1;
  min-height: 2.35rem;
  border: none;
  background: transparent;
  text-align: left;
  padding: 0.3rem 0.6rem;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
}

.json-field-btn:hover {
  border-color: transparent;
  background: transparent;
}

.field-arrow {
  color: var(--text-dim);
}

.normalizer-hover-btn {
  min-height: 2rem;
  margin-right: 0.35rem;
  padding: 0.24rem 0.55rem;
  font-size: 0.75rem;
  opacity: 0;
  pointer-events: none;
}

.json-field-row:hover .normalizer-hover-btn,
.json-field-row:focus-within .normalizer-hover-btn {
  opacity: 1;
  pointer-events: auto;
}

.rule-panel {
  position: relative;
  z-index: 1;
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  padding: var(--space-3);
  display: grid;
  gap: var(--space-2);
}

.rule-node {
  width: 100%;
  min-height: 7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  display: grid;
  gap: var(--space-1);
  align-content: center;
  justify-items: center;
  text-align: center;
}

.rule-node.is-drop-target {
  border-color: color-mix(in oklab, var(--accent) 68%, var(--border));
  background: color-mix(in oklab, var(--surface-2) 72%, var(--accent));
}

.rule-label {
  font-size: 1.02rem;
  font-weight: 700;
}

.rule-actions {
  justify-content: center;
}

.wire-summary {
  text-align: center;
  border-top: 1px solid var(--border-soft);
  padding-top: var(--space-2);
}

.hover-copy {
  text-align: center;
}

.lane-summary-card {
  border-style: dashed;
}

.metric-card {
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  background: var(--surface-2);
  display: grid;
  gap: var(--space-1);
}

.metric-value {
  margin: 0;
  font-size: 1.52rem;
  font-weight: 700;
}

.mockup-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  display: grid;
  place-items: center;
  padding: var(--space-4);
  z-index: 65;
}

.mockup-modal {
  width: min(720px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  padding: var(--space-4);
  display: grid;
  gap: var(--space-3);
}

.modal-header h3 {
  margin: 0;
}

.normalizer-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--space-2);
}

.normalizer-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-2);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  background: var(--surface-2);
}

.normalizer-name {
  margin: 0;
  font-size: 0.9rem;
}

@media (max-width: 980px) {
  .test-case-canvas {
    grid-template-columns: 1fr;
  }

  .rule-panel {
    order: 2;
  }
}
</style>
