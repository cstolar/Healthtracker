// Auswertungen: Streaks, Durchschnitte, Konfounder, Serien für Charts.
// Rein deskriptiv – keine medizinische Wertung, nur deine Zahlen.

import { ALL_FIELDS, durationHours } from '../schema.js'
import { addDays, todayISO, formatShort } from './date.js'

// Wert eines Feldes für einen Eintrag holen (inkl. berechneter Felder).
export function fieldValue(entry, field) {
  if (!entry) return undefined
  const v = entry.values || {}
  if (field.type === 'computed') return field.compute(v)
  return v[field.id]
}

// Eintrag gilt als "ausgefüllt", wenn mindestens ein Feld gesetzt ist.
export function isEntryFilled(entry) {
  if (!entry || !entry.values) return false
  return Object.values(entry.values).some(
    (v) => v !== undefined && v !== null && v !== '' && v !== false
  )
}

// Map date -> entry für schnellen Zugriff.
function indexByDate(entries) {
  const map = new Map()
  for (const e of entries) map.set(e.date, e)
  return map
}

// Streak: aufeinanderfolgende Tage (rückwärts ab heute), an denen predicate(entry) true ist.
// Tage ohne Eintrag brechen die Serie NICHT, wenn breakOnMissing=false (z.B. rauchfrei),
// brechen sie aber, wenn breakOnMissing=true (z.B. "Kein-Porno eingehalten").
export function streak(entries, predicate, { breakOnMissing = true } = {}) {
  const map = indexByDate(entries)
  let count = 0
  let cursor = todayISO()
  // Wenn heute noch kein Eintrag existiert, beim gestrigen Tag beginnen.
  if (!map.has(cursor)) cursor = addDays(cursor, -1)
  for (let i = 0; i < 3650; i++) {
    const e = map.get(cursor)
    if (!e) {
      if (breakOnMissing) break
      cursor = addDays(cursor, -1)
      continue
    }
    if (predicate(e)) {
      count++
      cursor = addDays(cursor, -1)
    } else {
      break
    }
  }
  return count
}

// Vordefinierte Streaks der App.
export function noPornStreak(entries) {
  return streak(entries, (e) => e.values?.noPornKept === true, { breakOnMissing: true })
}

export function smokeFreeStreak(entries) {
  // rauchfrei = 0 Zigaretten an dem Tag (fehlende Tage brechen nicht ab)
  return streak(entries, (e) => (e.values?.cigarettes || 0) === 0, { breakOnMissing: false })
}

// Längste rauchfreie Serie aller Zeiten: längste Kette aufeinanderfolgender
// Kalendertage mit protokollierten 0 Zigaretten.
export function longestSmokeFreeStreak(entries) {
  const free = entries
    .filter((e) => e.values && e.values.cigarettes === 0)
    .map((e) => e.date)
    .sort()
  let best = 0
  let run = 0
  let prev = null
  for (const d of free) {
    if (prev && addDays(prev, 1) === d) run += 1
    else run = 1
    if (run > best) best = run
    prev = d
  }
  return best
}

// Nicht gerauchte Zigaretten gegenüber einer Ausgangsmenge pro Tag.
export function nonSmokedTotal(entries, baselinePerDay) {
  let sum = 0
  for (const e of entries) {
    if (!e.values || e.values.cigarettes === undefined) continue
    sum += Math.max(0, baselinePerDay - (e.values.cigarettes || 0))
  }
  return sum
}

export function moneySaved(entries, baselinePerDay, pricePerCig) {
  return nonSmokedTotal(entries, baselinePerDay) * pricePerCig
}

