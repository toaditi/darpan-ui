<template>
  <section :class="['form-section', `form-section--${variant}`]">
    <header class="form-section-head">
      <h2 class="form-section-title">{{ title }}</h2>
      <p v-if="description" class="form-section-description">
        {{ description }}
      </p>
    </header>
    <div class="form-section-body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    variant?: 'static' | 'workflow'
  }>(),
  {
    description: undefined,
    variant: 'static',
  },
)
</script>
