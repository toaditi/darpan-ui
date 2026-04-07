<template>
  <Teleport to="body">
    <div v-if="open" class="command-overlay" @click.self="close">
      <section class="command-panel" role="dialog" aria-modal="true" aria-label="Command launcher">
        <header class="command-head">
          <label class="sr-only" for="command-palette-search">Search pages and workflows</label>
          <input
            id="command-palette-search"
            ref="searchInput"
            v-model="query"
            type="search"
            name="command-search"
            class="command-input"
            aria-describedby="command-palette-hint"
            autocomplete="off"
            spellcheck="false"
            placeholder="Search pages, workflows, settings, or common terms…"
            @keydown.down.prevent="moveActive(1)"
            @keydown.enter.prevent="executeActive"
            @keydown.up.prevent="moveActive(-1)"
          />
          <button type="button" class="ghost-btn" @click="close">Close</button>
        </header>

        <p id="command-palette-hint" class="mono-copy">Use Cmd/Ctrl+K to reopen. Press Enter to open the top match.</p>

        <div v-if="grouped.length === 0" class="empty-state compact">
          <h3>No matching results</h3>
          <p>Try words like compare files, API key, schema upload, or SFTP.</p>
        </div>

        <div v-for="group in grouped" :key="group.name" class="command-group">
          <p v-if="showGroupLabels" class="command-group-label">{{ group.name }}</p>
          <div class="stack-sm">
            <button
              v-for="action in group.actions"
              :key="action.id"
              :ref="setActionRef"
              type="button"
              :class="['command-item', { 'command-item--active': action.id === activeActionId }]"
              @focus="setActiveIndexById(action.id)"
              @mouseenter="setActiveIndexById(action.id)"
              @click="execute(action)"
            >
              <span>{{ action.label }}</span>
              <span class="muted-copy">{{ action.description }}</span>
            </button>
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

const filtered = computed(() => {
  return rankCommandActions(props.actions, query.value, props.recentCommandIds ?? [])
})

const activeActionId = computed(() => filtered.value[activeIndex.value]?.id ?? null)

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

function execute(action: CommandAction): void {
  emit('execute', action)
}

function resetActiveIndex(): void {
  activeIndex.value = filtered.value.length > 0 ? 0 : -1
}

function moveActive(delta: number): void {
  const resultCount = filtered.value.length
  if (resultCount === 0) return

  const currentIndex = activeIndex.value >= 0 ? activeIndex.value : 0
  activeIndex.value = (currentIndex + delta + resultCount) % resultCount
}

function setActiveIndexById(actionId: string): void {
  const nextIndex = filtered.value.findIndex((action) => action.id === actionId)
  if (nextIndex >= 0) {
    activeIndex.value = nextIndex
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
      return
    }

    resetActiveIndex()
    void nextTick(() => {
      searchInput.value?.focus()
    })
  },
)
</script>
