interface Point {
  label: string
  value: number
}

export function SalesLineChart({ data }: { data: Point[] }) {
  const w = 560
  const h = 180
  const pad = { t: 16, r: 12, b: 28, l: 8 }
  const max = Math.max(...data.map((d) => d.value), 1)
  const innerW = w - pad.l - pad.r
  const innerH = h - pad.t - pad.b
  const step = data.length > 1 ? innerW / (data.length - 1) : innerW

  const points = data.map((d, i) => {
    const x = pad.l + i * step
    const y = pad.t + innerH - (d.value / max) * innerH
    return { x, y, ...d }
  })

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')
  const area = `${path} L ${points[points.length - 1]?.x ?? pad.l} ${(pad.t + innerH).toFixed(1)} L ${pad.l} ${(pad.t + innerH).toFixed(1)} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label="৭ দিনের বিক্রি">
      <defs>
        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + innerH * (1 - t)
        return (
          <line
            key={t}
            x1={pad.l}
            x2={w - pad.r}
            y1={y}
            y2={y}
            className="chart-grid"
          />
        )
      })}
      <path d={area} fill="url(#salesFill)" />
      <path d={path} className="chart-line" fill="none" />
      {points.map((p) => (
        <g key={p.label + p.x}>
          <circle cx={p.x} cy={p.y} r={4} className="chart-dot" />
          <text x={p.x} y={h - 8} textAnchor="middle" className="chart-label">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function TopPartsBarChart({
  data,
}: {
  data: { name: string; qty: number }[]
}) {
  const max = Math.max(...data.map((d) => d.qty), 1)
  if (!data.length) {
    return <div className="empty compact">এখনো বিক্রি নেই</div>
  }
  return (
    <div className="bar-chart">
      {data.map((d) => (
        <div key={d.name} className="bar-row">
          <div className="bar-name" title={d.name}>
            {d.name}
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${Math.max(8, (d.qty / max) * 100)}%` }}
            />
          </div>
          <div className="bar-qty">{d.qty}</div>
        </div>
      ))}
    </div>
  )
}
