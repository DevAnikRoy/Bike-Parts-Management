import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { userFacingError } from './errors'

export type ToastKind = 'error' | 'success' | 'info'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
}

type ToastApi = {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  fromError: (err: unknown, fallback?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

let pushExternal: ToastApi | null = null

/** Imperative toast (e.g. from non-React helpers). Prefer useToast() in components. */
export function toast(): ToastApi {
  if (!pushExternal) {
    return {
      success: () => {},
      error: () => {},
      info: () => {},
      fromError: () => {},
    }
  }
  return pushExternal
}

const AUTO_MS: Record<ToastKind, number> = {
  success: 3200,
  info: 3800,
  error: 5200,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const text = message.trim()
      if (!text) return
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setItems((prev) => [...prev.slice(-4), { id, kind, message: text }])
      window.setTimeout(() => dismiss(id), AUTO_MS[kind])
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      info: (message) => push('info', message),
      fromError: (err, fallback) => push('error', userFacingError(err, fallback)),
    }),
    [push],
  )

  pushExternal = api

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions">
        {items.map((t) => (
          <div key={t.id} className={`toast-card toast-${t.kind}`} role="status">
            <span className="toast-label">
              {t.kind === 'success' ? 'ঠিক আছে' : t.kind === 'error' ? 'সমস্যা' : 'খবর'}
            </span>
            <p className="toast-msg">{t.message}</p>
            <button
              type="button"
              className="toast-close"
              aria-label="বন্ধ"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}
