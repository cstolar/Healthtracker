import Dexie from 'dexie'

// Lokale Datenbank (IndexedDB). Verlässt niemals das Gerät.
// Ein Eintrag pro Tag, adressiert über das ISO-Datum 'YYYY-MM-DD'.
export const db = new Dexie('tagwerk')

db.version(1).stores({
  // 'date' ist Primärschlüssel; values ist ein flaches Objekt feldId -> Wert.
  entries: 'date, updatedAt',
  // Einfacher Key/Value-Speicher für Einstellungen (Theme, Akzent, …).
  settings: 'key',
})

export async function getEntry(date) {
  return (await db.entries.get(date)) || { date, values: {} }
}

export async function saveEntry(date, values) {
  await db.entries.put({ date, values, updatedAt: Date.now() })
}

export async function getAllEntries() {
  return db.entries.orderBy('date').toArray()
}

export async function getSetting(key, fallback) {
  const row = await db.settings.get(key)
  return row ? row.value : fallback
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}

// Komplettes Backup für Import.
export async function replaceAllEntries(entries) {
  await db.transaction('rw', db.entries, async () => {
    await db.entries.clear()
    await db.entries.bulkPut(entries)
  })
}
