/**
 * Live multi-tenant smoke (free): two temp emails → OTP → shops → A buys stock → B sees none.
 * Usage: node scripts/live-isolation-smoke.mjs
 * Needs network. Uses public anon key from live Netlify bundle (same as the site).
 */
import { createClient } from '@supabase/supabase-js'

const SITE = 'https://bike-parts-management.netlify.app'
const REDIRECT = SITE
const MAIL_NEW = 'https://tempmailc.com/api/v1/new'
const MAIL_INBOX = (email) => `https://tempmailc.com/api/v1/inbox?email=${encodeURIComponent(email)}`
const MAIL_MSG = (email, id) =>
  `https://tempmailc.com/api/v1/message?email=${encodeURIComponent(email)}&msg_id=${encodeURIComponent(id)}`

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchText(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`)
  return res.text()
}

async function loadAnonFromLive() {
  const html = await fetchText(SITE + '/')
  const jsMatch = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)
  if (!jsMatch) throw new Error('live index.js not found')
  const js = await fetchText(SITE + jsMatch[0])
  const url = js.match(/https:\/\/[a-z0-9-]+\.supabase\.co/)?.[0]
  const anon = js.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/)?.[0]
  if (!url || !anon) throw new Error('could not extract supabase url/anon from live bundle')
  return { url, anon }
}

async function newTempEmail() {
  const res = await fetch(MAIL_NEW)
  const data = await res.json()
  const email = data.email || data.address || data.mailbox
  if (!email) throw new Error(`temp mail failed: ${JSON.stringify(data)}`)
  return String(email)
}

function extractOtp(text) {
  const m = String(text).match(/\b(\d{6})\b/)
  return m?.[1] ?? null
}

async function waitForOtp(email, timeoutMs = 90000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(MAIL_INBOX(email))
    const data = await res.json()
    const messages = data.messages || data || []
    for (const msg of messages) {
      const id = msg.id || msg.msg_id
      if (!id) continue
      const full = await fetch(MAIL_MSG(email, id)).then((r) => r.json())
      const body = full.text || full.html || full.content || JSON.stringify(full)
      const otp = extractOtp(body)
      if (otp) return otp
      const subjOtp = extractOtp(msg.subject || '')
      if (subjOtp) return subjOtp
    }
    await sleep(4000)
  }
  throw new Error(`OTP timeout for ${email}`)
}

async function loginShop(sbUrl, anon, email) {
  const sb = createClient(sbUrl, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: sendErr } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: REDIRECT },
  })
  if (sendErr) throw new Error(`OTP send ${email}: ${sendErr.message}`)
  console.log('OTP sent to', email)
  const token = await waitForOtp(email)
  console.log('OTP received for', email)
  const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw new Error(`OTP verify ${email}: ${error.message}`)
  const { data: shopData, error: shopErr } = await sb.rpc('ensure_my_shop')
  if (shopErr) throw new Error(`ensure_my_shop ${email}: ${shopErr.message}`)
  let shopId = shopData
  if (typeof shopId === 'string') {
    try {
      shopId = JSON.parse(shopId)
    } catch {
      /* keep */
    }
  }
  if (shopId && typeof shopId === 'object' && 'shop_id' in shopId) {
    shopId = shopId.shop_id
  }
  if (!shopId) throw new Error(`no shop_id for ${email}: ${JSON.stringify(shopData)}`)
  return { sb, shopId: String(shopId), email }
}

async function seedCatalog(sb) {
  const { catalogPayload } = await import('../src/lib/catalog.ts').catch(() => ({ catalogPayload: null }))
  if (!catalogPayload) {
    // Fallback: call seed with minimal empty — app uses full seed; try RPC with parts from DB
    const { data: existing } = await sb.from('parts').select('id').limit(1)
    if (existing?.length) return existing[0].id
    throw new Error('catalog module load failed and parts empty — open app once to seed, or fix import')
  }
  const { error } = await sb.rpc('seed_catalog', { p_payload: catalogPayload() })
  if (error) console.warn('seed_catalog:', error.message)
  const { data: parts, error: pErr } = await sb.from('parts').select('id, tracking_mode').limit(20)
  if (pErr) throw new Error(pErr.message)
  const qtyPart = parts?.find((p) => p.tracking_mode === 'qty_only') || parts?.[0]
  if (!qtyPart) throw new Error('no parts after seed')
  return qtyPart.id
}

async function main() {
  console.log('Loading live Supabase config…')
  const { url, anon } = await loadAnonFromLive()
  console.log('Supabase', url)

  const emailA = await newTempEmail()
  await sleep(2000)
  const emailB = await newTempEmail()
  console.log('A=', emailA, 'B=', emailB)

  const shopA = await loginShop(url, anon, emailA)
  console.log('Shop A', shopA.shopId)

  // Rate limit buffer before second OTP
  await sleep(60000)

  const shopB = await loginShop(url, anon, emailB)
  console.log('Shop B', shopB.shopId)

  if (shopA.shopId === shopB.shopId) {
    throw new Error('FAIL: both emails share the same shop_id')
  }
  console.log('OK: different shop_ids')

  const partId = await seedCatalog(shopA.sb)
  console.log('Part for purchase', partId)

  const { data: purch, error: purchErr } = await shopA.sb.rpc('receive_purchase', {
    p_supplier_id: null,
    p_note: 'isolation-smoke',
    p_items: [{ part_id: partId, qty: 3, buy_price: 10, generate_codes: false }],
  })
  if (purchErr) throw new Error(`purchase A: ${purchErr.message}`)
  console.log('Purchase A', purch)

  const { data: balA, error: balAErr } = await shopA.sb
    .from('stock_balances')
    .select('part_id, qty')
    .eq('part_id', partId)
  if (balAErr) throw new Error(balAErr.message)
  const qtyA = balA?.[0]?.qty ?? 0
  if (qtyA < 3) throw new Error(`FAIL: shop A stock expected >=3 got ${qtyA}`)
  console.log('Shop A stock qty', qtyA)

  const { data: balB, error: balBErr } = await shopB.sb.from('stock_balances').select('part_id, qty')
  if (balBErr) throw new Error(balBErr.message)
  const leak = (balB || []).find((r) => r.part_id === partId && Number(r.qty) > 0)
  if (leak) {
    throw new Error(`FAIL: shop B sees shop A stock ${JSON.stringify(leak)}`)
  }
  console.log('OK: shop B stock for that part is empty / unseen')
  console.log('ISOLATION_SMOKE_PASS')
}

main().catch((err) => {
  console.error('ISOLATION_SMOKE_FAIL', err.message || err)
  process.exit(1)
})
