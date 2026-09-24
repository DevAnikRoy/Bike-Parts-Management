import type { SupabaseClient } from '@supabase/supabase-js'
import { catalogPayload } from './catalog'
import { toBanglaError } from './errors'
import type {
  AppDatabase,
  AppUser,
  BikeModel,
  Brand,
  CartItem,
  Customer,
  Part,
  PartCategory,
  PartModelCompatibility,
  Purchase,
  PurchaseItemInput,
  PurchaseLine,
  ReturnRecord,
  Sale,
  SaleLine,
  StockBalance,
  StockMovement,
  StockUnit,
  Supplier,
} from './types'
import { supabase } from './supabase'

type Row = Record<string, unknown>

function num(v: unknown) {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown) {
  return v == null ? '' : String(v)
}

function strOrNull(v: unknown) {
  return v == null || v === '' ? null : String(v)
}

function client(): SupabaseClient {
  if (!supabase) throw new Error('Supabase কনফিগার করা নেই')
  return supabase
}

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(toBanglaError(error.message))
}

async function rows(table: string) {
  const { data, error } = await client().from(table).select('*').limit(2000)
  fail(error)
  return (data ?? []) as Row[]
}

function mapBrand(r: Row): Brand {
  return { id: str(r.id), name: str(r.name), name_bn: str(r.name_bn) }
}

function mapModel(r: Row): BikeModel {
  return {
    id: str(r.id),
    brand_id: str(r.brand_id),
    name: str(r.name),
    name_bn: str(r.name_bn),
    cc: num(r.cc),
    year_from: num(r.year_from),
    active: Boolean(r.active),
  }
}

function mapCategory(r: Row): PartCategory {
  return {
    id: str(r.id),
    name: str(r.name),
    name_bn: str(r.name_bn),
    sort_order: num(r.sort_order),
  }
}

function mapPart(r: Row): Part {
  return {
    id: str(r.id),
    brand_id: strOrNull(r.brand_id),
    category_id: str(r.category_id),
    name: str(r.name),
    name_bn: str(r.name_bn),
    oem_part_no: str(r.oem_part_no),
    tracking_mode: str(r.tracking_mode) as Part['tracking_mode'],
    default_buy_price: num(r.default_buy_price),
    default_sell_price: num(r.default_sell_price),
    reorder_level: num(r.reorder_level),
    unit: str(r.unit || 'পিস'),
  }
}

function mapCompat(r: Row): PartModelCompatibility {
  return { part_id: str(r.part_id), model_id: str(r.model_id) }
}

function mapSupplier(r: Row): Supplier {
  return {
    id: str(r.id),
    shop_id: str(r.shop_id),
    name: str(r.name),
    phone: str(r.phone),
    address: str(r.address),
    note: str(r.note),
    created_at: str(r.created_at),
  }
}

function mapCustomer(r: Row): Customer {
  return {
    id: str(r.id),
    shop_id: str(r.shop_id),
    name: str(r.name),
    phone: str(r.phone),
    address: str(r.address),
    note: str(r.note),
    created_at: str(r.created_at),
  }
}

function mapPurchase(r: Row): Purchase {
  return {
    id: str(r.id),
    shop_id: str(r.shop_id),
    supplier_id: strOrNull(r.supplier_id),
    invoice_no: str(r.invoice_no),
    note: str(r.note),
    total: num(r.total),
    created_by: str(r.created_by),
    created_at: str(r.created_at),
  }
}

function mapPurchaseLine(r: Row): PurchaseLine {
  return {
    id: str(r.id),
    purchase_id: str(r.purchase_id),
    part_id: str(r.part_id),
    qty: num(r.qty),
    buy_price: num(r.buy_price),
    line_total: num(r.line_total),
  }
}

function mapBalance(r: Row): StockBalance {
  return {
    shop_id: str(r.shop_id),
    part_id: str(r.part_id),
    qty: num(r.qty),
    avg_buy_price: num(r.avg_buy_price),
    sell_price: num(r.sell_price),
    updated_at: str(r.updated_at),
  }
}

function mapUnit(r: Row): StockUnit {
  return {
    id: str(r.id),
    shop_id: str(r.shop_id),
    part_id: str(r.part_id),
    unique_code: str(r.unique_code),
    status: str(r.status) as StockUnit['status'],
    purchase_id: strOrNull(r.purchase_id),
    purchase_line_id: strOrNull(r.purchase_line_id),
    sale_id: strOrNull(r.sale_id),
    sale_line_id: strOrNull(r.sale_line_id),
    buy_price: num(r.buy_price),
    sell_price: r.sell_price == null ? null : num(r.sell_price),
    warranty_until: strOrNull(r.warranty_until),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  }
}

