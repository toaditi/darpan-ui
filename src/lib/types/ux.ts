export type CommandGroup = 'Navigate'

export interface CommandAction {
  id: string
  label: string
  description: string
  group: CommandGroup
  to: string
  aliases: string[]
}

export type ReadinessStatus = 'complete' | 'pending' | 'unknown'

export interface HubReadinessState {
  id: 'connections' | 'schema' | 'rollout'
  label: string
  description?: string
  status: ReadinessStatus
  detail: string
}
