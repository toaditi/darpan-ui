export type CommandGroup = 'Navigate' | 'Data'

export interface CommandAction {
  id: string
  label: string
  description: string
  group: CommandGroup
  to: string
  aliases: string[]
  requiresQuery?: boolean
}
