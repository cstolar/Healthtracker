// Supabase-Client – nur aktiv, wenn URL & Anon-Key als Build-Variablen gesetzt
// sind (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Sonst bleibt die App
// vollständig lokal (kein Cloud-Code aktiv).
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const cloudConfigured = Boolean(url && key)

export const supabase = cloudConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
