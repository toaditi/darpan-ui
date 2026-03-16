<template>
  <p class="inline-validation" :class="tone">
    {{ message }}
  </p>
</template>

<script setup lang="ts">
defineProps<{
  message: string
  tone?: 'error' | 'info'
}>()
</script>
