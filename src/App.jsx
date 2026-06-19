import { useEffect, useState } from 'react'
import { getSetting, setSetting } from './db.js'
import { TodayScreen } from './screens/TodayScreen.jsx'
import { TrendsScreen } from './screens/TrendsScreen.jsx'
import { SettingsScreen, ACCENTS } from './screens/SettingsScreen.jsx'

const TABS = [
  { id: 'today', label: 'Heute', icon: '☀️' },
  { id: 'trends', label: 'Verlauf', icon: '📈' },
  { id: 'settings', label: 'Mehr', icon: '⚙️' },
]

export default function App() {
  const [tab, setTab] = useState('today')
  const [theme, setTheme] = useState('system')
  const [accent, setAccent] = useState('sage')
  const [ready, setReady] = useState(false)

  // Einstellungen laden.
  useEffect(() => {
    Promise.all([getSetting('theme', 'system'), getSetting('accent', 'sage')]).then(([t, a]) => {
      setTheme(t)
      setAccent(a)
      setReady(true)
    })
  }, [])

  // Theme + Akzent als data-Attribute / CSS-Variablen anwenden.
  useEffect(() => {
    if (!ready) return
    const root = document.documentElement
    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.dataset.theme = dark ? 'dark' : 'light'
    const accentColor = ACCENTS.find((a) => a.id === accent)?.color || ACCENTS[0].color
    root.style.setProperty('--accent', accentColor)
    // Statusleisten-Farbe der PWA mitziehen.
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? '#0e0e10' : '#faf9f7')
  }, [theme, accent, ready])

  function changeTheme(t) {
    setTheme(t)
    setSetting('theme', t)
  }
  function changeAccent(a) {
    setAccent(a)
    setSetting('accent', a)
  }

  if (!ready) return null

  return (
    <div className="app">
      <div className="app-scroll">
        {tab === 'today' && <TodayScreen />}
        {tab === 'trends' && <TrendsScreen />}
        {tab === 'settings' && (
          <SettingsScreen theme={theme} accent={accent} onTheme={changeTheme} onAccent={changeAccent} />
        )}
      </div>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon" aria-hidden="true">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
