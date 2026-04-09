import { describe, expect, it } from 'vitest'
import router from '../index'

describe('router release scope', () => {
  it('registers the standalone AI dashboard route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-ai')

    expect(route?.path).toBe('/settings/ai')
    expect(route?.meta.staticPageLabel).toBe('AI')
    expect(route?.meta.surfaceMode).toBe('static')
  })

  it('keeps the legacy connections llm route as a redirect', () => {
    const route = router.getRoutes().find((record) => record.name === 'connections-llm')

    expect(route?.path).toBe('/connections/llm')
    expect(typeof route?.redirect).toBe('object')
  })

  it('registers the standalone AI create workflow route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-ai-create')

    expect(route?.path).toBe('/settings/ai/create')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('registers the standalone AI edit workflow route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-ai-edit')

    expect(route?.path).toBe('/settings/ai/edit/:llmProvider')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('registers the standalone SFTP dashboard route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-sftp')

    expect(route?.path).toBe('/settings/sftp')
    expect(route?.meta.surfaceMode).toBe('static')
  })

  it('registers the standalone SFTP create workflow route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-sftp-create')

    expect(route?.path).toBe('/settings/sftp/create')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('registers the standalone SFTP edit workflow route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-sftp-edit')

    expect(route?.path).toBe('/settings/sftp/edit/:sftpServerId')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('registers the standalone NetSuite dashboard route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-netsuite')

    expect(route?.path).toBe('/settings/netsuite')
    expect(route?.meta.staticPageLabel).toBe('NetSuite')
    expect(route?.meta.surfaceMode).toBe('static')
  })

  it('registers the standalone runs dashboard route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-runs')

    expect(route?.path).toBe('/settings/runs')
    expect(route?.meta.staticPageLabel).toBe('Run Editor')
    expect(route?.meta.surfaceMode).toBe('static')
  })

  it('keeps the legacy connections runs route as a redirect', () => {
    const route = router.getRoutes().find((record) => record.name === 'connections-runs')

    expect(route?.path).toBe('/connections/runs')
    expect(typeof route?.redirect).toBe('object')
  })

  it('registers the runs edit workflow route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-runs-edit')

    expect(route?.path).toBe('/settings/runs/edit/:reconciliationMappingId')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('keeps the legacy connections netsuite route as a redirect', () => {
    const route = router.getRoutes().find((record) => record.name === 'connections-netsuite')

    expect(route?.path).toBe('/connections/netsuite')
    expect(typeof route?.redirect).toBe('object')
  })

  it('registers the NetSuite auth create workflow route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-netsuite-auth-create')

    expect(route?.path).toBe('/settings/netsuite/auth/create')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('registers the NetSuite auth edit workflow route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-netsuite-auth-edit')

    expect(route?.path).toBe('/settings/netsuite/auth/edit/:nsAuthConfigId')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('registers the NetSuite endpoint create workflow route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-netsuite-endpoints-create')

    expect(route?.path).toBe('/settings/netsuite/endpoints/create')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

  it('registers the NetSuite endpoint edit workflow route', () => {
    const route = router.getRoutes().find((record) => record.name === 'settings-netsuite-endpoints-edit')

    expect(route?.path).toBe('/settings/netsuite/endpoints/edit/:nsRestletConfigId')
    expect(route?.meta.surfaceMode).toBe('workflow')
  })

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
