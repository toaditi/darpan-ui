<template>
  <StaticPageFrame>
    <template #hero>
      <p class="eyebrow">connections // static_surface</p>
      <h1>{{ currentTabConfig.label }}</h1>
      <p class="muted-copy">{{ currentTabConfig.heroDescription }}</p>
    </template>

    <StaticPageSection
      title="Modules"
      description="Move between the remaining shared connection surfaces while standalone modules migrate to dedicated dashboards and workflows."
    >
      <nav class="static-page-tile-grid settings-module-grid" aria-label="Connections navigation">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          :class="['static-page-tile settings-module-tile', { 'settings-module-tile--active': currentTab === tab.key }]"
          :aria-current="currentTab === tab.key ? 'page' : undefined"
        >
          <span class="static-page-tile-title">{{ tab.label }}</span>
          <span class="settings-module-tile-copy">{{ tab.tileDescription }}</span>
        </RouterLink>
      </nav>
    </StaticPageSection>

    <RouterView />
  </StaticPageFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import StaticPageFrame from '../../components/ui/StaticPageFrame.vue'
import StaticPageSection from '../../components/ui/StaticPageSection.vue'

interface SettingsTab {
  key: string
  to: string
  label: string
  heroDescription: string
  tileDescription: string
}

const route = useRoute()
const tabs: SettingsTab[] = [
  {
    key: 'llm',
    to: '/connections/llm',
    label: 'LLM Settings',
    heroDescription: 'Configure provider credentials, runtime defaults, and key handling for rule workspace generation.',
    tileDescription: 'Provider selection, model defaults, and API key handling.',
  },
]
const fallbackTab = tabs[0] as SettingsTab

const currentTab = computed(() => {
  const routeName = String(route.name ?? '')
  const routePath = String(route.path ?? '')

  if (routeName === 'connections-llm' || routePath.startsWith('/connections/llm')) return 'llm'
  return null
})

const currentTabConfig = computed<SettingsTab>(() => tabs.find((tab) => tab.key === currentTab.value) ?? fallbackTab)
</script>

<style scoped>
.settings-module-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.settings-module-tile {
  width: 100%;
  min-height: 0;
  gap: var(--space-2);
}

.settings-module-tile--active {
  border-color: color-mix(in oklab, var(--static-tile-border) 58%, var(--accent));
  background: color-mix(in oklab, var(--static-tile-bg) 76%, var(--accent));
}

.settings-module-tile-copy {
  color: var(--text-soft);
  text-wrap: balance;
}
</style>
