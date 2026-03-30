<template>
  <Teleport to="body">
    <div v-if="open" class="command-overlay" @click.self="close">
      <section class="command-panel" role="dialog" aria-modal="true" aria-label="Command launcher">
        <header class="command-head">
          <label class="sr-only" for="command-palette-search">Search commands</label>
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
            placeholder="Search modules, settings, or actions…"
            @keydown.enter.prevent="executeFirst"
          />
          <button type="button" class="ghost-btn" @click="close">Close</button>
        </header>

        <p id="command-palette-hint" class="mono-copy">Use Cmd/Ctrl+K to reopen. Press Enter to run the top match.</p>

        <div v-if="grouped.length === 0" class="empty-state compact">
          <h3>No matching commands</h3>
          <p>Try keywords like schema, endpoint, sftp, roadmap, or hub.</p>
        </div>

        <div v-for="group in grouped" :key="group.name" class="command-group">
          <p class="command-group-label">{{ group.name }}</p>
          <div class="stack-sm">
            <button
              v-for="action in group.actions"
              :key="action.id"
              type="button"
              class="command-item"
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
import { computed, nextTick, ref, watch } from 'vue'
import type { CommandAction } from '../../lib/types/ux'

const props = defineProps<{
  open: boolean
  actions: CommandAction[]
}>()

const emit = defineEmits<{
  close: []
  execute: [action: CommandAction]
}>()

const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)

interface ScoredAction {
  action: CommandAction
  score: number
}

function scoreAction(action: CommandAction, input: string): number {
  const normalizedInput = input.trim().toLowerCase()
  if (!normalizedInput) return 100

  const tokens = normalizedInput.split(/\s+/).filter((token) => token.length > 0)
  const label = action.label.toLowerCase()
  const description = action.description.toLowerCase()
  const aliases = action.aliases.map((item) => item.toLowerCase())

  for (const token of tokens) {
    const tokenMatch =
      label.includes(token) || description.includes(token) || aliases.some((alias) => alias.includes(token))
    if (!tokenMatch) return -1
  }

  let score = 0
  if (label.startsWith(normalizedInput)) score += 90
  if (label.includes(normalizedInput)) score += 70
  if (aliases.some((alias) => alias.startsWith(normalizedInput))) score += 55
  if (description.includes(normalizedInput)) score += 35
  score += Math.max(0, 18 - label.length)

  return score
}

const filtered = computed(() => {
  const scored: ScoredAction[] = []
  for (const action of props.actions) {
    const score = scoreAction(action, query.value)
    if (score >= 0) scored.push({ action, score })
  }

  return scored
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.action)
})

const grouped = computed(() => {
  const groups: Array<{ name: string; actions: CommandAction[] }> = []
  const groupOrder: Record<string, number> = {
    Navigate: 0,
    'Quick Actions': 1,
  }

  for (const action of filtered.value) {
    const existing = groups.find((item) => item.name === action.group)
    if (existing) {
      existing.actions.push(action)
    } else {
      groups.push({ name: action.group, actions: [action] })
    }
  }

  return groups.sort((left, right) => (groupOrder[left.name] ?? 99) - (groupOrder[right.name] ?? 99))
})

function close(): void {
  emit('close')
}

function execute(action: CommandAction): void {
  emit('execute', action)
}

function executeFirst(): void {
  const first = filtered.value[0]
  if (!first) return
  execute(first)
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      query.value = ''
      return
    }

    void nextTick(() => {
      searchInput.value?.focus()
    })
  },
)
</script>
