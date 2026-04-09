<template>
  <button
    :type="type"
    class="app-icon-action app-icon-action--large"
    :data-testid="testId || undefined"
    :aria-label="label"
    :disabled="disabled"
    @click="emit('click')"
  >
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <line x1="5" y1="5" x2="15" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <line x1="15" y1="5" x2="5" y2="15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    type?: 'button' | 'submit'
    disabled?: boolean
    testId?: string
  }>(),
  {
    label: 'Cancel',
    type: 'button',
    disabled: false,
    testId: '',
  },
)

const emit = defineEmits<{
  click: []
}>()
</script>
