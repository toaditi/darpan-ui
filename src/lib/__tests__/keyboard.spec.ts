import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requestSubmitOnEnter, shouldAbortWorkflowOnEscape, shouldTriggerPrimaryEnterAction } from '../keyboard'

describe('keyboard submit helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('requests form submit on Enter from text inputs', () => {
    const form = document.createElement('form')
    const input = document.createElement('input')
    input.type = 'text'
    form.append(input)
    document.body.append(form)

    const requestSubmit = vi.fn()
    form.requestSubmit = requestSubmit
    form.addEventListener('keydown', (event) => requestSubmitOnEnter(event))

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))

    expect(requestSubmit).toHaveBeenCalledTimes(1)
  })

  it('does not treat ordinary key presses as primary Enter actions', () => {
    const input = document.createElement('input')
    input.type = 'text'
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true })
    Object.defineProperty(event, 'target', { value: input })

    expect(shouldTriggerPrimaryEnterAction(event)).toBe(false)
  })

  it('does not request form submit from textarea Enter events', () => {
    const form = document.createElement('form')
    const textarea = document.createElement('textarea')
    form.append(textarea)
    document.body.append(form)

    const requestSubmit = vi.fn()
    form.requestSubmit = requestSubmit
    form.addEventListener('keydown', (event) => requestSubmitOnEnter(event))

    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))

    expect(requestSubmit).not.toHaveBeenCalled()
  })

  it('keeps select Enter blocked by default but allows it when requested', () => {
    const select = document.createElement('select')
    const defaultEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    Object.defineProperty(defaultEvent, 'target', { value: select })

    expect(shouldTriggerPrimaryEnterAction(defaultEvent)).toBe(false)

    const selectAllowedEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    Object.defineProperty(selectAllowedEvent, 'target', { value: select })

    expect(shouldTriggerPrimaryEnterAction(selectAllowedEvent, { allowSelect: true })).toBe(true)
  })

  it('keeps file input Enter blocked by default but allows it when requested', () => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'

    const defaultEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    Object.defineProperty(defaultEvent, 'target', { value: fileInput })

    expect(shouldTriggerPrimaryEnterAction(defaultEvent)).toBe(false)

    const fileAllowedEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    Object.defineProperty(fileAllowedEvent, 'target', { value: fileInput })

    expect(shouldTriggerPrimaryEnterAction(fileAllowedEvent, { allowFile: true })).toBe(true)
  })

  it('keeps checkbox Enter blocked by default but allows it when requested', () => {
    const checkboxInput = document.createElement('input')
    checkboxInput.type = 'checkbox'

    const defaultEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    Object.defineProperty(defaultEvent, 'target', { value: checkboxInput })

    expect(shouldTriggerPrimaryEnterAction(defaultEvent)).toBe(false)

    const checkboxAllowedEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    Object.defineProperty(checkboxAllowedEvent, 'target', { value: checkboxInput })

    expect(shouldTriggerPrimaryEnterAction(checkboxAllowedEvent, { allowCheckbox: true })).toBe(true)
  })

  it('allows plain Escape to abort an active workflow', () => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

    expect(shouldAbortWorkflowOnEscape(event, { workflowActive: true })).toBe(true)
  })

  it('blocks workflow abort for modified Escape presses or inactive workflows', () => {
    const modifiedEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
      metaKey: true,
    })
    const inactiveEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })

    expect(shouldAbortWorkflowOnEscape(modifiedEvent, { workflowActive: true })).toBe(false)
    expect(shouldAbortWorkflowOnEscape(inactiveEvent, { workflowActive: false })).toBe(false)
  })
})
