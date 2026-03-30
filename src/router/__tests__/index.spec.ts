import { describe, expect, it } from 'vitest'
import router from '../index'

describe('router release scope', () => {
  it('does not register the out-of-scope inventory results workspace', () => {
    const route = router.getRoutes().find((record) => record.name === 'reconciliation-results')

    expect(route).toBeUndefined()
  })

  it('does not register the out-of-scope ruleset mockup route', () => {
    const route = router.getRoutes().find((record) => record.name === 'roadmap-reconciliation-create-ruleset')

    expect(route).toBeUndefined()
  })
})
