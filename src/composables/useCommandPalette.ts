import { ref, type Ref } from 'vue'
import { reconciliationFacade, settingsFacade } from '../lib/api/facade'
import type { GeneratedOutput, SftpServerRecord } from '../lib/api/types'
import { buildDataCommandActions } from '../lib/commandDataSearch'
import { listRecentCommandIds, recordRecentCommand } from '../lib/commandSearch'
import type { CommandAction } from '../lib/types/ux'
import { filterRecordsForActiveTenant } from '../lib/utils/tenantRecords'
import { makeRequestGuard } from '../lib/utils/async'

export interface UseCommandPaletteOptions {
  getActiveTenantUserGroupId: () => string | null
}

export interface UseCommandPalette {
  isCommandPaletteOpen: Ref<boolean>
  isLoadingCommandData: Ref<boolean>
  recentCommandIds: Ref<string[]>
  dataCommandActions: Ref<CommandAction[]>
  open: () => void
  close: () => void
  loadCommandData: () => Promise<void>
  clearCommandData: () => void
  recordExecution: (actionId: string) => void
  loadRecentFromStorage: () => void
}

function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled'
}

export function useCommandPalette(options: UseCommandPaletteOptions): UseCommandPalette {
  const isCommandPaletteOpen = ref(false)
  const isLoadingCommandData = ref(false)
  const recentCommandIds = ref<string[]>([])
  const dataCommandActions = ref<CommandAction[]>([])

  const commandDataRequest = makeRequestGuard()

  function readSftpServers(result: PromiseSettledResult<{ servers?: SftpServerRecord[] } | undefined>): SftpServerRecord[] {
    if (!isFulfilled(result)) return []
    return filterRecordsForActiveTenant(
      result.value?.servers ?? [],
      options.getActiveTenantUserGroupId(),
    )
  }

  function readGeneratedOutputs(result: PromiseSettledResult<{ generatedOutputs?: GeneratedOutput[] } | undefined>): GeneratedOutput[] {
    if (!isFulfilled(result)) return []
    return result.value?.generatedOutputs ?? []
  }

  async function loadCommandData(): Promise<void> {
    const requestId = commandDataRequest.getRequestId()
    isLoadingCommandData.value = true

    try {
      const [sftpResult, generatedOutputResult] = await Promise.allSettled([
        settingsFacade.listSftpServers({ pageIndex: 0, pageSize: 200 }),
        reconciliationFacade.listGeneratedOutputs({ pageIndex: 0, pageSize: 80, query: '' }),
      ])

      if (!commandDataRequest.isCurrentRequest(requestId)) return

      dataCommandActions.value = buildDataCommandActions({
        sftpServers: readSftpServers(sftpResult),
        generatedOutputs: readGeneratedOutputs(generatedOutputResult),
      })
    } finally {
      if (commandDataRequest.isCurrentRequest(requestId)) {
        isLoadingCommandData.value = false
      }
    }
  }

  function open(): void {
    isCommandPaletteOpen.value = true
    void loadCommandData()
  }

  function close(): void {
    isCommandPaletteOpen.value = false
  }

  function clearCommandData(): void {
    dataCommandActions.value = []
  }

  function recordExecution(actionId: string): void {
    recentCommandIds.value = recordRecentCommand(actionId)
  }

  function loadRecentFromStorage(): void {
    recentCommandIds.value = listRecentCommandIds()
  }

  return {
    isCommandPaletteOpen,
    isLoadingCommandData,
    recentCommandIds,
    dataCommandActions,
    open,
    close,
    loadCommandData,
    clearCommandData,
    recordExecution,
    loadRecentFromStorage,
  }
}
