import { isSupabaseConfigured } from './supabase'

/** Vite production build (`npm run build` / Netlify). */
export const isProdBuild = import.meta.env.PROD

/**
 * Offline localStorage demo is DEV-only.
 * Production never falls back to the known demo phone/password.
 */
export const isLocalDemoMode = import.meta.env.DEV && !isSupabaseConfigured

/** Production deploy missing VITE_SUPABASE_* — fail closed. */
export const isMisconfiguredProd = isProdBuild && !isSupabaseConfigured
