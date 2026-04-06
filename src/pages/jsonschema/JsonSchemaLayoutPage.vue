<template>
  <section class="page-root">
    <section class="module-intro">
      <p class="eyebrow">schema_studio // step_flow</p>
      <h1>Schema Studio</h1>
      <p class="muted-copy">Library, infer, and editor surfaces for JSON schema execution flow.</p>
    </section>

    <nav class="module-nav" aria-label="Schema navigation">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        :class="['module-link', { 'router-link-active': currentTab === tab.key, 'router-link-exact-active': currentTab === tab.key }]"
        :aria-current="currentTab === tab.key ? 'page' : undefined"
      >
        {{ tab.label }}
      </RouterLink>
    </nav>

    <RouterView />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const tabs = [
  { key: 'library', to: '/schemas/library', label: 'Library' },
  { key: 'infer', to: '/schemas/infer', label: 'Infer' },
  { key: 'editor', to: '/schemas/editor', label: 'Editor' },
]

const currentTab = computed(() => {
  const routeName = String(route.name ?? '')
  if (routeName === 'schemas-library') return 'library'
  if (routeName === 'schemas-infer') return 'infer'
  if (routeName === 'schemas-editor' || String(route.path ?? '').startsWith('/schemas/editor')) return 'editor'
  return null
})
</script>
