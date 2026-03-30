import { describe, expect, it } from 'vitest'
import router from '../index'

describe('router inventory results route', () => {
  it('registers the results workspace as an authenticated route', () => {
    const route = router.getRoutes().find((record) => record.name === 'reconciliation-results')

    expect(route).toBeTruthy()
    expect(route?.path).toBe('/reconciliation/results')
    expect(route?.meta.requiresAuth).toBe(true)
  })
})
