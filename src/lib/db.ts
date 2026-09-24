import { v4 as uuid } from 'uuid'
import {
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_COMPATIBILITY,
  SEED_MODELS,
  SEED_PARTS,
} from '../data/seed'
import type {
  AppDatabase,
  AppUser,
  CartItem,
  Customer,
  PurchaseItemInput,
  ReturnRecord,
  Sale,
  StockBalance,
  StockUnit,
  Supplier,
} from '../lib/types'

const STORAGE_KEY = 'bpm_db_v1'
const SESSION_KEY = 'bpm_session_user_id'
/** DEV-only demo credentials — never written into localStorage. */
const DEMO_PHONE = '01700000000'
const DEMO_EMAIL = 'owner@demo.local'
const DEMO_PASSWORD = '1234'

function now() {
  return new Date().toISOString()
}

function genCode(prefix = 'BP') {
  const t = Date.now().toString(36).toUpperCase()
  const r = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}-${t}-${r}`
}

function createInitialDb(): AppDatabase {
  const shopId = 'shop-demo-001'
  const ownerId = 'user-owner-001'
  return {
    version: 1,
    shop: {
      id: shopId,
      name: 'আমার বাইক পার্টস',
      address: 'ঢাকা, বাংলাদেশ',
      phone: '01700000000',
      invoice_prefix: 'BPM',
      created_at: now(),
    },
    users: [
      {
        id: ownerId,
        shop_id: shopId,
        name: 'দোকান মালিক',
        phone: DEMO_PHONE,
        email: DEMO_EMAIL,
        role: 'owner',
      },
    ],
    brands: SEED_BRANDS,
    models: SEED_MODELS,
    categories: SEED_CATEGORIES,
    parts: SEED_PARTS,
    compatibility: SEED_COMPATIBILITY,
    suppliers: [],
    customers: [],
    purchases: [],
    purchase_lines: [],
    stock_balances: [],
    stock_units: [],
    sales: [],
    sale_lines: [],
    returns: [],
    movements: [],
    invoice_counters: { purchase: 0, sale: 0 },
  }
}

function stripSecrets(db: AppDatabase): AppDatabase {
  db.users = db.users.map((u) => {
    const { password: _drop, ...rest } = u as AppUser & { password?: string }
    return rest
  })
  return db
}

function loadDb(): AppDatabase {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const db = createInitialDb()
    saveDb(db)
    return db
  }
  try {
    const parsed = stripSecrets(JSON.parse(raw) as AppDatabase)
    saveDb(parsed)
    return parsed
  } catch {
    const db = createInitialDb()
    saveDb(db)
    return db
  }
}

function saveDb(db: AppDatabase) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stripSecrets(db)))
}

function getBalance(db: AppDatabase, partId: string): StockBalance | undefined {
  return db.stock_balances.find(
    (b) => b.shop_id === db.shop.id && b.part_id === partId,
  )
}

function upsertBalance(
  db: AppDatabase,
  partId: string,
  qtyDelta: number,
  buyPrice?: number,
  sellPrice?: number,
) {
  let bal = getBalance(db, partId)
  if (!bal) {
    const part = db.parts.find((p) => p.id === partId)
    bal = {
      shop_id: db.shop.id,
      part_id: partId,
      qty: 0,
      avg_buy_price: buyPrice ?? part?.default_buy_price ?? 0,
      sell_price: sellPrice ?? part?.default_sell_price ?? 0,
      updated_at: now(),
    }
    db.stock_balances.push(bal)
  }
  if (qtyDelta > 0 && buyPrice != null && bal.qty + qtyDelta > 0) {
    const totalCost = bal.avg_buy_price * bal.qty + buyPrice * qtyDelta
    bal.avg_buy_price = totalCost / (bal.qty + qtyDelta)
  }
  bal.qty += qtyDelta
  if (sellPrice != null) bal.sell_price = sellPrice
  bal.updated_at = now()
}

export const dbApi = {
  resetDemo() {
    const db = createInitialDb()
    saveDb(db)
    localStorage.removeItem(SESSION_KEY)
    return db
  },

  getDb() {
    return loadDb()
  },

  getSessionUser(): AppUser | null {
    const id = localStorage.getItem(SESSION_KEY)
    if (!id) return null
    const db = loadDb()
    return db.users.find((u) => u.id === id) ?? null
  },

  login(phoneOrEmail: string, password: string): AppUser {
    const db = loadDb()
    const id = phoneOrEmail.trim()
    const user = db.users.find((u) => u.phone === id || u.email === id)
    const demoOk =
      password === DEMO_PASSWORD &&
      (id === DEMO_PHONE || id === DEMO_EMAIL || user?.phone === DEMO_PHONE)
    if (!user || !demoOk) throw new Error('ফোন/ইমেইল বা পাসওয়ার্ড ভুল')
    localStorage.setItem(SESSION_KEY, user.id)
    return user
  },

  logout() {
    localStorage.removeItem(SESSION_KEY)
  },

  updateShop(data: Partial<AppDatabase['shop']>) {
    const db = loadDb()
    db.shop = { ...db.shop, ...data, id: db.shop.id }
    saveDb(db)
    return db.shop
  },

  addSupplier(input: Omit<Supplier, 'id' | 'shop_id' | 'created_at'>) {
    const db = loadDb()
    const s: Supplier = {
      id: uuid(),
      shop_id: db.shop.id,
      created_at: now(),
      ...input,
    }
    db.suppliers.push(s)
    saveDb(db)
    return s
  },

  addCustomer(input: Omit<Customer, 'id' | 'shop_id' | 'created_at'>) {
    const db = loadDb()
    const c: Customer = {
      id: uuid(),
      shop_id: db.shop.id,
      created_at: now(),
      ...input,
    }
    db.customers.push(c)
    saveDb(db)
    return c
  },

  deleteSupplier(id: string) {
    const db = loadDb()
    const before = db.suppliers.length
    db.suppliers = db.suppliers.filter((s) => s.id !== id)
    if (db.suppliers.length === before) throw new Error('সাপ্লায়ার পাওয়া যায়নি')
    for (const p of db.purchases) {
      if (p.supplier_id === id) p.supplier_id = null
    }
    saveDb(db)
  },

  deleteCustomer(id: string) {
    const db = loadDb()
    const before = db.customers.length
    db.customers = db.customers.filter((c) => c.id !== id)
    if (db.customers.length === before) throw new Error('কাস্টমার পাওয়া যায়নি')
    for (const s of db.sales) {
      if (s.customer_id === id) s.customer_id = null
    }
    saveDb(db)
  },

  receivePurchase(opts: {
    supplier_id: string | null
    note: string
    items: PurchaseItemInput[]
    user_id: string
  }) {
    const db = loadDb()
    if (!opts.items.length) throw new Error('কমপক্ষে একটি পার্ট যোগ করুন')

    db.invoice_counters.purchase += 1
    const invoice_no = `${db.shop.invoice_prefix}-P-${String(db.invoice_counters.purchase).padStart(5, '0')}`
    const purchaseId = uuid()
    let total = 0
    const createdUnits: StockUnit[] = []

    for (const item of opts.items) {
      const part = db.parts.find((p) => p.id === item.part_id)
      if (!part) throw new Error('পার্ট পাওয়া যায়নি')

      const lineId = uuid()
      const lineTotal = item.qty * item.buy_price
      total += lineTotal

      db.purchase_lines.push({
        id: lineId,
        purchase_id: purchaseId,
        part_id: item.part_id,
        qty: item.qty,
        buy_price: item.buy_price,
        line_total: lineTotal,
      })

      const needsUnits =
        part.tracking_mode === 'serialized' ||
        (part.tracking_mode === 'optional_serial' &&
          (item.generate_codes || (item.serials && item.serials.length > 0)))

      if (part.tracking_mode === 'serialized' || needsUnits) {
        const codes: string[] = []
        if (item.serials?.length) {
          if (item.serials.length !== item.qty) {
            throw new Error(`${part.name_bn}: সিরিয়াল সংখ্যা qty-এর সমান হতে হবে`)
          }
          codes.push(...item.serials.map((s) => s.trim()).filter(Boolean))
        } else if (item.generate_codes || part.tracking_mode === 'serialized') {
          for (let i = 0; i < item.qty; i++) codes.push(genCode('BP'))
        } else {
          upsertBalance(db, item.part_id, item.qty, item.buy_price)
          db.movements.push({
            id: uuid(),
            shop_id: db.shop.id,
            part_id: item.part_id,
            stock_unit_id: null,
            unique_code: null,
            movement_type: 'purchase',
            qty_delta: item.qty,
            ref_type: 'purchase',
            ref_id: purchaseId,
            note: 'ক্রয়',
            created_by: opts.user_id,
            created_at: now(),
          })
          continue
        }

        for (const code of codes) {
          if (db.stock_units.some((u) => u.unique_code === code)) {
            throw new Error(`ডুপ্লিকেট কোড: ${code}`)
          }
          const warranty =
            item.warranty_days && item.warranty_days > 0
              ? new Date(
                  Date.now() + item.warranty_days * 86400000,
                ).toISOString()
              : null
          const unit: StockUnit = {
            id: uuid(),
            shop_id: db.shop.id,
            part_id: item.part_id,
            unique_code: code,
            status: 'in_stock',
            purchase_id: purchaseId,
            purchase_line_id: lineId,
            sale_id: null,
            sale_line_id: null,
            buy_price: item.buy_price,
            sell_price: null,
            warranty_until: warranty,
            created_at: now(),
            updated_at: now(),
          }
          db.stock_units.push(unit)
          createdUnits.push(unit)
          upsertBalance(db, item.part_id, 1, item.buy_price)
          db.movements.push({
            id: uuid(),
            shop_id: db.shop.id,
            part_id: item.part_id,
            stock_unit_id: unit.id,
            unique_code: code,
            movement_type: 'purchase',
            qty_delta: 1,
            ref_type: 'purchase',
            ref_id: purchaseId,
            note: 'ক্রয় (সিরিয়াল)',
            created_by: opts.user_id,
            created_at: now(),
          })
        }
      } else {
        upsertBalance(db, item.part_id, item.qty, item.buy_price)
        db.movements.push({
          id: uuid(),
          shop_id: db.shop.id,
          part_id: item.part_id,
          stock_unit_id: null,
          unique_code: null,
          movement_type: 'purchase',
          qty_delta: item.qty,
          ref_type: 'purchase',
          ref_id: purchaseId,
          note: 'ক্রয়',
          created_by: opts.user_id,
          created_at: now(),
        })
      }
    }

    db.purchases.push({
      id: purchaseId,
      shop_id: db.shop.id,
      supplier_id: opts.supplier_id,
      invoice_no,
      note: opts.note,
      total,
      created_by: opts.user_id,
      created_at: now(),
    })

    saveDb(db)
    return { purchase_id: purchaseId, invoice_no, total, units: createdUnits }
  },

  completeSale(opts: {
    customer_id: string | null
    note: string
    discount: number
    paid: number
    items: CartItem[]
    user_id: string
  }) {
    const db = loadDb()
    if (!opts.items.length) throw new Error('কার্ট খালি')

    db.invoice_counters.sale += 1
    const invoice_no = `${db.shop.invoice_prefix}-S-${String(db.invoice_counters.sale).padStart(5, '0')}`
    const saleId = uuid()
    let total = 0

    for (const item of opts.items) {
      const part = db.parts.find((p) => p.id === item.part_id)
      if (!part) throw new Error('পার্ট পাওয়া যায়নি')
      const lineId = uuid()
      const lineTotal = item.qty * item.sell_price
      total += lineTotal

      if (item.stock_unit_id || item.unique_code) {
        const unit = db.stock_units.find(
          (u) =>
            u.id === item.stock_unit_id ||
            u.unique_code === item.unique_code,
        )
        if (!unit) throw new Error('সিরিয়াল/কোড পাওয়া যায়নি')
        if (unit.status !== 'in_stock') {
          throw new Error(`কোড ${unit.unique_code} স্টকে নেই (${unit.status})`)
        }
        unit.status = 'sold'
        unit.sale_id = saleId
        unit.sale_line_id = lineId
        unit.sell_price = item.sell_price
        unit.updated_at = now()

        db.sale_lines.push({
          id: lineId,
          sale_id: saleId,
          part_id: item.part_id,
          stock_unit_id: unit.id,
          qty: 1,
          sell_price: item.sell_price,
          line_total: item.sell_price,
          unique_code: unit.unique_code,
        })
        upsertBalance(db, item.part_id, -1)
        db.movements.push({
          id: uuid(),
          shop_id: db.shop.id,
          part_id: item.part_id,
          stock_unit_id: unit.id,
          unique_code: unit.unique_code,
          movement_type: 'sale',
          qty_delta: -1,
          ref_type: 'sale',
          ref_id: saleId,
          note: 'বিক্রি',
          created_by: opts.user_id,
          created_at: now(),
        })
      } else {
        const bal = getBalance(db, item.part_id)
        if (!bal || bal.qty < item.qty) {
          throw new Error(`${part.name_bn}: পর্যাপ্ত স্টক নেই`)
        }
        db.sale_lines.push({
          id: lineId,
          sale_id: saleId,
          part_id: item.part_id,
          stock_unit_id: null,
          qty: item.qty,
          sell_price: item.sell_price,
          line_total: lineTotal,
          unique_code: null,
        })
        upsertBalance(db, item.part_id, -item.qty)
        db.movements.push({
          id: uuid(),
          shop_id: db.shop.id,
          part_id: item.part_id,
          stock_unit_id: null,
          unique_code: null,
          movement_type: 'sale',
          qty_delta: -item.qty,
          ref_type: 'sale',
          ref_id: saleId,
          note: 'বিক্রি',
          created_by: opts.user_id,
          created_at: now(),
        })
      }
    }

    const sale: Sale = {
      id: saleId,
      shop_id: db.shop.id,
      customer_id: opts.customer_id,
      invoice_no,
      note: opts.note,
      total,
      discount: opts.discount,
      paid: opts.paid,
      created_by: opts.user_id,
      created_at: now(),
    }
    db.sales.push(sale)
    saveDb(db)
    return sale
  },

  lookupCode(code: string) {
    const db = loadDb()
    const q = code.trim()
    if (!q) return null

    const unit = db.stock_units.find(
      (u) => u.unique_code.toLowerCase() === q.toLowerCase(),
    )
    if (unit) {
      const part = db.parts.find((p) => p.id === unit.part_id)
      const purchase = unit.purchase_id
        ? db.purchases.find((p) => p.id === unit.purchase_id)
        : null
      const sale = unit.sale_id
        ? db.sales.find((s) => s.id === unit.sale_id)
        : null
      const customer = sale?.customer_id
        ? db.customers.find((c) => c.id === sale.customer_id)
        : null
      const supplier = purchase?.supplier_id
        ? db.suppliers.find((s) => s.id === purchase.supplier_id)
        : null
      const movements = db.movements.filter(
        (m) => m.stock_unit_id === unit.id || m.unique_code === unit.unique_code,
      )
      return {
        type: 'unit' as const,
        unit,
        part,
        purchase,
        sale,
        customer,
        supplier,
        movements,
      }
    }

    const parts = db.parts.filter(
      (p) =>
        p.oem_part_no.toLowerCase() === q.toLowerCase() ||
        p.name_bn.includes(q) ||
        p.name.toLowerCase().includes(q.toLowerCase()),
    )
    if (parts.length) {
      return {
        type: 'parts' as const,
        parts: parts.map((part) => ({
          part,
          balance: getBalance(db, part.id),
          units_in_stock: db.stock_units.filter(
            (u) => u.part_id === part.id && u.status === 'in_stock',
          ),
        })),
      }
    }
    return null
  },

  processReturn(opts: {
    unique_code?: string
    part_id?: string
    qty?: number
    reason: string
    user_id: string
  }): ReturnRecord {
    const db = loadDb()

    if (opts.unique_code) {
      const unit = db.stock_units.find(
        (u) => u.unique_code.toLowerCase() === opts.unique_code!.toLowerCase(),
      )
      if (!unit) {
        const rec: ReturnRecord = {
          id: uuid(),
          shop_id: db.shop.id,
          sale_id: null,
          sale_line_id: null,
          part_id: opts.part_id ?? '',
          stock_unit_id: null,
          unique_code: opts.unique_code,
          qty: 1,
          reason: opts.reason || 'কোড মিলেনি',
          matched: false,
          created_by: opts.user_id,
          created_at: now(),
        }
        db.returns.push(rec)
        saveDb(db)
        throw new Error(
          `এই সিরিয়াল/কোড (${opts.unique_code}) আমাদের রেকর্ডে নেই — রিটার্ন গ্রহণ করা যাবে না`,
        )
      }
      if (unit.status !== 'sold') {
        throw new Error(
          `কোড ${unit.unique_code} বিক্রি অবস্থায় নেই (বর্তমান: ${unit.status})`,
        )
      }
      unit.status = 'returned'
      unit.updated_at = now()
      upsertBalance(db, unit.part_id, 1)

      const rec: ReturnRecord = {
        id: uuid(),
        shop_id: db.shop.id,
        sale_id: unit.sale_id,
        sale_line_id: unit.sale_line_id,
        part_id: unit.part_id,
        stock_unit_id: unit.id,
        unique_code: unit.unique_code,
        qty: 1,
        reason: opts.reason,
        matched: true,
        created_by: opts.user_id,
        created_at: now(),
      }
      db.returns.push(rec)
      db.movements.push({
        id: uuid(),
        shop_id: db.shop.id,
        part_id: unit.part_id,
        stock_unit_id: unit.id,
        unique_code: unit.unique_code,
        movement_type: 'return',
        qty_delta: 1,
        ref_type: 'return',
        ref_id: rec.id,
        note: opts.reason || 'রিটার্ন',
        created_by: opts.user_id,
        created_at: now(),
      })
      // put back to in_stock after return accepted
      unit.status = 'in_stock'
      unit.sale_id = null
      unit.sale_line_id = null
      unit.sell_price = null
      saveDb(db)
      return rec
    }

    if (!opts.part_id || !opts.qty || opts.qty < 1) {
      throw new Error('পার্ট ও পরিমাণ দিন')
    }
    const rec: ReturnRecord = {
      id: uuid(),
      shop_id: db.shop.id,
      sale_id: null,
      sale_line_id: null,
      part_id: opts.part_id,
      stock_unit_id: null,
      unique_code: null,
      qty: opts.qty,
      reason: opts.reason,
      matched: true,
      created_by: opts.user_id,
      created_at: now(),
    }
    db.returns.push(rec)
    upsertBalance(db, opts.part_id, opts.qty)
    db.movements.push({
      id: uuid(),
      shop_id: db.shop.id,
      part_id: opts.part_id,
      stock_unit_id: null,
      unique_code: null,
      movement_type: 'return',
      qty_delta: opts.qty,
      ref_type: 'return',
      ref_id: rec.id,
      note: opts.reason || 'রিটার্ন (qty)',
      created_by: opts.user_id,
      created_at: now(),
    })
    saveDb(db)
    return rec
  },

  findUnitByCode(code: string) {
    const db = loadDb()
    return (
      db.stock_units.find(
        (u) => u.unique_code.toLowerCase() === code.trim().toLowerCase(),
      ) ?? null
    )
  },

  getTodaySalesTotal() {
    const db = loadDb()
    const today = new Date().toISOString().slice(0, 10)
    return db.sales
      .filter((s) => s.created_at.startsWith(today))
      .reduce((sum, s) => sum + (s.total - s.discount), 0)
  },

  getStockValue() {
    const db = loadDb()
    return db.stock_balances.reduce(
      (sum, b) => sum + b.qty * b.avg_buy_price,
      0,
    )
  },

  getTopSoldParts(limit = 10) {
    const db = loadDb()
    const map = new Map<string, number>()
    for (const line of db.sale_lines) {
      map.set(line.part_id, (map.get(line.part_id) ?? 0) + line.qty)
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([part_id, qty]) => ({
        part: db.parts.find((p) => p.id === part_id),
        qty,
      }))
  },
}
