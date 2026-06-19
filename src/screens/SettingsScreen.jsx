import { useEffect, useRef, useState } from 'react'
import { getAllEntries, replaceAllEntries, getSetting, setSetting } from '../db.js'
import { entriesToCSV, entriesToJSON } from '../utils/derive.js'
import { encryptToEnvelope, decryptEnvelope, isEncryptedEnvelope } from '../utils/crypto.js'
import { todayISO } from '../utils/date.js'

const ACCENTS = [
  { id: 'sage', label: 'Salbei', color: '#7d9b76' },
  { id: 'clay', label: 'Ton', color: '#c08457' },
  { id: 'sky', label: 'Himmel', color: '#6c8ebf' },
  { id: 'plum', label: 'Pflaume', color: '#9b7da3' },
  { id: 'slate', label: 'Schiefer', color: '#8a8f98' },
  { id: 'coral', label: 'Koralle', color: '#e57b6a' },
  { id: 'teal', label: 'Petrol', color: '#4f9d9a' },
  { id: 'amber', label: 'Bernstein', color: '#d9a441' },
  { id: 'rose', label: 'Rosé', color: '#cf7393' },
  { id: 'indigo', label: 'Indigo', color: '#6d72c4' },
]

const THEMES = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
]

export function SettingsScreen({ theme, accent, onTheme, onAccent }) {
  const fileRef = useRef(null)
  const [importMsg, setImportMsg] = useState(null)

  // Verschlüsselter Export: Passwort-Panel.
  const [showEncExport, setShowEncExport] = useState(false)
  const [exportPw, setExportPw] = useState('')
  const [exportPw2, setExportPw2] = useState('')

  // Import einer verschlüsselten Datei: wartet auf Passwort.
  const [pendingEnvelope, setPendingEnvelope] = useState(null)
  const [importPw, setImportPw] = useState('')

  // Nicht-rauchen: Ausgangsmenge & Preise (für Streak-Ersparnis).
  const [baseline, setBaseline] = useState(10)
  const [pricePerPack, setPricePerPack] = useState(8)
  const [cigsPerPack, setCigsPerPack] = useState(20)
  useEffect(() => {
    Promise.all([
      getSetting('baselineCigsPerDay', 10),
      getSetting('pricePerPack', 8),
      getSetting('cigsPerPack', 20),
    ]).then(([b, p, c]) => {
      setBaseline(b)
      setPricePerPack(p)
      setCigsPerPack(c)
    })
  }, [])
  function saveSmoke(key, value, setter) {
    setter(value)
    if (value !== '' && !Number.isNaN(value)) setSetting(key, value)
  }

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

  async function exportEncrypted() {
    if (exportPw.length < 4) {
      setImportMsg('Bitte ein Passwort mit mindestens 4 Zeichen wählen.')
      return
    }
    if (exportPw !== exportPw2) {
      setImportMsg('Die Passwörter stimmen nicht überein.')
      return
    }
    const entries = await getAllEntries()
    const payload = { app: 'tagwerk', version: 1, exportedAt: new Date().toISOString(), entries }
    const envelope = await encryptToEnvelope(payload, exportPw)
    download(`tagwerk-${todayISO()}.tagwerk.json`, envelope, 'application/json')
    setShowEncExport(false)
    setExportPw('')
    setExportPw2('')
    setImportMsg('Verschlüsselte Datei exportiert. Bewahre das Passwort gut auf – ohne geht nichts mehr.')
  }

  // Gemeinsamer Schreibpfad für ent-/verschlüsselte Backups.
  async function applyPayload(data) {
    const entries = Array.isArray(data) ? data : data.entries
    if (!Array.isArray(entries)) throw new Error('Kein gültiges Tagwerk-Backup.')
    const clean = entries
      .filter((x) => x && typeof x.date === 'string')
      .map((x) => ({ date: x.date, values: x.values || {}, updatedAt: x.updatedAt || Date.now() }))
    await replaceAllEntries(clean)
    return clean.length
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (isEncryptedEnvelope(data)) {
        // Verschlüsselt: Passwort erfragen, Import danach fortsetzen.
        setPendingEnvelope(data)
        setImportPw('')
        setImportMsg(null)
        return
      }
      const n = await applyPayload(data)
      setImportMsg(`${n} Tage importiert.`)
    } catch (err) {
      setImportMsg('Import fehlgeschlagen: ' + err.message)
    } finally {
      e.target.value = ''
    }
  }

  async function confirmDecryptImport() {
    try {
      const data = await decryptEnvelope(pendingEnvelope, importPw)
      const n = await applyPayload(data)
      setPendingEnvelope(null)
      setImportPw('')
      setImportMsg(`${n} Tage entschlüsselt und importiert.`)
    } catch (err) {
      setImportMsg(err.message)
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

          {!showEncExport ? (
            <button className="btn" onClick={() => { setShowEncExport(true); setImportMsg(null) }}>
              🔒 Verschlüsselt exportieren
            </button>
          ) : (
            <div className="pw-panel">
              <p className="pw-hint">Passwort wählen. Es schützt die Datei und lässt sich nicht wiederherstellen.</p>
              <input
                type="password"
                className="text-input"
                placeholder="Passwort"
                autoComplete="new-password"
                value={exportPw}
                onChange={(e) => setExportPw(e.target.value)}
              />
              <input
                type="password"
                className="text-input"
                placeholder="Passwort wiederholen"
                autoComplete="new-password"
                value={exportPw2}
                onChange={(e) => setExportPw2(e.target.value)}
              />
              <div className="pw-actions">
                <button className="btn" onClick={exportEncrypted}>Verschlüsseln & speichern</button>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setShowEncExport(false); setExportPw(''); setExportPw2('') }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            Importieren (JSON oder verschlüsselt)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImport}
          />

          {pendingEnvelope && (
            <div className="pw-panel">
              <p className="pw-hint">🔒 Verschlüsselte Datei erkannt. Passwort eingeben, um sie zu importieren.</p>
              <input
                type="password"
                className="text-input"
                placeholder="Passwort"
                autoComplete="current-password"
                value={importPw}
                onChange={(e) => setImportPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmDecryptImport()}
              />
              <div className="pw-actions">
                <button className="btn" onClick={confirmDecryptImport}>Entschlüsseln & importieren</button>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setPendingEnvelope(null); setImportPw('') }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {importMsg && <p className="import-msg">{importMsg}</p>}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Nicht rauchen</h2>
        <p className="card-intro">
          Damit Tagwerk deine rauchfreie Serie und das gesparte Geld berechnen kann.
        </p>
        <div className="setting-row">
          <label className="setting-label">Früher pro Tag</label>
          <div className="number-row">
            <input
              type="number"
              inputMode="numeric"
              className="text-input number-input"
              value={baseline}
              onChange={(e) => saveSmoke('baselineCigsPerDay', Number(e.target.value), setBaseline)}
            />
            <span className="counter-unit">Zig.</span>
          </div>
        </div>
        <div className="setting-row">
          <label className="setting-label">Preis pro Schachtel</label>
          <div className="number-row">
            <input
              type="number"
              inputMode="decimal"
              step="0.10"
              className="text-input number-input"
              value={pricePerPack}
              onChange={(e) => saveSmoke('pricePerPack', Number(e.target.value), setPricePerPack)}
            />
            <span className="counter-unit">€</span>
          </div>
        </div>
        <div className="setting-row">
          <label className="setting-label">Zigaretten pro Schachtel</label>
          <div className="number-row">
            <input
              type="number"
              inputMode="numeric"
              className="text-input number-input"
              value={cigsPerPack}
              onChange={(e) => saveSmoke('cigsPerPack', Number(e.target.value), setCigsPerPack)}
            />
            <span className="counter-unit">Stk.</span>
          </div>
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
