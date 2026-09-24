import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { PartThumb } from '../components/PartThumb'
import { useData } from '../lib/data'
import { formatTk, trackingBn } from '../lib/format'
import { stockValue } from '../lib/queries'
import type { Part, StockBalance, StockUnit } from '../lib/types'

type StockStatus = 'all' | 'in' | 'low' | 'out'
type StockView = 'list' | 'grid'

const VIEW_KEY = 'bpm-stock-view'

function loadView(): StockView {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    if (v === 'grid' || v === 'list') return v
  } catch {
    /* ignore */
  }
  return 'list'
}

type StockRow = {
  part: Part
  bal: StockBalance | undefined
  units: StockUnit[]
  brand?: { name_bn: string }
  category?: { name_bn: string }
}
function qtyState(qty: number, reorder: number) {
  const out = qty <= 0
  const low = qty > 0 && qty <= reorder
  const level = reorder > 0 ? Math.min(1, qty / (reorder * 2)) : qty > 0 ? 1 : 0
  return { qty, out, low, level }
}
export function StockPage() {
  const { db, retry } = useData()
  const [q, setQ] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [modelId, setModelId] = useState('')
  const [status, setStatus] = useState<StockStatus>('all')
  const [view, setView] = useState<StockView>(loadView)
  const setViewPersist = (next: StockView) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }
  const stats = useMemo(() => {
    let inStock = 0
    let low = 0
    let out = 0
    for (const p of db.parts) {
      const qty = db.stock_balances.find((b) => b.part_id === p.id)?.qty ?? 0
      if (qty <= 0) out += 1
      else if (qty <= p.reorder_level) low += 1
      else inStock += 1
    }
    return {
      skus: db.parts.length,
      inStock,
      low,
      out,
      value: stockValue(db),
    }
  }, [db])
  const rows = useMemo(() => {
    const compatPartIds = modelId
      ? new Set(
          db.compatibility.filter((c) => c.model_id === modelId).map((c) => c.part_id),
        )
      : null
    return db.parts
      .filter((p) => {
        if (brandId && p.brand_id !== brandId) return false
        if (categoryId && p.category_id !== categoryId) return false
        if (compatPartIds && !compatPartIds.has(p.id)) return false
        if (q) {
          const s = q.toLowerCase()
          if (
            !p.name_bn.includes(q) &&
            !p.name.toLowerCase().includes(s) &&
            !p.oem_part_no.toLowerCase().includes(s)
          ) {
            return false
          }
        }
        const qty = db.stock_balances.find((b) => b.part_id === p.id)?.qty ?? 0
        if (status === 'out' && qty > 0) return false
        if (status === 'in' && (qty <= 0 || qty <= p.reorder_level)) return false
        if (status === 'low' && (qty <= 0 || qty > p.reorder_level)) return false
        return true
      })
      .map((p) => {
        const bal = db.stock_balances.find((b) => b.part_id === p.id)
        const units = db.stock_units.filter(
          (u) => u.part_id === p.id && u.status === 'in_stock',
        )
        const brand = db.brands.find((b) => b.id === p.brand_id)
        const category = db.categories.find((c) => c.id === p.category_id)
        return { part: p, bal, units, brand, category }
      })
      .sort((a, b) => (b.bal?.qty ?? 0) - (a.bal?.qty ?? 0))
  }, [db, q, brandId, categoryId, modelId, status])
  const filtersActive = Boolean(q || brandId || categoryId || modelId || status !== 'all')
  const clearFilters = () => {
    setQ('')
    setBrandId('')
    setCategoryId('')
    setModelId('')
    setStatus('all')
  }
  return (
    <div className="stock-page">
      <header className="page-hero stock-hero">
        <PageHeader title="স্টক" />
        <p className="muted">খুঁজুন, ফিল্টার করুন — লিস্ট বা গ্রিডে দেখুন।</p>
      </header>
      {db.parts.length === 0 ? (
        <div className="card stock-empty">
          <p className="err">ক্যাটালগে কোনো পার্ট নেই।</p>
          <button type="button" className="btn block" onClick={() => retry()}>
            ক্যাটালগ আবার লোড
          </button>
        </div>
      ) : (
        <>
          <div className="stock-summary" aria-label="স্টক সারাংশ">
            <button
              type="button"
              className={`stock-stat${status === 'all' ? ' active' : ''}`}
              onClick={() => setStatus('all')}
            >
              <span className="stock-stat-label">মোট পার্ট</span>
              <strong className="stock-stat-value">{stats.skus}</strong>
            </button>
            <button
              type="button"
              className={`stock-stat ok${status === 'in' ? ' active' : ''}`}
              onClick={() => setStatus('in')}
            >
              <span className="stock-stat-label">পর্যাপ্ত</span>
              <strong className="stock-stat-value">{stats.inStock}</strong>
            </button>
            <button
              type="button"
              className={`stock-stat warn${status === 'low' ? ' active' : ''}`}
              onClick={() => setStatus('low')}
            >
              <span className="stock-stat-label">কম স্টক</span>
              <strong className="stock-stat-value">{stats.low}</strong>
            </button>
            <button
              type="button"
              className={`stock-stat danger${status === 'out' ? ' active' : ''}`}
              onClick={() => setStatus('out')}
            >
              <span className="stock-stat-label">শূন্য</span>
              <strong className="stock-stat-value">{stats.out}</strong>
            </button>
            <div className="stock-stat value">
              <span className="stock-stat-label">স্টকের মূল্য</span>
              <strong className="stock-stat-value">{formatTk(stats.value)}</strong>
            </div>
          </div>
          <section className="stock-toolbar" aria-label="ফিল্টার">
            <div className="stock-search">
              <span className="stock-search-icon" aria-hidden>
                ⌕
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="নাম, OEM নম্বর…"
                aria-label="পার্ট খুঁজুন"
              />
              {q ? (
                <button
                  type="button"
                  className="stock-search-clear"
                  onClick={() => setQ('')}
                  aria-label="মুছুন"
                >
                  ×
                </button>
              ) : null}
            </div>
            <div className="stock-filters">
              <label className="stock-filter">
                <span>ব্র্যান্ড</span>
                <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                  <option value="">সব</option>
                  {db.brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name_bn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stock-filter">
                <span>ক্যাটাগরি</span>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  <option value="">সব</option>
                  {db.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name_bn}
                    </option>
                  ))}
                </select>
              </label>
              <label className="stock-filter">
                <span>মডেল</span>
                <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
                  <option value="">সব মডেল</option>
                  {db.models
                    .filter((m) => !brandId || m.brand_id === brandId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name_bn} ({m.cc}cc)
                      </option>
                    ))}
                </select>
              </label>
              {filtersActive ? (
                <button type="button" className="btn ghost stock-clear" onClick={clearFilters}>
                  মুছুন
                </button>
              ) : null}
            </div>
          </section>
          <div className="stock-result-meta">
            <span>
              {rows.length} পার্ট
              {status !== 'all'
                ? ` · ${status === 'in' ? 'পর্যাপ্ত' : status === 'low' ? 'কম' : 'শূন্য'}`
                : ''}
            </span>
            <div className="stock-result-actions">
              <div className="stock-view-toggle" role="group" aria-label="দেখার ধরন">
                <button
                  type="button"
                  className={view === 'list' ? 'active' : ''}
                  onClick={() => setViewPersist('list')}
                  aria-pressed={view === 'list'}
                >
                  লিস্ট
                </button>
                <button
                  type="button"
                  className={view === 'grid' ? 'active' : ''}
                  onClick={() => setViewPersist('grid')}
                  aria-pressed={view === 'grid'}
                >
                  গ্রিড
                </button>
              </div>
              <Link to="/purchase" className="btn ghost">
                কিনলাম
              </Link>
              <Link to="/sale" className="btn">
                বিক্রি
              </Link>
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="card stock-empty">
              <p>ফিল্টারে কোনো পার্ট মিলছে না।</p>
              <button type="button" className="btn ghost" onClick={clearFilters}>
                ফিল্টার মুছুন
              </button>
            </div>
          ) : view === 'list' ? (
            <StockListView rows={rows} />
          ) : (
            <StockGridView rows={rows} />
          )}
        </>
      )}
    </div>
  )
}
function StockListView({ rows }: { rows: StockRow[] }) {
  return (
    <div className="stock-panel">
      <div className="stock-list-rows">
        {rows.map(({ part, bal, units, brand, category }) => {
          const { qty, out, low, level } = qtyState(bal?.qty ?? 0, part.reorder_level)
          return (
            <article
              key={part.id}
              className={`stock-list-row${out ? ' is-out' : low ? ' is-low' : ''}`}
            >
              <div className="stock-part">
                <PartThumb name={part.name} label={part.name_bn} size="xl" />
                <div className="stock-part-copy">
                  <strong>{part.name_bn}</strong>
                  <div className="stock-part-meta">
                    <span className="stock-oem">{part.oem_part_no}</span>
                    {brand ? <span>{brand.name_bn}</span> : null}
                    {category ? <span>{category.name_bn}</span> : null}
                    <span className="stock-list-tracking">{trackingBn(part.tracking_mode)}</span>
                  </div>
                  {units.length > 0 ? (
                    <div className="stock-codes">
                      কোড:{' '}
                      {units
                        .slice(0, 3)
                        .map((u) => u.unique_code)
                        .join(', ')}
                      {units.length > 3 ? ` +${units.length - 3}` : ''}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="stock-qty-cell">
                <div className="stock-qty-line">
                  <strong>
                    {qty} <span>{part.unit}</span>
                  </strong>
                  {out ? (
                    <span className="badge danger">শূন্য</span>
                  ) : low ? (
                    <span className="badge warn">কম</span>
                  ) : null}
                </div>
                <div className="stock-meter" aria-hidden>
                  <i style={{ width: `${Math.round(level * 100)}%` }} />
                </div>
              </div>
              <div className="stock-list-prices">
                <span>কেনা {formatTk(bal?.avg_buy_price ?? part.default_buy_price)}</span>
                <strong>বিক্রি {formatTk(bal?.sell_price ?? part.default_sell_price)}</strong>
              </div>
              <div className="stock-row-actions">
                {low || out ? (
                  <Link to="/purchase" className="btn ghost">
                    কিনুন
                  </Link>
                ) : null}
                {qty > 0 ? (
                  <Link to="/sale" className="btn ghost">
                    বিক্রি
                  </Link>
                ) : null}
                <Link
                  to={`/lookup?q=${encodeURIComponent(part.oem_part_no)}`}
                  className="btn ghost"
                >
                  খুঁজো
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
function StockGridView({ rows }: { rows: StockRow[] }) {
  return (
    <div className="stock-grid-view">
      {rows.map(({ part, bal, units, brand, category }) => {
        const { qty, out, low, level } = qtyState(bal?.qty ?? 0, part.reorder_level)
        return (
          <article
            key={part.id}
            className={`stock-grid-card${out ? ' out' : low ? ' low' : ''}`}
          >
            <div className="stock-grid-media">
              <div className="stock-grid-photo">
                <PartThumb name={part.name} label={part.name_bn} size="xl" />
              </div>
              {out ? (
                <span className="badge danger">শূন্য</span>
              ) : low ? (
                <span className="badge warn">কম</span>
              ) : null}
            </div>
            <strong className="stock-grid-title">{part.name_bn}</strong>
            <div className="stock-part-meta">
              <span className="stock-oem">{part.oem_part_no}</span>
              {brand ? <span>{brand.name_bn}</span> : null}
            </div>
            {category ? <div className="muted stock-grid-cat">{category.name_bn}</div> : null}
            <div className="stock-grid-qty">
              <span>
                {qty} {part.unit}
              </span>
              <div className="stock-meter" aria-hidden>
                <i style={{ width: `${Math.round(level * 100)}%` }} />
              </div>
            </div>
            <div className="stock-card-prices">
              <span>কেনা {formatTk(bal?.avg_buy_price ?? part.default_buy_price)}</span>
              <span>বিক্রি {formatTk(bal?.sell_price ?? part.default_sell_price)}</span>
            </div>
            {units.length > 0 ? (
              <div className="stock-codes">
                কোড: {units.slice(0, 2).map((u) => u.unique_code).join(', ')}
                {units.length > 2 ? ` +${units.length - 2}` : ''}
              </div>
            ) : null}
            <div className="stock-card-actions">
              {low || out ? (
                <Link to="/purchase" className="btn ghost">
                  কিনুন
                </Link>
              ) : null}
              {qty > 0 ? (
                <Link to="/sale" className="btn ghost">
                  বিক্রি
                </Link>
              ) : null}
              <Link
                to={`/lookup?q=${encodeURIComponent(part.oem_part_no)}`}
                className="btn ghost"
              >
                খুঁজো
              </Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}