function mapSale(r: Row): Sale {
  return {
    id: str(r.id),
    shop_id: str(r.shop_id),
    customer_id: strOrNull(r.customer_id),
    invoice_no: str(r.invoice_no),
    note: str(r.note),
    total: num(r.total),
    discount: num(r.discount),
    paid: num(r.paid),
    created_by: str(r.created_by),
    created_at: str(r.created_at),
  }
}

function mapSaleLine(r: Row): SaleLine {
  return {
    id: str(r.id),
    sale_id: str(r.sale_id),
    part_id: str(r.part_id),
    stock_unit_id: strOrNull(r.stock_unit_id),
    qty: num(r.qty),
    sell_price: num(r.sell_price),
    line_total: num(r.line_total),
    unique_code: strOrNull(r.unique_code),
  }
}

function mapReturn(r: Row): ReturnRecord {
  return {
    id: str(r.id),
    shop_id: str(r.shop_id),
    sale_id: strOrNull(r.sale_id),
    sale_line_id: strOrNull(r.sale_line_id),
    part_id: str(r.part_id),
    stock_unit_id: strOrNull(r.stock_unit_id),
    unique_code: strOrNull(r.unique_code),
    qty: num(r.qty),
    reason: str(r.reason),
    matched: Boolean(r.matched),
    created_by: str(r.created_by),
    created_at: str(r.created_at),
  }
}

function mapMovement(r: Row): StockMovement {
  return {
    id: str(r.id),
    shop_id: str(r.shop_id),
    part_id: str(r.part_id),
    stock_unit_id: strOrNull(r.stock_unit_id),
    unique_code: strOrNull(r.unique_code),
    movement_type: str(r.movement_type) as StockMovement['movement_type'],
    qty_delta: num(r.qty_delta),
    ref_type: str(r.ref_type),
    ref_id: str(r.ref_id),
    note: str(r.note),
    created_by: str(r.created_by),
    created_at: str(r.created_at),
  }
}

export async function seedSharedCatalog() {
  const { error } = await client().rpc('seed_catalog', { p_payload: catalogPayload() })
  fail(error)
}

export async function loadCloudDb(shopId: string, user: AppUser): Promise<AppDatabase> {
  const sb = client()
  const { data: shopRow, error: shopError } = await sb
    .from('shops')
    .select('*')
    .eq('id', shopId)
    .maybeSingle()
  fail(shopError)
  if (!shopRow) throw new Error('দোকান পাওয়া যায়নি')

  const [
    brands,
    models,
    categories,
    parts,
    compatibility,
    suppliers,
    customers,
    purchases,
    purchaseLines,
    balances,
    units,
    sales,
    saleLines,
    returns,
    movements,
  ] = await Promise.all([
    rows('brands'),
    rows('bike_models'),
    rows('part_categories'),
    rows('parts'),
    rows('part_model_compatibility'),
    rows('suppliers'),
    rows('customers'),
    rows('purchases'),
    rows('purchase_lines'),
    rows('stock_balances'),
    rows('stock_units'),
    rows('sales'),
    rows('sale_lines'),
    rows('returns'),
    rows('stock_movements'),
  ])

  const shop = shopRow as Row
  return {
    version: 1,
    shop: {
      id: str(shop.id),
      name: str(shop.name),
      address: str(shop.address),
      phone: str(shop.phone),
      invoice_prefix: str(shop.invoice_prefix || 'BPM'),
      logo_svg: shop.logo_svg != null ? str(shop.logo_svg) : null,
      created_at: str(shop.created_at),
    },
    users: [user],
    brands: brands.map(mapBrand),
    models: models.map(mapModel),
    categories: categories.map(mapCategory),
    parts: parts.map(mapPart),
    compatibility: compatibility.map(mapCompat),
    suppliers: suppliers.map(mapSupplier),
    customers: customers.map(mapCustomer),
    purchases: purchases.map(mapPurchase),
    purchase_lines: purchaseLines.map(mapPurchaseLine),
    stock_balances: balances.map(mapBalance),
    stock_units: units.map(mapUnit),
    sales: sales.map(mapSale),
    sale_lines: saleLines.map(mapSaleLine),
    returns: returns.map(mapReturn),
    movements: movements.map(mapMovement),
    invoice_counters: { purchase: 0, sale: 0 },
  }
}

