import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './auth'
import {
  cloudAddCustomer,
  cloudAddSupplier,
  cloudCompleteSale,
  cloudProcessReturn,
  cloudReceivePurchase,
  cloudUpdateShop,
  loadCloudDb,
  seedSharedCatalog,
} from './cloud'
import { dbApi } from './db'
import { emptyDatabase } from './queries'
import { isSupabaseConfigured } from './supabase'
import type {
  AppDatabase,
  CartItem,
  Customer,
  PurchaseItemInput,
  ReturnRecord,
  Sale,
  Supplier,
} from './types'

interface DataCtx {
  db: AppDatabase
  loaded: boolean
  error: string
  retry: () => void
  updateShop: (data: Partial<AppDatabase['shop']>) => Promise<void>
  addSupplier: (input: Omit<Supplier, 'id' | 'shop_id' | 'created_at'>) => Promise<void>
  addCustomer: (input: Omit<Customer, 'id' | 'shop_id' | 'created_at'>) => Promise<void>
  receivePurchase: (opts: {
    supplier_id: string | null
    note: string
    items: PurchaseItemInput[]
    user_id: string
  }) => Promise<{
    purchase_id: string
    invoice_no: string
    total: number
    units: AppDatabase['stock_units']
  }>
  completeSale: (opts: {
    customer_id: string | null
    note: string
    discount: number
    paid: number
    items: CartItem[]
    user_id: string
  }) => Promise<Sale>
  processReturn: (opts: {
    unique_code?: string
    part_id?: string
    qty?: number
    reason: string
    user_id: string
  }) => Promise<ReturnRecord>
}

const DataContext = createContext<DataCtx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, ready, schemaError } = useAuth()
  const [db, setDb] = useState<AppDatabase>(() =>
    isSupabaseConfigured ? emptyDatabase() : dbApi.getDb(),
  )
  const [loaded, setLoaded] = useState(!isSupabaseConfigured)
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState(0)

  const reloadCloud = useCallback(async () => {
    if (!user?.shop_id) return
    setDb(await loadCloudDb(user.shop_id, user))
  }, [user])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setDb(dbApi.getDb())
      setLoaded(true)
      setError('')
      return
    }
    if (!ready) return
    if (!user) {
      setDb(emptyDatabase())
      setLoaded(true)
      setError('')
      return
    }
    if (!user.shop_id) {
      setError(schemaError || 'ডাটাবেস সেটআপ বাকি')
      setLoaded(true)
      return
    }

    const current = user
    let cancel = false
    setLoaded(false)
    setError('')
    ;(async () => {
      try {
        await seedSharedCatalog()
        const next = await loadCloudDb(current.shop_id, current)
        if (!cancel) setDb(next)
      } catch (err) {
        if (!cancel) {
          setError(err instanceof Error ? err.message : 'ডাটা লোড হয়নি')
        }
      } finally {
        if (!cancel) setLoaded(true)
      }
    })()
    return () => {
      cancel = true
    }
  }, [ready, user, schemaError, nonce])

  const value = useMemo<DataCtx>(() => {
    if (!isSupabaseConfigured) {
      const bump = () => setDb(dbApi.getDb())
      return {
        db,
        loaded,
        error,
        retry: () => setDb(dbApi.getDb()),
        async updateShop(data) {
          dbApi.updateShop(data)
          bump()
        },
        async addSupplier(input) {
          dbApi.addSupplier(input)
          bump()
        },
        async addCustomer(input) {
          dbApi.addCustomer(input)
          bump()
        },
        async receivePurchase(opts) {
          const result = dbApi.receivePurchase(opts)
          bump()
          return result
        },
        async completeSale(opts) {
          const sale = dbApi.completeSale(opts)
          bump()
          return sale
        },
        async processReturn(opts) {
          const rec = dbApi.processReturn(opts)
          bump()
          return rec
        },
      }
    }

    const shopId = user?.shop_id ?? ''
    return {
      db,
      loaded,
      error,
      retry: () => setNonce((n) => n + 1),
      async updateShop(data) {
        await cloudUpdateShop(shopId, data)
        await reloadCloud()
      },
      async addSupplier(input) {
        await cloudAddSupplier(shopId, input)
        await reloadCloud()
      },
      async addCustomer(input) {
        await cloudAddCustomer(shopId, input)
        await reloadCloud()
      },
      async receivePurchase(opts) {
        const result = await cloudReceivePurchase(opts)
        await reloadCloud()
        return result
      },
      async completeSale(opts) {
        const sale = await cloudCompleteSale(opts)
        await reloadCloud()
        return sale
      },
      async processReturn(opts) {
        const exact = opts.unique_code
          ? (db.stock_units.find(
              (u) => u.unique_code.toLowerCase() === opts.unique_code!.trim().toLowerCase(),
            )?.unique_code ?? opts.unique_code.trim())
          : undefined
        const rec = await cloudProcessReturn({
          unique_code: exact,
          part_id: opts.part_id,
          qty: opts.qty,
          reason: opts.reason,
          shopId,
        })
        await reloadCloud()
        return rec
      },
    }
  }, [db, loaded, error, user?.shop_id, reloadCloud])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData outside provider')
  return ctx
}
