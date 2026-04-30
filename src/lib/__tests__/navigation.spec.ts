import { describe, expect, it } from 'vitest'
import { resolveInternalRedirectTarget } from '../navigation'

describe('resolveInternalRedirectTarget', () => {
  it('keeps valid internal routes', () => {
    expect(resolveInternalRedirectTarget('/connections/llm?focus=create#panel')).toBe(
      '/connections/llm?focus=create#panel',
    )
  })

  it('falls back for non-string and external-looking values', () => {
    expect(resolveInternalRedirectTarget(undefined)).toBe('/')
    expect(resolveInternalRedirectTarget('https://example.com/escape')).toBe('/')
    expect(resolveInternalRedirectTarget('//example.com/escape')).toBe('/')
    expect(resolveInternalRedirectTarget('not-a-route')).toBe('/')
  })

  it('falls back for login self-redirects', () => {
    expect(resolveInternalRedirectTarget('/login')).toBe('/')
    expect(resolveInternalRedirectTarget('/login?redirect=/login')).toBe('/')
    expect(resolveInternalRedirectTarget('/login/?redirect=/settings/sftp')).toBe('/')
  })
})
