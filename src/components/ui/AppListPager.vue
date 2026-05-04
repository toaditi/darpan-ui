<template>
  <nav
    v-if="normalizedPageCount > 1"
    class="static-page-pager app-list-pager"
    :aria-label="ariaLabel"
  >
    <button
      type="button"
      :data-testid="previousTestId"
      :disabled="normalizedPageIndex <= 0"
      @click="emitPage(normalizedPageIndex - 1)"
    >
      Previous
    </button>
    <span>Page {{ normalizedPageIndex + 1 }} of {{ normalizedPageCount }}</span>
    <button
      type="button"
      :data-testid="nextTestId"
      :disabled="normalizedPageIndex >= normalizedPageCount - 1"
      @click="emitPage(normalizedPageIndex + 1)"
    >
      Next
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { clampListPageIndex } from '../../lib/listPagination'

const props = withDefaults(defineProps<{
  pageIndex: number
  pageCount: number
  ariaLabel?: string
  previousTestId?: string
  nextTestId?: string
}>(), {
  ariaLabel: 'List pages',
  previousTestId: 'list-page-previous',
  nextTestId: 'list-page-next',
})

const emit = defineEmits<{
  'update:pageIndex': [pageIndex: number]
}>()

const normalizedPageCount = computed(() => Math.max(1, Math.floor(props.pageCount)))
const normalizedPageIndex = computed(() => clampListPageIndex(props.pageIndex, normalizedPageCount.value))

function emitPage(nextPageIndex: number): void {
  emit('update:pageIndex', clampListPageIndex(nextPageIndex, normalizedPageCount.value))
}
</script>
