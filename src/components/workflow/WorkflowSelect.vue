<template>
  <div
    ref="root"
    :class="['workflow-select', { 'workflow-select--open': isOpen }]"
    :data-enter-submit="isOpen ? 'off' : undefined"
  >
    <button
      ref="trigger"
      type="button"
      :class="[
        'wizard-answer-control',
        'workflow-select-trigger',
        { empty: isEmpty, 'workflow-select-trigger--open': isOpen, 'workflow-select-trigger--disabled': disabled },
      ]"
      :disabled="disabled"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="listbox"
      :aria-controls="listboxId"
      :data-testid="testId || undefined"
      @mousedown.stop
      @click.stop="toggleMenu"
      @keydown.enter.prevent="handleTriggerEnter"
      @keydown.space.prevent="toggleMenu"
      @keydown.down.prevent="openMenuAndFocus('selected')"
      @keydown.up.prevent="openMenuAndFocus('last')"
      @keydown.escape.prevent="closeMenu"
    >
      <span class="workflow-select-trigger-label">{{ selectedLabel || placeholder }}</span>
      <span class="workflow-select-trigger-icon" aria-hidden="true">
        <svg viewBox="0 0 12 8" focusable="false">
          <polyline points="1 1 6 7 11 1" />
        </svg>
      </span>
    </button>

    <div
      v-if="isOpen"
      :id="listboxId"
      class="workflow-select-menu"
      role="listbox"
      @mousedown.stop
    >
      <button
        v-for="(option, index) in options"
        :key="option.value"
        :ref="setOptionRef"
        type="button"
        class="workflow-select-option"
        :class="{ 'workflow-select-option--selected': option.value === modelValue }"
        role="option"
        :aria-selected="option.value === modelValue ? 'true' : 'false'"
        data-testid="workflow-select-option"
        :data-option-value="option.value"
        @click="selectOption(option.value)"
        @keydown.down.prevent="focusRelative(index, 1)"
        @keydown.up.prevent="focusRelative(index, -1)"
        @keydown.home.prevent="focusOption(0)"
        @keydown.end.prevent="focusOption(options.length - 1)"
        @keydown.enter.prevent="selectOptionAndSubmit(option.value)"
        @keydown.escape.prevent="closeAndFocusTrigger"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useInlineSelect, type InlineSelectOption } from '../../lib/useInlineSelect'

export type WorkflowSelectOption = InlineSelectOption

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: WorkflowSelectOption[]
    placeholder: string
    disabled?: boolean
    testId?: string
  }>(),
  {
    disabled: false,
    testId: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const {
  root,
  trigger,
  isOpen,
  listboxId,
  selectedLabel,
  isEmpty,
  hasSelection,
  setOptionRef,
  closeMenu,
  toggleMenu,
  focusOption,
  focusRelative,
  openMenuAndFocus,
  selectOption,
  selectOptionAndSubmit,
  submitClosestForm,
  closeAndFocusTrigger,
} = useInlineSelect({
  idPrefix: 'workflow-select',
  options: () => props.options,
  modelValue: () => props.modelValue,
  disabled: () => props.disabled,
  emitValue: (value) => emit('update:modelValue', value),
})

async function handleTriggerEnter(): Promise<void> {
  if (props.disabled || props.options.length === 0) return

  if (!hasSelection.value) {
    await openMenuAndFocus('selected')
    return
  }

  if (isOpen.value) {
    await selectOptionAndSubmit(props.modelValue)
    return
  }

  if (submitClosestForm()) return

  trigger.value?.focus()
}
</script>

<style scoped>
.workflow-select {
  position: relative;
  width: 100%;
}

.workflow-select--open {
  z-index: 60;
}

.workflow-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.workflow-select-trigger--disabled {
  cursor: default;
  opacity: 0.55;
}

.workflow-select-trigger:focus-visible {
  outline: none;
  border-bottom-color: var(--text);
}

.workflow-select-trigger-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workflow-select-trigger-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in oklab, var(--text) 58%, transparent);
  transition: transform 140ms ease;
}

.workflow-select-trigger-icon svg {
  width: 0.7rem;
  height: 0.46rem;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.workflow-select-trigger--open .workflow-select-trigger-icon {
  transform: rotate(180deg);
}

.workflow-select-menu {
  position: absolute;
  top: calc(100% + 0.55rem);
  left: 0;
  right: 0;
  z-index: 70;
  display: grid;
  gap: 0.2rem;
  padding: 0.35rem;
  border: 1px solid color-mix(in oklab, var(--text) 12%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in oklab, var(--surface-2) 94%, var(--surface));
  box-shadow: 0 18px 48px color-mix(in oklab, var(--bg) 56%, transparent);
  max-height: min(18rem, 48vh);
  overflow: auto;
}

.workflow-select-option {
  border: 0;
  border-radius: calc(var(--radius-sm) - 0.02rem);
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  line-height: 1.15;
}

.workflow-select-option:hover {
  background: color-mix(in oklab, var(--text) 8%, var(--surface-2));
}

.workflow-select-option--selected {
  background: color-mix(in oklab, var(--text) 12%, var(--surface-2));
}

.workflow-select-option:focus-visible {
  outline: none;
  background: color-mix(in oklab, var(--text) 10%, var(--surface-2));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--text) 18%, transparent);
}
</style>
