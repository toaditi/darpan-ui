<template>
  <StaticPageFrame>
    <template #hero>
      <p class="eyebrow">schema_studio // static_surface</p>
      <h1>{{ currentTabConfig.label }}</h1>
      <p class="muted-copy">{{ currentTabConfig.heroDescription }}</p>
    </template>

    <StaticPageSection
      title="Modules"
      description="Move between the schema library, inference flow, and direct editor without leaving the shared static workspace."
    >
      <nav class="static-page-tile-grid static-page-module-grid" aria-label="Schema navigation">
        <RouterLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          :class="['static-page-tile static-page-module-tile', { 'static-page-module-tile--active': currentTab === tab.key }]"
          :aria-current="currentTab === tab.key ? 'page' : undefined"
        >
          <span class="static-page-tile-title">{{ tab.label }}</span>
          <span class="static-page-module-copy">{{ tab.tileDescription }}</span>
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

interface SchemaTab {
  key: string
  to: string
  label: string
  heroDescription: string
  tileDescription: string
}

const route = useRoute()
const tabs: SchemaTab[] = [
  {
    key: 'library',
    to: '/schemas/library',
    label: 'Schema Library',
    heroDescription: 'Upload, browse, and validate saved schemas on the shared static surface.',
    tileDescription: 'Browse saved schemas, upload new ones, and validate payloads.',
  },
  {
    key: 'infer',
    to: '/schemas/create',
    label: 'Create Schema',
    heroDescription: 'Infer a schema from sample JSON, review the flattened fields, and persist it into the library.',
    tileDescription: 'Generate schemas from sample JSON and review inferred fields.',
  },
  {
    key: 'editor',
    to: '/schemas/editor',
    label: 'Schema Editor',
    heroDescription: 'Edit raw schema text or refined field rows without leaving the shared static Schema Studio shell.',
    tileDescription: 'Direct editing for raw schema text and flattened field rows.',
  },
]
const fallbackTab = tabs[0] as SchemaTab

const currentTab = computed(() => {
  const routeName = String(route.name ?? '')
  if (routeName === 'schemas-library') return 'library'
  if (routeName === 'schemas-create' || String(route.path ?? '').startsWith('/schemas/create')) return 'infer'
  if (routeName === 'schemas-editor' || String(route.path ?? '').startsWith('/schemas/editor')) return 'editor'
  return null
})

const currentTabConfig = computed<SchemaTab>(() => tabs.find((tab) => tab.key === currentTab.value) ?? fallbackTab)
</script>
