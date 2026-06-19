import { FieldRenderer } from './Fields.jsx'

// Eine Karte pro Lebensbereich. Ruhig, eine Sache nach der anderen.
export function AreaCard({ area, values, onChange, filledCount }) {
  return (
    <section className="card">
      <header className="card-head">
        <span className="card-emoji" aria-hidden="true">{area.emoji}</span>
        <div className="card-head-text">
          <h2 className="card-title">{area.title}</h2>
          {area.intro && <p className="card-intro">{area.intro}</p>}
        </div>
        {filledCount > 0 && <span className="card-badge">{filledCount}</span>}
      </header>
      <div className="card-body">
        {area.fields.map((field) => (
          <FieldRenderer key={field.id} field={field} values={values} onChange={onChange} />
        ))}
      </div>
    </section>
  )
}
