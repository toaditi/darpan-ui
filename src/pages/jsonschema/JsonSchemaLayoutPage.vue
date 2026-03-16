<template>
  <section class="page-root">
    <section class="module-intro">
      <p class="eyebrow">schema_studio // step_flow</p>
      <h1>Schema Studio</h1>
      <p class="muted-copy">Library, infer, and editor surfaces for JSON schema execution flow.</p>
    </section>

    <nav class="module-nav" aria-label="Schema navigation">
      <RouterLink v-for="tab in tabs" :key="tab.to" :to="tab.to" class="module-link">
        {{ tab.label }}
      </RouterLink>
    </nav>

    <RouterView />
  </section>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const tabs = [
  { to: '/schemas/library', label: 'Library' },
  { to: '/schemas/infer', label: 'Infer' },
  { to: '/schemas/editor', label: 'Editor' },
]
</script>
