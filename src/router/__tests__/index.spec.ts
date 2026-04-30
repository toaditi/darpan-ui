import { describe, expect, it } from 'vitest'
import router from '../index'

describe('router release scope', () => {
  const expectedRoutes = [
    { name: 'settings-ai', path: '/settings/ai', surfaceMode: 'static', staticPageLabel: 'AI' },
    { name: 'connections-llm', path: '/connections/llm', redirect: true },
    { name: 'settings-ai-create', path: '/settings/ai/create', surfaceMode: 'workflow' },
    { name: 'settings-ai-edit', path: '/settings/ai/edit/:llmProvider', surfaceMode: 'workflow' },
    { name: 'settings-sftp', path: '/settings/sftp', surfaceMode: 'static' },
    { name: 'settings-sftp-create', path: '/settings/sftp/create', surfaceMode: 'workflow' },
    { name: 'settings-sftp-edit', path: '/settings/sftp/edit/:sftpServerId', surfaceMode: 'workflow' },
    { name: 'settings-netsuite', path: '/settings/netsuite', surfaceMode: 'static', staticPageLabel: 'NetSuite' },
    { name: 'settings-runs', path: '/settings/runs', surfaceMode: 'static', staticPageLabel: 'Run Editor' },
    { name: 'connections-runs', path: '/connections/runs', redirect: true },
    { name: 'settings-runs-edit', path: '/settings/runs/edit/:reconciliationMappingId', surfaceMode: 'workflow' },
    { name: 'connections-netsuite', path: '/connections/netsuite', redirect: true },
    { name: 'settings-netsuite-auth-create', path: '/settings/netsuite/auth/create', surfaceMode: 'workflow' },
    { name: 'settings-netsuite-auth-edit', path: '/settings/netsuite/auth/edit/:nsAuthConfigId', surfaceMode: 'workflow' },
    { name: 'settings-netsuite-endpoints-create', path: '/settings/netsuite/endpoints/create', surfaceMode: 'workflow' },
    { name: 'settings-netsuite-endpoints-edit', path: '/settings/netsuite/endpoints/edit/:nsRestletConfigId', surfaceMode: 'workflow' },
    { name: 'reconciliation-create', path: '/reconciliation/create', surfaceMode: 'workflow' },
    { name: 'reconciliation-ruleset-manager', path: '/reconciliation/ruleset-manager', surfaceMode: 'static', staticPageLabel: 'Ruleset Manager' },
    { name: 'reconciliation-ruleset-editor', path: '/reconciliation/ruleset-manager/rules', surfaceMode: 'workflow' },
    { name: 'reconciliation-diff', path: '/reconciliation/diff', surfaceMode: 'workflow' },
    { name: 'reconciliation-run-result', path: '/reconciliation/run-result/:savedRunId/:outputFileName', surfaceMode: 'static' },
    { name: 'reconciliation-run-history', path: '/reconciliation/run-history/:savedRunId', surfaceMode: 'static' },
    { name: 'hub', path: '/', surfaceMode: 'static' },
  ]

  it.each(expectedRoutes)('registers $name at $path', ({ name, path, surfaceMode, staticPageLabel, redirect }) => {
    const route = router.getRoutes().find((record) => record.name === name)

    expect(route?.path).toBe(path)
    if (surfaceMode) expect(route?.meta.surfaceMode).toBe(surfaceMode)
    if (staticPageLabel) expect(route?.meta.staticPageLabel).toBe(staticPageLabel)
    if (redirect) expect(typeof route?.redirect).toBe('object')
  })

  it.each([
    'reconciliation-results',
    'roadmap-reconciliation-create-ruleset',
    'connections-read-db',
  ])('does not register removed route %s', (name) => {
    const route = router.getRoutes().find((record) => record.name === name)

    expect(route).toBeUndefined()
  })
})
