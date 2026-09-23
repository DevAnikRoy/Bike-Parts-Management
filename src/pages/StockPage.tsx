import { useMemo, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useData } from '../lib/data'
import { formatTk, trackingBn } from '../lib/format'

export function StockPage() {
  const { db } = useData()
  const [q, setQ] = useState('')
  const [brandId, setBrandId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [modelId, setModelId] = useState('')

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
        return true
      })
      .map((p) => {
        const bal = db.stock_balances.find((b) => b.part_id === p.id)
        const units = db.stock_units.filter(
          (u) => u.part_id === p.id && u.status === 'in_stock',
        )
        return { part: p, bal, units }
      })
      .sort((a, b) => (b.bal?.qty ?? 0) - (a.bal?.qty ?? 0))
  }, [db, q, brandId, categoryId, modelId])

  return (
    <>
      <PageHeader title="স্টক দেখো" />

      <div className="card">
        <div className="field">
          <label>খুঁজুন</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="নাম বা পার্ট নম্বর"
          />
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label>ব্র্যান্ড</label>
            <select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">সব</option>
              {db.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_bn}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>ক্যাটাগরি</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">সব</option>
              {db.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_bn}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>বাইক মডেল</label>
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
        </div>
      </div>

      <div className="list">
        {rows.length === 0 && (
          <div className="card empty">কোনো পার্ট মিলছে না</div>
        )}
        {rows.map(({ part, bal, units }) => {
          const low = (bal?.qty ?? 0) <= part.reorder_level
          return (
            <div key={part.id} className="card" style={{ marginBottom: 8, padding: 12 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <strong>{part.name_bn}</strong>
                  <div className="muted">
                    {part.oem_part_no} · {trackingBn(part.tracking_mode)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                    {bal?.qty ?? 0} {part.unit}
                  </div>
                  {low && <span className="badge warn">কম স্টক</span>}
                </div>
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                কেনা গড় {formatTk(bal?.avg_buy_price ?? part.default_buy_price)} · বিক্রি{' '}
                {formatTk(bal?.sell_price ?? part.default_sell_price)}
              </div>
              {units.length > 0 && (
                <div className="muted" style={{ marginTop: 6 }}>
                  কোড: {units.slice(0, 5).map((u) => u.unique_code).join(', ')}
                  {units.length > 5 ? ` +${units.length - 5}` : ''}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
