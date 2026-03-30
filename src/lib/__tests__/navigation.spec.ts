import { describe, expect, it } from 'vitest'
import { resolveInternalRedirectTarget } from '../navigation'

describe('resolveInternalRedirectTarget', () => {
  it('keeps valid internal routes', () => {
    expect(resolveInternalRedirectTarget('/reconciliation/results?tab=review#drawer')).toBe(
      '/reconciliation/results?tab=review#drawer',
    )
  })

  it('falls back for non-string and external-looking values', () => {
    expect(resolveInternalRedirectTarget(undefined)).toBe('/')
    expect(resolveInternalRedirectTarget('https://example.com/escape')).toBe('/')
    expect(resolveInternalRedirectTarget('//example.com/escape')).toBe('/')
    expect(resolveInternalRedirectTarget('not-a-route')).toBe('/')
  })
})
