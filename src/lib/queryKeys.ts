export const savedRunKeys = {
  all: ['savedRuns'] as const,
  lists: () => [...savedRunKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...savedRunKeys.lists(), params] as const,
}

export const generatedOutputKeys = {
  all: ['generatedOutputs'] as const,
  lists: () => [...generatedOutputKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...generatedOutputKeys.lists(), params] as const,
  details: () => [...generatedOutputKeys.all, 'detail'] as const,
  detail: (params: Record<string, unknown>) => [...generatedOutputKeys.details(), params] as const,
}

export const automationKeys = {
  all: ['automations'] as const,
  lists: () => [...automationKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...automationKeys.lists(), params] as const,
  details: () => [...automationKeys.all, 'detail'] as const,
  detail: (id: string) => [...automationKeys.details(), id] as const,
  sourceOptions: () => [...automationKeys.all, 'sourceOptions'] as const,
}

export const tenantSettingsKeys = {
  all: ['tenantSettings'] as const,
  settings: () => [...tenantSettingsKeys.all, 'settings'] as const,
  notifications: () => [...tenantSettingsKeys.all, 'notifications'] as const,
  llm: () => [...tenantSettingsKeys.all, 'llm'] as const,
}

export const sftpServerKeys = {
  all: ['sftpServers'] as const,
  lists: () => [...sftpServerKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...sftpServerKeys.lists(), params] as const,
}

export const nsAuthConfigKeys = {
  all: ['nsAuthConfigs'] as const,
  lists: () => [...nsAuthConfigKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...nsAuthConfigKeys.lists(), params] as const,
}

export const nsRestletConfigKeys = {
  all: ['nsRestletConfigs'] as const,
  lists: () => [...nsRestletConfigKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...nsRestletConfigKeys.lists(), params] as const,
}

export const shopifyAuthConfigKeys = {
  all: ['shopifyAuthConfigs'] as const,
  lists: () => [...shopifyAuthConfigKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...shopifyAuthConfigKeys.lists(), params] as const,
}

export const omsRestSourceConfigKeys = {
  all: ['omsRestSourceConfigs'] as const,
  lists: () => [...omsRestSourceConfigKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...omsRestSourceConfigKeys.lists(), params] as const,
}

export const mappingKeys = {
  all: ['mappings'] as const,
  lists: () => [...mappingKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...mappingKeys.lists(), params] as const,
  details: () => [...mappingKeys.all, 'detail'] as const,
  detail: (id: string) => [...mappingKeys.details(), id] as const,
}
