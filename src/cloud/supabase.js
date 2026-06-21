// Supabase-Client. URL & Anon-Key kommen aus Build-Variablen; als Fallback die
// hinterlegten Projektwerte. Der Anon-Key ist bewusst öffentlich – die Daten
// schützt die Row-Level-Security (Policy), nicht der Key.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://lgzzfwcnillgllhzsfvw.supabase.co'
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxnenpmd2NuaWxsZ2xsaHpzZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMTQ1MzgsImV4cCI6MjA5NzU5MDUzOH0.hYmW66OmLMBEQ-vV_bkWTzLMGr2SBAKq_n7HoXTuGY4'

export const cloudConfigured = Boolean(url && key)

export const supabase = cloudConfigured
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
