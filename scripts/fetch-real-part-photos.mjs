/**
 * Fetch real part photos from the open web:
 *  1) Wikimedia Commons API search (CC-licensed)
 *  2) curated Unsplash direct URLs (Unsplash License)
 *  3) leave SVG icon if both fail
 *
 * Run: node scripts/fetch-real-part-photos.mjs
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join('public', 'parts')
mkdirSync(outDir, { recursive: true })

const UA = 'BikePartsManagement/1.0 (shop catalog thumbs; free-license reuse)'

/** Prefer these Commons search phrases (namespace File) */
const COMMONS_QUERY = {
  'spark-plug': 'spark plug automotive',
  'brake-pad': 'brake pad motorcycle',
  'brake-shoe': 'drum brake shoe',
  'chain-kit': 'motorcycle drive chain sprocket',
  battery: 'motorcycle battery 12V',
  headlight: 'motorcycle headlight',
  'air-filter': 'motorcycle air filter',
  'oil-filter': 'oil filter automotive',
  bulb: 'halogen H4 headlight bulb',
  'engine-oil': 'motor oil bottle',
  'fork-oil': 'motorcycle front fork',
  'clutch-plate': 'clutch disc automotive',
  shock: 'motorcycle rear shock absorber',
  speedometer: 'motorcycle speedometer gauge',
  ignition: 'motorcycle ignition switch key',
  cdi: 'CDI ignition module motorcycle',
  'clutch-cable': 'motorcycle clutch cable',
  'accelerator-cable': 'motorcycle throttle cable',
  'speedo-cable': 'speedometer cable',
  'side-cover': 'motorcycle side cover fairing',
  'tank-cap': 'motorcycle fuel tank cap',
  generic: 'motorcycle spare parts workshop',
}

/** Unsplash License — curated close-ups / relevant motorcycle parts */
const UNSPLASH = {
  'chain-kit':
    'https://images.unsplash.com/photo-1645454616643-89ce27edb210?auto=format&fit=crop&w=480&q=80',
  'brake-pad':
    'https://images.unsplash.com/photo-1707859299538-859372fc3aa9?auto=format&fit=crop&w=480&q=80',
  'spark-plug':
    'https://images.unsplash.com/photo-1776265003052-bca265f63b2f?auto=format&fit=crop&w=480&q=80',
  shock:
    'https://images.unsplash.com/photo-1749655672319-05f2cbb4e340?auto=format&fit=crop&w=480&q=80',
  headlight:
    'https://images.unsplash.com/photo-1755585190999-2c8b62c03a49?auto=format&fit=crop&w=480&q=80',
  'engine-oil':
    'https://images.unsplash.com/photo-1746014994978-4591e956d2d0?auto=format&fit=crop&w=480&q=80',
  generic:
    'https://images.unsplash.com/photo-1762441406290-e637744e6294?auto=format&fit=crop&w=480&q=80',
  battery:
    'https://images.unsplash.com/photo-1609091839311-9e9d9e0d1e0a?auto=format&fit=crop&w=480&q=80',
  bulb:
    'https://images.unsplash.com/photo-1513506003901-1e6a229e6b15?auto=format&fit=crop&w=480&q=80',
  speedometer:
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=480&q=80',
  'side-cover':
    'https://images.unsplash.com/photo-1558981359-219d6364c9c8?auto=format&fit=crop&w=480&q=80',
  'fork-oil':
    'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=480&q=80',
  ignition:
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=480&q=80',
  'clutch-cable':
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=480&q=80',
  'accelerator-cable':
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=480&q=80',
  'tank-cap':
    'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=480&q=80',
  'air-filter':
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=480&q=80',
  'oil-filter':
    'https://images.unsplash.com/photo-1487754180451-d8c9484a5a36?auto=format&fit=crop&w=480&q=80',
  'clutch-plate':
    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=480&q=80',
  'brake-shoe':
    'https://images.unsplash.com/photo-1710464081714-4ed52a70ca5f?auto=format&fit=crop&w=480&q=80',
  cdi:
    'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=480&q=80',
  'speedo-cable':
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=480&q=80',
}

