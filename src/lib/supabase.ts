import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** When env is set, use Supabase; otherwise the app runs on localStorage (demo/offline). */
export const isSupabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, key!)
  : null

export function supabaseProjectRef() {
  if (!url) return ''
  try {
    return new URL(url).hostname.split('.')[0] ?? ''
  } catch {
    return ''
  }
}
