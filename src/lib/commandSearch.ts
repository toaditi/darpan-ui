import type { CommandAction } from './types/ux'

const RECENT_COMMANDS_STORAGE_KEY = 'darpan-ui-recent-commands'
const MAX_RECENT_COMMANDS = 5

function canUseStorage(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof localStorage !== 'undefined' &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function'
  )
}

function safeParseRecentCommandIds(rawValue: string | null): string[] {
  if (!rawValue) return []

  try {
    const parsed = JSON.parse(rawValue)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))]
  } catch {
    return []
  }
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function tokenize(value: string): string[] {
  if (!value) return []
  return value.split(' ').filter((token) => token.length > 0)
}

function hasExactWord(text: string, token: string): boolean {
  return tokenize(text).some((word) => word === token)
}

function hasPrefixWord(text: string, token: string): boolean {
  return tokenize(text).some((word) => word.startsWith(token))
}

function tokenAppears(text: string, token: string): boolean {
  return text.includes(token)
}

function recentBoost(recentIndex: number | undefined): number {
  if (recentIndex == null) return 0
  return Math.max(0, 140 - recentIndex * 20)
}

function scoreField(text: string, token: string, exactWordPoints: number, prefixPoints: number, containsPoints: number): number {
  if (hasExactWord(text, token)) return exactWordPoints
  if (hasPrefixWord(text, token)) return prefixPoints
  if (tokenAppears(text, token)) return containsPoints
  return 0
}

function scoreCommandAction(action: CommandAction, query: string, recentIndexMap: Map<string, number>): number {
  const normalizedQuery = normalizeText(query)
  const label = normalizeText(action.label)
  const description = normalizeText(action.description)
  const aliases = action.aliases.map(normalizeText).filter((alias) => alias.length > 0)

  if (!normalizedQuery) {
    return recentBoost(recentIndexMap.get(action.id))
  }

  const tokens = tokenize(normalizedQuery)
  for (const token of tokens) {
    const tokenMatch =
      tokenAppears(label, token) || tokenAppears(description, token) || aliases.some((alias) => tokenAppears(alias, token))
    if (!tokenMatch) return -1
  }

  let score = 0

  if (label === normalizedQuery) score += 1600
  if (aliases.some((alias) => alias === normalizedQuery)) score += 1500
  if (label.startsWith(normalizedQuery)) score += 1100
  if (aliases.some((alias) => alias.startsWith(normalizedQuery))) score += 1000
  if (label.includes(normalizedQuery)) score += 650
  if (aliases.some((alias) => alias.includes(normalizedQuery))) score += 600
  if (description.includes(normalizedQuery)) score += 160

  for (const token of tokens) {
    score += scoreField(label, token, 140, 110, 45)
    score += Math.max(...aliases.map((alias) => scoreField(alias, token, 120, 95, 35)), 0)
    score += scoreField(description, token, 35, 20, 10)
  }

  score += Math.max(0, 32 - label.length)
  score += recentBoost(recentIndexMap.get(action.id))
  return score
}

export function rankCommandActions(
  actions: CommandAction[],
  query: string,
  recentCommandIds: string[] = [],
): CommandAction[] {
  const recentIndexMap = new Map(recentCommandIds.map((commandId, index) => [commandId, index]))

  return actions
    .map((action, index) => ({
      action,
      index,
      score: scoreCommandAction(action, query, recentIndexMap),
    }))
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.action)
}

export function listRecentCommandIds(): string[] {
  if (!canUseStorage()) return []
  return safeParseRecentCommandIds(localStorage.getItem(RECENT_COMMANDS_STORAGE_KEY))
}

export function recordRecentCommand(commandId: string): string[] {
  const trimmedId = commandId.trim()
  if (!trimmedId) return listRecentCommandIds()

  const nextIds = [trimmedId, ...listRecentCommandIds().filter((existingId) => existingId !== trimmedId)].slice(
    0,
    MAX_RECENT_COMMANDS,
  )

  if (canUseStorage()) {
    localStorage.setItem(RECENT_COMMANDS_STORAGE_KEY, JSON.stringify(nextIds))
  }

  return nextIds
}
