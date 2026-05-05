<template>
  <div
    class="json-collapse-viewer"
    data-testid="json-collapse-viewer"
    role="tree"
    aria-label="JSON diff detail"
  >
    <JsonCollapseNode
      :value="normalizedValue"
      :depth="0"
      :is-last="true"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import JsonCollapseNode from './JsonCollapseNode.vue'

const props = defineProps<{
  value: unknown
}>()

const normalizedValue = computed(() => parseRootJsonValue(props.value))

function parseRootJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') return value

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
</script>

<style scoped>
.json-collapse-viewer {
  max-width: 100%;
  overflow-x: auto;
  color: var(--text);
  font-size: 0.82rem;
  line-height: 1.55;
}
</style>
