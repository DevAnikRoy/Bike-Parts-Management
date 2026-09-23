/**
 * Free offline check: shop tables must have RLS + current_shop_id policies in setup.sql.
 * Run: node scripts/check-isolation-sql.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sql = readFileSync(join(root, 'supabase/setup.sql'), 'utf8')

const shopTables = [
  'shops',
  'profiles',
  'suppliers',
  'customers',
  'purchases',
  'purchase_lines',
  'stock_balances',
  'stock_units',
  'sales',
  'sale_lines',
  'returns',
  'stock_movements',
  'shop_counters',
]

const fails = []

for (const t of shopTables) {
  if (!new RegExp(`alter table ${t} enable row level security`, 'i').test(sql)) {
    fails.push(`RLS not enabled: ${t}`)
  }
}

if (!/create or replace function public\.current_shop_id/i.test(sql)) {
  fails.push('missing current_shop_id()')
}

if (!/create or replace function public\.ensure_my_shop/i.test(sql)) {
  fails.push('missing ensure_my_shop()')
}

if (!/when unique_violation/i.test(sql)) {
  fails.push('ensure_my_shop missing unique_violation race guard')
}

const mustMentionShop = [
  'suppliers_all',
  'customers_all',
  'purchases_all',
  'stock_balances_all',
  'stock_units_all',
  'sales_all',
  'returns_all',
  'movements_all',
  'counters_all',
]

for (const p of mustMentionShop) {
  if (!sql.includes(p)) fails.push(`missing policy name: ${p}`)
}

if (!/using \(shop_id = public\.current_shop_id\(\)\)/i.test(sql)) {
  fails.push('no shop_id = current_shop_id() policies found')
}

if (fails.length) {
  console.error('Isolation SQL check FAILED:')
  for (const f of fails) console.error(' -', f)
  process.exit(1)
}

console.log('Isolation SQL check OK:', shopTables.length, 'shop tables RLS + policies present')
