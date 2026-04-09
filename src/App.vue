<template>
  <a class="skip-link" href="#main-content">Skip to main content</a>

  <div :class="['app-shell', `app-shell--${surfaceMode}`]">
    <section id="main-content" :class="['content-shell', `content-shell--${surfaceMode}`]" tabindex="-1">
      <RouterView />
    </section>
  </div>

  <div v-if="workflowEscapeHintLabel" class="workflow-escape-hint" role="status" aria-live="polite">
    Press Esc to go back to {{ workflowEscapeHintLabel }}
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

          <div class="user-menu-row">
            <button
              type="button"
              class="theme-toggle"
              :class="{ dark: theme === 'dark', light: theme === 'light' }"
              :aria-label="`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`"
              :aria-pressed="theme === 'dark'"
              @click="toggleTheme"
            >
              <span class="theme-toggle-icon theme-toggle-sun" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.5" />
                  <path d="M12 2.5v3.2M12 18.3v3.2M21.5 12h-3.2M5.7 12H2.5M18.7 5.3l-2.3 2.3M7.6 16.4l-2.3 2.3M18.7 18.7l-2.3-2.3M7.6 7.6 5.3 5.3" />
                </svg>
              </span>
              <span class="theme-toggle-icon theme-toggle-moon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path d="M15.7 3.2a8.7 8.7 0 1 0 5.1 15.6 9.8 9.8 0 1 1-5.1-15.6Z" />
                </svg>
              </span>
              <span class="theme-toggle-thumb" aria-hidden="true"></span>
              <span class="sr-only">Toggle theme</span>
            </button>
          </div>

          <div class="user-menu-actions">
            <button type="button" class="user-menu-logout" :disabled="isLoggingOut" @click="handleLogout">
              {{ isLoggingOut ? 'Signing out...' : 'Sign Out' }}
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
    @close="closeCommandPalette"
    @execute="executeCommand"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import CommandPalette from './components/shell/CommandPalette.vue'
import { buildAuthRedirect, ensureAuthenticated, logoutSession, useAuthState } from './lib/auth'
import { AUTH_REQUIRED_EVENT } from './lib/api/client'
import { listRecentCommandIds, recordRecentCommand } from './lib/commandSearch'
import { shouldAbortWorkflowOnEscape } from './lib/keyboard'
import { purgeLegacyReconciliationDrafts } from './lib/reconciliationDrafts'
import { useTheme } from './lib/theme'
import type { CommandAction } from './lib/types/ux'
import { buildWorkflowOriginState, readWorkflowOriginFromHistoryState, resolveStaticPageLabel } from './lib/workflowOrigin'

const route = useRoute()
const router = useRouter()
const authState = useAuthState()
const { theme, toggleTheme } = useTheme()

const isCommandPaletteOpen = ref(false)
const isUserMenuOpen = ref(false)
const isLoggingOut = ref(false)
const recentCommandIds = ref<string[]>([])
const userMenuWrap = ref<HTMLElement | null>(null)
const workflowEscapeHintLabel = ref<string | null>(null)
const workflowEscapeOriginPath = ref<string | null>(null)

const isShelllessRoute = computed(() => route.name === 'login')
const surfaceMode = computed<'static' | 'workflow'>(() => (route.meta.surfaceMode === 'workflow' ? 'workflow' : 'static'))
const userDisplayName = computed(() => authState.username ?? authState.userId ?? 'Unknown user')
const userStatusText = computed<string | null>(() => {
  if (isLoggingOut.value) return 'Signing out'
  if (authState.authenticated) return null
  if (authState.status === 'verification-failed') return 'Session check failed'
  if (authState.checked) return 'Not signed in'
  return 'Checking session'
})

const commandActions: CommandAction[] = [
  {
    id: 'navigate-hub',
    label: 'Go to Dashboard',
    description: 'See the main workspace, setup areas, and reconciliation entry points.',
    group: 'Navigate',
    to: '/',
    aliases: ['home', 'dashboard', 'start', 'main page', 'overview'],
  },
  {
    id: 'navigate-llm',
    label: 'Open AI Settings',
    description: 'Manage providers, models, and API keys.',
    group: 'Navigate',
    to: '/settings/ai',
    aliases: ['ai', 'llm', 'openai', 'gemini', 'api key', 'model settings', 'change api key'],
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
    id: 'navigate-netsuite',
    label: 'Open NetSuite Settings',
    description: 'Manage NetSuite auth profiles and endpoint configs.',
    group: 'Navigate',
    to: '/settings/netsuite',
    aliases: ['netsuite', 'login', 'credentials', 'token', 'oauth', 'auth', 'endpoint', 'api url', 'restlet', 'timeout', 'settings'],
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
    to: '/reconciliation/pilot-diff',
    aliases: ['compare files', 'compare data', 'match records', 'reconcile data', 'run comparison', 'execute', 'diff', 'pilot'],
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

const workflowRoutePaths = new Set(['/reconciliation/create', '/reconciliation/pilot-diff', '/schemas/create'])
let workflowEscapeHintTimer: ReturnType<typeof globalThis.setTimeout> | null = null

function openCommandPalette(): void {
  isUserMenuOpen.value = false
  isCommandPaletteOpen.value = true
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

  isCommandPaletteOpen.value = false
  isUserMenuOpen.value = false
  if (options.clearFocus) clearActiveElementFocus()
  if (route.fullPath === targetPath) return
  await router.push(targetPath)
  if (options.clearFocus) {
    await nextTick()
    clearActiveElementFocus()
  }
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
  if (staticPageLabel && workflowRoutePaths.has(action.to)) {
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
    isCommandPaletteOpen.value = true
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

  if (shouldAbortWorkflowOnEscape(event, { workflowActive: surfaceMode.value === 'workflow' })) {
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
  workflowEscapeHintLabel.value = null
}

function syncWorkflowEscapeOrigin(): void {
  if (surfaceMode.value !== 'workflow') {
    workflowEscapeOriginPath.value = null
    hideWorkflowEscapeHint()
    return
  }

  const workflowOrigin = readWorkflowOriginFromHistoryState()
  workflowEscapeOriginPath.value = workflowOrigin?.path ?? null
  if (!workflowOrigin) {
    hideWorkflowEscapeHint()
    return
  }

  workflowEscapeHintLabel.value = workflowOrigin.label
  clearWorkflowEscapeHintTimer()
  workflowEscapeHintTimer = globalThis.setTimeout(() => {
    workflowEscapeHintLabel.value = null
    workflowEscapeHintTimer = null
  }, 2000)
}

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
  purgeLegacyReconciliationDrafts()
  recentCommandIds.value = listRecentCommandIds()
  window.addEventListener('keydown', handleKeyboard)
  window.addEventListener('mousedown', handleWindowMouseDown)
  window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired)
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
  if (typeof document !== 'undefined') {
    document.body.classList.remove('surface-mode-static', 'surface-mode-workflow')
  }
})
</script>
