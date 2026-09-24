/**
 * Live multi-tenant isolation smoke (free, real Gmail).
 *
 * Phases (state in scripts/.smoke-state.json):
 *   npx --yes tsx scripts/live-isolation-smoke.mts --send-a
 *   # write OTP to scripts/.smoke-otp-a  OR  --otp-a=123456
 *   npx --yes tsx scripts/live-isolation-smoke.mts --verify-a --otp-a=123456
 *   npx --yes tsx scripts/live-isolation-smoke.mts --send-b
 *   npx --yes tsx scripts/live-isolation-smoke.mts --verify-b --otp-b=456789
 *   npx --yes tsx scripts/live-isolation-smoke.mts --isolate
 *
 * Or all-in-one (waits on OTP files, long timeout):
 *   npm run smoke:isolation
 */
import { readFileSync, existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'
import { catalogPayload } from '../src/lib/catalog'

const SITE = 'https://bike-parts-management.netlify.app'
const root = join(dirname(fileURLToPath(import.meta.url)))
const STATE = join(root, '.smoke-state.json')
const OTP_A = join(root, '.smoke-otp-a')
const OTP_B = join(root, '.smoke-otp-b')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const EMAIL_A = process.env.SMOKE_EMAIL_A || 'softvenceanik@gmail.com'
const EMAIL_B = process.env.SMOKE_EMAIL_B || 'anikroy302@gmail.com'

type SmokeState = {
  url: string
  anon: string
  emailA: string
  emailB: string
  shopA?: string
  shopB?: string
  sessionA?: Session
  sessionB?: Session
  partId?: string
  phase: string
}

function arg(flag: string) {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`))
  return hit ? hit.slice(flag.length + 1) : ''
}
function hasFlag(flag: string) {
  return process.argv.includes(flag)
}

function extractOtp(text: string) {
  return text.match(/\b(\d{6})\b/)?.[1] ?? null
}

function loadState(): SmokeState | null {
  if (!existsSync(STATE)) return null
  return JSON.parse(readFileSync(STATE, 'utf8')) as SmokeState
}

function saveState(s: SmokeState) {
  writeFileSync(STATE, JSON.stringify(s, null, 2), 'utf8')
}

function readOtp(path: string, preset: string) {
  const fromPreset = extractOtp(preset)
  if (fromPreset) return fromPreset
  if (!existsSync(path)) return null
  return extractOtp(readFileSync(path, 'utf8').trim())
}

async function pollOtp(path: string, label: string, preset: string, timeoutMs: number) {
  const quick = readOtp(path, preset)
  if (quick) {
    try {
      if (existsSync(path)) unlinkSync(path)
    } catch {
      /* ignore */
    }
    return quick
  }
  console.log(`\n→ OTP for ${label}: write 6 digits to\n  ${path}\n  or pass --otp-a= / --otp-b=\n`)
  writeFileSync(path, '', 'utf8')
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const otp = readOtp(path, '')
    if (otp) {
      try {
        unlinkSync(path)
      } catch {
        /* ignore */
      }
      return otp
    }
    await sleep(2000)
  }
  throw new Error(`OTP timeout for ${label}`)
}

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

async function client(url: string, anon: string, session?: Session) {
  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: session
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : undefined,
  })
  if (session) {
    const { error } = await sb.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    if (error) throw new Error(`setSession: ${error.message}`)
  }
  return sb
}

async function sendOtp(sb: SupabaseClient, email: string) {
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: SITE },
  })
  if (error) throw new Error(`OTP send ${email}: ${error.message}`)
  console.log('OTP sent to', email)
}

async function verifyAndShop(sb: SupabaseClient, email: string, token: string) {
  const { data, error } = await sb.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw new Error(`OTP verify ${email}: ${error.message}`)
  if (!data.session) throw new Error('no session after verify')
  const { data: shopData, error: shopErr } = await sb.rpc('ensure_my_shop')
  if (shopErr) throw new Error(`ensure_my_shop ${email}: ${shopErr.message}`)
  return { session: data.session, shopId: readShopId(shopData) }
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

async function runIsolate(state: SmokeState) {
  if (!state.sessionA || !state.sessionB || !state.shopA || !state.shopB) {
    throw new Error('need both shops verified first (--verify-a and --verify-b)')
  }
  if (state.shopA === state.shopB) throw new Error('FAIL: same shop_id')
  console.log('OK: different shop_ids', state.shopA, state.shopB)

  const sbA = await client(state.url, state.anon, state.sessionA)
  const sbB = await client(state.url, state.anon, state.sessionB)
  const partId = state.partId || (await ensurePart(sbA))
  state.partId = partId
  saveState(state)

  const { data: purch, error: purchErr } = await sbA.rpc('receive_purchase', {
    p_supplier_id: null,
    p_note: 'isolation-smoke',
    p_items: [{ part_id: partId, qty: 3, buy_price: 10, generate_codes: false }],
  })
  if (purchErr) throw new Error(`purchase A: ${purchErr.message}`)
  console.log('Purchase A', purch)

  const { data: balA, error: balAErr } = await sbA
    .from('stock_balances')
    .select('part_id, qty')
    .eq('part_id', partId)
  if (balAErr) throw new Error(balAErr.message)
  const qtyA = Number(balA?.[0]?.qty ?? 0)
  if (qtyA < 3) throw new Error(`FAIL: shop A stock expected >=3 got ${qtyA}`)
  console.log('Shop A stock qty', qtyA)

  const { data: balB, error: balBErr } = await sbB.from('stock_balances').select('part_id, qty')
  if (balBErr) throw new Error(balBErr.message)
  const leak = (balB || []).find((r) => r.part_id === partId && Number(r.qty) > 0)
  if (leak) throw new Error(`FAIL: shop B sees shop A stock ${JSON.stringify(leak)}`)

  console.log('OK: shop B does not see shop A stock')
  console.log('ISOLATION_SMOKE_PASS')
  state.phase = 'pass'
  saveState(state)
}

async function allInOne() {
  const { url, anon } = await loadAnonFromLive()
  const state: SmokeState = {
    url,
    anon,
    emailA: EMAIL_A,
    emailB: EMAIL_B,
    phase: 'start',
  }
  saveState(state)

  const sbA = await client(url, anon)
  await sendOtp(sbA, EMAIL_A)
  const otpA = await pollOtp(OTP_A, EMAIL_A, arg('--otp-a') || process.env.SMOKE_OTP_A || '', 300000)
  const verifiedA = await verifyAndShop(sbA, EMAIL_A, otpA)
  state.sessionA = verifiedA.session
  state.shopA = verifiedA.shopId
  state.phase = 'a-ok'
  saveState(state)
  console.log('Shop A', state.shopA)

  console.log('Waiting 65s for email rate limit…')
  await sleep(65000)

  const sbB = await client(url, anon)
  await sendOtp(sbB, EMAIL_B)
  const otpB = await pollOtp(OTP_B, EMAIL_B, arg('--otp-b') || process.env.SMOKE_OTP_B || '', 300000)
  const verifiedB = await verifyAndShop(sbB, EMAIL_B, otpB)
  state.sessionB = verifiedB.session
  state.shopB = verifiedB.shopId
  state.phase = 'b-ok'
  saveState(state)
  console.log('Shop B', state.shopB)

  await runIsolate(state)
}

async function continueFromAwaitA() {
  let state = loadState()
  if (!state || state.phase !== 'await-a') {
    throw new Error(`expected phase await-a, got ${state?.phase ?? 'none'}`)
  }
  console.log('Watching for OTP A in', OTP_A, '(or --otp-a=)')
  const otpA = await pollOtp(OTP_A, state.emailA, arg('--otp-a') || process.env.SMOKE_OTP_A || '', 600000)
  const sbA = await client(state.url, state.anon)
  const vA = await verifyAndShop(sbA, state.emailA, otpA)
  state.sessionA = vA.session
  state.shopA = vA.shopId
  state.phase = 'a-ok'
  saveState(state)
  console.log('Shop A', state.shopA)

  console.log('Waiting 65s for email rate limit…')
  await sleep(65000)

  await sendOtp(await client(state.url, state.anon), state.emailB)
  state.phase = 'await-b'
  saveState(state)
  console.log('Watching for OTP B in', OTP_B)
  const otpB = await pollOtp(OTP_B, state.emailB, arg('--otp-b') || process.env.SMOKE_OTP_B || '', 600000)
  const sbB = await client(state.url, state.anon)
  const vB = await verifyAndShop(sbB, state.emailB, otpB)
  state.sessionB = vB.session
  state.shopB = vB.shopId
  state.phase = 'b-ok'
  saveState(state)
  console.log('Shop B', state.shopB)

  await runIsolate(state)
}

async function main() {
  if (hasFlag('--continue')) {
    await continueFromAwaitA()
    return
  }

  const phased =
    hasFlag('--send-a') ||
    hasFlag('--verify-a') ||
    hasFlag('--send-b') ||
    hasFlag('--verify-b') ||
    hasFlag('--isolate')

  if (!phased) {
    await allInOne()
    return
  }

  let state = loadState()
  if (!state || hasFlag('--send-a')) {
    const { url, anon } = await loadAnonFromLive()
    state = { url, anon, emailA: EMAIL_A, emailB: EMAIL_B, phase: 'init' }
  }

  if (hasFlag('--send-a')) {
    await sendOtp(await client(state.url, state.anon), state.emailA)
    state.phase = 'await-a'
    saveState(state)
    console.log('Next: --continue  (watches OTP files)  or --verify-a --otp-a=XXXXXX')
    return
  }

  if (hasFlag('--verify-a')) {
    const otp = await pollOtp(OTP_A, state.emailA, arg('--otp-a') || process.env.SMOKE_OTP_A || '', 5000)
    if (!otp) throw new Error('need --otp-a= or scripts/.smoke-otp-a')
    const sb = await client(state.url, state.anon)
    const v = await verifyAndShop(sb, state.emailA, otp)
    state.sessionA = v.session
    state.shopA = v.shopId
    state.phase = 'a-ok'
    saveState(state)
    console.log('Shop A', state.shopA, '→ wait ~60s then --send-b')
    return
  }

  if (hasFlag('--send-b')) {
    await sendOtp(await client(state.url, state.anon), state.emailB)
    state.phase = 'await-b'
    saveState(state)
    console.log('Next: --verify-b --otp-b=XXXXXX')
    return
  }

  if (hasFlag('--verify-b')) {
    const otp = await pollOtp(OTP_B, state.emailB, arg('--otp-b') || process.env.SMOKE_OTP_B || '', 5000)
    if (!otp) throw new Error('need --otp-b= or scripts/.smoke-otp-b')
    const sb = await client(state.url, state.anon)
    const v = await verifyAndShop(sb, state.emailB, otp)
    state.sessionB = v.session
    state.shopB = v.shopId
    state.phase = 'b-ok'
    saveState(state)
    console.log('Shop B', state.shopB, '→ --isolate')
    return
  }

  if (hasFlag('--isolate')) {
    await runIsolate(state!)
  }
}

main().catch((err) => {
  console.error('ISOLATION_SMOKE_FAIL', err instanceof Error ? err.message : err)
  process.exit(1)
})
