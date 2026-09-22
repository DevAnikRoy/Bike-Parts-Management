import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { dbApi } from './db'
import type { AppUser } from './types'

interface AuthCtx {
  user: AppUser | null
  login: (phoneOrEmail: string, password: string) => void
  logout: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => dbApi.getSessionUser())

  const login = useCallback((phoneOrEmail: string, password: string) => {
    const u = dbApi.login(phoneOrEmail, password)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    dbApi.logout()
    setUser(null)
  }, [])

  const refresh = useCallback(() => {
    setUser(dbApi.getSessionUser())
  }, [])

  const value = useMemo(
    () => ({ user, login, logout, refresh }),
    [user, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
