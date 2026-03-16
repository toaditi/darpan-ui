<template>
  <div class="app-shell">
    <header v-if="!isLoginRoute" class="utility-header">
      <div class="utility-brand">
        <h1 class="app-title">
          <RouterLink class="app-title-link" to="/">Darpan</RouterLink>
        </h1>
        <p class="muted-copy utility-subtitle">Connections, schema setup, and reconciliation readiness in one place.</p>
      </div>
    </header>

    <section class="content-shell">
      <RouterView />
    </section>
  </div>

  <button
    v-if="!isLoginRoute && isUserMenuOpen"
    type="button"
    class="user-menu-backdrop"
    aria-label="Close user details menu"
    @click="closeUserMenu"
  ></button>

  <div v-if="!isLoginRoute" class="floating-actions">
    <div class="user-menu-wrap">
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
        <p class="eyebrow">User details</p>
        <p class="user-menu-name">{{ userDisplayName }}</p>
        <p class="mono-copy">{{ userStatusText }}</p>

        <div class="user-menu-row">
          <span class="muted-copy">Theme</span>
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

        <p class="mono-copy user-menu-hint">Ask Darpan shortcut: Cmd/Ctrl+K</p>
      </section>
    </div>

    <button type="button" class="command-bubble" aria-label="Open command menu" @click="openCommandPalette">
      <span class="command-bubble-dot" aria-hidden="true"></span>
      <span>Ask Darpan</span>
      <span class="command-bubble-shortcut">Cmd/Ctrl+K</span>
    </button>
  </div>

  <CommandPalette
    v-if="!isLoginRoute"
    :open="isCommandPaletteOpen"
    :actions="commandActions"
    @close="closeCommandPalette"
    @execute="executeCommand"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import CommandPalette from './components/shell/CommandPalette.vue'
import { ensureAuthenticated, useAuthState } from './lib/auth'
import { useTheme } from './lib/theme'
import type { CommandAction } from './lib/types/ux'

const route = useRoute()
const router = useRouter()
const authState = useAuthState()
const { theme, toggleTheme } = useTheme()

const isCommandPaletteOpen = ref(false)
const isUserMenuOpen = ref(false)

const isLoginRoute = computed(() => route.name === 'login')
const userDisplayName = computed(() => authState.username ?? authState.userId ?? 'Unknown user')
const userStatusText = computed(() => {
  if (authState.authenticated) return 'Signed in'
  if (authState.checked) {
    return authState.error ? 'Session check failed' : 'Not signed in'
  }
  return 'Checking session'
})

const commandActions: CommandAction[] = [
  {
    id: 'navigate-hub',
    label: 'Go to Hub',
    description: 'Open module hub and readiness track.',
    group: 'Navigate',
    to: '/',
    aliases: ['home', 'dashboard', 'module hub'],
  },
  {
    id: 'navigate-llm',
    label: 'Open LLM Settings',
    description: 'Provider, model, and API key controls.',
    group: 'Navigate',
    to: '/connections/llm',
    aliases: ['connections', 'llm', 'provider'],
  },
  {
    id: 'navigate-sftp',
    label: 'Open SFTP Servers',
    description: 'Manage remote SFTP profiles.',
    group: 'Navigate',
    to: '/connections/sftp',
    aliases: ['sftp', 'server', 'connection'],
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
    id: 'navigate-ns-endpoint',
    label: 'Open NetSuite Endpoints',
    description: 'Manage endpoint URLs and timeout controls.',
    group: 'Navigate',
    to: '/connections/netsuite/endpoints',
    aliases: ['netsuite', 'endpoint', 'restlet'],
  },
  {
    id: 'navigate-read-db',
    label: 'Open Read DB',
    description: 'Manage read-only database connection profiles.',
    group: 'Navigate',
    to: '/connections/read-db',
    aliases: ['read db', 'jdbc', 'database'],
  },
  {
    id: 'navigate-schema-library',
    label: 'Open Schema Library',
    description: 'Upload, browse, validate, and edit saved schemas.',
    group: 'Navigate',
    to: '/schemas/library',
    aliases: ['schema', 'library', 'browse'],
  },
  {
    id: 'navigate-schema-infer',
    label: 'Open Schema Infer',
    description: 'Infer a schema from sample JSON payloads.',
    group: 'Navigate',
    to: '/schemas/infer',
    aliases: ['schema', 'infer', 'wizard'],
  },
  {
    id: 'navigate-schema-editor',
    label: 'Open Schema Editor',
    description: 'Edit schema JSON and flattened fields.',
    group: 'Navigate',
    to: '/schemas/editor',
    aliases: ['schema', 'editor', 'refine'],
  },
  {
    id: 'navigate-roadmap',
    label: 'Open Reconciliation Roadmap',
    description: 'View reconciliation rollout status.',
    group: 'Navigate',
    to: '/roadmap/reconciliation',
    aliases: ['reconciliation', 'roadmap', 'coming soon'],
  },
  {
    id: 'quick-new-schema',
    label: 'Quick Action: New Schema Upload',
    description: 'Jump to library upload panel.',
    group: 'Quick Actions',
    to: '/schemas/library?focus=upload',
    aliases: ['new schema', 'upload schema', 'quick'],
  },
  {
    id: 'quick-infer-schema',
    label: 'Quick Action: Infer Schema',
    description: 'Open JSON-to-schema inference page.',
    group: 'Quick Actions',
    to: '/schemas/infer',
    aliases: ['infer', 'wizard', 'sample json'],
  },
  {
    id: 'quick-add-sftp',
    label: 'Quick Action: Add SFTP Server',
    description: 'Open SFTP profile form.',
    group: 'Quick Actions',
    to: '/connections/sftp?focus=create',
    aliases: ['add sftp', 'server profile'],
  },
  {
    id: 'quick-add-ns-auth',
    label: 'Quick Action: Add NetSuite Auth',
    description: 'Open NetSuite auth profile form.',
    group: 'Quick Actions',
    to: '/connections/netsuite/auth?focus=create',
    aliases: ['add auth', 'netsuite auth', 'quick'],
  },
  {
    id: 'quick-add-endpoint',
    label: 'Quick Action: Add NetSuite Endpoint',
    description: 'Open endpoint configuration form.',
    group: 'Quick Actions',
    to: '/connections/netsuite/endpoints?focus=create',
    aliases: ['endpoint', 'restlet', 'add endpoint'],
  },
  {
    id: 'quick-add-read-db',
    label: 'Quick Action: Add Read DB Config',
    description: 'Open Read DB profile form.',
    group: 'Quick Actions',
    to: '/connections/read-db?focus=create',
    aliases: ['read db', 'jdbc', 'add config'],
  },
  {
    id: 'quick-open-llm',
    label: 'Quick Action: Open LLM Provider',
    description: 'Open provider model and key settings.',
    group: 'Quick Actions',
    to: '/connections/llm',
    aliases: ['llm', 'provider', 'openai', 'gemini'],
  },
]

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

async function executeCommand(action: CommandAction): Promise<void> {
  isCommandPaletteOpen.value = false
  if (action.to === route.fullPath) return
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
  }
}

watch(
  () => route.fullPath,
  () => {
    isCommandPaletteOpen.value = false
    isUserMenuOpen.value = false
    if (!isLoginRoute.value) {
      void ensureAuthenticated()
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeyboard)
  if (!isLoginRoute.value) {
    void ensureAuthenticated()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyboard)
})
</script>
