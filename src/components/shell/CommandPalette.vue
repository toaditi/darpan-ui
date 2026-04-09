<template>
  <Teleport to="body">
    <div v-if="open" class="command-overlay" @click.self="close">
      <section
        :class="['command-panel', { 'command-panel--keyboard': interactionMode === 'keyboard' }]"
        role="dialog"
        aria-modal="true"
        aria-label="Command launcher"
        @keydown="handlePanelKeydown"
      >
        <header class="command-head">
          <label class="sr-only" for="command-palette-search">Search pages and workflows</label>
          <input
            id="command-palette-search"
            ref="searchInput"
            v-model="query"
            type="text"
            name="command-search"
            class="command-input"
            role="combobox"
            aria-autocomplete="list"
            :aria-activedescendant="activeActionDomId"
            :aria-controls="resultsListId"
            aria-describedby="command-palette-hint"
            :aria-expanded="open ? 'true' : 'false'"
            inputmode="search"
            autocomplete="off"
            spellcheck="false"
            placeholder="Search pages, workflows, settings, or common terms…"
          />
          <button type="button" class="ghost-btn" @click="close">Close</button>
        </header>

        <p id="command-palette-hint" class="mono-copy">
          Use Up/Down to select a result. Press Enter to open the selected match.
        </p>

        <div v-if="grouped.length === 0" class="empty-state compact">
          <h3>No matching results</h3>
          <p>Try words like compare files, API key, schema upload, or SFTP.</p>
        </div>

        <div v-else :id="resultsListId" class="command-results">
          <div v-for="group in grouped" :key="group.name" class="command-group">
            <p v-if="showGroupLabels" class="command-group-label">{{ group.name }}</p>
            <div class="stack-sm">
              <button
                v-for="action in group.actions"
                :id="getActionDomId(action.id)"
                :key="action.id"
                :ref="setActionRef"
                type="button"
                :aria-current="action.id === activeActionId ? 'true' : undefined"
                :class="['command-item', { 'command-item--active': action.id === activeActionId }]"
                @focus="handleActionFocus(action.id)"
                @mouseenter="handleActionMouseenter(action.id)"
                @click="execute(action)"
              >
                <span>{{ action.label }}</span>
                <span class="muted-copy">{{ action.description }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUpdate, ref, watch, type ComponentPublicInstance } from 'vue'
import { rankCommandActions } from '../../lib/commandSearch'
import type { CommandAction } from '../../lib/types/ux'

const props = defineProps<{
  open: boolean
  actions: CommandAction[]
  recentCommandIds?: string[]
}>()

const emit = defineEmits<{
  close: []
  execute: [action: CommandAction]
}>()

const query = ref('')
const activeIndex = ref(-1)
const actionRefs = ref<HTMLButtonElement[]>([])
const searchInput = ref<HTMLInputElement | null>(null)
const interactionMode = ref<'keyboard' | 'pointer'>('keyboard')
const resultsListId = 'command-palette-results'

const filtered = computed(() => {
  return rankCommandActions(props.actions, query.value, props.recentCommandIds ?? [])
})

const activeActionId = computed(() => filtered.value[activeIndex.value]?.id ?? null)
const activeActionDomId = computed(() => (activeActionId.value ? getActionDomId(activeActionId.value) : undefined))

const grouped = computed(() => {
  const groups: Array<{ name: string; actions: CommandAction[] }> = []

  for (const action of filtered.value) {
    const existing = groups.find((item) => item.name === action.group)
    if (existing) {
      existing.actions.push(action)
    } else {
      groups.push({ name: action.group, actions: [action] })
    }
  }

  return groups
})

const showGroupLabels = computed(() => grouped.value.length > 1)

onBeforeUpdate(() => {
  actionRefs.value = []
})

function setActionRef(element: Element | ComponentPublicInstance | null): void {
  if (element instanceof HTMLButtonElement) {
    actionRefs.value.push(element)
  }
}

function close(): void {
  emit('close')
}

function getActionDomId(actionId: string): string {
  return `command-palette-option-${actionId}`
}

function execute(action: CommandAction): void {
  emit('execute', action)
}

function resetActiveIndex(): void {
  activeIndex.value = filtered.value.length > 0 ? 0 : -1
}

function moveActive(delta: number): void {
  const resultCount = filtered.value.length
  if (resultCount === 0) return

  interactionMode.value = 'keyboard'
  const currentIndex = activeIndex.value >= 0 ? activeIndex.value : 0
  activeIndex.value = (currentIndex + delta + resultCount) % resultCount
}

function setActiveIndexById(actionId: string): void {
  const nextIndex = filtered.value.findIndex((action) => action.id === actionId)
  if (nextIndex >= 0) {
    activeIndex.value = nextIndex
  }
}

function handleActionFocus(actionId: string): void {
  setActiveIndexById(actionId)
}

function handleActionMouseenter(actionId: string): void {
  interactionMode.value = 'pointer'
  setActiveIndexById(actionId)
}

function focusActiveAction(): void {
  void nextTick(() => {
    actionRefs.value[activeIndex.value]?.focus()
  })
}

function handlePanelKeydown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return

  const target = event.target
  const searchIsFocused = target === searchInput.value
  const actionButtonIsFocused = target instanceof HTMLButtonElement && actionRefs.value.includes(target)

  switch (event.key) {
    case 'ArrowDown':
    case 'Down':
      if (!searchIsFocused && !actionButtonIsFocused) return
      event.preventDefault()
      moveActive(1)
      if (actionButtonIsFocused) focusActiveAction()
      return
    case 'ArrowUp':
    case 'Up':
      if (!searchIsFocused && !actionButtonIsFocused) return
      event.preventDefault()
      moveActive(-1)
      if (actionButtonIsFocused) focusActiveAction()
      return
    case 'Enter':
      if (!searchIsFocused) return
      event.preventDefault()
      executeActive()
      return
    default:
      return
  }
}

function executeActive(): void {
  const activeAction = activeIndex.value >= 0 ? filtered.value[activeIndex.value] : filtered.value[0]
  if (!activeAction) return
  execute(activeAction)
}

watch(
  filtered,
  (actions) => {
    if (actions.length === 0) {
      activeIndex.value = -1
      return
    }

    if (activeIndex.value < 0 || activeIndex.value >= actions.length) {
      activeIndex.value = 0
    }
  },
  { immediate: true },
)

watch(query, () => {
  interactionMode.value = 'keyboard'
  resetActiveIndex()
})

watch(activeIndex, async (nextIndex) => {
  if (nextIndex < 0) return

  await nextTick()
  actionRefs.value[nextIndex]?.scrollIntoView?.({ block: 'nearest' })
})

watch(
  () => props.open,
  (open) => {
    if (!open) {
      query.value = ''
      activeIndex.value = -1
      interactionMode.value = 'keyboard'
      return
    }

    interactionMode.value = 'keyboard'
    resetActiveIndex()
    void nextTick(() => {
      searchInput.value?.focus()
    })
  },
)
</script>
