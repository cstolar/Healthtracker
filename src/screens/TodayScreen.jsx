import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getEntry, saveEntry, getAllEntries, getSetting } from '../db.js'
import { SCHEMA, getField } from '../schema.js'
import { FieldRenderer } from '../components/Fields.jsx'
import { greeting, relativeLabel, formatLong, todayISO, addDays, isFuture } from '../utils/date.js'
import { noPornStreak, smokeFreeStreak, moneySaved } from '../utils/derive.js'

// Eingabetypen, die einen eindeutigen Abschluss haben -> Auto-Advance nach Tap.
const AUTO_ADVANCE = new Set(['scale', 'toggle', 'select'])

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Geordnete Frage-Sequenz aus dem Schema: Intro → je Bereich (Sektions-Screen +
// Fragen) → Abschluss. Datengetrieben; neue Felder reihen sich automatisch ein.
function buildSteps() {
  const steps = [{ kind: 'intro' }]
  for (const area of SCHEMA) {
    steps.push({ kind: 'section', areaId: area.id, title: area.title, emoji: area.emoji, intro: area.intro })
    for (const field of area.fields) {
      if (field.type === 'computed') continue // berechnete Felder sind keine Fragen
      steps.push({ kind: 'question', areaId: area.id, field })
    }
  }
  steps.push({ kind: 'done' })
  return steps
}

export function TodayScreen() {
  const steps = useMemo(buildSteps, [])
  const motionOK = useMemo(() => !prefersReducedMotion(), [])

  const [date, setDate] = useState(todayISO())
  const [values, setValues] = useState(null)
  const [index, setIndex] = useState(0)
  const [anim, setAnim] = useState('enter')
  const [dir, setDir] = useState('fwd')

  // Refs für Zugriff aus Timeouts (Navigation/Auto-Advance/Speichern).
  const valuesRef = useRef({})
  const indexRef = useRef(0)
  const dateRef = useRef(date)
  const saveTimer = useRef(null)
  const advanceTimer = useRef(null)

  indexRef.current = index
  dateRef.current = date

  // Eintrag des Tages laden; Sequenz auf Anfang.
  useEffect(() => {
    let active = true
    getEntry(date).then((e) => {
      if (!active) return
      valuesRef.current = e.values || {}
      setValues(e.values || {})
      setIndex(0)
      setAnim('enter')
    })
    return () => {
      active = false
    }
  }, [date])

  // Streaks & gespartes Geld live aus allen Einträgen.
  const allEntries = useLiveQuery(() => getAllEntries(), [], [])
  const [smokeCfg, setSmokeCfg] = useState({ baseline: 10, pricePerCig: 8 / 20 })
  useEffect(() => {
    Promise.all([
      getSetting('baselineCigsPerDay', 10),
      getSetting('pricePerPack', 8),
      getSetting('cigsPerPack', 20),
    ]).then(([baseline, pack, perPack]) =>
      setSmokeCfg({ baseline, pricePerCig: pack / (perPack || 20) })
    )
  }, [])

  // --- Persistenz ---------------------------------------------------------
  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveEntry(dateRef.current, valuesRef.current), 300)
  }

  function setVal(fieldId, value) {
    setValues((prev) => {
      const next = { ...prev }
      if (value === undefined || value === null || value === '') delete next[fieldId]
      else next[fieldId] = value
      valuesRef.current = next
      scheduleSave()
      return next
    })
  }

  // --- Navigation ---------------------------------------------------------
  const isQuestionVisible = (step) =>
    step.kind !== 'question' || !step.field.showIf || step.field.showIf(valuesRef.current)

  function nextIndex(from) {
    for (let j = from + 1; j < steps.length; j++) {
      if (steps[j].kind === 'question' && !isQuestionVisible(steps[j])) continue
      return j
    }
    return steps.length - 1
  }

  function prevIndex(from) {
    // Beim Zurück Sektions-Screens überspringen und auf einer Frage/Intro landen.
    for (let j = from - 1; j >= 0; j--) {
      if (steps[j].kind === 'section') continue
      if (steps[j].kind === 'question' && !isQuestionVisible(steps[j])) continue
      return j
    }
    return 0
  }

  function go(to, direction) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setDir(direction)
    if (!motionOK) {
      setIndex(to)
      setAnim('enter')
      return
    }
    setAnim('exit')
    setTimeout(() => {
      setIndex(to)
      setAnim('enter')
    }, 200)
  }

  function handleChange(fieldId, value) {
    setVal(fieldId, value)
    const f = getField(fieldId)
    if (f && AUTO_ADVANCE.has(f.type) && value !== undefined) {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
      advanceTimer.current = setTimeout(
        () => go(nextIndex(indexRef.current), 'fwd'),
        motionOK ? 320 : 120
      )
    } else if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
    }
  }

  function confirm(field) {
    // Zähler ohne Eingabe ausdrücklich mit Startwert (z.B. 0 Zigaretten) sichern.
    if (field.type === 'counter' && valuesRef.current[field.id] === undefined) {
      setVal(field.id, field.min ?? 0)
    }
    go(nextIndex(indexRef.current), 'fwd')
  }

  // Sektions-Screens nach kurzer Ruhe automatisch weiterblenden (nur vorwärts).
  useEffect(() => {
    if (steps[index].kind !== 'section' || dir !== 'fwd') return
    const t = setTimeout(() => go(nextIndex(index), 'fwd'), motionOK ? 950 : 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, dir])

  if (values === null) return <div className="screen flow" />

  const step = steps[index]

  // Fortschritt über sichtbare Fragen.
  const visibleQuestions = steps.filter((s) => s.kind === 'question' && isQuestionVisible(s))
  const passed = steps
    .slice(0, index)
    .filter((s) => s.kind === 'question' && isQuestionVisible(s)).length
  const progress = visibleQuestions.length ? passed / visibleQuestions.length : 0

  const npStreak = noPornStreak(allEntries)
  const sfStreak = smokeFreeStreak(allEntries)

  return (
    <div className="screen flow">
      {/* Kopfzeile: Zurück + Fortschritt (nur in Fragen sichtbar) */}
      <div className="flow-top">
        {step.kind !== 'intro' ? (
          <button className="flow-back" onClick={() => go(prevIndex(index), 'back')} aria-label="Zurück">
            ‹
          </button>
        ) : (
          <span className="flow-back placeholder" />
        )}
        {step.kind === 'question' && (
          <div className="progress" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        )}
        <span className="flow-back placeholder" />
      </div>

      <div className={`step ${anim} ${dir}`}>
        {step.kind === 'intro' && (
          <IntroScreen
            date={date}
            setDate={setDate}
            onStart={() => go(nextIndex(0), 'fwd')}
            npStreak={npStreak}
            sfStreak={sfStreak}
          />
        )}

        {step.kind === 'section' && (
          <div className="section-screen">
            <span className="section-emoji" aria-hidden="true">{step.emoji}</span>
            <h2 className="section-title">{step.title}</h2>
            {step.intro && <p className="section-intro">{step.intro}</p>}
          </div>
        )}

        {step.kind === 'question' && (
          <QuestionScreen
            field={step.field}
            values={values}
            onChange={handleChange}
            onConfirm={() => confirm(step.field)}
            onSkip={() => go(nextIndex(index), 'fwd')}
          />
        )}

        {step.kind === 'done' && (
          <DoneScreen
            date={date}
            npStreak={npStreak}
            sfStreak={sfStreak}
            money={moneySaved(allEntries, smokeCfg.baseline, smokeCfg.pricePerCig)}
            onRestart={() => go(0, 'back')}
          />
        )}
      </div>
    </div>
  )
}

