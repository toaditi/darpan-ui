<template>
  <StaticPageFrame>
    <template #hero>
      <p class="eyebrow">connections // configuration_center</p>
      <h1>Connections</h1>
      <p class="muted-copy">Select a module, manage saved connections, and reopen any saved record by name.</p>

      <nav class="module-nav" aria-label="Connections navigation">
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
    </template>

    <RouterView />
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'

const route = useRoute()
const tabs = [
  { key: 'llm', to: '/connections/llm', label: 'LLM' },
  { key: 'sftp', to: '/connections/sftp', label: 'SFTP' },
  { key: 'netsuite-auth', to: '/connections/netsuite/auth', label: 'NetSuite Auth' },
  { key: 'netsuite-endpoints', to: '/connections/netsuite/endpoints', label: 'NetSuite Endpoints' },
]

const currentTab = computed(() => {
  const routeName = String(route.name ?? '')
  const routePath = String(route.path ?? '')

  if (routeName === 'connections-llm' || routePath.startsWith('/connections/llm')) return 'llm'
  if (routeName === 'connections-sftp' || routePath.startsWith('/connections/sftp')) return 'sftp'
  if (routeName === 'connections-netsuite-auth' || routePath.startsWith('/connections/netsuite/auth')) return 'netsuite-auth'
  if (routeName === 'connections-netsuite-endpoints' || routePath.startsWith('/connections/netsuite/endpoints')) {
    return 'netsuite-endpoints'
  }
  return null
})
</script>
