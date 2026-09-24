/**
 * Curated real part photos — exact Wikimedia Commons file titles
 * (+ a few Unsplash License URLs only when Commons has no close-up).
 * Overwrites matching keys. Run: node scripts/curate-part-photos.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join('public', 'parts')
mkdirSync(outDir, { recursive: true })
const UA = 'BikePartsManagement/1.0 (shop catalog thumbs; CC reuse)'

/** Exact Commons File: titles known to match the part type */
const COMMONS_FILE = {
  'spark-plug': 'Spark_plug.jpg',
  'brake-pad': 'Brake_pads.jpg',
  'brake-shoe': 'Brake_shoes.jpg',
  'chain-kit': 'Motorcycle_chain.jpg',
  battery: 'Motorcycle_battery.jpg',
  headlight: 'Motorcycle_headlight.jpg',
  'air-filter': 'Air_filter.jpg',
  'oil-filter': 'Oilfilter_Automotive_Internal.png',
  bulb: 'H4_halogen_car_lamp.jpg',
  'engine-oil': 'Motor_oil.jpg',
  'fork-oil': 'Yamaha-fork.jpg',
  'clutch-plate': 'Clutch_disc_1.jpg',
  shock: 'Motorcycle_shock_absorber.jpg',
  speedometer: 'Motorcycle_speedometer.jpg',
  ignition: 'Ignition-key.jpg',
  cdi: 'Aprilia_RS_125_SP_Corsa_CDI_und_8400_Ausslasssteuergerät.jpg',
  'clutch-cable': 'Bowden_cable.jpg',
  'accelerator-cable': 'Throttle_cables.jpg',
  'speedo-cable': '2008-05-06_1990_Geo_Storm_GSi_speedometer_cable.jpg',
  'side-cover': 'Motorcycle_side_cover.jpg',
  'tank-cap': 'Fuel_cap_of_old_Triumph_motorcycle_at_Quail_Motorcycle_Gathering_2015.jpg',
  generic: 'Motorcycle_spare_parts.jpg',
}

/** Fallbacks if title missing — more Commons titles to try in order */
const COMMONS_FALLBACKS = {
  'spark-plug': ['Zündkerze.jpg', 'Spark_plugs.jpg', 'NGK_Spark_Plug.jpg'],
  'brake-pad': ['Brake_pad.jpg', 'Disc_brake_pads.jpg', 'Bremsbelag.jpg'],
  'brake-shoe': ['Trommelbremse_Bremsbacken.jpg', 'Drum_brake.jpg', 'Brake_shoe.jpg'],
  'chain-kit': ['Motorradkette.jpg', 'Bicycle_chain.jpg', 'Drive_chain.jpg'],
  battery: ['Motorradbatterie.jpg', 'Lead-acid_battery.jpg', 'Yuasa_battery.jpg'],
  headlight: ['Motorradscheinwerfer.jpg', 'Motorcycle_headlamp.jpg', 'Scheinwerfer.jpg'],
  'air-filter': ['Luftfilter.jpg', 'Automotive_air_filter.jpg', 'Paper_air_filter.jpg'],
  'oil-filter': ['Oil_filter.jpg', 'Ölfilter.jpg', 'Spin-on_oil_filter.jpg'],
  bulb: ['Halogenlamph4mayak.JPG', 'Bilux.jpg', 'H4_Philips_Premium_used.JPG'],
  'engine-oil': ['Engine_oil.jpg', 'Castrol_oil.jpg', 'Motoroil.jpg'],
  'fork-oil': ['Motorcycle_fork.jpg', 'Front_fork.jpg', 'Teleskopgabel.jpg'],
  'clutch-plate': [
    'Clutch_disc_13.jpg',
    'Close-up_view_of_a_worn_clutch_disc_among_automotive_tools_in_a_workshop.jpg',
    'Kupplungsscheibe.jpg',
  ],
  shock: [
    'Rear_shock_absorber.jpg',
    'Motorrad_Stoßdämpfer.jpg',
    'Plunger_suspension.jpg',
    'Shock_absorber.jpg',
  ],
  speedometer: [
    'Fuel_gauge_and_speedometer_of_a_Rex_RS_500_scooter_with_50_ccm_(cropped).jpg',
    'Speedometer.jpg',
    'Tachimetro_omologato_2.jpg',
  ],
  ignition: ['Ignition_key.jpg', 'Zündschlüssel.jpg', 'Motorcycle_keys.jpg'],
  cdi: [
    'Aprilia_RS_125_GS_Zündung_SEM.jpg',
    'CDI.jpg',
    'Ignition_module.jpg',
  ],
  'clutch-cable': ['Bowdenzug.jpg', 'Control_cable.jpg', 'Cable_control.jpg'],
  'accelerator-cable': ['Bowden_cable.jpg', 'Bowdenzug.jpg', 'Throttle.jpg'],
  'speedo-cable': ['Speedometer_cable.jpg', 'Tachowelle.jpg'],
  'side-cover': [
    'Motorrad_Seitenverkleidung.jpg',
    'Motorcycle_fairing.jpg',
    'Engine_side_cover.jpg',
  ],
  'tank-cap': [
    'Fuel_tank_cap_of_Kawasaki_H2_at_Quail_Motorcycle_Gathering_2015.jpg',
    'Fuel_tank_cap_of_Honda_CBR1000RR_Fireblade_from_ca._2005.jpg',
    'Fuel_tank_cap_of_Ducati_750.jpg',
  ],
  generic: [
    "World's_best_motorcycle_spare_parts_in_'Russian_Marke'.JPG",
    'DFC_3998_A_rugged_motorcycle_parked_in_front_of_a_small_well-used_workshop_filled_with_tools_and_spare_parts.jpg',
  ],
}

