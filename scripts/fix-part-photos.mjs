/**
 * Direct Special:FilePath downloads (avoids search API rate limits).
 * Run: node scripts/fix-part-photos.mjs
 */
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join('public', 'parts')
mkdirSync(outDir, { recursive: true })
const UA = 'BikePartsManagement/1.0 (catalog thumbs; free-license reuse)'

/** Keys that still need accurate photos → Commons file name (underscores OK) */
const DIRECT = {
  generic: 'Motorcycle_spare_parts.jpg',
  bulb: 'H4_halogen_car_lamp.jpg',
  'oil-filter': 'Oilfilter_Automotive_Internal.png',
  'clutch-plate': 'Clutch_disc_1.jpg',
  ignition: 'Ignition-key.jpg',
  'tank-cap': 'Fuel_cap_of_old_Triumph_motorcycle_at_Quail_Motorcycle_Gathering_2015.jpg',
  'speedo-cable': '2008-05-06_1990_Geo_Storm_GSi_speedometer_cable.jpg',
  'brake-shoe': 'Brake_shoes.jpg',
  battery: 'Yuasa_YT12A-BS.jpg',
  'air-filter': 'Air_filter_for_car.jpg',
  cdi: 'Aprilia_RS_125_SP_Corsa_CDI_und_8400_Ausslasssteuerger%C3%A4t.jpg',
  'clutch-cable': 'Bowdenzug.jpg',
  'accelerator-cable': 'Bowdenzug.jpg',
  shock: 'Plunger_suspension.jpg',
  speedometer: 'Fuel_gauge_and_speedometer_of_a_Rex_RS_500_scooter_with_50_ccm_%28cropped%29.jpg',
}

const ALTS = {
  battery: ['Motorradbatterie.jpg', 'Lead-acid_car_battery.jpg', 'Car_battery.jpg'],
  'air-filter': ['Automotive_air_filter.jpg', 'Cabin_air_filter.jpg', 'Luftfilter.jpg'],
  ignition: ['Z%C3%BCndschloss.jpg', 'Car_keys.jpg', 'Ignition_switch.jpg'],
  cdi: ['Aprilia_RS_125_GS_Z%C3%BCndung_SEM.jpg', 'Electronic_control_unit.jpg'],
  'clutch-cable': ['Bowden_cable.svg', 'Control_cables.jpg'],
  'accelerator-cable': ['Throttle.jpg', 'Gaszug.jpg'],
  'brake-shoe': ['Drum_brake_with_shoes.jpg', 'Trommelbremse.jpg', 'Brake_shoe.jpg'],
  'oil-filter': ['Oil_filter.jpg', 'Spin-on_oil_filter.jpg'],
  bulb: ['Halogenlamph4mayak.JPG', 'Bilux.jpg'],
  generic: ["World%27s_best_motorcycle_spare_parts_in_%27Russian_Marke%27.JPG"],
}

async function fetchImage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 800) throw new Error('too small')
  // HTML error pages
  const head = buf.subarray(0, 20).toString('utf8')
  if (head.includes('<!') || head.includes('<html')) throw new Error('html response')
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8
  const isPng = buf[0] === 0x89 && buf[1] === 0x50
  if (!isJpeg && !isPng) throw new Error('not image')
  return { buf, ext: isPng ? 'png' : 'jpg' }
}

function filePathUrl(name) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${name}?width=480`
}

const ok = []
const failed = []

for (const [key, primary] of Object.entries(DIRECT)) {
  const names = [primary, ...(ALTS[key] || [])]
  let done = false
  for (const name of names) {
    // skip svg
    if (/\.svg$/i.test(name)) continue
    try {
      await new Promise((r) => setTimeout(r, 800))
      const { buf, ext } = await fetchImage(filePathUrl(name))
      const file = `${key}.${ext}`
      writeFileSync(join(outDir, file), buf)
      for (const other of ['jpg', 'png', 'webp']) {
        if (other === ext) continue
        const p = join(outDir, `${key}.${other}`)
        if (existsSync(p)) unlinkSync(p)
      }
      ok.push({ key, file, bytes: buf.length, source: `FilePath:${decodeURIComponent(name)}` })
      console.log('OK', key, buf.length, name)
      done = true
      break
    } catch (e) {
      console.log('..', key, name, e.message)
    }
  }
  if (!done) {
    failed.push(key)
    console.error('FAIL', key)
  }
}

writeFileSync(
  join(outDir, 'fix-manifest.json'),
  JSON.stringify({ ok, failed, at: new Date().toISOString() }, null, 2),
)
console.log(`Fixed ${ok.length}, still failed: ${failed.join(', ') || 'none'}`)
