<template>
  <p v-if="visible" class="inline-validation" :class="tone" role="status" aria-live="polite" aria-atomic="true">
    {{ message }}
  </p>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

const ERROR_DISPLAY_MS = 10_000

const props = defineProps<{
  message: string
  tone?: 'error' | 'info'
}>()

const visible = ref(true)
let hideTimer: ReturnType<typeof setTimeout> | null = null

function clearHideTimer(): void {
  if (!hideTimer) return
  clearTimeout(hideTimer)
  hideTimer = null
}

function resetVisibility(): void {
  visible.value = true
  clearHideTimer()
  if (props.tone !== 'error') return

  hideTimer = setTimeout(() => {
    visible.value = false
    hideTimer = null
  }, ERROR_DISPLAY_MS)
}

watch([() => props.message, () => props.tone], resetVisibility, { immediate: true })
onUnmounted(clearHideTimer)
</script>
