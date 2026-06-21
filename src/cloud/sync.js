// Offline-First-Sync mit Supabase.
// Lokaler Speicher (IndexedDB/Dexie) bleibt die Quelle für den Betrieb; hier
// wird pro Tag mit der Cloud abgeglichen (letzte Änderung gewinnt, je Datum).
import { supabase, cloudConfigured } from './supabase.js'
import { db, getAllEntries } from '../db.js'

export { cloudConfigured }

export async function getSessionUser() {
  if (!cloudConfigured) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user || null
}

export function onAuthChange(cb) {
  if (!cloudConfigured) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session?.user || null))
  return () => data.subscription.unsubscribe()
}

// Magic-Link-Anmeldung per E-Mail (kein Passwort nötig).
export async function signInWithEmail(email) {
  if (!cloudConfigured) throw new Error('Cloud nicht konfiguriert.')
  return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } })
}

export async function signOut() {
  if (!cloudConfigured) return
  await supabase.auth.signOut()
}

// Einzelnen Tag in die Cloud schreiben (fire-and-forget aus dem Check-in).
export async function pushEntry(date, values) {
  if (!cloudConfigured) return
  const user = await getSessionUser()
  if (!user) return
  await supabase
    .from('entries')
    .upsert(
      { user_id: user.id, date, data: values || {}, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
}

// Vollständiger Abgleich in beide Richtungen.
export async function fullSync() {
  if (!cloudConfigured) return { ok: false, reason: 'not-configured' }
  const user = await getSessionUser()
  if (!user) return { ok: false, reason: 'signed-out' }

  const { data: remote, error } = await supabase
    .from('entries')
    .select('date,data,updated_at')
    .eq('user_id', user.id)
  if (error) throw error

  const local = await getAllEntries()
  const localMap = new Map(local.map((e) => [e.date, e]))
  const remoteMap = new Map((remote || []).map((r) => [r.date, r]))

  let pulled = 0
  let pushed = 0

  // Cloud -> lokal (neuere oder fehlende Tage)
  for (const r of remote || []) {
    const l = localMap.get(r.date)
    const rTs = new Date(r.updated_at).getTime()
    if (!l || rTs > (l.updatedAt || 0)) {
      await db.entries.put({ date: r.date, values: r.data || {}, updatedAt: rTs })
      pulled++
    }
  }

  // lokal -> Cloud (neuere oder fehlende Tage)
  const toUpsert = []
  for (const l of local) {
    const r = remoteMap.get(l.date)
    const rTs = r ? new Date(r.updated_at).getTime() : 0
    if (!r || (l.updatedAt || 0) > rTs) {
      toUpsert.push({
        user_id: user.id,
        date: l.date,
        data: l.values || {},
        updated_at: new Date(l.updatedAt || Date.now()).toISOString(),
      })
      pushed++
    }
  }
  if (toUpsert.length) {
    const { error: e2 } = await supabase.from('entries').upsert(toUpsert, { onConflict: 'user_id,date' })
    if (e2) throw e2
  }

  // UI über aktualisierte lokale Daten informieren.
  window.dispatchEvent(new Event('tagwerk-sync'))
  return { ok: true, pulled, pushed }
}
