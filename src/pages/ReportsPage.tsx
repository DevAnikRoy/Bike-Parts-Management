import { PageHeader } from '../components/PageHeader'
import { dbApi } from '../lib/db'
import { formatDate, formatTk } from '../lib/format'

export function ReportsPage() {
  const db = dbApi.getDb()
  const todayTotal = dbApi.getTodaySalesTotal()
  const stockValue = dbApi.getStockValue()
  const top = dbApi.getTopSoldParts(8)
  const recentSales = [...db.sales].reverse().slice(0, 8)
  const lowStock = db.stock_balances.filter((b) => {
    const part = db.parts.find((p) => p.id === b.part_id)
    return part && b.qty <= part.reorder_level && b.qty >= 0
  })

  return (
    <>
      <PageHeader title="রিপোর্ট" />

      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="label">আজকের বিক্রি</div>
          <div className="value">{formatTk(todayTotal)}</div>
        </div>
        <div className="stat">
          <div className="label">স্টক মূল্য (কেনা)</div>
          <div className="value">{formatTk(stockValue)}</div>
        </div>
        <div className="stat">
          <div className="label">মোট বিক্রি (সব)</div>
          <div className="value">
            {formatTk(db.sales.reduce((s, x) => s + x.total - x.discount, 0))}
          </div>
        </div>
        <div className="stat">
          <div className="label">কম স্টক আইটেম</div>
          <div className="value">{lowStock.length}</div>
        </div>
      </div>

      <div className="card">
        <h2>সবচেয়ে বেশি বিক্রি</h2>
        {top.length === 0 ? (
          <div className="empty">এখনো বিক্রি নেই</div>
        ) : (
          <div className="list">
            {top.map((t, i) => (
              <div key={t.part?.id ?? i} className="list-item">
                <strong>{t.part?.name_bn}</strong>
                <span>{t.qty} পিস</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>সাম্প্রতিক বিক্রি</h2>
        {recentSales.length === 0 ? (
          <div className="empty">কোনো মেমো নেই</div>
        ) : (
          <div className="list">
            {recentSales.map((s) => (
              <div key={s.id} className="list-item">
                <div>
                  <strong>{s.invoice_no}</strong>
                  <span className="muted">{formatDate(s.created_at)}</span>
                </div>
                <strong>{formatTk(s.total - s.discount)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>কম স্টক</h2>
        {lowStock.length === 0 ? (
          <div className="empty">সব ঠিক আছে</div>
        ) : (
          <div className="list">
            {lowStock.map((b) => {
              const part = db.parts.find((p) => p.id === b.part_id)
              return (
                <div key={b.part_id} className="list-item">
                  <strong>{part?.name_bn}</strong>
                  <span className="badge warn">
                    {b.qty} / মিন {part?.reorder_level}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
