/**
 * Live multi-tenant isolation without OTP (uses Supabase Anonymous Sign-Ins if enabled).
 * Run: npx --yes tsx scripts/live-isolation-anon.mts
 * Success: ISOLATION_SMOKE_PASS
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'
import { catalogPayload } from '../src/lib/catalog'

const SITE = 'https://bike-parts-management.netlify.app'

async function loadAnonFromLive() {
  const html = await fetch(SITE + '/').then((r) => r.text())
  const jsMatch = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)
  if (!jsMatch) throw new Error('live index.js not found')
  const js = await fetch(SITE + jsMatch[0]).then((r) => r.text())
  const url = js.match(/https:\/\/[a-z0-9-]+\.supabase\.co/)?.[0]
  const anon = js.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/)?.[0]
  if (!url || !anon) throw new Error('could not extract supabase config from live bundle')
  return { url, anon }
}

function readShopId(data: unknown) {
  let value = data
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      throw new Error('shop parse failed')
    }
  }
  if (value && typeof value === 'object' && 'shop_id' in value) {
    return String((value as { shop_id: unknown }).shop_id)
  }
  throw new Error(`no shop_id: ${JSON.stringify(data)}`)
}

async function clientWithSession(url: string, anon: string, session: Session) {
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  })
  const { error } = await sb.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  })
  if (error) throw new Error(`setSession: ${error.message}`)
  return sb
}

async function bootShop(url: string, anon: string, label: string) {
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await sb.auth.signInAnonymously()
  if (error) {
    throw new Error(
      `Anonymous sign-in failed (${label}): ${error.message}. Enable Authentication → Providers → Anonymous (free).`,
    )
  }
  if (!data.session) throw new Error(`no session for ${label}`)
  const authed = await clientWithSession(url, anon, data.session)
  const { data: shopData, error: shopErr } = await authed.rpc('ensure_my_shop')
  if (shopErr) throw new Error(`ensure_my_shop ${label}: ${shopErr.message}`)
  const shopId = readShopId(shopData)
  console.log(label, 'shop', shopId, 'user', data.session.user.id)
  return { sb: authed, shopId, session: data.session }
}

async function ensurePart(sb: SupabaseClient) {
  const { error: seedErr } = await sb.rpc('seed_catalog', { p_payload: catalogPayload() })
  if (seedErr) console.warn('seed_catalog:', seedErr.message)
  const { data: parts, error } = await sb.from('parts').select('id, tracking_mode').limit(30)
  if (error) throw new Error(error.message)
  const qtyPart = parts?.find((p) => p.tracking_mode === 'qty_only') || parts?.[0]
  if (!qtyPart) throw new Error('no parts after seed')
  return String(qtyPart.id)
}

async function main() {
  console.log('Loading live config…')
  const { url, anon } = await loadAnonFromLive()

  const shopA = await bootShop(url, anon, 'A')
  const shopB = await bootShop(url, anon, 'B')

  if (shopA.shopId === shopB.shopId) {
    throw new Error('FAIL: both anonymous users share the same shop_id')
  }
  console.log('OK: different shop_ids')

  const partId = await ensurePart(shopA.sb)
  const { data: purch, error: purchErr } = await shopA.sb.rpc('receive_purchase', {
    p_supplier_id: null,
    p_note: 'anon-isolation-smoke',
    p_items: [{ part_id: partId, qty: 3, buy_price: 10, generate_codes: false }],
  })
  if (purchErr) throw new Error(`purchase A: ${purchErr.message}`)
  console.log('Purchase A', purch)

  const { data: balA, error: balAErr } = await shopA.sb
    .from('stock_balances')
    .select('part_id, qty')
    .eq('part_id', partId)
  if (balAErr) throw new Error(balAErr.message)
  const qtyA = Number(balA?.[0]?.qty ?? 0)
  if (qtyA < 3) throw new Error(`FAIL: shop A stock expected >=3 got ${qtyA}`)
  console.log('Shop A stock qty', qtyA)

  const { data: balB, error: balBErr } = await shopB.sb.from('stock_balances').select('part_id, qty')
  if (balBErr) throw new Error(balBErr.message)
  const leak = (balB || []).find((r) => r.part_id === partId && Number(r.qty) > 0)
  if (leak) throw new Error(`FAIL: shop B sees shop A stock ${JSON.stringify(leak)}`)

  console.log('OK: shop B does not see shop A stock')
  console.log('ISOLATION_SMOKE_PASS')
}

main().catch((err) => {
  console.error('ISOLATION_SMOKE_FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
