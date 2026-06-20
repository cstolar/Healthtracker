import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getEntry, saveEntry, getAllEntries, getSetting, deleteEntry } from '../db.js'
import { SCHEMA, getField } from '../schema.js'
import { FieldRenderer } from '../components/Fields.jsx'
import { Illustration } from '../components/Illustration.jsx'
import { themeFor, themeVars } from '../theme.js'
import { greeting, relativeLabel, formatLong, todayISO, addDays, isFuture } from '../utils/date.js'
import { noPornStreak, smokeFreeStreak, moneySaved } from '../utils/derive.js'

// Eingabetypen mit eindeutigem Abschluss -> Auto-Advance nach Tap.
const AUTO_ADVANCE = new Set(['scale', 'toggle', 'select'])

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Geordnete Frage-Sequenz aus dem Schema.
function buildSteps() {
  const steps = [{ kind: 'intro', areaId: 'intro' }]
  for (const area of SCHEMA) {
    steps.push({ kind: 'section', areaId: area.id })
    for (const field of area.fields) {
      if (field.type === 'computed' || field.subfield) continue
      steps.push({ kind: 'question', areaId: area.id, field })
    }
  }
  steps.push({ kind: 'done', areaId: 'done' })
  return steps
}

function stepMeta(step) {
  if (step.kind === 'intro') return { emoji: '🌅', label: 'Start' }
  if (step.kind === 'done') return { emoji: '✓', label: 'Fertig' }
  const area = SCHEMA.find((a) => a.id === step.areaId)
  if (step.kind === 'section') return { emoji: area.emoji, label: area.title }
  return { emoji: area.emoji, label: step.field.label }
}

