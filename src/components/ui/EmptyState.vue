<template>
  <div class="empty-state">
    <h3>{{ title }}</h3>
    <p v-if="description">
      {{ description }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>
