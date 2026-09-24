import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'public/parts'

function wrap(body, bg = '#f3faf5') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img">
  <rect width="96" height="96" rx="14" fill="${bg}"/>
  ${body}
</svg>
`
}

const icons = {
  'chain-kit': wrap(`
    <circle cx="30" cy="48" r="16" fill="none" stroke="#1a6840" stroke-width="4"/>
    <circle cx="66" cy="48" r="12" fill="none" stroke="#1a6840" stroke-width="4"/>
    <path d="M44 40h14M44 56h14" stroke="#c45c26" stroke-width="3" stroke-linecap="round"/>
    <circle cx="30" cy="48" r="4" fill="#0f3f28"/>
    <circle cx="66" cy="48" r="3" fill="#0f3f28"/>
  `),
  cdi: wrap(
    `
    <rect x="22" y="28" width="52" height="40" rx="6" fill="#14261c"/>
    <rect x="28" y="34" width="40" height="18" rx="3" fill="#2d5a40"/>
    <circle cx="34" cy="60" r="3" fill="#d7e8dc"/>
    <circle cx="48" cy="60" r="3" fill="#d7e8dc"/>
    <circle cx="62" cy="60" r="3" fill="#d7e8dc"/>
    <text x="48" y="47" text-anchor="middle" fill="#d7e8dc" font-size="10" font-family="sans-serif" font-weight="700">CDI</text>
  `,
    '#eef3ef',
  ),
  ignition: wrap(`
    <circle cx="48" cy="42" r="18" fill="none" stroke="#1a6840" stroke-width="4"/>
    <circle cx="48" cy="42" r="6" fill="#c45c26"/>
    <path d="M48 60v14M42 68h12" stroke="#0f3f28" stroke-width="4" stroke-linecap="round"/>
  `),
  headlight: wrap(`
    <ellipse cx="48" cy="48" rx="26" ry="20" fill="#fff8e7" stroke="#1a6840" stroke-width="3"/>
    <circle cx="48" cy="48" r="8" fill="#c45c26"/>
    <path d="M20 40l-8-4M20 56l-8 4" stroke="#5a6f62" stroke-width="2"/>
  `),
  'brake-shoe': wrap(`
    <path d="M28 70c0-28 40-28 40 0" fill="none" stroke="#1a6840" stroke-width="10" stroke-linecap="round"/>
    <path d="M34 66c2-16 26-16 28 0" fill="none" stroke="#c45c26" stroke-width="4"/>
  `),
  'brake-pad': wrap(`
    <rect x="20" y="34" width="24" height="32" rx="4" fill="#1a6840"/>
    <rect x="52" y="34" width="24" height="32" rx="4" fill="#1a6840"/>
    <rect x="24" y="40" width="16" height="20" rx="2" fill="#c45c26"/>
    <rect x="56" y="40" width="16" height="20" rx="2" fill="#c45c26"/>
  `),
  'clutch-cable': wrap(`
    <path d="M18 30c20 0 20 36 40 36s20-36 40-36" fill="none" stroke="#1a6840" stroke-width="4"/>
    <circle cx="18" cy="30" r="5" fill="#c45c26"/>
    <rect x="72" y="24" width="10" height="14" rx="2" fill="#0f3f28"/>
  `),
  'accelerator-cable': wrap(`
    <path d="M16 50h50" stroke="#1a6840" stroke-width="4"/>
    <circle cx="72" cy="50" r="12" fill="none" stroke="#c45c26" stroke-width="4"/>
    <circle cx="72" cy="50" r="3" fill="#0f3f28"/>
    <rect x="12" y="44" width="10" height="12" rx="2" fill="#0f3f28"/>
  `),
  'speedo-cable': wrap(`
    <path d="M20 28c8 20 8 20 0 40M28 28c8 20 8 20 0 40M36 28c8 20 8 20 0 40" fill="none" stroke="#1a6840" stroke-width="3"/>
    <rect x="58" y="36" width="22" height="24" rx="4" fill="#c45c26"/>
  `),
  'air-filter': wrap(`
    <rect x="24" y="26" width="48" height="44" rx="8" fill="#d7e8dc" stroke="#1a6840" stroke-width="3"/>
    <path d="M32 36h32M32 46h32M32 56h32" stroke="#1a6840" stroke-width="3"/>
  `),
  'oil-filter': wrap(`
    <rect x="32" y="22" width="32" height="52" rx="10" fill="#1a6840"/>
    <rect x="38" y="30" width="20" height="10" rx="2" fill="#d7e8dc"/>
    <circle cx="48" cy="58" r="8" fill="#c45c26"/>
  `),
  'engine-oil': wrap(`
    <path d="M34 28h28l6 12v36a8 8 0 0 1-8 8H36a8 8 0 0 1-8-8V40z" fill="#1a6840"/>
    <rect x="40" y="18" width="16" height="12" rx="2" fill="#0f3f28"/>
    <text x="48" y="58" text-anchor="middle" fill="#fff" font-size="11" font-family="sans-serif" font-weight="700">1L</text>
  `),
  'fork-oil': wrap(`
    <rect x="28" y="20" width="14" height="56" rx="4" fill="#1a6840"/>
    <rect x="54" y="20" width="14" height="56" rx="4" fill="#1a6840"/>
    <rect x="30" y="36" width="10" height="28" fill="#c45c26" opacity=".85"/>
    <rect x="56" y="36" width="10" height="28" fill="#c45c26" opacity=".85"/>
  `),
  'clutch-plate': wrap(`
    <circle cx="48" cy="48" r="28" fill="none" stroke="#1a6840" stroke-width="6"/>
    <circle cx="48" cy="48" r="14" fill="none" stroke="#c45c26" stroke-width="4"/>
    <circle cx="48" cy="48" r="5" fill="#0f3f28"/>
  `),
  'spark-plug': wrap(`
    <rect x="40" y="14" width="16" height="18" rx="2" fill="#5a6f62"/>
    <rect x="36" y="30" width="24" height="28" rx="3" fill="#d7e8dc" stroke="#1a6840" stroke-width="2"/>
    <path d="M48 58v18M42 72l6 8 6-8" fill="none" stroke="#c45c26" stroke-width="3" stroke-linecap="round"/>
  `),
  speedometer: wrap(`
    <circle cx="48" cy="50" r="26" fill="#fff" stroke="#1a6840" stroke-width="4"/>
    <path d="M48 50L64 36" stroke="#c45c26" stroke-width="3" stroke-linecap="round"/>
    <circle cx="48" cy="50" r="4" fill="#0f3f28"/>
    <path d="M28 50h4M64 50h4M48 28v4" stroke="#5a6f62" stroke-width="2"/>
  `),
  'side-cover': wrap(`
    <path d="M22 30c20-10 40-10 52 8v28c-16 14-40 14-52 4z" fill="#1a6840"/>
    <path d="M30 40c14-6 28-4 38 6" fill="none" stroke="#d7e8dc" stroke-width="3"/>
  `),
  battery: wrap(`
    <rect x="22" y="34" width="52" height="36" rx="4" fill="#1a6840"/>
    <rect x="30" y="26" width="12" height="10" rx="2" fill="#0f3f28"/>
    <rect x="54" y="26" width="12" height="10" rx="2" fill="#0f3f28"/>
    <text x="38" y="58" fill="#c45c26" font-size="16" font-family="sans-serif" font-weight="700">+</text>
    <text x="58" y="58" fill="#d7e8dc" font-size="18" font-family="sans-serif" font-weight="700">-</text>
  `),
  bulb: wrap(`
    <circle cx="48" cy="40" r="18" fill="#fff3c4" stroke="#c45c26" stroke-width="3"/>
    <rect x="40" y="56" width="16" height="14" rx="2" fill="#5a6f62"/>
    <path d="M42 30c6-8 14-8 20 0" fill="none" stroke="#1a6840" stroke-width="2"/>
  `),
  shock: wrap(`
    <rect x="42" y="16" width="12" height="20" rx="2" fill="#0f3f28"/>
    <rect x="38" y="34" width="20" height="28" rx="4" fill="#1a6840"/>
    <path d="M48 62v18" stroke="#c45c26" stroke-width="6" stroke-linecap="round"/>
    <path d="M40 70h16M40 78h16" stroke="#5a6f62" stroke-width="2"/>
  `),
  'tank-cap': wrap(`
    <circle cx="48" cy="48" r="26" fill="#1a6840"/>
    <circle cx="48" cy="48" r="14" fill="#d7e8dc"/>
    <circle cx="48" cy="48" r="5" fill="#c45c26"/>
  `),
  generic: wrap(`
    <rect x="28" y="28" width="40" height="40" rx="8" fill="#1a6840"/>
    <path d="M40 48h16M48 40v16" stroke="#d7e8dc" stroke-width="4" stroke-linecap="round"/>
  `),
}

for (const [k, svg] of Object.entries(icons)) {
  writeFileSync(join(dir, `${k}.svg`), svg)
}

console.log('wrote', Object.keys(icons).length, 'part icons')