// --- Intro ------------------------------------------------------------------
function IntroScreen({ date, setDate, onStart, npStreak, sfStreak }) {
  const isToday = date === todayISO()
  return (
    <div className="intro-screen">
      <p className="today-greet">{isToday ? `${greeting()}.` : relativeLabel(date)}</p>
      <h1 className="today-date">{formatLong(date)}</h1>
      <p className="today-sub">
        {isToday ? 'Nimm dir einen Moment. Eine Frage nach der anderen.' : 'Trag in Ruhe nach.'}
      </p>

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
          {sfStreak > 0 && <span className="streak-pill">🚭 {sfStreak} Tage rauchfrei</span>}
          {npStreak > 0 && <span className="streak-pill">🌿 {npStreak} Tage kein Porno</span>}
        </div>
      )}

      <button className="btn flow-start" onClick={onStart}>
        Beginnen
      </button>
    </div>
  )
}

// --- Eine Frage -------------------------------------------------------------
function QuestionScreen({ field, values, onChange, onConfirm, onSkip }) {
  const isAuto = AUTO_ADVANCE.has(field.type)
  return (
    <div className="question-screen">
      <div className="question-head">
        {field.when && (
          <span className={`when when-${field.when}`}>{field.when === 'today' ? 'heute' : 'gestern'}</span>
        )}
        <h2 className="question-title">{field.label}</h2>
        {field.hint && <p className="question-hint">{field.hint}</p>}
      </div>

      <div className="question-body">
        <FieldRenderer field={{ ...field, hideLabel: true }} values={values} onChange={onChange} />
      </div>

      <div className="question-foot">
        {isAuto ? (
          <button className="skip-link" onClick={onSkip}>
            Überspringen
          </button>
        ) : (
          <>
            <button className="btn flow-next" onClick={onConfirm}>
              Weiter
            </button>
            {field.optional && (
              <button className="skip-link" onClick={onSkip}>
                Überspringen
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// --- Abschluss --------------------------------------------------------------
function DoneScreen({ date, npStreak, sfStreak, money, onRestart }) {
  const isToday = date === todayISO()
  return (
    <div className="done-screen">
      <span className="done-mark" aria-hidden="true">✓</span>
      <h1 className="done-title">{isToday ? 'Fertig für heute' : 'Eingetragen'}</h1>
      <p className="done-sub">Schön, dass du da warst. Bis morgen früh.</p>

      <div className="done-stats">
        {sfStreak > 0 && (
          <div className="done-stat">
            <span className="done-stat-num">{sfStreak}</span>
            <span className="done-stat-label">Tage rauchfrei</span>
          </div>
        )}
        {money > 0 && (
          <div className="done-stat">
            <span className="done-stat-num">{money.toFixed(2)} €</span>
            <span className="done-stat-label">gespart</span>
          </div>
        )}
        {npStreak > 0 && (
          <div className="done-stat">
            <span className="done-stat-num">{npStreak}</span>
            <span className="done-stat-label">Tage kein Porno</span>
          </div>
        )}
      </div>

      <button className="btn btn-ghost flow-restart" onClick={onRestart}>
        Noch einen Tag nachtragen
      </button>
      <p className="today-foot">Alles automatisch gespeichert. Nur auf diesem Gerät.</p>
    </div>
  )
}
