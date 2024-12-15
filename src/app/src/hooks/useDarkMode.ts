import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    const theme = localStorage.getItem('theme')
    return theme === 'dark'
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  return { isDark, toggle: () => setIsDark(!isDark) }
} 