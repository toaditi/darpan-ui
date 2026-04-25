<template>
  <div
    ref="root"
    class="app-select"
    :data-enter-submit="isOpen ? 'off' : undefined"
  >
    <button
      ref="trigger"
      type="button"
      :class="[
        'app-select-trigger',
        { empty: isEmpty, 'app-select-trigger--open': isOpen, 'app-select-trigger--disabled': disabled },
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
      <span class="app-select-trigger-label">{{ selectedLabel || placeholder }}</span>
      <span class="app-select-trigger-icon" aria-hidden="true">
        <svg viewBox="0 0 12 8" focusable="false">
          <polyline points="1 1 6 7 11 1" />
        </svg>
      </span>
    </button>

    <div
      v-if="isOpen"
      :id="listboxId"
      class="app-select-menu"
      role="listbox"
      @mousedown.stop
    >
      <button
        v-for="(option, index) in options"
        :key="option.value"
        :ref="setOptionRef"
        type="button"
        class="app-select-option"
        :class="{ 'app-select-option--selected': option.value === modelValue }"
        role="option"
        :aria-selected="option.value === modelValue ? 'true' : 'false'"
        data-testid="app-select-option"
        :data-option-value="option.value"
        @click="selectOption(option.value)"
        @keydown.down.prevent="focusRelative(index, 1)"
        @keydown.up.prevent="focusRelative(index, -1)"
        @keydown.home.prevent="focusOption(0)"
        @keydown.end.prevent="focusOption(options.length - 1)"
        @keydown.enter.prevent="handleOptionEnter(option.value)"
        @keydown.space.prevent="selectOption(option.value)"
        @keydown.escape.prevent="closeAndFocusTrigger"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, type ComponentPublicInstance } from 'vue'
import { DISMISS_INLINE_MENUS_EVENT, INLINE_MENU_OPEN_EVENT } from '../../lib/uiEvents'

export interface AppSelectOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: AppSelectOption[]
    placeholder?: string
    disabled?: boolean
    testId?: string
    submitOnEnter?: boolean
  }>(),
  {
    placeholder: '',
    disabled: false,
    testId: '',
    submitOnEnter: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const optionRefs = ref<HTMLButtonElement[]>([])
const isOpen = ref(false)
const listboxId = `app-select-${Math.random().toString(36).slice(2, 10)}`

const selectedLabel = computed(() => props.options.find((option) => option.value === props.modelValue)?.label ?? '')
const isEmpty = computed(() => props.modelValue.length === 0)

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

function openMenu(): void {
  if (isOpen.value) return
  document.dispatchEvent(new CustomEvent<string>(INLINE_MENU_OPEN_EVENT, { detail: listboxId }))
  isOpen.value = true
}

function toggleMenu(): void {
  if (props.disabled || props.options.length === 0) return
  if (isOpen.value) {
    closeMenu()
    return
  }
  openMenu()
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
  openMenu()
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

  if (submitClosestForm()) return

  trigger.value?.focus()
}

function submitClosestForm(): boolean {
  const form = root.value?.closest('form')
  if (!(form instanceof HTMLFormElement)) return false

  if (typeof form.requestSubmit === 'function') {
    form.requestSubmit()
    return true
  }

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  return true
}

async function handleOptionEnter(value: string): Promise<void> {
  if (props.submitOnEnter) {
    await selectOptionAndSubmit(value)
    return
  }

  await selectOption(value)
}

async function handleTriggerEnter(): Promise<void> {
  if (props.disabled || props.options.length === 0) return

  const hasSelection = props.options.some((option) => option.value === props.modelValue)
  if (props.submitOnEnter && hasSelection) {
    await selectOptionAndSubmit(props.modelValue)
    return
  }

  await openMenuAndFocus('selected')
}

function closeAndFocusTrigger(): void {
  closeMenu()
  trigger.value?.focus()
}

function handleDocumentPointerDown(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Node)) return
  if (root.value?.contains(target)) return
  closeMenu()
}

function handlePeerOpen(event: Event): void {
  const openEvent = event as CustomEvent<string>
  if (openEvent.detail === listboxId) return
  closeMenu()
}

function handleDismissInlineMenus(): void {
  closeMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentPointerDown)
  document.addEventListener(INLINE_MENU_OPEN_EVENT, handlePeerOpen)
  document.addEventListener(DISMISS_INLINE_MENUS_EVENT, handleDismissInlineMenus)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentPointerDown)
  document.removeEventListener(INLINE_MENU_OPEN_EVENT, handlePeerOpen)
  document.removeEventListener(DISMISS_INLINE_MENUS_EVENT, handleDismissInlineMenus)
})
</script>

<style scoped>
.app-select {
  position: relative;
  width: 100%;
}

.app-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  padding: 0.65rem 0.8rem;
  min-height: 2.55rem;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.app-select-trigger.empty {
  color: color-mix(in oklab, var(--text) 40%, transparent);
}

.app-select-trigger--disabled {
  cursor: default;
  opacity: 0.55;
}

.app-select-trigger:focus-visible {
  outline: none;
  border-color: color-mix(in oklab, var(--text) 16%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--text) 14%, transparent);
}

.app-select-trigger-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-select-trigger-icon {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: color-mix(in oklab, var(--text) 58%, transparent);
  transition: transform 140ms ease;
}

.app-select-trigger-icon svg {
  width: 0.7rem;
  height: 0.46rem;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.app-select-trigger--open .app-select-trigger-icon {
  transform: rotate(180deg);
}

.app-select-menu {
  position: absolute;
  top: calc(100% + 0.45rem);
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

.app-select-option {
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

.app-select-option:hover {
  background: color-mix(in oklab, var(--text) 8%, var(--surface-2));
}

.app-select-option--selected {
  background: color-mix(in oklab, var(--text) 12%, var(--surface-2));
}

.app-select-option:focus-visible {
  outline: none;
  background: color-mix(in oklab, var(--text) 10%, var(--surface-2));
  box-shadow: inset 0 0 0 1px color-mix(in oklab, var(--text) 18%, transparent);
}
</style>
