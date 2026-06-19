import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceDot, Legend,
} from 'recharts'
import { getAllEntries, getSetting } from '../db.js'
import { getField } from '../schema.js'
import {
  ehsSeries, metricSeries, noPornStreak, smokeFreeStreak, weeklySummary,
  longestSmokeFreeStreak, moneySaved, nonSmokedTotal, triggerFrequency, cravingSeries,
} from '../utils/derive.js'
import { addDays, todayISO } from '../utils/date.js'

const RANGES = [
  { id: 'week', label: 'Woche', days: 7 },
  { id: 'month', label: 'Monat', days: 30 },
]

export function TrendsScreen() {
  const [range, setRange] = useState('week')
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
  const entries = useLiveQuery(() => getAllEntries(), [], null)
  if (entries === null) return <div className="screen" />

  const days = RANGES.find((r) => r.id === range).days
  const fromIso = addDays(todayISO(), -(days - 1))

  const ehs = ehsSeries(entries, fromIso)
  const sensitivity = metricSeries(entries, getField('glansSensitivity'), fromIso)
  const summary = weeklySummary(entries, fromIso)
  const npStreak = noPornStreak(entries)

  const hasData = entries.some((e) => Object.keys(e.values || {}).length)

  return (
    <div className="screen trends">
      <header className="screen-head">
        <h1 className="screen-title">Verlauf</h1>
        <div className="segments range-toggle">
          {RANGES.map((r) => (
            <button
              key={r.id}
              className={`segment ${range === r.id ? 'on' : ''}`}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {!hasData ? (
        <p className="empty-hint">Noch keine Daten. Trag ein paar Tage ein – dann erscheinen hier deine Verläufe.</p>
      ) : (
        <>
          {/* Nicht rauchen */}
          <SmokeSection entries={entries} fromIso={fromIso} cfg={smokeCfg} />

          {/* Sexuelle Gesundheit – Kein-Porno-Serie */}
          {npStreak > 0 && (
            <div className="streak-cards">
              <div className="streak-card">
                <span className="streak-card-num">{npStreak}</span>
                <span className="streak-card-label">Tage kein Porno</span>
              </div>
            </div>
          )}

          {/* EHS 3-Linien – zentraler Lese-Indikator */}
          <ChartCard
            title="EHS-Verlauf"
            subtitle="morgens · allein · Partnersex — Punkte = viel Alkohol / Cannabis"
          >
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ehs} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <YAxis domain={[1, 4]} ticks={[1, 2, 3, 4]} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <Tooltip content={<EhsTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="morgens" name="morgens" stroke="var(--accent)" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
                <Line type="monotone" dataKey="allein" name="allein" stroke="#7aa2f7" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                <Line type="monotone" dataKey="partner" name="Partner" stroke="#e0af68" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                {/* Konfounder-Marker auf der morgens-Linie */}
                {ehs.map((d) =>
                  d.highAlcohol || d.cannabis ? (
                    <ReferenceDot
                      key={d.date}
                      x={d.label}
                      y={d.morgens ?? d.allein ?? d.partner ?? 1}
                      r={6}
                      fill="transparent"
                      stroke={d.highAlcohol ? '#f7768e' : '#9ece6a'}
                      strokeWidth={2}
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>
            <div className="confounder-legend">
              <span><i className="dot dot-alcohol" /> viel Alkohol (≥4)</span>
              <span><i className="dot dot-cannabis" /> Cannabis</span>
            </div>
          </ChartCard>

          {/* Empfindlichkeit */}
          <ChartCard title="Eichel-Empfindlichkeit" subtitle="1 = abgestumpft · 5 = sehr empfindlich">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={sensitivity} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" name="Empfindlichkeit" stroke="var(--accent)" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Wochenrückblick */}
          <ChartCard title="Rückblick" subtitle={range === 'week' ? 'letzte 7 Tage' : 'letzte 30 Tage'}>
            <div className="summary-grid">
              <Stat label="Einträge" value={summary.entryCount} />
              <Stat label="Ø Stimmung" value={fmt(summary.avgMood)} />
              <Stat label="Ø Stress" value={fmt(summary.avgStress)} />
              <Stat label="Ø Schlaf" value={summary.avgSleep != null ? summary.avgSleep + ' h' : '–'} />
              <Stat label="Ø EHS morgens" value={fmt(summary.avgMorningEHS)} />
              <Stat label="Ø Empfindlichkeit" value={fmt(summary.avgSensitivity)} />
              <Stat label="Tage mit Sport" value={summary.exerciseDays} />
              <Stat label="Tage mit Alkohol" value={summary.alcoholDays} />
            </div>
          </ChartCard>

          {/* Weitere Metriken */}
          <MoreMetrics entries={entries} fromIso={fromIso} />
        </>
      )}
    </div>
  )
}

function MoreMetrics({ entries, fromIso }) {
  // Einfache Einzel-Charts für weitere numerische Metriken.
  const extra = ['sleepDuration', 'sleepQuality', 'mood', 'stress', 'alcohol']
  return (
    <ChartCard title="Weitere Verläufe" subtitle="zum Querlesen">
      {extra.map((id) => {
        const field = getField(id)
        const data = metricSeries(entries, field, fromIso)
        if (!data.length) return null
        return (
          <div key={id} className="mini-chart">
            <span className="mini-chart-label">{field.label}</span>
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={data} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} connectNulls />
                <Tooltip />
                <XAxis dataKey="label" hide />
                <YAxis hide domain={['auto', 'auto']} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </ChartCard>
  )
}

function SmokeSection({ entries, fromIso, cfg }) {
  const craving = cravingSeries(entries, fromIso)
  const confidence = metricSeries(entries, getField('quitConfidence'), fromIso)
  const triggers = triggerFrequency(entries, getField('cravingTrigger').options)
  const current = smokeFreeStreak(entries)
  const longest = longestSmokeFreeStreak(entries)
  const saved = moneySaved(entries, cfg.baseline, cfg.pricePerCig)
  const notSmoked = nonSmokedTotal(entries, cfg.baseline)

  return (
    <>
      {/* Motivatoren */}
      <div className="streak-cards">
        <div className="streak-card">
          <span className="streak-card-num">{current}</span>
          <span className="streak-card-label">Tage rauchfrei</span>
        </div>
        <div className="streak-card">
          <span className="streak-card-num">{longest}</span>
          <span className="streak-card-label">längste Serie</span>
        </div>
      </div>
      <div className="streak-cards">
        <div className="streak-card">
          <span className="streak-card-num">{saved.toFixed(2)} €</span>
          <span className="streak-card-label">gespart</span>
        </div>
        <div className="streak-card">
          <span className="streak-card-num">{notSmoked}</span>
          <span className="streak-card-label">Zig. nicht geraucht</span>
        </div>
      </div>

      {/* Verlangen mit Konfoundern */}
      <ChartCard title="Rauchverlangen" subtitle="0–10 · Punkte = viel Alkohol / hoher Stress">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={craving} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <Tooltip content={<CravingTooltip />} />
            <Line type="monotone" dataKey="craving" name="Verlangen" stroke="var(--accent)" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
            {craving.map((d) =>
              d.highAlcohol || d.highStress ? (
                <ReferenceDot
                  key={d.date}
                  x={d.label}
                  y={d.craving}
                  r={6}
                  fill="transparent"
                  stroke={d.highAlcohol ? '#f7768e' : '#e0af68'}
                  strokeWidth={2}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
        <div className="confounder-legend">
          <span><i className="dot dot-alcohol" /> viel Alkohol</span>
          <span><i className="dot dot-stress" /> hoher Stress</span>
        </div>
      </ChartCard>

      {/* Zuversicht */}
      <ChartCard title="Zuversicht" subtitle="rauchfrei zu bleiben · 1–5">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={confidence} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
            <Tooltip />
            <Line type="monotone" dataKey="value" name="Zuversicht" stroke="var(--accent)" strokeWidth={2.5} connectNulls dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Auslöser-Häufigkeit */}
      {triggers.length > 0 && (
        <ChartCard title="Häufigste Auslöser" subtitle="wann das Verlangen am stärksten war">
          <TriggerBars triggers={triggers} />
        </ChartCard>
      )}
    </>
  )
}

function TriggerBars({ triggers }) {
  const max = Math.max(...triggers.map((t) => t.count), 1)
  return (
    <div className="trigger-bars">
      {triggers.map((t) => (
        <div key={t.value} className="trigger-row">
          <span className="trigger-label">{t.label}</span>
          <div className="trigger-track">
            <div className="trigger-fill" style={{ width: `${(t.count / max) * 100}%` }} />
          </div>
          <span className="trigger-count">{t.count}</span>
        </div>
      ))}
    </div>
  )
}

function CravingTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  return (
    <div className="tooltip">
      <div className="tooltip-date">{label}</div>
      <div style={{ color: 'var(--accent)' }}>Verlangen: {d.craving}</div>
      {d.highAlcohol && <div className="tooltip-flag">⚠︎ viel Alkohol</div>}
      {d.highStress && <div className="tooltip-flag">⚠︎ hoher Stress</div>}
    </div>
  )
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="card chart-card">
      <header className="chart-head">
        <h2 className="card-title">{title}</h2>
        {subtitle && <p className="card-intro">{subtitle}</p>}
      </header>
      {children}
    </section>
  )
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-num">{value ?? '–'}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}

function fmt(v) {
  return v == null ? '–' : v
}

function EhsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload || {}
  return (
    <div className="tooltip">
      <div className="tooltip-date">{label}</div>
      {payload.map((p) =>
        p.value != null ? (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value}
          </div>
        ) : null
      )}
      {d.highAlcohol && <div className="tooltip-flag">⚠︎ viel Alkohol</div>}
      {d.cannabis && <div className="tooltip-flag">⚠︎ Cannabis</div>}
    </div>
  )
}
