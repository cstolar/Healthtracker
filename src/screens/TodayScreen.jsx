import { useEffect, useState, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getEntry, saveEntry, getAllEntries } from '../db.js'
import { SCHEMA } from '../schema.js'
import { AreaCard } from '../components/AreaCard.jsx'
import { greeting, relativeLabel, formatLong, todayISO, addDays, isFuture } from '../utils/date.js'
import { noPornStreak, smokeFreeStreak } from '../utils/derive.js'

// Startscreen = Heute-Check-in. Begrüßung, Datum, Bereiche als Karten.
export function TodayScreen() {
  const [date, setDate] = useState(todayISO())
  const [values, setValues] = useState(null)
  const saveTimer = useRef(null)

  // Eintrag des gewählten Tages laden.
  useEffect(() => {
    let active = true
    getEntry(date).then((e) => {
      if (active) setValues(e.values || {})
    })
    return () => {
      active = false
    }
  }, [date])

  // Streaks live aus allen Einträgen.
  const allEntries = useLiveQuery(() => getAllEntries(), [], [])
  const npStreak = noPornStreak(allEntries)
  const sfStreak = smokeFreeStreak(allEntries)

  // Feld ändern -> Zustand + entprellt speichern (kein Speichern-Button nötig).
  function handleChange(fieldId, value) {
    setValues((prev) => {
      const next = { ...prev }
      if (value === undefined) delete next[fieldId]
      else next[fieldId] = value
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => saveEntry(date, next), 300)
      return next
    })
  }

  if (values === null) return <div className="screen" />

  const isToday = date === todayISO()
  const filledPerArea = (area) =>
    area.fields.filter((f) => {
      const v = values[f.id]
      return v !== undefined && v !== null && v !== '' && v !== false
    }).length

  return (
    <div className="screen today">
      <header className="today-head">
        {isToday ? (
          <>
            <p className="today-greet">{greeting()}.</p>
            <h1 className="today-date">{formatLong(date)}</h1>
            <p className="today-sub">Nimm dir einen Moment. Trag ein, was da ist.</p>
          </>
        ) : (
          <>
            <p className="today-greet">{relativeLabel(date)}</p>
            <h1 className="today-date">{formatLong(date)}</h1>
            <p className="today-sub">Frühere Tage kannst du in Ruhe nachtragen.</p>
          </>
        )}

        <div className="day-nav">
          <button className="day-nav-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Tag zurück">
            ‹
          </button>
          {!isToday && (
            <button className="day-nav-today" onClick={() => setDate(todayISO())}>
              heute
            </button>
          )}
          <button
            className="day-nav-btn"
            onClick={() => !isFuture(addDays(date, 1)) && setDate(addDays(date, 1))}
            disabled={isFuture(addDays(date, 1))}
            aria-label="Tag vor"
          >
            ›
          </button>
        </div>

        {(npStreak > 0 || sfStreak > 0) && (
          <div className="streak-row">
            {npStreak > 0 && (
              <span className="streak-pill">🌿 {npStreak} Tag{npStreak === 1 ? '' : 'e'} kein Porno</span>
            )}
            {sfStreak > 0 && (
              <span className="streak-pill">💨 {sfStreak} Tag{sfStreak === 1 ? '' : 'e'} rauchfrei</span>
            )}
          </div>
        )}
      </header>

      <main className="cards">
        {SCHEMA.map((area) => (
          <AreaCard
            key={area.id}
            area={area}
            values={values}
            onChange={handleChange}
            filledCount={filledPerArea(area)}
          />
        ))}
        <p className="today-foot">Alles automatisch gespeichert. Nur auf diesem Gerät. ☁️✗</p>
      </main>
    </div>
  )
}
