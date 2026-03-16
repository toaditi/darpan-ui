<template>
  <span class="status-badge" :class="tone">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  tone: 'neutral' | 'success' | 'warning' | 'danger'
}>()
</script>
