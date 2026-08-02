import { useEffect, useState } from 'react'

function getInitialTheme() {
  const saved = localStorage.getItem('yurtpano_theme')
  if (saved === 'dark' || saved === 'light') return saved
  // Kayitli tercih yoksa isletim sistemi/tarayici tercihini kullan
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle({ inline = false }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('yurtpano_theme', theme)
  }, [theme])

  return (
    <button
      type="button"
      className={inline ? 'theme-toggle theme-toggle-inline' : 'theme-toggle'}
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      title={theme === 'dark' ? 'Aydinlik moda gec' : 'Karanlik moda gec'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
