export interface EnterSubmitOptions {
  allowSelect?: boolean
  allowFile?: boolean
  allowCheckbox?: boolean
  disabled?: boolean
}

export interface WorkflowEscapeOptions {
  workflowActive?: boolean
}

function isSupportedHtmlTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement
}

export function shouldTriggerPrimaryEnterAction(
  event: KeyboardEvent,
  { allowSelect = false, allowFile = false, allowCheckbox = false, disabled = false }: EnterSubmitOptions = {},
): boolean {
  if (disabled || event.defaultPrevented || event.repeat || event.isComposing) return false
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false

  if (!isSupportedHtmlTarget(event.target)) return true

  const target = event.target
  if (target.isContentEditable || target.closest('[data-enter-submit="off"]')) return false
  if (target instanceof HTMLTextAreaElement) return false
  if (target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement) return false
  if (target instanceof HTMLSelectElement) return allowSelect

  if (target instanceof HTMLInputElement) {
    const blockedTypes = new Set(['button', 'checkbox', 'radio', 'reset', 'submit'])
    if (target.type === 'file') return allowFile
    if (target.type === 'checkbox') return allowCheckbox
    return !blockedTypes.has(target.type)
  }

  return true
}

export function requestSubmitOnEnter(event: KeyboardEvent, options: EnterSubmitOptions = {}): void {
  if (!shouldTriggerPrimaryEnterAction(event, options)) return

  const form = event.currentTarget instanceof HTMLFormElement ? event.currentTarget : null
  if (!form) return

  event.preventDefault()
  if (typeof form.requestSubmit === 'function') {
    form.requestSubmit()
    return
  }

  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

export function invokePrimaryActionOnEnter(
  event: KeyboardEvent,
  action: () => void | Promise<void>,
  options: EnterSubmitOptions = {},
): void {
  if (!shouldTriggerPrimaryEnterAction(event, options)) return

  event.preventDefault()
  void action()
}

export function shouldAbortWorkflowOnEscape(
  event: KeyboardEvent,
  { workflowActive = false }: WorkflowEscapeOptions = {},
): boolean {
  if (!workflowActive || event.defaultPrevented || event.repeat || event.isComposing) return false
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false

  return event.key.toLowerCase() === 'escape'
}
