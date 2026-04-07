import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listRecentCommandIds, recordRecentCommand, rankCommandActions } from '../commandSearch'
import type { CommandAction } from '../types/ux'

const storageState = vi.hoisted(() => new Map<string, string>())

const actions: CommandAction[] = [
  {
    id: 'navigate-ai-settings',
    label: 'Open AI Settings',
    description: 'Manage providers, models, and API keys.',
    group: 'Navigate',
    to: '/connections/llm',
    aliases: ['ai', 'llm', 'openai', 'gemini', 'api key', 'model settings', 'change api key'],
  },
  {
    id: 'navigate-schema-library',
    label: 'Open Schema Library',
    description: 'Upload, review, and manage saved schemas.',
    group: 'Navigate',
    to: '/schemas/library',
    aliases: ['schema', 'schemas', 'upload schema', 'json schema', 'field map', 'data shape'],
  },
  {
    id: 'navigate-netsuite-endpoints',
    label: 'Open NetSuite Endpoints',
    description: 'Manage NetSuite API URLs and timeout settings.',
    group: 'Navigate',
    to: '/connections/netsuite/endpoints',
    aliases: ['netsuite', 'endpoint', 'api url', 'restlet', 'timeout', 'settings'],
  },
  {
    id: 'navigate-run-reconciliation',
    label: 'Run Reconciliation',
    description: 'Compare two files or datasets and review the result.',
    group: 'Navigate',
    to: '/reconciliation/pilot-diff',
    aliases: ['compare files', 'compare data', 'match records', 'reconcile data', 'run comparison', 'execute', 'diff', 'pilot'],
  },
]

describe('rankCommandActions', () => {
  it('prefers exact alias matches over weaker field matches', () => {
    const ranked = rankCommandActions(actions, 'openai')

    expect(ranked.map((action) => action.id)).toEqual(['navigate-ai-settings'])
  })

  it('supports natural-language queries by ignoring filler words', () => {
    const ranked = rankCommandActions(actions, 'where do i change my open ai key')

    expect(ranked[0]?.id).toBe('navigate-ai-settings')
  })

  it('tolerates small typos when the intended destination is otherwise clear', () => {
    const ranked = rankCommandActions(actions, 'scheema uplod')

    expect(ranked[0]?.id).toBe('navigate-schema-library')
  })

  it('keeps comparison search discoverable without surfacing legacy wording in the label', () => {
    const ranked = rankCommandActions(actions, 'compare files')

    expect(ranked[0]?.id).toBe('navigate-run-reconciliation')
  })

  it('boosts recently used commands when the textual match is otherwise tied', () => {
    const ranked = rankCommandActions(actions, 'settings', ['navigate-netsuite-endpoints'])

    expect(ranked[0]?.id).toBe('navigate-netsuite-endpoints')
    expect(ranked[1]?.id).toBe('navigate-ai-settings')
  })
})

describe('recent command storage', () => {
  beforeEach(() => {
    storageState.clear()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storageState.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storageState.set(key, value)
      },
      removeItem: (key: string) => {
        storageState.delete(key)
      },
      clear: () => {
        storageState.clear()
      },
    })
  })

  it('stores the most recent command first without duplicates', () => {
    recordRecentCommand('navigate-ai-settings')
    recordRecentCommand('navigate-run-reconciliation')
    recordRecentCommand('navigate-ai-settings')

    expect(listRecentCommandIds()).toEqual(['navigate-ai-settings', 'navigate-run-reconciliation'])
  })

  it('caps the stored recent history to a small bounded list', () => {
    recordRecentCommand('one')
    recordRecentCommand('two')
    recordRecentCommand('three')
    recordRecentCommand('four')
    recordRecentCommand('five')
    recordRecentCommand('six')

    expect(listRecentCommandIds()).toEqual(['six', 'five', 'four', 'three', 'two'])
  })
})
