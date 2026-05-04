<template>
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <div
    :class="[
      'app-shell',
      `app-shell--${surfaceMode}`,
      { 'app-shell--popup-open': isCommandPaletteOpen || isUserMenuOpen },
    ]"
  >
    <section id="main-content" :class="['content-shell', `content-shell--${surfaceMode}`]" tabindex="-1">
      <RouterView :key="routerViewKey" />
    </section>
  </div>

  <div
    v-if="workflowHint"
    :class="[
      'workflow-escape-hint',
      { 'workflow-escape-hint--warning': workflowHint.tone === 'warning' },
    ]"
    role="status"
    aria-live="polite"
  >
    {{ workflowHint.message }}
  </div>

  <div v-if="!isShelllessRoute" class="floating-actions">
    <div class="floating-quick-actions">
      <button type="button" class="home-fab" aria-label="Go to Dashboard" @click="goToHub()">
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M3.8 10.4 12 4l8.2 6.4" />
          <path d="M6.7 9.5V20h10.6V9.5" />
          <path d="M10.3 20v-5.8h3.4V20" />
        </svg>
      </button>

      <div ref="userMenuWrap" class="user-menu-wrap">
        <button
          type="button"
          class="user-fab"
          :aria-expanded="isUserMenuOpen"
          aria-haspopup="dialog"
          aria-label="Open user details and settings"
          @click="toggleUserMenu"
        >
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M4 19.5c1.9-3 5-4.5 8-4.5s6.1 1.5 8 4.5" />
          </svg>
        </button>

        <section v-if="isUserMenuOpen" class="user-menu-card" role="dialog" aria-label="User details and settings">
          <p class="user-menu-name">{{ userDisplayName }}</p>
          <p v-if="userStatusText" class="mono-copy">{{ userStatusText }}</p>

          <div class="user-menu-actions">
            <button
              type="button"
              class="app-icon-action app-icon-action--large"
              :disabled="isLoggingOut"
              aria-label="Sign out"
              @click="handleLogout"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 2v10" />
                <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
              </svg>
            </button>
            <button
              type="button"
              class="app-icon-action app-icon-action--large"
              :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`"
              :aria-pressed="theme === 'dark'"
              @click="toggleTheme"
            >
              <svg v-if="theme === 'dark'" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
              </svg>
              <svg v-else viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2.5v3.2M12 18.3v3.2M21.5 12h-3.2M5.7 12H2.5M18.7 5.3l-2.3 2.3M7.6 16.4l-2.3 2.3M18.7 18.7l-2.3-2.3M7.6 7.6 5.3 5.3" />
              </svg>
            </button>
            <button
              type="button"
              class="app-icon-action app-icon-action--large"
              aria-label="Open user settings"
              @click="goToUserSettings"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.3a2 2 0 0 1-4 0V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3 14H2.7a2 2 0 0 1 0-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.6v-.3a2 2 0 0 1 4 0V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1A1.7 1.7 0 0 0 21 10h.3a2 2 0 0 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
              </svg>
            </button>
          </div>
        </section>
      </div>
    </div>

    <button type="button" class="command-bubble" aria-label="Open command menu" @click="openCommandPalette">
      <span class="command-bubble-dot" aria-hidden="true"></span>
      <span>Ask Darpan</span>
      <span class="command-bubble-shortcut">Cmd/Ctrl+K</span>
    </button>
  </div>

  <CommandPalette
    v-if="!isShelllessRoute"
    :open="isCommandPaletteOpen"
    :actions="commandActions"
    :recent-command-ids="recentCommandIds"
    :data-search-loading="isLoadingCommandData"
    @close="closeCommandPalette"
    @execute="executeCommand"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import CommandPalette from './components/shell/CommandPalette.vue'
import { buildAuthRedirect, ensureAuthenticated, logoutSession, useAuthState, useUiPermissions } from './lib/auth'
import { AUTH_REQUIRED_EVENT } from './lib/api/client'
import { reconciliationFacade, settingsFacade } from './lib/api/facade'
import type { GeneratedOutput, SftpServerRecord } from './lib/api/types'
import { buildDataCommandActions } from './lib/commandDataSearch'
import { listRecentCommandIds, recordRecentCommand } from './lib/commandSearch'
import { shouldAbortWorkflowOnEscape } from './lib/keyboard'
import { useTheme } from './lib/theme'
import type { CommandAction } from './lib/types/ux'
import {
  DISMISS_INLINE_MENUS_EVENT,
  WORKFLOW_CANCEL_REQUEST_EVENT,
  WORKFLOW_HINT_REQUEST_EVENT,
  type WorkflowHintRequestDetail,
  type WorkflowHintTone,
} from './lib/uiEvents'
import { useUserDisplayNamePreference } from './lib/userDisplayName'
import { filterRecordsForActiveTenant } from './lib/utils/tenantRecords'
import { buildWorkflowOriginState, readWorkflowOriginFromHistoryState, resolveStaticPageLabel, type WorkflowOrigin } from './lib/workflowOrigin'

const route = useRoute()
const router = useRouter()
const authState = useAuthState()
const permissions = useUiPermissions()
const { theme, toggleTheme } = useTheme()
const { resolveUserDisplayName } = useUserDisplayNamePreference()

const isCommandPaletteOpen = ref(false)
const isUserMenuOpen = ref(false)
const isLoggingOut = ref(false)
const isLoadingCommandData = ref(false)
const recentCommandIds = ref<string[]>([])
const dataCommandActions = ref<CommandAction[]>([])
const userMenuWrap = ref<HTMLElement | null>(null)
const workflowHint = ref<{ message: string, tone: WorkflowHintTone } | null>(null)
const workflowEscapeOriginPath = ref<string | null>(null)
const workflowEscapeOriginState = ref<WorkflowOrigin | null>(null)

const isShelllessRoute = computed(() => route.name === 'login')
const surfaceMode = computed<'static' | 'workflow'>(() => (route.meta.surfaceMode === 'workflow' ? 'workflow' : 'static'))
const routerViewKey = computed(
  () => `${route.fullPath}::${authState.sessionInfo?.activeTenantUserGroupId ?? authState.sessionInfo?.scopeType ?? 'anonymous'}`,
)
const userDisplayName = computed(() => resolveUserDisplayName(authState.sessionInfo))
const activeTenantUserGroupId = computed(() => authState.sessionInfo?.activeTenantUserGroupId ?? null)
const userStatusText = computed<string | null>(() => {
  if (isLoggingOut.value) return 'Signing out'
  if (authState.authenticated) return null
  if (authState.error) return authState.error
  if (authState.status === 'verification-failed') return 'Session check failed'
  if (authState.checked) return 'Not signed in'
  return 'Checking session'
})

const canEditTenantSettings = computed(() => permissions.canEditTenantSettings)
const canRunActiveTenantReconciliation = computed(() => permissions.canRunActiveTenantReconciliation)
const commandActions = computed<CommandAction[]>(() => [
  ...staticCommandActions.filter((action) => {
    if (action.id === 'navigate-run-reconciliation') return canRunActiveTenantReconciliation.value
    if (
      action.id === 'navigate-schema-infer'
      || action.id === 'navigate-create-reconciliation'
    ) {
      return canEditTenantSettings.value
    }
    return true
  }),
  ...dataCommandActions.value.filter((action) => (
    canEditTenantSettings.value || !action.id.startsWith('data-sftp-server-')
  )),
])

const staticCommandActions: CommandAction[] = [
  {
    id: 'navigate-hub',
    label: 'Go to Dashboard',
    description: 'See the main workspace, setup areas, and reconciliation entry points.',
    group: 'Navigate',
    to: '/',
    aliases: ['home', 'dashboard', 'start', 'main page', 'overview'],
  },
  {
    id: 'navigate-user-settings',
    label: 'Open User Settings',
    description: 'Manage account display name, active tenant, and user preferences.',
    group: 'Navigate',
    to: '/settings/user',
    aliases: ['user settings', 'profile', 'display name', 'tenant switcher'],
  },
  {
    id: 'navigate-tenant-settings',
    label: 'Open Tenant Settings',
    description: 'Manage tenant connections, timezone, notifications, runs, and AI provider settings.',
    group: 'Navigate',
    to: '/settings/tenant',
    aliases: ['tenant settings', 'settings', 'timezone', 'time zone', 'ai', 'llm', 'openai', 'gemini', 'api key', 'model settings', 'change api key', 'connections'],
  },
  {
    id: 'navigate-sftp',
    label: 'Open SFTP Servers',
    description: 'Set up remote file-transfer connections.',
    group: 'Navigate',
    to: '/settings/sftp',
    aliases: ['sftp', 'file server', 'file transfer', 'ftp', 'server connection'],
  },
  {
    id: 'navigate-notifications',
    label: 'Configure Notifications',
    description: 'Configure tenant run-completion webhooks.',
    group: 'Navigate',
    to: '/settings/tenant?workflow=notifications',
    aliases: ['notifications', 'google chat', 'gchat', 'webhook', 'run notification', 'run completion'],
  },
  {
    id: 'navigate-netsuite',
    label: 'Open NetSuite Settings',
    description: 'Manage NetSuite auth profiles and endpoint configs.',
    group: 'Navigate',
    to: '/settings/netsuite',
    aliases: ['netsuite', 'login', 'credentials', 'token', 'oauth', 'auth', 'endpoint', 'api url', 'restlet', 'timeout', 'settings'],
  },
  {
    id: 'navigate-shopify',
    label: 'Open Shopify Settings',
    description: 'Manage Shopify Admin API source credentials.',
    group: 'Navigate',
    to: '/settings/shopify',
    aliases: ['shopify', 'shopify connection', 'shopify auth', 'shopify token', 'shopify api', 'orders api', 'automation source'],
  },
  {
    id: 'navigate-oms',
    label: 'Open HotWax Settings',
    description: 'Manage HotWax source credentials and order API setup.',
    group: 'Navigate',
    to: '/settings/hotwax',
    aliases: ['hotwax', 'oms', 'hotwax connection', 'oms connection', 'oms rest', 'orders api', 'order source', 'automation source'],
  },
  {
    id: 'navigate-runs-settings',
    label: 'Open Runs Settings',
    description: 'Review saved runs and reopen one for edit.',
    group: 'Navigate',
    to: '/settings/runs',
    aliases: ['runs', 'run settings', 'saved runs', 'edit run', 'mapping settings', 'reconciliation settings'],
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
    id: 'navigate-schema-infer',
    label: 'Create Schema',
    description: 'Upload a file and save a new schema through the guided workflow.',
    group: 'Navigate',
    to: '/schemas/create',
    aliases: ['generate schema', 'infer schema', 'sample json', 'make schema', 'create schema', 'new schema'],
  },
  {
    id: 'navigate-create-reconciliation',
    label: 'Create Reconciliation Flow',
    description: 'Set up a new comparison flow step by step.',
    group: 'Navigate',
    to: '/reconciliation/create',
    aliases: ['new reconciliation', 'create compare flow', 'new workflow', 'match setup'],
  },
  {
    id: 'navigate-run-reconciliation',
    label: 'Run Reconciliation',
    description: 'Compare two files or datasets and review the result.',
    group: 'Navigate',
    to: '/reconciliation/diff',
    aliases: ['compare files', 'compare data', 'match records', 'reconcile data', 'run comparison', 'execute', 'diff'],
  },
  {
    id: 'navigate-automations',
    label: 'Open Automations',
    description: 'Review scheduled reconciliation automations.',
    group: 'Navigate',
    to: '/reconciliation/automations',
    aliases: ['automations', 'automation dashboard', 'scheduled runs', 'scheduled reconciliation', 'pause automation', 'run automation'],
  },
  {
    id: 'navigate-roadmap',
    label: 'Open Requests and Roadmap',
    description: 'Check delivery status and send product requests.',
    group: 'Navigate',
    to: '/roadmap/reconciliation',
    aliases: ['roadmap', 'requests', 'feature request', 'status', 'coming soon'],
  },
]

let workflowEscapeHintTimer: ReturnType<typeof globalThis.setTimeout> | null = null
let commandDataRequestId = 0

function isFulfilled<T>(result: PromiseSettledResult<T>): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled'
}

function readSftpServers(result: PromiseSettledResult<{ servers?: SftpServerRecord[] }>): SftpServerRecord[] {
  if (!isFulfilled(result)) return []
  return filterRecordsForActiveTenant(
    result.value.servers ?? [],
    authState.sessionInfo?.activeTenantUserGroupId ?? null,
  )
}

function readGeneratedOutputs(result: PromiseSettledResult<{ generatedOutputs?: GeneratedOutput[] }>): GeneratedOutput[] {
  if (!isFulfilled(result)) return []
  return result.value.generatedOutputs ?? []
}

async function loadCommandDataActions(): Promise<void> {
  const requestId = ++commandDataRequestId
  isLoadingCommandData.value = true

  try {
    const [sftpResult, generatedOutputResult] = await Promise.allSettled([
      settingsFacade.listSftpServers({ pageIndex: 0, pageSize: 200 }),
      reconciliationFacade.listGeneratedOutputs({ pageIndex: 0, pageSize: 80, query: '' }),
    ])

    if (requestId !== commandDataRequestId) return

    dataCommandActions.value = buildDataCommandActions({
      sftpServers: readSftpServers(sftpResult),
      generatedOutputs: readGeneratedOutputs(generatedOutputResult),
    })
  } finally {
    if (requestId === commandDataRequestId) {
      isLoadingCommandData.value = false
    }
  }
}

function openCommandPalette(): void {
  isUserMenuOpen.value = false
  document.dispatchEvent(new Event(DISMISS_INLINE_MENUS_EVENT))
  isCommandPaletteOpen.value = true
  void loadCommandDataActions()
}

function closeCommandPalette(): void {
  isCommandPaletteOpen.value = false
}

function toggleUserMenu(): void {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

function closeUserMenu(): void {
  isUserMenuOpen.value = false
}

function handleWindowMouseDown(event: MouseEvent): void {
  if (!isUserMenuOpen.value) return
  if (!(event.target instanceof Node)) return
  if (userMenuWrap.value?.contains(event.target)) return
  closeUserMenu()
}

function clearActiveElementFocus(): void {
  if (typeof document === 'undefined') return

  const activeElement = document.activeElement
  if (activeElement instanceof HTMLElement && activeElement !== document.body) {
    activeElement.blur()
  }
}

async function goToHub(options: { clearFocus?: boolean } = {}): Promise<void> {
  isCommandPaletteOpen.value = false
  isUserMenuOpen.value = false
  if (options.clearFocus) clearActiveElementFocus()
  if (route.path === '/') return
  await router.push('/')
  if (options.clearFocus) {
    await nextTick()
    clearActiveElementFocus()
  }
}

async function goToWorkflowOrigin(options: { clearFocus?: boolean } = {}): Promise<void> {
  const targetPath = workflowEscapeOriginPath.value || '/'
  const targetState = workflowEscapeOriginState.value?.state

  isCommandPaletteOpen.value = false
  isUserMenuOpen.value = false
  if (options.clearFocus) clearActiveElementFocus()
  if (route.fullPath === targetPath) return
  await router.push(targetState ? { path: targetPath, state: targetState } : targetPath)
  if (options.clearFocus) {
    await nextTick()
    clearActiveElementFocus()
  }
}

async function goToUserSettings(): Promise<void> {
  isCommandPaletteOpen.value = false
  isUserMenuOpen.value = false
  if (route.path === '/settings/user') return
  await router.push('/settings/user')
}

async function handleLogout(): Promise<void> {
  if (isLoggingOut.value) return

  isCommandPaletteOpen.value = false
  isLoggingOut.value = true
  try {
    const loggedOut = await logoutSession()
    if (!loggedOut) return

    isUserMenuOpen.value = false
    await router.replace({ name: 'login' })
  } finally {
    isLoggingOut.value = false
  }
}

async function executeCommand(action: CommandAction): Promise<void> {
  isCommandPaletteOpen.value = false
  recentCommandIds.value = recordRecentCommand(action.id)
  if (action.to === route.fullPath) return
  const staticPageLabel = resolveStaticPageLabel(route)
  const targetRoute = router.resolve(action.to)
  if (staticPageLabel && targetRoute.meta.surfaceMode === 'workflow') {
    await router.push({
      path: action.to,
      state: buildWorkflowOriginState(staticPageLabel, route.fullPath),
    })
    return
  }
  await router.push(action.to)
}

function handleKeyboard(event: KeyboardEvent): void {
  const key = event.key.toLowerCase()
  const launcherPressed = (event.metaKey || event.ctrlKey) && key === 'k'

  if (launcherPressed) {
    event.preventDefault()
    openCommandPalette()
    return
  }

  if (key === 'escape' && isCommandPaletteOpen.value) {
    event.preventDefault()
    isCommandPaletteOpen.value = false
    return
  }

  if (key === 'escape' && isUserMenuOpen.value) {
    event.preventDefault()
    isUserMenuOpen.value = false
    return
  }

  const plainEscapePressed = shouldAbortWorkflowOnEscape(event, { workflowActive: true })
  if (plainEscapePressed) {
    const cancelRequest = new Event(WORKFLOW_CANCEL_REQUEST_EVENT, { cancelable: true })
    document.dispatchEvent(cancelRequest)
    if (cancelRequest.defaultPrevented) {
      event.preventDefault()
      return
    }
  }

  if (plainEscapePressed && surfaceMode.value === 'workflow') {
    event.preventDefault()
    void goToWorkflowOrigin({ clearFocus: true })
  }
}

async function redirectToAuthBoundary(): Promise<void> {
  if (isShelllessRoute.value) return

  isCommandPaletteOpen.value = false
  isUserMenuOpen.value = false
  await router.replace(buildAuthRedirect(route.fullPath))
}

async function handleAuthRequired(): Promise<void> {
  if (isShelllessRoute.value) return

  const authenticated = await ensureAuthenticated(true)
  if (authenticated) return

  await redirectToAuthBoundary()
}

function syncBodySurfaceMode(nextMode: 'static' | 'workflow'): void {
  if (typeof document === 'undefined') return
  document.body.classList.remove('surface-mode-static', 'surface-mode-workflow')
  document.body.classList.add(`surface-mode-${nextMode}`)
}

function clearWorkflowEscapeHintTimer(): void {
  if (workflowEscapeHintTimer === null) return
  globalThis.clearTimeout(workflowEscapeHintTimer)
  workflowEscapeHintTimer = null
}

function hideWorkflowEscapeHint(): void {
  clearWorkflowEscapeHintTimer()
  workflowHint.value = null
}

function showWorkflowHint(message: string, options: { tone?: WorkflowHintTone, durationMs?: number } = {}): void {
  const normalizedMessage = message.trim()
  if (!normalizedMessage) return

  workflowHint.value = {
    message: normalizedMessage,
    tone: options.tone ?? 'neutral',
  }
  clearWorkflowEscapeHintTimer()
  workflowEscapeHintTimer = globalThis.setTimeout(() => {
    workflowHint.value = null
    workflowEscapeHintTimer = null
  }, options.durationMs ?? 2000)
}

function handleWorkflowHintRequest(event: Event): void {
  const detail = (event as CustomEvent<WorkflowHintRequestDetail>).detail
  if (!detail?.message) return

  showWorkflowHint(detail.message, {
    tone: detail.tone,
    durationMs: detail.durationMs,
  })
}

function syncWorkflowEscapeOrigin(): void {
  if (surfaceMode.value !== 'workflow') {
    workflowEscapeOriginPath.value = null
    workflowEscapeOriginState.value = null
    hideWorkflowEscapeHint()
    return
  }

  const workflowOrigin = readWorkflowOriginFromHistoryState()
  workflowEscapeOriginState.value = workflowOrigin
  workflowEscapeOriginPath.value = workflowOrigin?.path ?? null
  if (!workflowOrigin) {
    hideWorkflowEscapeHint()
    return
  }

  showWorkflowHint(`Press Esc to go back to ${workflowOrigin.label}`, { durationMs: 2000 })
}

watch(activeTenantUserGroupId, () => {
  dataCommandActions.value = []
  if (isCommandPaletteOpen.value) {
    void loadCommandDataActions()
  }
})

watch(
  () => route.fullPath,
  () => {
    isCommandPaletteOpen.value = false
    isUserMenuOpen.value = false
    if (!isShelllessRoute.value) {
      void ensureAuthenticated()
    }
  },
)

watch(
  () => route.fullPath,
  () => {
    syncWorkflowEscapeOrigin()
  },
  { immediate: true },
)

watch(
  surfaceMode,
  (nextMode) => {
    syncBodySurfaceMode(nextMode)
  },
  { immediate: true },
)

onMounted(() => {
  recentCommandIds.value = listRecentCommandIds()
  window.addEventListener('keydown', handleKeyboard)
  window.addEventListener('mousedown', handleWindowMouseDown)
  window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired)
  document.addEventListener(WORKFLOW_HINT_REQUEST_EVENT, handleWorkflowHintRequest)
  syncBodySurfaceMode(surfaceMode.value)
  if (!isShelllessRoute.value) {
    void ensureAuthenticated()
  }
})

onBeforeUnmount(() => {
  hideWorkflowEscapeHint()
  window.removeEventListener('keydown', handleKeyboard)
  window.removeEventListener('mousedown', handleWindowMouseDown)
  window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired)
  document.removeEventListener(WORKFLOW_HINT_REQUEST_EVENT, handleWorkflowHintRequest)
  if (typeof document !== 'undefined') {
    document.body.classList.remove('surface-mode-static', 'surface-mode-workflow')
  }
})
</script>
