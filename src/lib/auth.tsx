import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { dbApi } from './db'
import { toBanglaError } from './errors'
import { isSupabaseConfigured, supabase } from './supabase'
import type { AppUser } from './types'

interface AuthCtx {
  user: AppUser | null
  ready: boolean
  schemaError: string
  login: (phoneOrEmail: string, password: string) => void
  sendEmailOtp: (email: string) => Promise<void>
  verifyEmailOtp: (email: string, token: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthCtx | null>(null)

function readShopId(data: unknown) {
  let value = data
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown
    } catch {
      throw new Error('দোকান তৈরি হয়নি')
    }
  }
  if (value && typeof value === 'object' && 'shop_id' in value) {
    return String((value as { shop_id: unknown }).shop_id)
  }
  throw new Error('দোকান তৈরি হয়নি')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() =>
    isSupabaseConfigured ? null : dbApi.getSessionUser(),
  )
  const [ready, setReady] = useState(!isSupabaseConfigured)
  const [schemaError, setSchemaError] = useState('')

  const hydrate = useCallback(async (session: Session | null) => {
    if (!supabase) return
    if (!session) {
      setUser(null)
      setSchemaError('')
      setReady(true)
      return
    }

    const email = session.user.email ?? ''
    const fallback: AppUser = {
      id: session.user.id,
      shop_id: '',
      name: email.split('@')[0] || 'মালিক',
      phone: '',
      email,
      role: 'owner',
    }

    const { data, error } = await supabase.rpc('ensure_my_shop')
    if (error) {
      setSchemaError(toBanglaError(error.message))
      setUser(fallback)
      setReady(true)
      return
    }

    try {
      const shopId = readShopId(data)
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, phone, role')
        .eq('id', session.user.id)
        .maybeSingle()
      setSchemaError('')
      setUser({
        id: session.user.id,
        shop_id: shopId,
        name: profile?.name || fallback.name,
        phone: profile?.phone || '',
        email,
        role: profile?.role === 'staff' ? 'staff' : 'owner',
      })
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : 'দোকান তৈরি হয়নি')
      setUser(fallback)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    let ignore = false
    supabase.auth.getSession().then(({ data }) => {
      if (ignore) return
      void hydrate(data.session)
    }).catch(() => {
      if (!ignore) setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (!ignore) void hydrate(session)
      }, 0)
    })
    return () => {
      ignore = true
      sub.subscription.unsubscribe()
    }
  }, [hydrate])

  const login = useCallback((phoneOrEmail: string, password: string) => {
    if (isSupabaseConfigured) {
      throw new Error('ইমেইলের কোড দিয়ে লগইন করুন')
    }
    const u = dbApi.login(phoneOrEmail, password)
    setUser(u)
  }, [])

  const sendEmailOtp = useCallback(async (email: string) => {
    if (!supabase) throw new Error('Supabase কনফিগার করা নেই')
    const origin = window.location.origin
    let { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: origin },
    })
    if (error && /redirect/i.test(error.message)) {
      const second = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      error = second.error
    }
    if (error) throw new Error(toBanglaError(error.message))
  }, [])

  const verifyEmailOtp = useCallback(
    async (email: string, token: string) => {
      if (!supabase) throw new Error('Supabase কনফিগার করা নেই')
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })
      if (error) throw new Error(toBanglaError(error.message))
      await hydrate(data.session)
    },
    [hydrate],
  )

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    else dbApi.logout()
    setUser(null)
    setSchemaError('')
  }, [])

  const refresh = useCallback(async () => {
    if (!supabase) {
      setUser(dbApi.getSessionUser())
      return
    }
    const { data } = await supabase.auth.getSession()
    await hydrate(data.session)
  }, [hydrate])

  const value = useMemo(
    () => ({
      user,
      ready,
      schemaError,
      login,
      sendEmailOtp,
      verifyEmailOtp,
      logout,
      refresh,
    }),
    [user, ready, schemaError, login, sendEmailOtp, verifyEmailOtp, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
