<template>
  <form class="wizard-question-shell" @submit.prevent="emit('submit')" @keydown.enter="handleEnter">
    <slot name="context"></slot>

    <div class="wizard-prompt-row">
      <p class="wizard-question">
        <slot name="question">{{ question }}</slot>
      </p>
    </div>

    <slot></slot>

    <div class="wizard-actions">
      <button v-if="showBack" type="button" class="wizard-back" @click="emit('back')">Back</button>

      <button
        type="button"
        class="wizard-next"
        :disabled="submitDisabled"
        :data-testid="primaryTestId || undefined"
        @click="emit('submit')"
      >
        {{ primaryLabel }}
      </button>

      <span v-if="showEnterHint" class="wizard-enter-hint">press <strong>Enter</strong> ↵</span>
      <slot name="actions-after"></slot>
    </div>
  </form>
</template>

<script setup lang="ts">
import { requestSubmitOnEnter } from '../../lib/keyboard'

const props = withDefaults(
  defineProps<{
    question: string
    primaryLabel?: string
    submitDisabled?: boolean
    showBack?: boolean
    showEnterHint?: boolean
    allowSelectEnter?: boolean
    allowFileEnter?: boolean
    primaryTestId?: string
  }>(),
  {
    primaryLabel: 'OK',
    submitDisabled: false,
    showBack: false,
    showEnterHint: true,
    allowSelectEnter: false,
    allowFileEnter: false,
    primaryTestId: '',
  },
)

const emit = defineEmits<{
  submit: []
  back: []
}>()

function handleEnter(event: KeyboardEvent): void {
  requestSubmitOnEnter(event, {
    allowSelect: props.allowSelectEnter,
    allowFile: props.allowFileEnter,
    disabled: props.submitDisabled,
  })
}
</script>

<style scoped>
.wizard-question-shell {
  width: min(var(--workflow-question-width), 100%);
  display: grid;
  gap: 1rem;
  justify-items: start;
  align-content: start;
  min-height: 0;
  padding-top: 0;
  margin-inline: auto;
}

.wizard-question-shell :deep(.inline-validation) {
  margin: 0;
}

.wizard-prompt-row {
  display: flex;
  align-items: flex-start;
  width: 100%;
}

.wizard-question {
  margin: 0;
  font-size: var(--workflow-question-size);
  line-height: 1.22;
  letter-spacing: -0.015em;
  white-space: normal;
  font-weight: 400;
}

.wizard-question :deep(strong) {
  font-weight: 600;
}

.wizard-question-shell :deep(.wizard-input-shell),
.wizard-question-shell :deep(.workflow-context-block) {
  width: 100%;
  margin-top: 0.35rem;
  display: grid;
  gap: 0.45rem;
}

.wizard-question-shell :deep(.workflow-context-label) {
  margin: 0;
  color: color-mix(in oklab, var(--text) 55%, transparent);
  font-size: 0.78rem;
}

.wizard-question-shell :deep(.wizard-answer-control) {
  width: 100%;
  min-height: auto;
  padding: 0.15rem 0 0.55rem;
  border: 0;
  border-bottom: 1px solid var(--workflow-underline);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: var(--text);
  font-size: var(--workflow-answer-size);
  line-height: 1.2;
  letter-spacing: -0.015em;
  text-align: left;
  appearance: none;
  font-weight: 400;
}

.wizard-question-shell :deep(select.wizard-answer-control) {
  padding-bottom: 0.35rem;
  font-size: var(--workflow-select-size);
  line-height: 1.15;
  letter-spacing: -0.01em;
  color-scheme: light dark;
}

.wizard-question-shell :deep(.wizard-answer-control::placeholder) {
  color: color-mix(in oklab, var(--text) 20%, transparent);
}

.wizard-question-shell :deep(.wizard-answer-control.empty:not(select)) {
  color: color-mix(in oklab, var(--text) 24%, transparent);
}

.wizard-question-shell :deep(select.wizard-answer-control option) {
  color: FieldText;
  background: Field;
}

.wizard-question-shell :deep(select.wizard-answer-control option:checked) {
  color: HighlightText;
  background: Highlight;
}

.wizard-question-shell :deep(.wizard-answer-control:focus-visible) {
  outline: none;
  border-bottom-color: var(--text);
}

.wizard-question-shell :deep(.wizard-or) {
  margin: 0;
  color: color-mix(in oklab, var(--text) 55%, transparent);
  font-size: 0.85rem;
}

.wizard-question-shell :deep(.wizard-secondary-link) {
  color: var(--text);
  text-decoration: none;
  font-size: 1rem;
  letter-spacing: -0.02em;
}

.wizard-question-shell :deep(.wizard-file-shell) {
  position: relative;
  cursor: pointer;
}

.wizard-question-shell :deep(.wizard-file-input) {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.wizard-question-shell :deep(.wizard-file-answer) {
  display: block;
  cursor: pointer;
}

.wizard-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.wizard-back {
  background: transparent;
  border-style: solid;
}

.wizard-next {
  min-width: var(--workflow-action-min-width);
  min-height: var(--workflow-action-min-height);
  padding-inline: 0.9rem;
  background: var(--workflow-action-bg);
  color: var(--text);
  border-color: var(--workflow-action-border);
  font-size: 0.95rem;
  font-weight: 500;
  box-shadow: none;
}

.wizard-next:hover {
  background: color-mix(in oklab, var(--surface-2) 86%, var(--surface));
  border-color: color-mix(in oklab, var(--text) 14%, transparent);
}

.wizard-enter-hint {
  color: color-mix(in oklab, var(--text) 50%, transparent);
  font-size: 0.76rem;
}

.wizard-enter-hint strong {
  color: var(--text);
  font-weight: 600;
}

@media (max-width: 768px) {
  .wizard-question-shell {
    width: 100%;
    padding-top: 0;
  }

  .wizard-prompt-row {
    width: 100%;
  }

  .wizard-question {
    font-size: clamp(1.35rem, 6vw, 1.75rem);
    white-space: normal;
  }
}
</style>
