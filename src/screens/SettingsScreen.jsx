import { useRef, useState } from 'react'
import { getAllEntries, replaceAllEntries } from '../db.js'
import { entriesToCSV, entriesToJSON } from '../utils/derive.js'
import { todayISO } from '../utils/date.js'

const ACCENTS = [
  { id: 'sage', label: 'Salbei', color: '#7d9b76' },
  { id: 'clay', label: 'Ton', color: '#c08457' },
  { id: 'sky', label: 'Himmel', color: '#6c8ebf' },
  { id: 'plum', label: 'Pflaume', color: '#9b7da3' },
  { id: 'slate', label: 'Schiefer', color: '#8a8f98' },
]

const THEMES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
]

export function SettingsScreen({ theme, accent, onTheme, onAccent }) {
  const fileRef = useRef(null)
  const [importMsg, setImportMsg] = useState(null)

  async function download(filename, text, type) {
    const blob = new Blob([text], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportJSON() {
    const entries = await getAllEntries()
    download(`tagwerk-${todayISO()}.json`, entriesToJSON(entries), 'application/json')
  }

  async function exportCSV() {
    const entries = await getAllEntries()
    download(`tagwerk-${todayISO()}.csv`, entriesToCSV(entries), 'text/csv')
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const entries = Array.isArray(data) ? data : data.entries
      if (!Array.isArray(entries)) throw new Error('Kein gültiges Tagwerk-Backup.')
      const clean = entries
        .filter((x) => x && typeof x.date === 'string')
        .map((x) => ({ date: x.date, values: x.values || {}, updatedAt: x.updatedAt || Date.now() }))
      await replaceAllEntries(clean)
      setImportMsg(`${clean.length} Tage importiert.`)
    } catch (err) {
      setImportMsg('Import fehlgeschlagen: ' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="screen settings">
      <header className="screen-head">
        <h1 className="screen-title">Einstellungen</h1>
      </header>

      <section className="card">
        <h2 className="card-title">Erscheinungsbild</h2>
        <div className="setting-block">
          <span className="setting-label">Modus</span>
          <div className="segments">
            {THEMES.map((t) => (
              <button key={t.id} className={`segment ${theme === t.id ? 'on' : ''}`} onClick={() => onTheme(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-block">
          <span className="setting-label">Akzent</span>
          <div className="accent-row">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                className={`accent-swatch ${accent === a.id ? 'on' : ''}`}
                style={{ '--swatch': a.color }}
                onClick={() => onAccent(a.id)}
                aria-label={a.label}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Deine Daten</h2>
        <p className="card-intro">Gehören dir. Exportiere sie jederzeit – sie verlassen sonst nie dieses Gerät.</p>
        <div className="btn-col">
          <button className="btn" onClick={exportCSV}>Als CSV exportieren</button>
          <button className="btn" onClick={exportJSON}>Als JSON exportieren</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Aus JSON importieren
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
          {importMsg && <p className="import-msg">{importMsg}</p>}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Über Tagwerk</h2>
        <p className="card-intro">
          Ein ruhiges Tagebuch für deine Werte – ohne Konto, ohne Cloud, ohne Wertung.
          Keine Diagnosen, keine Bewertungen: nur deine Zahlen, klar sichtbar.
        </p>
      </section>
    </div>
  )
}

export { ACCENTS }
