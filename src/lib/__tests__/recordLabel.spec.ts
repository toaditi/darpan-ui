import { describe, expect, it } from 'vitest'
import { resolveRecordLabel } from '../utils/recordLabel'

describe('resolveRecordLabel', () => {
  it('prefers description copy over ids for saved-surface labels', () => {
    expect(resolveRecordLabel({
      description: 'Primary Auth',
      primary: 'auth-primary',
      fallbackId: 'AUTH_PRIMARY',
    })).toBe('Primary Auth')
  })

  it('falls back to the primary field when description is blank', () => {
    expect(resolveRecordLabel({
      description: '   ',
      primary: 'Invoice Export',
      fallbackId: 'endpoint-primary',
    })).toBe('Invoice Export')
  })

  it('uses the fallback id when no user-facing label is available', () => {
    expect(resolveRecordLabel({
      description: '',
      primary: '   ',
      fallbackId: 'schema-primary',
    })).toBe('schema-primary')
  })
})
