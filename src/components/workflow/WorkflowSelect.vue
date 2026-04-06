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
    >
      <span class="workflow-select-trigger-label">{{ selectedLabel || placeholder }}</span>
      <span class="workflow-select-trigger-icon" aria-hidden="true">▾</span>
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
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, type ComponentPublicInstance } from 'vue'

export interface WorkflowSelectOption {
  value: string
  label: string
}

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

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const optionRefs = ref<HTMLButtonElement[]>([])
const isOpen = ref(false)
const listboxId = `workflow-select-${Math.random().toString(36).slice(2, 10)}`

const isEmpty = computed(() => props.modelValue.length === 0)
const selectedLabel = computed(() => props.options.find((option) => option.value === props.modelValue)?.label ?? '')

onBeforeUpdate(() => {
  optionRefs.value = []
})

function setOptionRef(element: Element | ComponentPublicInstance | null): void {
  if (element instanceof HTMLButtonElement) {
    optionRefs.value.push(element)
  }
}

function closeMenu(): void {
  isOpen.value = false
}

function toggleMenu(): void {
  if (props.disabled || props.options.length === 0) return
  isOpen.value = !isOpen.value
}

function focusOption(index: number): void {
  optionRefs.value[index]?.focus()
}

function focusRelative(currentIndex: number, delta: number): void {
  const optionCount = props.options.length
  if (optionCount === 0) return
  const nextIndex = (currentIndex + delta + optionCount) % optionCount
  focusOption(nextIndex)
}

async function openMenuAndFocus(target: 'selected' | 'last'): Promise<void> {
  if (props.disabled || props.options.length === 0) return
  isOpen.value = true
  await nextTick()

  if (target === 'last') {
    focusOption(props.options.length - 1)
    return
  }

  const selectedIndex = props.options.findIndex((option) => option.value === props.modelValue)
  focusOption(selectedIndex >= 0 ? selectedIndex : 0)
}

async function selectOption(value: string): Promise<void> {
  emit('update:modelValue', value)
  closeMenu()
  await nextTick()
  trigger.value?.focus()
}

async function selectOptionAndSubmit(value: string): Promise<void> {
  emit('update:modelValue', value)
  closeMenu()
  await nextTick()

  if (await submitClosestForm()) return

  trigger.value?.focus()
}

async function handleTriggerEnter(): Promise<void> {
  if (props.disabled || props.options.length === 0) return

  const hasSelection = props.options.some((option) => option.value === props.modelValue)
  if (!hasSelection) {
    await openMenuAndFocus('selected')
    return
  }

  if (isOpen.value) {
    await selectOptionAndSubmit(props.modelValue)
    return
  }

  if (await submitClosestForm()) return

  trigger.value?.focus()
}

async function submitClosestForm(): Promise<boolean> {
  const form = root.value?.closest('form')
  if (form instanceof HTMLFormElement) {
    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit()
      return true
    }
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    return true
  }
  return false
}

function handleDocumentPointerDown(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Node)) return
  if (root.value?.contains(target)) return
  closeMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown)
})
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
  color: color-mix(in oklab, var(--text) 58%, transparent);
  font-size: 0.9rem;
  line-height: 1;
  transition: transform 140ms ease;
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
