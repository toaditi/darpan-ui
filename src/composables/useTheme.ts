import { onBeforeUnmount, onMounted, ref } from 'vue'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'darpan-ui-theme'
const theme = ref<ThemeMode>('dark')
let userSelected = false

function resolveStoredTheme(input: string | null | undefined): ThemeMode | null {
  if (input === 'light' || input === 'dark') return input
  return null
}

function detectSystemTheme(): ThemeMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function applyTheme(mode: ThemeMode, persist: boolean): void {
  theme.value = mode
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', mode)
  }
  if (persist && typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, mode)
  }
}

export function initTheme(): ThemeMode {
  const stored = typeof localStorage !== 'undefined' ? resolveStoredTheme(localStorage.getItem(STORAGE_KEY)) : null
  if (stored) {
    userSelected = true
    applyTheme(stored, true)
    return stored
  }

  const initial = detectSystemTheme()
  applyTheme(initial, false)
  return initial
}

export interface UseTheme {
  theme: typeof theme
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

export function useTheme(): UseTheme {
  let mediaQuery: MediaQueryList | null = null
  const handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    if (userSelected) return
    applyTheme(event.matches ? 'light' : 'dark', false)
  }

  onMounted(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    mediaQuery.addEventListener('change', handleSystemThemeChange)
  })

  onBeforeUnmount(() => {
    if (!mediaQuery) return
    mediaQuery.removeEventListener('change', handleSystemThemeChange)
    mediaQuery = null
  })

  const setTheme = (mode: ThemeMode): void => {
    userSelected = true
    applyTheme(mode, true)
  }

  const toggleTheme = (): void => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}