export async function cloudUpdateShop(
  shopId: string,
  data: Partial<AppDatabase['shop']>,
) {
  const patch: Record<string, unknown> = {}
  if (data.name !== undefined) patch.name = data.name
  if (data.address !== undefined) patch.address = data.address
  if (data.phone !== undefined) patch.phone = data.phone
  if (data.invoice_prefix !== undefined) patch.invoice_prefix = data.invoice_prefix
  if (data.logo_svg !== undefined) patch.logo_svg = data.logo_svg
  const { error } = await client().from('shops').update(patch).eq('id', shopId)
  fail(error)
}

export async function cloudAddSupplier(
  shopId: string,
  input: Omit<Supplier, 'id' | 'shop_id' | 'created_at'>,
) {
  const { data, error } = await client()
    .from('suppliers')
    .insert({
      shop_id: shopId,
      name: input.name,
      phone: input.phone,
      address: input.address,
      note: input.note,
    })
    .select('id')
    .single()
  fail(error)
  return String(data.id)
}

export async function cloudAddCustomer(
  shopId: string,
  input: Omit<Customer, 'id' | 'shop_id' | 'created_at'>,
) {
  const { data, error } = await client()
    .from('customers')
    .insert({
      shop_id: shopId,
      name: input.name,
      phone: input.phone,
      address: input.address,
      note: input.note,
    })
    .select('id')
    .single()
  fail(error)
  return String(data.id)
}

export async function cloudDeleteSupplier(id: string) {
  const { error } = await client().from('suppliers').delete().eq('id', id)
  fail(error)
}

export async function cloudDeleteCustomer(id: string) {
  const { error } = await client().from('customers').delete().eq('id', id)
  fail(error)
}

export async function cloudReceivePurchase(opts: {
  supplier_id: string | null
  note: string
  items: PurchaseItemInput[]
}) {
  const { data, error } = await client().rpc('receive_purchase', {
    p_supplier_id: opts.supplier_id,
    p_note: opts.note,
    p_items: opts.items,
  })
  fail(error)
  const result = data as { purchase_id: string; invoice_no: string; total: number }
  const { data: unitRows, error: unitError } = await client()
    .from('stock_units')
    .select('*')
    .eq('purchase_id', result.purchase_id)
  fail(unitError)
  return {
    purchase_id: result.purchase_id,
    invoice_no: result.invoice_no,
    total: num(result.total),
    units: ((unitRows ?? []) as Row[]).map(mapUnit),
  }
}

export async function cloudCompleteSale(opts: {
  customer_id: string | null
  note: string
  discount: number
  paid: number
  items: CartItem[]
}) {
  const { data, error } = await client().rpc('complete_sale', {
    p_customer_id: opts.customer_id,
    p_note: opts.note,
    p_discount: opts.discount,
    p_paid: opts.paid,
    p_items: opts.items.map((item) => ({
      part_id: item.part_id,
      qty: item.qty,
      sell_price: item.sell_price,
      unique_code: item.unique_code ?? '',
    })),
  })
  fail(error)
  const result = data as { sale_id: string }
  const { data: saleRow, error: saleError } = await client()
    .from('sales')
    .select('*')
    .eq('id', result.sale_id)
    .single()
  fail(saleError)
  return mapSale(saleRow as Row)
}

export async function cloudProcessReturn(opts: {
  unique_code?: string
  part_id?: string
  qty?: number
  reason: string
  shopId: string
}): Promise<ReturnRecord> {
  if (opts.unique_code) {
    const { data, error } = await client().rpc('process_return_serial', {
      p_unique_code: opts.unique_code,
      p_reason: opts.reason,
    })
    fail(error)
    const result = data as { return_id: string; unique_code: string; matched: boolean }
    return {
      id: result.return_id,
      shop_id: opts.shopId,
      sale_id: null,
      sale_line_id: null,
      part_id: opts.part_id ?? '',
      stock_unit_id: null,
      unique_code: result.unique_code,
      qty: 1,
      reason: opts.reason,
      matched: true,
      created_by: '',
      created_at: new Date().toISOString(),
    }
  }

  if (!opts.part_id || !opts.qty || opts.qty < 1) {
    throw new Error('পার্ট ও পরিমাণ দিন')
  }
  const { data, error } = await client().rpc('process_return_qty', {
    p_part_id: opts.part_id,
    p_qty: opts.qty,
    p_reason: opts.reason,
  })
  fail(error)
  const result = data as { return_id: string }
  return {
    id: result.return_id,
    shop_id: opts.shopId,
    sale_id: null,
    sale_line_id: null,
    part_id: opts.part_id,
    stock_unit_id: null,
    unique_code: null,
    qty: opts.qty,
    reason: opts.reason,
    matched: true,
    created_by: '',
    created_at: new Date().toISOString(),
  }
}
