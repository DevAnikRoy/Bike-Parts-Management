/**
 * Part thumbnail — real photo first; falls back to SVG icon if the photo 404s.
 * Desktop hover shows a modest preview to the right (avoids left-edge clipping).
 */
import type { SyntheticEvent } from 'react'
import { partImageSrc, partVisualKey } from '../lib/partImages'

const SIZE_PX = { sm: 40, md: 56, lg: 88, xl: 120 } as const

export function PartThumb({
  name,
  label,
  size = 'md',
}: {
  name: string
  label?: string
  size?: keyof typeof SIZE_PX
}) {
  const key = partVisualKey(name)
  const src = partImageSrc(name)
  const alt = label || name
  const px = SIZE_PX[size]

  const onError = (e: SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    const fallback = `/parts/${key}.svg`
    if (!el.getAttribute('src')?.endsWith('.svg')) el.src = fallback
  }

  return (
    <span className={`part-thumb-wrap part-thumb-wrap-${size}`}>
      <img
        className={`part-thumb part-thumb-${size}`}
        src={src}
        alt={alt}
        title={alt}
        width={px}
        height={px}
        loading="lazy"
        data-part-visual={key}
        onError={onError}
      />
      <img
        className="part-thumb-zoom"
        src={src}
        alt=""
        aria-hidden
        loading="lazy"
        onError={onError}
      />
    </span>
  )
}