/** Unsplash License — last resort, curated for relevance */
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
  'side-cover':
    'https://images.unsplash.com/photo-1558981359-219d6364c9c8?auto=format&fit=crop&w=480&q=80',
  speedometer:
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=480&q=80',
  'fork-oil':
    'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=480&q=80',
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 800) throw new Error('too small')
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8
  const isPng = buf[0] === 0x89 && buf[1] === 0x50
  if (!isJpeg && !isPng) throw new Error('not jpeg/png')
  return { buf, ext: isPng ? 'png' : 'jpg' }
}

async function commonsThumb(title) {
  const clean = title.replace(/^File:/i, '')
  const api =
    'https://commons.wikimedia.org/w/api.php?' +
    new URLSearchParams({
      action: 'query',
      format: 'json',
      titles: `File:${clean}`,
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
      iiurlwidth: '480',
      origin: '*',
    })
  const data = await fetch(api, { headers: { 'User-Agent': UA } }).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`)
    return r.json()
  })
  const page = Object.values(data?.query?.pages || {})[0]
  if (!page || page.missing != null) throw new Error('missing')
  const info = page.imageinfo?.[0]
  if (!info) throw new Error('no imageinfo')
  const mime = info.mime || ''
  if (!mime.startsWith('image/') || mime.includes('svg')) throw new Error(mime)
  const url = info.thumburl || info.url
  const { buf, ext } = await download(url)
  return { buf, ext, source: `commons:File:${clean}` }
}

async function resolveKey(key) {
  const titles = [COMMONS_FILE[key], ...(COMMONS_FALLBACKS[key] || [])].filter(Boolean)
  for (const title of titles) {
    try {
      const r = await commonsThumb(title)
      return { ...r, via: 'commons' }
    } catch {
      /* next */
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  if (UNSPLASH[key]) {
    const { buf, ext } = await download(UNSPLASH[key])
    return { buf, ext, source: UNSPLASH[key].split('?')[0], via: 'unsplash' }
  }
  throw new Error('all sources failed')
}

const keys = Object.keys(COMMONS_FILE)
const ok = []
const failed = []

for (const key of keys) {
  try {
    const r = await resolveKey(key)
    const file = `${key}.${r.ext}`
    writeFileSync(join(outDir, file), r.buf)
    // remove alternate extension leftovers
    for (const other of ['jpg', 'png', 'webp']) {
      if (other === r.ext) continue
      try {
        const { unlinkSync, existsSync } = await import('node:fs')
        const p = join(outDir, `${key}.${other}`)
        if (existsSync(p)) unlinkSync(p)
      } catch {
        /* ignore */
      }
    }
    ok.push({ key, file, bytes: r.buf.length, source: r.source, via: r.via })
    console.log('OK', key, r.via, r.buf.length)
  } catch (e) {
    failed.push({ key, error: String(e.message || e) })
    console.error('FAIL', key, e.message)
  }
  await new Promise((r) => setTimeout(r, 350))
}

writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ ok, failed }, null, 2))
writeFileSync(
  join(outDir, 'ATTRIBUTION.md'),
  `# Part photo attribution\n\nCurated Wikimedia Commons (CC) + Unsplash License thumbnails.\n\n${ok
    .map((x) => `- **${x.key}** (${x.via}): ${x.source} → \`${x.file}\``)
    .join('\n')}\n\nFailed: ${failed.length ? failed.map((f) => f.key).join(', ') : 'none'}\n`,
)

console.log(`Done. ${ok.length} ok, ${failed.length} failed`)
