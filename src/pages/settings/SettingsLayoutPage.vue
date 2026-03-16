<template>
  <section class="page-root">
    <section class="module-intro">
      <p class="eyebrow">connections // configuration_center</p>
      <h1>Connections</h1>
      <p class="muted-copy">Select a module, configure fields, validate, and save profile settings.</p>
    </section>

    <nav class="module-nav" aria-label="Connections navigation">
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
  { to: '/connections/llm', label: 'LLM' },
  { to: '/connections/sftp', label: 'SFTP' },
  { to: '/connections/netsuite/auth', label: 'NetSuite Auth' },
  { to: '/connections/netsuite/endpoints', label: 'NetSuite Endpoints' },
  { to: '/connections/read-db', label: 'Read DB' },
]
</script>
