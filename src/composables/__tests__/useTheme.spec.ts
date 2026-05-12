import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installLocalStorageStub } from '../../test/localStorage'
import { initTheme, useTheme } from '../useTheme'

describe('useTheme', () => {
  beforeEach(() => {
    installLocalStorageStub()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initTheme returns the stored theme when one is saved', () => {
    localStorage.setItem('darpan-ui-theme', 'light')
    expect(initTheme()).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('initTheme falls back to the system preference when nothing is saved', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query.includes('light'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    } as unknown as MediaQueryList))
    expect(initTheme()).toBe('light')
  })

  it('toggleTheme persists the new value and inverts state', () => {
    initTheme()
    const { theme, toggleTheme } = useTheme()
    const before = theme.value
    toggleTheme()
    expect(theme.value).not.toBe(before)
    expect(localStorage.getItem('darpan-ui-theme')).toBe(theme.value)
  })

  it('setTheme persists the chosen mode', () => {
    initTheme()
    const { setTheme, theme } = useTheme()
    setTheme('dark')
    expect(theme.value).toBe('dark')
    expect(localStorage.getItem('darpan-ui-theme')).toBe('dark')
  })
})
