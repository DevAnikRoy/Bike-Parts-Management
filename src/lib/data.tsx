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
  cloudDeleteCustomer,
  cloudDeleteSupplier,
  cloudProcessReturn,
  cloudReceivePurchase,
  cloudUpdateShop,
  loadCloudDb,
  seedSharedCatalog,
} from './cloud'
import { dbApi } from './db'
import { emptyDatabase } from './queries'
import { RATE, takeRateLimit } from './rateLimit'
import { isLocalDemoMode } from './runtime'
import { isSupabaseConfigured } from './supabase'
import { userFacingError } from './errors'
import { toast } from './toast'
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
  addSupplier: (input: Omit<Supplier, 'id' | 'shop_id' | 'created_at'>) => Promise<string>
  addCustomer: (input: Omit<Customer, 'id' | 'shop_id' | 'created_at'>) => Promise<string>
  deleteSupplier: (id: string) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>
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
    isLocalDemoMode ? dbApi.getDb() : emptyDatabase(),
  )
  const [loaded, setLoaded] = useState(isLocalDemoMode)
  const [error, setError] = useState('')
  const [nonce, setNonce] = useState(0)

  const reloadCloud = useCallback(async () => {
    if (!user?.shop_id) return
    setDb(await loadCloudDb(user.shop_id, user))
  }, [user])

  useEffect(() => {
    if (isLocalDemoMode) {
      setDb(dbApi.getDb())
      setLoaded(true)
      setError('')
      return
    }
    if (!isSupabaseConfigured) {
      setDb(emptyDatabase())
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
        const seedOnce = async () => {
          try {
            await seedSharedCatalog()
          } catch {
            /* soft-fail */
          }
        }
        await seedOnce()
        let next = await loadCloudDb(current.shop_id, current)
        if (next.parts.length === 0) {
          await seedOnce()
          next = await loadCloudDb(current.shop_id, current)
        }
        if (!cancel) setDb(next)
      } catch (err) {
        if (!cancel) {
          const msg = userFacingError(err, 'ডাটা লোড হয়নি')
          setError(msg)
          toast().fromError(err, 'ডাটা লোড হয়নি')
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
    const shopKey = user?.shop_id || 'local'
    if (isLocalDemoMode) {
      const bump = () => setDb(dbApi.getDb())
      return {
        db,
        loaded,
        error,
        retry: () => setDb(dbApi.getDb()),
        async updateShop(data) {
          takeRateLimit(`shop:${shopKey}:update`, RATE.shopUpdate)
          dbApi.updateShop(data)
          bump()
        },
        async addSupplier(input) {
          takeRateLimit(`shop:${shopKey}:party`, RATE.partyWrite)
          const s = dbApi.addSupplier(input)
          bump()
          return s.id
        },
        async addCustomer(input) {
          takeRateLimit(`shop:${shopKey}:party`, RATE.partyWrite)
          const c = dbApi.addCustomer(input)
          bump()
          return c.id
        },
        async deleteSupplier(id) {
          takeRateLimit(`shop:${shopKey}:party`, RATE.partyWrite)
          dbApi.deleteSupplier(id)
          bump()
        },
        async deleteCustomer(id) {
          takeRateLimit(`shop:${shopKey}:party`, RATE.partyWrite)
          dbApi.deleteCustomer(id)
          bump()
        },
        async receivePurchase(opts) {
          takeRateLimit(`shop:${shopKey}:purchase`, RATE.purchase)
          const result = dbApi.receivePurchase(opts)
          bump()
          return result
        },
        async completeSale(opts) {
          takeRateLimit(`shop:${shopKey}:sale`, RATE.sale)
          const sale = dbApi.completeSale(opts)
          bump()
          return sale
        },
        async processReturn(opts) {
          takeRateLimit(`shop:${shopKey}:return`, RATE.returnAction)
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
        takeRateLimit(`shop:${shopId}:update`, RATE.shopUpdate)
        await cloudUpdateShop(shopId, data)
        await reloadCloud()
      },
      async addSupplier(input) {
        takeRateLimit(`shop:${shopId}:party`, RATE.partyWrite)
        const id = await cloudAddSupplier(shopId, input)
        await reloadCloud()
        return id
      },
      async addCustomer(input) {
        takeRateLimit(`shop:${shopId}:party`, RATE.partyWrite)
        const id = await cloudAddCustomer(shopId, input)
        await reloadCloud()
        return id
      },
      async deleteSupplier(id) {
        takeRateLimit(`shop:${shopId}:party`, RATE.partyWrite)
        await cloudDeleteSupplier(id)
        await reloadCloud()
      },
      async deleteCustomer(id) {
        takeRateLimit(`shop:${shopId}:party`, RATE.partyWrite)
        await cloudDeleteCustomer(id)
        await reloadCloud()
      },
      async receivePurchase(opts) {
        takeRateLimit(`shop:${shopId}:purchase`, RATE.purchase)
        const result = await cloudReceivePurchase(opts)
        await reloadCloud()
        return result
      },
      async completeSale(opts) {
        takeRateLimit(`shop:${shopId}:sale`, RATE.sale)
        const sale = await cloudCompleteSale(opts)
        await reloadCloud()
        return sale
      },
      async processReturn(opts) {
        takeRateLimit(`shop:${shopId}:return`, RATE.returnAction)
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
