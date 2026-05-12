import { computed, ref, type ComputedRef, type Ref } from 'vue'

export type TenantSettingsAiWorkflowMode = 'create' | 'edit'

export type TenantSettingsActivePopup =
  | { type: 'timezone' }
  | { type: 'notification-menu' }
  | { type: 'notification-form' }
  | { type: 'ai-menu' }
  | { type: 'ai'; mode: TenantSettingsAiWorkflowMode }

export interface UseActivePopup<TPopup> {
  activePopup: Ref<TPopup | null>
  isPopupOpen: ComputedRef<boolean>
  open: (popup: TPopup) => void
  close: () => void
  is: <K extends TPopup extends { type: infer T } ? T : never>(type: K) => boolean
}

export function useActivePopup<TPopup extends { type: string }>(): UseActivePopup<TPopup> {
  const activePopup = ref(null) as Ref<TPopup | null>
  const isPopupOpen = computed(() => activePopup.value !== null)

  function open(popup: TPopup): void {
    activePopup.value = popup
  }

  function close(): void {
    activePopup.value = null
  }

  function is<K extends TPopup extends { type: infer T } ? T : never>(type: K): boolean {
    return activePopup.value?.type === type
  }

  return { activePopup, isPopupOpen, open, close, is }
}

export interface TenantSettingsPopupActions {
  activePopup: Ref<TenantSettingsActivePopup | null>
  isPopupOpen: ComputedRef<boolean>
  isAiEditing: ComputedRef<boolean>
  openTimezone: () => void
  openNotificationMenu: () => void
  openNotificationForm: () => void
  openAiMenu: () => void
  openAiCreate: () => void
  openAiEdit: () => void
  close: () => void
}

export function useTenantSettingsPopup(): TenantSettingsPopupActions {
  const { activePopup, isPopupOpen, open, close } = useActivePopup<TenantSettingsActivePopup>()
  const isAiEditing = computed(
    () => activePopup.value?.type === 'ai' && activePopup.value.mode === 'edit',
  )

  return {
    activePopup,
    isPopupOpen,
    isAiEditing,
    openTimezone: () => open({ type: 'timezone' }),
    openNotificationMenu: () => open({ type: 'notification-menu' }),
    openNotificationForm: () => open({ type: 'notification-form' }),
    openAiMenu: () => open({ type: 'ai-menu' }),
    openAiCreate: () => open({ type: 'ai', mode: 'create' }),
    openAiEdit: () => open({ type: 'ai', mode: 'edit' }),
    close,
  }
}
