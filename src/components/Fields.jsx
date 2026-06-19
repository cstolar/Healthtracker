import { durationHours } from '../schema.js'

// Zeitbezug-Pille ("heute" / "gestern").
function WhenTag({ when }) {
  if (!when) return null
  return <span className={`when when-${when}`}>{when === 'today' ? 'heute' : 'gestern'}</span>
}

function Label({ field }) {
  // Im Frage-pro-Screen-Modus trägt der Screen selbst die große Überschrift.
  if (field.hideLabel) return null
  return (
    <div className="field-label">
      <span className="field-label-text">{field.label}</span>
      <WhenTag when={field.when} />
      {field.optional && <span className="field-optional">optional</span>}
    </div>
  )
}

// --- Skala min..max (Tap) ---------------------------------------------------
function ScaleField({ field, value, onChange }) {
  const min = field.min ?? 1
  const steps = Array.from({ length: field.max - min + 1 }, (_, i) => i + min)
  const active = value
  const wrap = steps.length > 6 // z.B. 0–10 bricht in zwei Reihen um
  return (
    <div className="field">
      <Label field={field} />
      <div className={`scale ${wrap ? 'scale-wrap' : ''}`} role="radiogroup">
        {steps.map((s) => (
          <button
            key={s}
            type="button"
            className={`scale-btn ${active === s ? 'on' : ''}`}
            aria-pressed={active === s}
            onClick={() => onChange(active === s ? undefined : s)}
          >
            <span className="scale-num">{s}</span>
            {field.stepLabels && <span className="scale-step-label">{field.stepLabels[s]}</span>}
          </button>
        ))}
      </div>
      {field.endLabels && (
        <div className="scale-ends">
          <span>{field.endLabels[0]}</span>
          <span>{field.endLabels[1]}</span>
        </div>
      )}
      {field.descriptions && active && <div className="scale-desc">{field.descriptions[active]}</div>}
    </div>
  )
}

// --- Toggle (Ja/Nein) -------------------------------------------------------
function ToggleField({ field, value, onChange }) {
  return (
    <div className="field">
      <Label field={field} />
      <div className="toggle">
        <button
          type="button"
          className={`toggle-btn ${value === true ? 'on yes' : ''}`}
          aria-pressed={value === true}
          onClick={() => onChange(value === true ? undefined : true)}
        >
          ja
        </button>
        <button
          type="button"
          className={`toggle-btn ${value === false ? 'on no' : ''}`}
          aria-pressed={value === false}
          onClick={() => onChange(value === false ? undefined : false)}
        >
          nein
        </button>
      </div>
    </div>
  )
}

// --- Counter (+/-) ----------------------------------------------------------
function CounterField({ field, value, onChange }) {
  const v = value ?? 0
  const dec = () => onChange(Math.max(field.min, v - field.step))
  const inc = () => onChange(Math.min(field.max, v + field.step))
  return (
    <div className="field">
      <Label field={field} />
      <div className="counter">
        <button type="button" className="counter-btn" onClick={dec} aria-label="weniger">
          –
        </button>
        <div className="counter-val">
          <span className="counter-num">{v}</span>
          {field.unit && <span className="counter-unit">{field.unit}</span>}
        </div>
        <button type="button" className="counter-btn" onClick={inc} aria-label="mehr">
          +
        </button>
      </div>
    </div>
  )
}

// --- Slider -----------------------------------------------------------------
function SliderField({ field, value, onChange }) {
  const v = value ?? field.min
  const atMax = v >= field.max && field.maxLabel
  return (
    <div className="field">
      <Label field={field} />
      <div className="slider">
        <input
          type="range"
          min={field.min}
          max={field.max}
          step={field.step}
          value={v}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <div className="slider-val">
          <span className="counter-num">{atMax ? field.maxLabel : v}</span>
          {field.unit && <span className="counter-unit">{field.unit}</span>}
        </div>
      </div>
    </div>
  )
}

// --- Select (Segmente) ------------------------------------------------------
function SelectField({ field, value, onChange }) {
  return (
    <div className="field">
      <Label field={field} />
      <div className="segments">
        {field.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`segment ${value === o.value ? 'on' : ''}`}
            aria-pressed={value === o.value}
            onClick={() => onChange(value === o.value ? undefined : o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// --- Mehrfachauswahl --------------------------------------------------------
function MultiSelectField({ field, value, onChange }) {
  const selected = Array.isArray(value) ? value : []
  function toggle(v) {
    const next = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]
    onChange(next.length ? next : undefined)
  }
  return (
    <div className="field">
      <Label field={field} />
      <div className="chips">
        {field.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`chip ${selected.includes(o.value) ? 'on' : ''}`}
            aria-pressed={selected.includes(o.value)}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// --- Uhrzeit ----------------------------------------------------------------
function TimeField({ field, value, onChange }) {
  return (
    <div className="field">
      <Label field={field} />
      <input
        type="time"
        className="text-input time-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  )
}

// --- Zahl (optional) --------------------------------------------------------
function NumberField({ field, value, onChange }) {
  return (
    <div className="field">
      <Label field={field} />
      <div className="number-row">
        <input
          type="number"
          inputMode="numeric"
          className="text-input number-input"
          value={value ?? ''}
          placeholder="–"
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
        {field.unit && <span className="counter-unit">{field.unit}</span>}
      </div>
    </div>
  )
}

// --- Text / Textarea --------------------------------------------------------
function TextField({ field, value, onChange }) {
  return (
    <div className="field">
      <Label field={field} />
      <input
        type="text"
        className="text-input"
        value={value ?? ''}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  )
}

function TextareaField({ field, value, onChange }) {
  return (
    <div className="field">
      <Label field={field} />
      <textarea
        className="text-input textarea"
        rows={3}
        value={value ?? ''}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value || undefined)}
      />
    </div>
  )
}

// --- Berechnet (read-only) --------------------------------------------------
function ComputedField({ field, values }) {
  const v = field.compute(values)
  return (
    <div className="field">
      <Label field={field} />
      <div className="computed-val">
        {v === null ? (
          <span className="computed-empty">–</span>
        ) : (
          <>
            <span className="counter-num">{v}</span>
            {field.unit && <span className="counter-unit">{field.unit}</span>}
          </>
        )}
      </div>
    </div>
  )
}

// --- Dispatcher -------------------------------------------------------------
export function FieldRenderer({ field, values, onChange }) {
  // Abhängige Felder ausblenden.
  if (field.showIf && !field.showIf(values)) return null
  const value = values[field.id]
  const set = (v) => onChange(field.id, v)
  switch (field.type) {
    case 'scale':
      return <ScaleField field={field} value={value} onChange={set} />
    case 'toggle':
      return <ToggleField field={field} value={value} onChange={set} />
    case 'counter':
      return <CounterField field={field} value={value} onChange={set} />
    case 'slider':
      return <SliderField field={field} value={value} onChange={set} />
    case 'select':
      return <SelectField field={field} value={value} onChange={set} />
    case 'multiselect':
      return <MultiSelectField field={field} value={value} onChange={set} />
    case 'time':
      return <TimeField field={field} value={value} onChange={set} />
    case 'number':
      return <NumberField field={field} value={value} onChange={set} />
    case 'text':
      return <TextField field={field} value={value} onChange={set} />
    case 'textarea':
      return <TextareaField field={field} value={value} onChange={set} />
    case 'computed':
      return <ComputedField field={field} values={values} />
    default:
      return null
  }
}

export { durationHours }
