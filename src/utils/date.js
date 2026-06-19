// Datums-Helfer. Alles lokal, ISO-Format 'YYYY-MM-DD' als Tagesschlüssel.

export function toISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayISO() {
  return toISO(new Date())
}

export function addDays(iso, delta) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + delta)
  return toISO(d)
}

export function isFuture(iso) {
  return iso > todayISO()
}

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export function formatLong(iso) {
  const d = fromISO(iso)
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`
}

export function formatShort(iso) {
  const d = fromISO(iso)
  return `${d.getDate()}.${d.getMonth() + 1}.`
}

// Freundliche Tageskennzeichnung für Navigation.
export function relativeLabel(iso) {
  const t = todayISO()
  if (iso === t) return 'Heute'
  if (iso === addDays(t, -1)) return 'Gestern'
  return formatLong(iso)
}

// Zeitabhängige Begrüßung.
export function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 5) return 'Noch wach?'
  if (h < 11) return 'Guten Morgen'
  if (h < 17) return 'Hallo'
  if (h < 22) return 'Guten Abend'
  return 'Gute Nacht'
}
