import { describe, expect, it } from 'vitest'
import { getLinearPortalConfig, normalizeLinearPortalUrl, parseLinearEmbedEnabled } from '../linearAccess'

describe('linearAccess helpers', () => {
  it('normalizes valid customer-safe Linear URLs', () => {
    expect(normalizeLinearPortalUrl(' https://linear.app/public-roadmap ')).toBe('https://linear.app/public-roadmap')
    expect(normalizeLinearPortalUrl('https://linear.app/forms/customer-request')).toBe(
      'https://linear.app/forms/customer-request',
    )
  })

  it('rejects invalid or unsafe URLs', () => {
    expect(normalizeLinearPortalUrl('')).toBeNull()
    expect(normalizeLinearPortalUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeLinearPortalUrl('/relative/path')).toBeNull()
  })

  it('parses embed mode conservatively', () => {
    expect(parseLinearEmbedEnabled(undefined)).toBe(true)
    expect(parseLinearEmbedEnabled('')).toBe(true)
    expect(parseLinearEmbedEnabled('true')).toBe(true)
    expect(parseLinearEmbedEnabled('false')).toBe(false)
    expect(parseLinearEmbedEnabled('0')).toBe(false)
    expect(parseLinearEmbedEnabled('off')).toBe(false)
  })

  it('builds config from frontend env values', () => {
    expect(
      getLinearPortalConfig({
        VITE_DARPAN_LINEAR_ROADMAP_URL: 'https://linear.app/public-roadmap',
        VITE_DARPAN_LINEAR_REQUEST_URL: 'https://linear.app/forms/customer-request',
        VITE_DARPAN_LINEAR_EMBED_ENABLED: 'false',
      }),
    ).toEqual({
      roadmapUrl: 'https://linear.app/public-roadmap',
      requestUrl: 'https://linear.app/forms/customer-request',
      embedEnabled: false,
    })
  })
})
