import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useData } from '../lib/data'
import { formatTk, trackingBn } from '../lib/format'

export function StockPage() {
  const { db, retry } = useData()
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
      <header className="page-hero">
        <PageHeader title="স্টক" />
        <p className="muted">ব্র্যান্ড, মডেল বা নাম দিয়ে দেখুন। কম হলে কিনলাম খুলুন।</p>
      </header>

      {db.parts.length === 0 ? (
        <div className="card">
          <p className="err">ক্যাটালগে কোনো পার্ট নেই।</p>
          <button type="button" className="btn block" onClick={() => retry()}>
            ক্যাটালগ আবার লোড
          </button>
        </div>
      ) : (
        <>
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
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
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

          {rows.length === 0 ? (
            <div className="card empty">ফিল্টারে কোনো পার্ট মিলছে না</div>
          ) : (
            <>
              <div className="table-wrap stock-table desktop-only">
                <table className="simple">
                  <thead>
                    <tr>
                      <th>পার্ট</th>
                      <th>OEM</th>
                      <th>স্টক</th>
                      <th>কেনা</th>
                      <th>বিক্রি</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(({ part, bal }) => {
                      const low = (bal?.qty ?? 0) <= part.reorder_level
                      return (
                        <tr key={part.id} className={low ? 'row-warn' : undefined}>
                          <td>
                            <strong>{part.name_bn}</strong>
                            <div className="muted">{trackingBn(part.tracking_mode)}</div>
                          </td>
                          <td>{part.oem_part_no}</td>
                          <td>
                            {bal?.qty ?? 0} {part.unit}
                            {low && <span className="badge warn"> কম</span>}
                          </td>
                          <td>{formatTk(bal?.avg_buy_price ?? part.default_buy_price)}</td>
                          <td>{formatTk(bal?.sell_price ?? part.default_sell_price)}</td>
                          <td>
                            <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                              {low && (
                                <Link to="/purchase" className="btn ghost">
                                  কিনুন
                                </Link>
                              )}
                              {(bal?.qty ?? 0) > 0 && (
                                <Link to="/sale" className="btn ghost">
                                  বিক্রি
                                </Link>
                              )}
                              <Link
                                to={`/lookup?q=${encodeURIComponent(part.oem_part_no)}`}
                                className="btn ghost"
                              >
                                খুঁজো
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="stock-list phone-only">
                {rows.map(({ part, bal, units }) => {
                  const low = (bal?.qty ?? 0) <= part.reorder_level
                  return (
                    <article key={part.id} className={`stock-card${low ? ' low' : ''}`}>
                      <div className="stock-card-top">
                        <div>
                          <strong>{part.name_bn}</strong>
                          <div className="muted">
                            {part.oem_part_no} · {trackingBn(part.tracking_mode)}
                          </div>
                        </div>
                        <div className="stock-qty">
                          <span>
                            {bal?.qty ?? 0} {part.unit}
                          </span>
                          {low && <span className="badge warn">কম</span>}
                        </div>
                      </div>
                      <div className="muted">
                        কেনা গড় {formatTk(bal?.avg_buy_price ?? part.default_buy_price)} · বিক্রি{' '}
                        {formatTk(bal?.sell_price ?? part.default_sell_price)}
                      </div>
                      {units.length > 0 && (
                        <div className="muted" style={{ marginTop: 6 }}>
                          কোড:{' '}
                          {units
                            .slice(0, 4)
                            .map((u) => u.unique_code)
                            .join(', ')}
                          {units.length > 4 ? ` +${units.length - 4}` : ''}
                        </div>
                      )}
                      <div className="row" style={{ marginTop: 10 }}>
                        {low && (
                          <Link to="/purchase" className="btn ghost">
                            কিনুন
                          </Link>
                        )}
                        {(bal?.qty ?? 0) > 0 && (
                          <Link to="/sale" className="btn ghost">
                            বিক্রি
                          </Link>
                        )}
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
            </>
          )}
        </>
      )}
    </>
  )
}
