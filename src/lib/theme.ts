import { ref } from 'vue'

export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'darpan-ui-theme'
const theme = ref<ThemeMode>('dark')

function resolveTheme(input: string | null | undefined): ThemeMode {
  return input === 'light' ? 'light' : 'dark'
}

function applyTheme(mode: ThemeMode): void {
  theme.value = mode
  document.documentElement.setAttribute('data-theme', mode)
  localStorage.setItem(STORAGE_KEY, mode)
}

export function initTheme(): ThemeMode {
  const saved = resolveTheme(localStorage.getItem(STORAGE_KEY))
  applyTheme(saved)
  return saved
}

export function useTheme() {
  const setTheme = (mode: ThemeMode): void => {
    applyTheme(mode)
  }

  const toggleTheme = (): void => {
    applyTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    setTheme,
    toggleTheme,
  }
}
