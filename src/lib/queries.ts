import type {
  AppDatabase,
  Part,
  ReturnRecord,
  Sale,
  StockBalance,
  StockMovement,
  StockUnit,
} from './types'

function todayKey() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function dayKey(iso: string) {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function balanceOf(db: AppDatabase, partId: string): StockBalance | undefined {
  return db.stock_balances.find((b) => b.part_id === partId)
}

export function todaySalesTotal(db: AppDatabase) {
  const today = todayKey()
  return db.sales
    .filter((s) => dayKey(s.created_at) === today)
    .reduce((sum, s) => sum + (s.total - s.discount), 0)
}

export function monthSalesTotal(db: AppDatabase) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  return db.sales
    .filter((s) => {
      const d = new Date(s.created_at)
      return d.getFullYear() === y && d.getMonth() === m
    })
    .reduce((sum, s) => sum + (s.total - s.discount), 0)
}

/** Last 7 calendar days inclusive of today, oldest → newest. */
export function salesLast7Days(db: AppDatabase) {
  const days: { key: string; label: string; total: number }[] = []
  const labels = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({
      key,
      label: labels[d.getDay()],
      total: 0,
    })
  }
  const map = new Map(days.map((x) => [x.key, x]))
  for (const sale of db.sales) {
    const k = dayKey(sale.created_at)
    const row = map.get(k)
    if (row) row.total += sale.total - sale.discount
  }
  return days
}

export function lowStockRows(db: AppDatabase) {
  return db.stock_balances
    .map((b) => {
      const part = db.parts.find((p) => p.id === b.part_id)
      if (!part || b.qty > part.reorder_level) return null
      return { part, balance: b }
    })
    .filter(Boolean) as { part: Part; balance: StockBalance }[]
}

export function isFreshShop(db: AppDatabase) {
  return (
    db.purchases.length === 0 &&
    db.sales.length === 0 &&
    db.suppliers.length === 0
  )
}

export function stockValue(db: AppDatabase) {
  return db.stock_balances.reduce((sum, b) => sum + b.qty * b.avg_buy_price, 0)
}

export function topSoldParts(db: AppDatabase, limit = 10) {
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
}

/** YYYY-MM-DD for a Date (local). */
export function toDayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function parseDayKey(key: string) {
  const [y, m, day] = key.split('-').map(Number)
  const d = new Date(y, (m || 1) - 1, day || 1, 12, 0, 0, 0)
  return d
}

export function shiftDayKey(key: string, deltaDays: number) {
  const d = parseDayKey(key)
  d.setDate(d.getDate() + deltaDays)
  return toDayKey(d)
}

export type SalesPeriodId =
  | 'today'
  | 'yesterday'
  | 'last_7'
  | 'last_30'
  | 'this_month'
  | 'last_6_months'
  | 'last_year'
  | 'day'

export const SALES_PERIODS: { id: SalesPeriodId; label: string }[] = [
  { id: 'today', label: 'আজ' },
  { id: 'yesterday', label: 'গতকাল' },
  { id: 'last_7', label: '৭ দিন' },
  { id: 'last_30', label: '৩০ দিন' },
  { id: 'this_month', label: 'এই মাস' },
  { id: 'last_6_months', label: '৬ মাস' },
  { id: 'last_year', label: '১ বছর' },
  { id: 'day', label: 'দিন বাছাই' },
]

function startOfLocalDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfLocalDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function rangeForSalesPeriod(
  id: SalesPeriodId,
  dayKey?: string,
): { start: Date; end: Date; title: string } {
  const now = new Date()
  if (id === 'today') {
    return {
      start: startOfLocalDay(now),
      end: endOfLocalDay(now),
      title: 'আজকের বিক্রি',
    }
  }
  if (id === 'yesterday') {
    const y = new Date(now)
    y.setDate(y.getDate() - 1)
    return {
      start: startOfLocalDay(y),
      end: endOfLocalDay(y),
      title: 'গতকালের বিক্রি',
    }
  }
  if (id === 'day') {
    const key = dayKey || toDayKey(now)
    const d = parseDayKey(key)
    return {
      start: startOfLocalDay(d),
      end: endOfLocalDay(d),
      title: 'দিনের বিক্রি',
    }
  }
  if (id === 'last_7') {
    const start = startOfLocalDay(now)
    start.setDate(start.getDate() - 6)
    return { start, end: endOfLocalDay(now), title: 'গত ৭ দিনের বিক্রি' }
  }
  if (id === 'last_30') {
    const start = startOfLocalDay(now)
    start.setDate(start.getDate() - 29)
    return { start, end: endOfLocalDay(now), title: 'গত ৩০ দিনের বিক্রি' }
  }
  if (id === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    return { start, end: endOfLocalDay(now), title: 'এই মাসের বিক্রি' }
  }
  if (id === 'last_6_months') {
    const start = startOfLocalDay(now)
    start.setMonth(start.getMonth() - 6)
    return { start, end: endOfLocalDay(now), title: 'গত ৬ মাসের বিক্রি' }
  }
  // last_year
  const start = startOfLocalDay(now)
  start.setFullYear(start.getFullYear() - 1)
  return { start, end: endOfLocalDay(now), title: 'গত ১ বছরের বিক্রি' }
}

