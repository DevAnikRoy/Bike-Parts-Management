export type TrackingMode = 'serialized' | 'optional_serial' | 'qty_only'
export type UnitStatus = 'in_stock' | 'sold' | 'returned' | 'warranty' | 'damaged'
export type UserRole = 'owner' | 'staff'
export type MovementType =
  | 'purchase'
  | 'sale'
  | 'return'
  | 'adjust'
  | 'warranty'

export interface Shop {
  id: string
  name: string
  address: string
  phone: string
  invoice_prefix: string
  created_at: string
}

export interface AppUser {
  id: string
  shop_id: string
  name: string
  phone: string
  email: string
  role: UserRole
}

export interface Brand {
  id: string
  name: string
  name_bn: string
}

export interface BikeModel {
  id: string
  brand_id: string
  name: string
  name_bn: string
  cc: number
  year_from: number
  active: boolean
}

export interface PartCategory {
  id: string
  name: string
  name_bn: string
  sort_order: number
}

export interface Part {
  id: string
  brand_id: string | null
  category_id: string
  name: string
  name_bn: string
  oem_part_no: string
  tracking_mode: TrackingMode
  default_buy_price: number
  default_sell_price: number
  reorder_level: number
  unit: string
}

export interface PartModelCompatibility {
  part_id: string
  model_id: string
}

export interface Supplier {
  id: string
  shop_id: string
  name: string
  phone: string
  address: string
  note: string
  created_at: string
}

export interface Customer {
  id: string
  shop_id: string
  name: string
  phone: string
  address: string
  note: string
  created_at: string
}

export interface Purchase {
  id: string
  shop_id: string
  supplier_id: string | null
  invoice_no: string
  note: string
  total: number
  created_by: string
  created_at: string
}

export interface PurchaseLine {
  id: string
  purchase_id: string
  part_id: string
  qty: number
  buy_price: number
  line_total: number
}

export interface StockBalance {
  shop_id: string
  part_id: string
  qty: number
  avg_buy_price: number
  sell_price: number
  updated_at: string
}

export interface StockUnit {
  id: string
  shop_id: string
  part_id: string
  unique_code: string
  status: UnitStatus
  purchase_id: string | null
  purchase_line_id: string | null
  sale_id: string | null
  sale_line_id: string | null
  buy_price: number
  sell_price: number | null
  warranty_until: string | null
  created_at: string
  updated_at: string
}

export interface Sale {
  id: string
  shop_id: string
  customer_id: string | null
  invoice_no: string
  note: string
  total: number
  discount: number
  paid: number
  created_by: string
  created_at: string
}

export interface SaleLine {
  id: string
  sale_id: string
  part_id: string
  stock_unit_id: string | null
  qty: number
  sell_price: number
  line_total: number
  unique_code: string | null
}

export interface ReturnRecord {
  id: string
  shop_id: string
  sale_id: string | null
  sale_line_id: string | null
  part_id: string
  stock_unit_id: string | null
  unique_code: string | null
  qty: number
  reason: string
  matched: boolean
  created_by: string
  created_at: string
}

export interface StockMovement {
  id: string
  shop_id: string
  part_id: string
  stock_unit_id: string | null
  unique_code: string | null
  movement_type: MovementType
  qty_delta: number
  ref_type: string
  ref_id: string
  note: string
  created_by: string
  created_at: string
}

export interface AppDatabase {
  version: number
  shop: Shop
  users: AppUser[]
  brands: Brand[]
  models: BikeModel[]
  categories: PartCategory[]
  parts: Part[]
  compatibility: PartModelCompatibility[]
  suppliers: Supplier[]
  customers: Customer[]
  purchases: Purchase[]
  purchase_lines: PurchaseLine[]
  stock_balances: StockBalance[]
  stock_units: StockUnit[]
  sales: Sale[]
  sale_lines: SaleLine[]
  returns: ReturnRecord[]
  movements: StockMovement[]
  invoice_counters: { purchase: number; sale: number }
}

export interface CartItem {
  part_id: string
  qty: number
  sell_price: number
  stock_unit_id?: string
  unique_code?: string
}

export interface PurchaseItemInput {
  part_id: string
  qty: number
  buy_price: number
  serials?: string[]
  generate_codes?: boolean
  warranty_days?: number
}
