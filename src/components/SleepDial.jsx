import { useRef } from 'react'

// Kreisförmige Schlaf-Zeitauswahl im Stil der iOS-Weckfunktion:
// 24-Stunden-Ziffernblatt, zwei ziehbare Griffe (Bettzeit & Aufwachen),
// Schlafbogen dazwischen, Dauer in der Mitte. Schreibt bedtime + waketime.

const SIZE = 280
const CX = 140
const CY = 140
const R = 104
const DEFAULT_BED = 23 * 60
const DEFAULT_WAKE = 7 * 60
const SNAP = 5 // Minuten

function timeToMin(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minToTime(min) {
  min = ((Math.round(min) % 1440) + 1440) % 1440
  const h = Math.floor(min / 60)
  const m = min % 60
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}
function ptR(min, r) {
  const a = (min / 1440) * 2 * Math.PI
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) }
}
function fmtDur(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h} Std${m ? ` ${m} Min` : ''}`
}

export function SleepDial({ values, onChange }) {
  const ref = useRef(null)
  const active = useRef(null)

  const bedSet = values.bedtime != null
  const wakeSet = values.waketime != null
  const bedMin = timeToMin(values.bedtime) ?? DEFAULT_BED
  const wakeMin = timeToMin(values.waketime) ?? DEFAULT_WAKE
  const dur = (wakeMin - bedMin + 1440) % 1440

  function evtToMin(e) {
    const rect = ref.current.getBoundingClientRect()
    const scale = SIZE / rect.width
    const x = (e.clientX - rect.left) * scale - CX
    const y = (e.clientY - rect.top) * scale - CY
    let a = Math.atan2(x, -y)
    if (a < 0) a += 2 * Math.PI
    return (a / (2 * Math.PI)) * 1440
  }

  function writeBoth(bed, wake) {
    onChange('bedtime', minToTime(bed))
    onChange('waketime', minToTime(wake))
  }

  function onDown(which, e) {
    active.current = which
    ref.current.setPointerCapture?.(e.pointerId)
    apply(e)
  }
  function apply(e) {
    if (!active.current) return
    const min = Math.round(evtToMin(e) / SNAP) * SNAP
    if (active.current === 'bed') writeBoth(min, wakeMin)
    else writeBoth(bedMin, min)
  }
  function onUp() {
    active.current = null
  }

  const bed = ptR(bedMin, R)
  const wake = ptR(wakeMin, R)
  const large = dur > 720 ? 1 : 0
  const arc = `M ${bed.x} ${bed.y} A ${R} ${R} 0 ${large} 1 ${wake.x} ${wake.y}`

  return (
    <div className="sleepdial">
      <div className="sleep-times">
        <div className="sleep-time">
          <span className="sleep-time-label">🌙 Bettzeit · gestern</span>
          <span className="sleep-time-val">{bedSet ? minToTime(bedMin) : '–'}</span>
        </div>
        <div className="sleep-time">
          <span className="sleep-time-label">⏰ Aufwachen · heute</span>
          <span className="sleep-time-val">{wakeSet ? minToTime(wakeMin) : '–'}</span>
        </div>
      </div>

      <svg
        ref={ref}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="sleepdial-svg"
        onPointerMove={apply}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <circle cx={CX} cy={CY} r={R} className="dial-track" />

        {Array.from({ length: 48 }).map((_, i) => {
          const major = i % 4 === 0
          const p1 = ptR(i * 30, R + 8)
          const p2 = ptR(i * 30, major ? R + 18 : R + 13)
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={`tick ${major ? 'major' : ''}`} />
        })}

        {[0, 6, 12, 18].map((h) => {
          const p = ptR(h * 60, R - 24)
          return (
            <text key={h} x={p.x} y={p.y} className="dial-hr" dominantBaseline="middle" textAnchor="middle">
              {h}
            </text>
          )
        })}

        <path d={arc} className="dial-arc" />

        {/* Griffe */}
        <g className="handle" onPointerDown={(e) => onDown('bed', e)}>
          <circle cx={bed.x} cy={bed.y} r={19} className="handle-bg" />
          <text x={bed.x} y={bed.y} textAnchor="middle" dominantBaseline="central" className="handle-icon">🌙</text>
        </g>
        <g className="handle" onPointerDown={(e) => onDown('wake', e)}>
          <circle cx={wake.x} cy={wake.y} r={19} className="handle-bg" />
          <text x={wake.x} y={wake.y} textAnchor="middle" dominantBaseline="central" className="handle-icon">⏰</text>
        </g>

        <text x={CX} y={CY - 6} className="dial-dur" textAnchor="middle">{fmtDur(dur)}</text>
        <text x={CX} y={CY + 18} className="dial-sub" textAnchor="middle">
          {bedSet && wakeSet ? 'Schlaf' : 'ziehen zum Einstellen'}
        </text>
      </svg>
    </div>
  )
}
