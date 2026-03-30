<template>
  <p class="inline-validation" :class="tone" role="status" aria-live="polite" aria-atomic="true">
    {{ message }}
  </p>
</template>

<script setup lang="ts">
defineProps<{
  message: string
  tone?: 'error' | 'info'
}>()
</script>
