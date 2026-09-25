import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage.js'

export const THEME_KEY = 'todo-app.theme'

// 初回訪問時は OS の設定(ダーク/ライト)に合わせる
function systemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// 'light' | 'dark' を localStorage に保存し、<html data-theme> に反映する
export function useTheme() {
  const [stored, setStored] = useLocalStorage(THEME_KEY, systemTheme())
  const theme = stored === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const toggleTheme = () => setStored(theme === 'dark' ? 'light' : 'dark')

  return [theme, toggleTheme]
}
