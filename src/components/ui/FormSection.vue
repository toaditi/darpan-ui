<template>
  <section class="form-section">
    <header class="form-section-head">
      <h2>{{ title }}</h2>
      <p v-if="description">
        {{ description }}
      </p>
    </header>
    <div class="form-section-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>
