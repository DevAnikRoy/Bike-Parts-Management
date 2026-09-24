/**
 * Validate & read an SVG logo file for shop branding.
 * Max 100KB. Rejects scripted SVGs.
 */
const MAX_BYTES = 100 * 1024
const MIN_RECOMMENDED = 20 * 1024

const UNSAFE =
  /<script|javascript:|on\w+\s*=|<foreignObject|xlink:href\s*=\s*["'](?!#)/i

export type LogoReadResult =
  | { ok: true; svg: string; bytes: number; underRecommended: boolean }
  | { ok: false; error: string }

export async function readShopLogoSvg(file: File): Promise<LogoReadResult> {
  const name = file.name.toLowerCase()
  const type = (file.type || '').toLowerCase()
  if (!name.endsWith('.svg') && type !== 'image/svg+xml') {
    return { ok: false, error: 'শুধু SVG ফাইল (.svg) আপলোড করুন' }
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `লোগো সর্বোচ্চ ১০০ KB হতে পারে (এখন ${Math.ceil(file.size / 1024)} KB)`,
    }
  }
  const text = await file.text()
  const trimmed = text.trim()
  if (!trimmed.includes('<svg')) {
    return { ok: false, error: 'সঠিক SVG ফাইল নয়' }
  }
  if (UNSAFE.test(trimmed)) {
    return { ok: false, error: 'এই SVG-তে অনিরাপদ কোড আছে — অন্য ফাইল দিন' }
  }
  return {
    ok: true,
    svg: trimmed,
    bytes: file.size,
    underRecommended: file.size < MIN_RECOMMENDED,
  }
}

export function shopLogoSrc(svg: string | null | undefined): string | null {
  if (!svg?.trim()) return null
  const t = svg.trim()
  if (t.startsWith('data:')) return t
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(t)}`
}
