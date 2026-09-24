/**
 * Map catalog part English names → local thumbnail keys under /parts/{key}.{jpg|png|svg}
 * Same part *type* shares one image so Hero/Bajaj variants never cross-match.
 */
const RULES: { key: string; test: RegExp }[] = [
  { key: 'chain-kit', test: /chain kit/i },
  { key: 'cdi', test: /\bcdi\b/i },
  { key: 'ignition', test: /ignition/i },
  { key: 'headlight', test: /headlight/i },
  { key: 'brake-shoe', test: /brake shoe/i },
  { key: 'brake-pad', test: /brake pad|disc pad/i },
  { key: 'clutch-cable', test: /clutch cable/i },
  { key: 'accelerator-cable', test: /accelerator cable/i },
  { key: 'speedo-cable', test: /speedometer cable/i },
  { key: 'air-filter', test: /air filter/i },
  { key: 'oil-filter', test: /oil filter/i },
  { key: 'engine-oil', test: /engine oil/i },
  { key: 'fork-oil', test: /fork oil/i },
  { key: 'clutch-plate', test: /clutch plate/i },
  { key: 'spark-plug', test: /spark plug/i },
  { key: 'speedometer', test: /speedometer(?! cable)/i },
  { key: 'side-cover', test: /side cover/i },
  { key: 'battery', test: /battery/i },
  { key: 'bulb', test: /bulb/i },
  { key: 'shock', test: /shock/i },
  { key: 'tank-cap', test: /tank cap|fuel tank/i },
]

const FALLBACK = 'generic'

/** Real photos from Wikimedia Commons / Unsplash License. SVG icons remain as fallback. */
const EXT_BY_KEY: Record<string, 'jpg' | 'png' | 'webp' | 'svg'> = {
  'spark-plug': 'jpg',
  'brake-pad': 'jpg',
  'brake-shoe': 'jpg',
  'chain-kit': 'jpg',
  battery: 'jpg',
  headlight: 'jpg',
  'air-filter': 'jpg',
  'oil-filter': 'jpg',
  bulb: 'jpg',
  'engine-oil': 'jpg',
  'fork-oil': 'jpg',
  'clutch-plate': 'jpg',
  shock: 'jpg',
  speedometer: 'jpg',
  ignition: 'jpg',
  cdi: 'jpg',
  'clutch-cable': 'jpg',
  'accelerator-cable': 'jpg',
  'speedo-cable': 'jpg',
  'side-cover': 'jpg',
  'tank-cap': 'jpg',
  generic: 'jpg',
}

export function partVisualKey(name: string): string {
  for (const rule of RULES) {
    if (rule.test.test(name)) return rule.key
  }
  return FALLBACK
}

export function partImageSrc(name: string): string {
  const key = partVisualKey(name)
  const ext = EXT_BY_KEY[key] ?? 'svg'
  return `/parts/${key}.${ext}`
}

export const PART_VISUAL_KEYS = [...new Set([...RULES.map((r) => r.key), FALLBACK])]