// Häufigkeit der Verlangens-Auslöser über alle Tage (für Mustererkennung).
export function triggerFrequency(entries, options) {
  const counts = new Map(options.map((o) => [o.value, 0]))
  for (const e of entries) {
    const sel = e.values?.cravingTrigger
    if (!Array.isArray(sel)) continue
    for (const v of sel) counts.set(v, (counts.get(v) || 0) + 1)
  }
  return options
    .map((o) => ({ value: o.value, label: o.label, count: counts.get(o.value) || 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
}

// Verlangens-Verlauf inkl. Konfounder-Flags (viel Alkohol / hoher Stress).
export function cravingSeries(entries, fromIso) {
  const out = []
  for (const e of entries) {
    if (fromIso && e.date < fromIso) continue
    const v = e.values || {}
    if (v.cravingMax === undefined || v.cravingMax === null) continue
    out.push({
      date: e.date,
      label: formatShort(e.date),
      craving: Number(v.cravingMax),
      highAlcohol: (v.alcohol || 0) >= 4,
      highStress: (v.stress || 0) >= 4,
    })
  }
  return out
}

// Zeitreihe einer Metrik: [{date, label, value}], nur Tage mit Wert.
export function metricSeries(entries, field, fromIso) {
  const out = []
  for (const e of entries) {
    if (fromIso && e.date < fromIso) continue
    let v
    if (field.type === 'computed') v = field.compute(e.values || {})
    else v = e.values?.[field.id]
    if (v === undefined || v === null || v === '') continue
    out.push({ date: e.date, label: formatShort(e.date), value: Number(v) })
  }
  return out
}

// EHS-3-Linien-Serie: morgens / allein / Partnersex, plus Konfounder-Flags.
export function ehsSeries(entries, fromIso) {
  const out = []
  for (const e of entries) {
    if (fromIso && e.date < fromIso) continue
    const v = e.values || {}
    const morning = numOrNull(v.morningEHS)
    const solo = v.masturbation ? numOrNull(v.masturbationEHS) : null
    const partner = v.partnerSex ? numOrNull(v.partnerEHS) : null
    if (morning === null && solo === null && partner === null) continue
    out.push({
      date: e.date,
      label: formatShort(e.date),
      morgens: morning,
      allein: solo,
      partner,
      // Konfounder
      highAlcohol: (v.alcohol || 0) >= 4,
      cannabis: v.cannabis === true,
    })
  }
  return out
}

function numOrNull(x) {
  if (x === undefined || x === null || x === '') return null
  return Number(x)
}

// Wochenrückblick: Zeitraum [fromIso, today].
export function weeklySummary(entries, fromIso) {
  const inRange = entries.filter((e) => e.date >= fromIso && isEntryFilled(e))
  const avg = (field) => {
    const vals = inRange
      .map((e) =>
        field.type === 'computed' ? field.compute(e.values || {}) : e.values?.[field.id]
      )
      .filter((x) => x !== undefined && x !== null && x !== '')
      .map(Number)
    if (!vals.length) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }
  const f = (id) => ALL_FIELDS.find((x) => x.id === id)
  return {
    entryCount: inRange.length,
    avgMood: avg(f('mood')),
    avgStress: avg(f('stress')),
    avgSleep: avg(f('sleepDuration')),
    avgMorningEHS: avg(f('morningEHS')),
    avgSensitivity: avg(f('glansSensitivity')),
    alcoholDays: inRange.filter((e) => (e.values?.alcohol || 0) > 0).length,
    exerciseDays: inRange.filter((e) => e.values?.exercised === true).length,
  }
}

// ---- Export -------------------------------------------------------------

export function entriesToJSON(entries) {
  return JSON.stringify({ app: 'tagwerk', version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)
}

export function entriesToCSV(entries) {
  // Spalten: date + alle Feld-IDs (ohne reine UI-Felder wie das Schlaffenster).
  const cols = ['date', ...ALL_FIELDS.filter((f) => f.type !== 'sleepwindow').map((f) => f.id)]
  const header = cols.join(',')
  const rows = entries.map((e) => {
    return cols
      .map((c) => {
        if (c === 'date') return e.date
        const field = ALL_FIELDS.find((f) => f.id === c)
        let val = field?.type === 'computed' ? field.compute(e.values || {}) : e.values?.[c]
        return csvCell(val)
      })
      .join(',')
  })
  return [header, ...rows].join('\n')
}

function csvCell(val) {
  if (val === undefined || val === null) return ''
  if (typeof val === 'boolean') return val ? 'ja' : 'nein'
  const s = String(val)
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export { durationHours }
