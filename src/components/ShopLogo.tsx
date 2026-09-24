import { shopLogoSrc } from '../lib/shopLogo'

export function ShopLogo({
  svg,
  name,
  size = 'md',
}: {
  svg?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'memo'
}) {
  const src = shopLogoSrc(svg)
  if (!src) {
    return <div className={`brand-mark shop-logo-fallback shop-logo-${size}`} aria-hidden />
  }
  return (
    <img
      className={`shop-logo shop-logo-${size}`}
      src={src}
      alt={name ? `${name} লোগো` : 'দোকানের লোগো'}
    />
  )
}