export function salesInRange(db: AppDatabase, start: Date, end: Date): Sale[] {
  const a = start.getTime()
  const b = end.getTime()
  return db.sales
    .filter((s) => {
      const t = new Date(s.created_at).getTime()
      return t >= a && t <= b
    })
    .sort((x, y) => (x.created_at < y.created_at ? 1 : -1))
}

export function salesNetTotal(sales: Sale[]) {
  return sales.reduce((sum, s) => sum + (s.total - s.discount), 0)
}

export function topPartsInSales(db: AppDatabase, sales: Sale[], limit = 8) {
  const ids = new Set(sales.map((s) => s.id))
  const map = new Map<string, { qty: number; amount: number }>()
  for (const line of db.sale_lines) {
    if (!ids.has(line.sale_id)) continue
    const cur = map.get(line.part_id) ?? { qty: 0, amount: 0 }
    cur.qty += line.qty
    cur.amount += line.line_total
    map.set(line.part_id, cur)
  }
  return [...map.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, limit)
    .map(([part_id, v]) => ({
      part: db.parts.find((p) => p.id === part_id),
      qty: v.qty,
      amount: v.amount,
    }))
}

export function stockValueBreakdown(db: AppDatabase) {
  return db.stock_balances
    .map((b) => {
      const part = db.parts.find((p) => p.id === b.part_id)
      if (!part || b.qty <= 0) return null
      const line = b.qty * b.avg_buy_price
      return { part, balance: b, line }
    })
    .filter(Boolean)
    .sort((a, b) => b!.line - a!.line) as {
    part: Part
    balance: StockBalance
    line: number
  }[]
}

export function findUnitByCode(db: AppDatabase, code: string): StockUnit | null {
  const q = code.trim().toLowerCase()
  if (!q) return null
  return db.stock_units.find((u) => u.unique_code.toLowerCase() === q) ?? null
}

export type LookupResult =
  | {
      type: 'unit'
      unit: StockUnit
      part: Part | undefined
      purchase: AppDatabase['purchases'][number] | null
      sale: Sale | null
      customer: AppDatabase['customers'][number] | null
      supplier: AppDatabase['suppliers'][number] | null
      movements: StockMovement[]
    }
  | {
      type: 'parts'
      parts: {
        part: Part
        balance: StockBalance | undefined
        units_in_stock: StockUnit[]
      }[]
    }
  | null

export function lookupInDb(db: AppDatabase, code: string): LookupResult {
  const q = code.trim()
  if (!q) return null

  const unit = findUnitByCode(db, q)
  if (unit) {
    const part = db.parts.find((p) => p.id === unit.part_id)
    const purchase = unit.purchase_id
      ? (db.purchases.find((p) => p.id === unit.purchase_id) ?? null)
      : null
    const sale = unit.sale_id
      ? (db.sales.find((s) => s.id === unit.sale_id) ?? null)
      : null
    const customer = sale?.customer_id
      ? (db.customers.find((c) => c.id === sale.customer_id) ?? null)
      : null
    const supplier = purchase?.supplier_id
      ? (db.suppliers.find((s) => s.id === purchase.supplier_id) ?? null)
      : null
    const movements = db.movements.filter(
      (m) => m.stock_unit_id === unit.id || m.unique_code === unit.unique_code,
    )
    return { type: 'unit', unit, part, purchase, sale, customer, supplier, movements }
  }

  const parts = db.parts.filter(
    (p) =>
      p.oem_part_no.toLowerCase() === q.toLowerCase() ||
      p.name_bn.includes(q) ||
      p.name.toLowerCase().includes(q.toLowerCase()),
  )
  if (parts.length) {
    return {
      type: 'parts',
      parts: parts.map((part) => ({
        part,
        balance: balanceOf(db, part.id),
        units_in_stock: db.stock_units.filter(
          (u) => u.part_id === part.id && u.status === 'in_stock',
        ),
      })),
    }
  }
  return null
}

export function emptyDatabase(): AppDatabase {
  return {
    version: 1,
    shop: {
      id: '',
      name: 'বাইক পার্টস',
      address: '',
      phone: '',
      invoice_prefix: 'BPM',
      created_at: '',
    },
    users: [],
    brands: [],
    models: [],
    categories: [],
    parts: [],
    compatibility: [],
    suppliers: [],
    customers: [],
    purchases: [],
    purchase_lines: [],
    stock_balances: [],
    stock_units: [],
    sales: [],
    sale_lines: [],
    returns: [] as ReturnRecord[],
    movements: [],
    invoice_counters: { purchase: 0, sale: 0 },
  }
}
