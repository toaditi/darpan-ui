<template>
  <section class="static-page-section">
    <header v-if="title || description || $slots.header" class="static-page-section-head">
      <slot name="header">
        <h2 v-if="title" class="static-page-section-heading">{{ title }}</h2>
      </slot>
      <p v-if="description" class="static-page-section-description">{{ description }}</p>
    </header>

    <div class="static-page-section-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>
