/**
 * Download real CC-licensed part photos from Wikimedia Commons into public/parts/*.jpg
 * Run: node scripts/download-part-photos.mjs
 *
 * Sources are Wikimedia Special:FilePath (CC BY / CC BY-SA / public domain).
 * See public/parts/ATTRIBUTION.md after download.
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join('public', 'parts')
mkdirSync(outDir, { recursive: true })

/** key → Wikimedia filename (must match Commons exactly) */
const FILES = {
  'spark-plug': 'Spark_plug_2.jpg',
  'brake-pad': 'Brake_pad.jpg',
  'chain-kit': 'Bike-Sprocket(Main).png',
  battery: 'Car_battery.jpg',
  headlight: 'BMW_R32_headlight_Bosch_2023-02-23.jpg',
  'air-filter': 'BMW_R_75_Gespann_Luftfilter.jpg',
  'oil-filter': 'Oil_filter.jpg',
  bulb: 'Halogen_light_bulb.jpg',
  'engine-oil': 'Motor_oil.jpg',
  'clutch-plate': 'Clutch_disc.jpg',
  shock: 'Motorcycle_shock_absorber.jpg',
  speedometer: 'Motorcycle_speedometer.jpg',
  ignition: 'Ignition_switch.jpg',
  'brake-shoe': 'Drum_brake_shoes.jpg',
  cdi: 'Capacitor_discharge_ignition.jpg',
  'clutch-cable': 'Bicycle_brake_cable.jpg',
  'accelerator-cable': 'Throttle_cable.jpg',
  'speedo-cable': 'Speedometer_cable.jpg',
  'fork-oil': 'Motorcycle_front_fork.jpg',
  'side-cover': 'Motorcycle_side_panel.jpg',
  'tank-cap': 'Fuel_tank_cap.jpg',
  generic: 'Motorcycle_engine.jpg',
}

async function download(key, filename) {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=480`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BikePartsManagement/1.0 (local catalog thumbs; CC reuse)' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status} for ${filename}`)
  const type = res.headers.get('content-type') || ''
  if (!type.startsWith('image/')) throw new Error(`${key}: not an image (${type})`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 800) throw new Error(`${key}: file too small`)
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
  const dest = join(outDir, `${key}.${ext}`)
  writeFileSync(dest, buf)
  return { key, file: `${key}.${ext}`, bytes: buf.length, source: filename }
}

const attribution = []
const results = []
const failed = []

for (const [key, filename] of Object.entries(FILES)) {
  try {
    const r = await download(key, filename)
    results.push(r)
    attribution.push(`- **${key}**: Wikimedia Commons \`${filename}\` → \`${r.file}\``)
    console.log('OK', key, r.bytes)
  } catch (e) {
    failed.push({ key, filename, err: String(e.message || e) })
    console.error('FAIL', key, e.message || e)
  }
}

writeFileSync(
  join(outDir, 'ATTRIBUTION.md'),
  `# Part photo attribution

Downloaded from [Wikimedia Commons](https://commons.wikimedia.org/) for shop catalog thumbnails.
Reuse subject to each file's Creative Commons / free license on Commons.

${attribution.join('\n')}

Failed downloads (kept prior SVG if present):
${failed.map((f) => `- ${f.key}: ${f.err}`).join('\n') || '(none)'}
`,
)

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ ok: results, failed }, null, 2))
console.log(`Done: ${results.length} ok, ${failed.length} failed`)
