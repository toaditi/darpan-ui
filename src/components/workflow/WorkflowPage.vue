<template>
  <main class="page-root workflow-page">
    <WorkflowProgressBar :progress-percent="progressPercent" :aria-label="ariaLabel" />
    <section :class="['workflow-shell', { 'workflow-shell--center-stage': centerStage }]">
      <slot />
    </section>
  </main>
</template>

<script setup lang="ts">
import WorkflowProgressBar from './WorkflowProgressBar.vue'

withDefaults(
  defineProps<{
    progressPercent: number | string
    ariaLabel?: string
    centerStage?: boolean
  }>(),
  {
    ariaLabel: 'Workflow progress',
    centerStage: false,
  },
)
</script>
