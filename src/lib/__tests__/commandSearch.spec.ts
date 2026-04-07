import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listRecentCommandIds, recordRecentCommand, rankCommandActions } from '../commandSearch'
import type { CommandAction } from '../types/ux'

const storageState = vi.hoisted(() => new Map<string, string>())

const actions: CommandAction[] = [
  {
    id: 'navigate-llm',
    label: 'Open LLM Settings',
    description: 'Provider, model, and API key controls.',
    group: 'Navigate',
    to: '/connections/llm',
    aliases: ['connections', 'llm', 'provider'],
  },
  {
    id: 'quick-open-llm',
    label: 'Quick Action: Open LLM Provider',
    description: 'Open provider model and key settings.',
    group: 'Quick Actions',
    to: '/connections/llm',
    aliases: ['llm', 'provider', 'openai', 'gemini'],
  },
  {
    id: 'navigate-ns-auth',
    label: 'Open NetSuite Auth',
    description: 'Configure reusable authentication profiles.',
    group: 'Navigate',
    to: '/connections/netsuite/auth',
    aliases: ['netsuite', 'auth', 'token', 'oauth'],
  },
  {
    id: 'quick-run-pilot-diff',
    label: 'Quick Action: Execute',
    description: 'Jump straight to the diff flow.',
    group: 'Quick Actions',
    to: '/reconciliation/pilot-diff',
    aliases: ['execute', 'run diff', 'compare files', 'reconciliation diff'],
  },
]

describe('rankCommandActions', () => {
  it('prefers exact alias matches over weaker field matches', () => {
    const ranked = rankCommandActions(actions, 'openai')

    expect(ranked.map((action) => action.id)).toEqual(['quick-open-llm'])
  })

  it('prefers phrase and word-prefix matches for label-driven queries', () => {
    const ranked = rankCommandActions(actions, 'run diff')

    expect(ranked[0]?.id).toBe('quick-run-pilot-diff')
  })

  it('requires all query tokens to be represented across the command fields', () => {
    const ranked = rankCommandActions(actions, 'netsuite auth')

    expect(ranked.map((action) => action.id)).toEqual(['navigate-ns-auth'])
  })

  it('boosts recently used commands when the textual match is otherwise tied', () => {
    const ranked = rankCommandActions(actions, 'llm', ['quick-open-llm'])

    expect(ranked[0]?.id).toBe('quick-open-llm')
    expect(ranked[1]?.id).toBe('navigate-llm')
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
    recordRecentCommand('navigate-llm')
    recordRecentCommand('quick-run-pilot-diff')
    recordRecentCommand('navigate-llm')

    expect(listRecentCommandIds()).toEqual(['navigate-llm', 'quick-run-pilot-diff'])
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