async function fetchBuf(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const type = res.headers.get('content-type') || ''
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 1500) throw new Error('too small')
  if (!type.startsWith('image/') && buf[0] !== 0xff && buf[0] !== 0x89) {
    // still accept if JPEG/PNG magic
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8
    const isPng = buf[0] === 0x89 && buf[1] === 0x50
    if (!isJpeg && !isPng && !type.startsWith('image/')) throw new Error(`not image: ${type}`)
  }
  const ext = type.includes('png') || buf[0] === 0x89 ? 'png' : 'jpg'
  return { buf, ext, type }
}

async function fromCommons(key, query) {
  const api =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      format: 'json',
      generator: 'search',
      gsrsearch: query,
      gsrnamespace: '6',
      gsrlimit: '8',
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
      iiurlwidth: '480',
      origin: '*',
    })
  const data = await fetch(api, { headers: { 'User-Agent': UA } }).then((r) => r.json())
  const pages = Object.values(data?.query?.pages || {})
  pages.sort((a, b) => (b.index || 0) - (a.index || 0))
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info) continue
    const mime = info.mime || ''
    if (!mime.startsWith('image/') || mime.includes('svg')) continue
    const url = info.thumburl || info.url
    if (!url) continue
    try {
      const { buf, ext } = await fetchBuf(url)
      const file = `${key}.${ext}`
      writeFileSync(join(outDir, file), buf)
      return { key, file, bytes: buf.length, source: `commons:${page.title}`, via: 'commons' }
    } catch {
      /* try next hit */
    }
  }
  throw new Error('no commons hit')
}

async function fromUnsplash(key) {
  const url = UNSPLASH[key]
  if (!url) throw new Error('no unsplash url')
  const { buf, ext } = await fetchBuf(url)
  const file = `${key}.${ext}`
  writeFileSync(join(outDir, file), buf)
  return { key, file, bytes: buf.length, source: url.split('?')[0], via: 'unsplash' }
}

function hasRealPhoto(key) {
  return (
    existsSync(join(outDir, `${key}.jpg`)) ||
    existsSync(join(outDir, `${key}.png`)) ||
    existsSync(join(outDir, `${key}.webp`))
  )
}

const keys = Object.keys(COMMONS_QUERY)
const ok = []
const failed = []

for (const key of keys) {
  if (hasRealPhoto(key) && !process.argv.includes('--force')) {
    console.log('SKIP (already have)', key)
    ok.push({ key, skipped: true })
    continue
  }
  try {
    const r = await fromCommons(key, COMMONS_QUERY[key])
    ok.push(r)
    console.log('OK commons', key, r.bytes)
    await new Promise((r) => setTimeout(r, 250))
    continue
  } catch (e1) {
    try {
      const r = await fromUnsplash(key)
      ok.push(r)
      console.log('OK unsplash', key, r.bytes)
      continue
    } catch (e2) {
      failed.push({ key, commons: String(e1.message || e1), unsplash: String(e2.message || e2) })
      console.error('FAIL', key, e1.message, '/', e2.message)
    }
  }
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ ok, failed }, null, 2))
writeFileSync(
  join(outDir, 'ATTRIBUTION.md'),
  `# Part photo attribution

Real photos for catalog thumbnails. Prefer Wikimedia Commons (CC) then Unsplash License.

${ok
  .filter((x) => x.file)
  .map((x) => `- **${x.key}** (${x.via}): ${x.source} → \`${x.file}\``)
  .join('\n')}

Failed: ${failed.length ? failed.map((f) => f.key).join(', ') : 'none'}
`,
)

const photos = readdirSync(outDir).filter((f) => /\.(jpg|png|webp)$/i.test(f))
console.log(`Done. Real photos on disk: ${photos.length}`)
console.log(photos.sort().join(', '))