export function TodayScreen() {
  const steps = useMemo(buildSteps, [])
  const motionOK = useMemo(() => !prefersReducedMotion(), [])

  const [date, setDate] = useState(todayISO())
  const [values, setValues] = useState(null)
  const [index, setIndex] = useState(0)
  const [anim, setAnim] = useState('enter')
  const [dir, setDir] = useState('fwd')

  const valuesRef = useRef({})
  const indexRef = useRef(0)
  const dateRef = useRef(date)
  const saveTimer = useRef(null)
  const advanceTimer = useRef(null)

  indexRef.current = index
  dateRef.current = date

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
      advanceTimer.current = setTimeout(() => go(nextIndex(indexRef.current), 'fwd'), motionOK ? 320 : 120)
    } else if (advanceTimer.current) {
      clearTimeout(advanceTimer.current)
    }
  }

  function confirmQuestion(field) {
    if (field.type === 'counter' && valuesRef.current[field.id] === undefined) {
      setVal(field.id, field.min ?? 0)
    }
    go(nextIndex(indexRef.current), 'fwd')
  }

  // Zentrale Aktion der Subnavigation je nach Step.
  function onCenter() {
    const s = steps[index]
    if (s.kind === 'intro') return go(nextIndex(0), 'fwd')
    if (s.kind === 'done') return go(0, 'back')
    if (s.kind === 'section') return go(nextIndex(index), 'fwd')
    confirmQuestion(s.field)
  }

  // Sektions-Screens automatisch weiterblenden (nur vorwärts).
  useEffect(() => {
    if (steps[index].kind !== 'section' || dir !== 'fwd') return
    const t = setTimeout(() => go(nextIndex(index), 'fwd'), motionOK ? 1000 : 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, dir])

  async function handleDelete() {
    await deleteEntry(date)
    valuesRef.current = {}
    setValues({})
  }

  if (values === null) return <div className="screen flow" />

  const step = steps[index]
  const theme = themeFor(step.areaId)

  const leftT = prevIndex(index)
  const rightT = nextIndex(index)
  const hasLeft = leftT !== index
  const hasRight = rightT !== index

  const visibleQuestions = steps.filter((s) => s.kind === 'question' && isQuestionVisible(s))
  const passed = steps.slice(0, index).filter((s) => s.kind === 'question' && isQuestionVisible(s)).length
  const progress = visibleQuestions.length ? passed / visibleQuestions.length : 0

  const npStreak = noPornStreak(allEntries)
  const sfStreak = smokeFreeStreak(allEntries)

  return (
    <div className="screen flow" style={themeVars(theme)}>
      {step.kind === 'question' && (
        <div className="flow-top">
          <div className="progress" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}

      <div className={`step ${anim} ${dir}`}>
        {step.kind === 'intro' && (
          <IntroScreen
            date={date}
            setDate={setDate}
            npStreak={npStreak}
            sfStreak={sfStreak}
            hasData={Object.keys(values).length > 0}
            onDelete={handleDelete}
          />
        )}

        {step.kind === 'section' && (
          <div className="section-screen">
            <Illustration name={step.areaId} />
            <h2 className="section-title">{SCHEMA.find((a) => a.id === step.areaId).title}</h2>
            <p className="section-intro">{SCHEMA.find((a) => a.id === step.areaId).intro}</p>
          </div>
        )}

        {step.kind === 'question' && (
          <QuestionScreen areaId={step.areaId} field={step.field} values={values} onChange={handleChange} />
        )}

        {step.kind === 'done' && (
          <DoneScreen
            date={date}
            npStreak={npStreak}
            sfStreak={sfStreak}
            money={moneySaved(allEntries, smokeCfg.baseline, smokeCfg.pricePerCig)}
          />
        )}
      </div>

      {/* Subnavigation: vorheriger · aktueller · nächster Step */}
      <nav className="subnav">
        <button
          className={`subnav-side left ${hasLeft ? '' : 'hidden'}`}
          onClick={() => hasLeft && go(leftT, 'back')}
          aria-label="Vorheriger Schritt"
        >
          <span className="subnav-emoji">{stepMeta(steps[leftT]).emoji}</span>
          <span className="subnav-label">{stepMeta(steps[leftT]).label}</span>
        </button>

        <button className="subnav-center" onClick={onCenter} aria-label="Weiter">
          <span className="subnav-center-glyph">{step.kind === 'done' ? '✓' : '↑'}</span>
          <span className="subnav-center-label">{stepMeta(step).label}</span>
        </button>

        <button
          className={`subnav-side right ${hasRight ? '' : 'hidden'}`}
          onClick={() => hasRight && go(rightT, 'fwd')}
          aria-label="Nächster Schritt"
        >
          <span className="subnav-emoji">{stepMeta(steps[rightT]).emoji}</span>
          <span className="subnav-label">{stepMeta(steps[rightT]).label}</span>
        </button>
      </nav>
    </div>
  )
}

// --- Intro ------------------------------------------------------------------
function IntroScreen({ date, setDate, npStreak, sfStreak, hasData, onDelete }) {
  const isToday = date === todayISO()
  const [confirmDel, setConfirmDel] = useState(false)
  return (
    <div className="intro-screen">
      <Illustration name="intro" />
      <p className="today-greet">{isToday ? `${greeting()}.` : relativeLabel(date)}</p>
      <h1 className="today-date">{formatLong(date)}</h1>
      <p className="today-sub">
        {isToday ? 'Eine Frage nach der anderen. Ganz in Ruhe.' : 'Trag in Ruhe nach.'}
      </p>

      <div className="day-nav">
        <button className="day-nav-btn" onClick={() => { setConfirmDel(false); setDate(addDays(date, -1)) }} aria-label="Tag zurück">‹</button>
        {!isToday && (
          <button className="day-nav-today" onClick={() => { setConfirmDel(false); setDate(todayISO()) }}>heute</button>
        )}
        <button
          className="day-nav-btn"
          onClick={() => !isFuture(addDays(date, 1)) && (setConfirmDel(false), setDate(addDays(date, 1)))}
          disabled={isFuture(addDays(date, 1))}
          aria-label="Tag vor"
        >›</button>
      </div>

      {(npStreak > 0 || sfStreak > 0) && (
        <div className="streak-row">
          {sfStreak > 0 && <span className="streak-pill">🚭 {sfStreak} Tage rauchfrei</span>}
          {npStreak > 0 && <span className="streak-pill">🌿 {npStreak} Tage kein Porno</span>}
        </div>
      )}

      {hasData &&
        (confirmDel ? (
          <div className="del-confirm">
            <span>Diesen Tag wirklich löschen?</span>
            <div className="del-actions">
              <button className="del-yes" onClick={() => { onDelete(); setConfirmDel(false) }}>Ja, löschen</button>
              <button className="del-no" onClick={() => setConfirmDel(false)}>Abbrechen</button>
            </div>
          </div>
        ) : (
          <button className="del-link" onClick={() => setConfirmDel(true)}>Diesen Tag löschen</button>
        ))}
    </div>
  )
}

// --- Eine Frage -------------------------------------------------------------
function QuestionScreen({ areaId, field, values, onChange }) {
  // Große Steuerelemente (z.B. Schlaf-Zifferblatt) brauchen den Platz selbst.
  const bigControl = field.type === 'sleepwindow'
  return (
    <div className="question-screen">
      {!bigControl && <Illustration name={areaId} />}
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
    </div>
  )
}

// --- Abschluss --------------------------------------------------------------
function DoneScreen({ date, npStreak, sfStreak, money }) {
  const isToday = date === todayISO()
  return (
    <div className="done-screen">
      <Illustration name="done" />
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
    </div>
  )
}
