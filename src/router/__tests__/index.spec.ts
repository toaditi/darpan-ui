import { describe, expect, it } from 'vitest'
import router from '../index'

describe('router release scope', () => {
  it('registers the guided create reconciliation route', () => {
    const route = router.getRoutes().find((record) => record.name === 'reconciliation-create')

    expect(route?.path).toBe('/reconciliation/create')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('registers the pilot generic diff route', () => {
    const route = router.getRoutes().find((record) => record.name === 'reconciliation-pilot-diff')

    expect(route?.path).toBe('/reconciliation/pilot-diff')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('registers the static reconciliation run result route', () => {
    const route = router.getRoutes().find((record) => record.name === 'reconciliation-run-result')

    expect(route?.path).toBe('/reconciliation/run-result/:reconciliationMappingId/:outputFileName')
    expect(route?.meta.surfaceMode).toBe('static')
  })

  it('keeps the hub route on the static surface system', () => {
    const route = router.getRoutes().find((record) => record.name === 'hub')

    expect(route?.path).toBe('/')
    expect(route?.meta.surfaceMode).toBe('static')
  })

  it('does not register the out-of-scope inventory results workspace', () => {
    const route = router.getRoutes().find((record) => record.name === 'reconciliation-results')

    expect(route).toBeUndefined()
  })

  it('does not register the out-of-scope ruleset mockup route', () => {
    const route = router.getRoutes().find((record) => record.name === 'roadmap-reconciliation-create-ruleset')

    expect(route).toBeUndefined()
  })

  it('does not register the removed read DB connections route', () => {
    const route = router.getRoutes().find((record) => record.name === 'connections-read-db')

    expect(route).toBeUndefined()
  })
})
