import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MemoModal } from './MemoModal'
import { PartThumb } from './PartThumb'
import { formatDate, formatDayBn, formatTk } from '../lib/format'
import {
  rangeForSalesPeriod,
  salesInRange,
  salesNetTotal,
  SALES_PERIODS,
  shiftDayKey,
  stockValueBreakdown,
  toDayKey,
  topPartsInSales,
  type SalesPeriodId,
  lowStockRows,
} from '../lib/queries'
import type { AppDatabase, Sale } from '../lib/types'

export type InsightKind = 'sales' | 'stock' | 'low'

export function DashboardInsight({
  kind,
  db,
  initialPeriod = 'today',
  onClose,
}: {
  kind: InsightKind
  db: AppDatabase
  initialPeriod?: SalesPeriodId
  onClose: () => void
}) {
  const [period, setPeriod] = useState<SalesPeriodId>(initialPeriod)
  const [dayKey, setDayKey] = useState(() => toDayKey(new Date()))
  const [openSale, setOpenSale] = useState<Sale | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !openSale) onClose()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, openSale])

  const salesView = useMemo(() => {
    if (kind !== 'sales') return null
    const range = rangeForSalesPeriod(period, dayKey)
    const sales = salesInRange(db, range.start, range.end)
    const total = salesNetTotal(sales)
    const tops = topPartsInSales(db, sales, 6)
    return { range, sales, total, tops }
  }, [kind, period, dayKey, db])

  const stockRows = useMemo(
    () => (kind === 'stock' ? stockValueBreakdown(db) : []),
    [kind, db],
  )
  const lowRows = useMemo(() => (kind === 'low' ? lowStockRows(db) : []), [kind, db])

  const title =
    kind === 'sales'
      ? (salesView?.range.title ?? 'বিক্রি')
      : kind === 'stock'
        ? 'স্টকের কেনা মূল্য'
        : 'কম স্টক'

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={onClose}>
        <div
          className="modal-panel insight-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="insight-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-toolbar">
            <strong id="insight-title">{title}</strong>
            <button type="button" className="btn ghost" onClick={onClose}>
              বন্ধ
            </button>
          </div>

          {kind === 'sales' && salesView ? (
            <div className="insight-body">
              <div className="insight-chips" role="tablist" aria-label="সময়সীমা">
                {SALES_PERIODS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="tab"
                    aria-selected={period === p.id}
                    className={`insight-chip${period === p.id ? ' active' : ''}`}
                    onClick={() => {
                      setPeriod(p.id)
                      if (p.id === 'day' || p.id === 'today') {
                        setDayKey(toDayKey(new Date()))
                      }
                      if (p.id === 'yesterday') {
                        setDayKey(shiftDayKey(toDayKey(new Date()), -1))
                      }
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {(period === 'day' || period === 'today' || period === 'yesterday') && (
                <div className="insight-day-nav">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => {
                      setPeriod('day')
                      setDayKey((k) => shiftDayKey(k, -1))
                    }}
                  >
                    ← আগের দিন
                  </button>
                  <div className="insight-day-label">
                    <strong>{formatDayBn(dayKey)}</strong>
                    <input
                      type="date"
                      className="insight-date"
                      value={dayKey}
                      max={toDayKey(new Date())}
                      onChange={(e) => {
                        if (!e.target.value) return
                        setPeriod('day')
                        setDayKey(e.target.value)
                      }}
                      aria-label="তারিখ বাছুন"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={dayKey >= toDayKey(new Date())}
                    onClick={() => {
                      setPeriod('day')
                      setDayKey((k) => shiftDayKey(k, 1))
                    }}
                  >
                    পরের দিন →
                  </button>
                </div>
              )}

              <div className="insight-summary">
                <div>
                  <span className="muted">মেমো</span>
                  <strong>{salesView.sales.length}</strong>
                </div>
                <div>
                  <span className="muted">মোট বিক্রি</span>
                  <strong className="insight-money">{formatTk(salesView.total)}</strong>
                </div>
              </div>

              {salesView.tops.length > 0 ? (
                <div className="insight-section">
                  <h3>এই সময়ে বেশি বিক্রি</h3>
                  <div className="list">
                    {salesView.tops.map((t) =>
                      t.part ? (
                        <div key={t.part.id} className="list-item">
                          <div className="part-row">
                            <PartThumb name={t.part.name} label={t.part.name_bn} size="sm" />
                            <div>
                              <strong>{t.part.name_bn}</strong>
                              <span className="muted">{t.qty} {t.part.unit}</span>
                            </div>
                          </div>
                          <strong>{formatTk(t.amount)}</strong>
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}

              <div className="insight-section">
                <h3>মেমো তালিকা</h3>
                {salesView.sales.length === 0 ? (
                  <div className="empty compact">এই সময়ে কোনো বিক্রি নেই</div>
                ) : (
                  <div className="list">
                    {salesView.sales.map((s) => {
                      const customer = s.customer_id
                        ? db.customers.find((c) => c.id === s.customer_id)
                        : undefined
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className="list-item list-item-btn"
                          onClick={() => setOpenSale(s)}
                        >
                          <div>
                            <strong>{s.invoice_no}</strong>
                            <span className="muted">
                              {formatDate(s.created_at)}
                              {customer ? ` · ${customer.name}` : ''}
                            </span>
                          </div>
                          <strong>{formatTk(s.total - s.discount)}</strong>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {kind === 'stock' ? (
            <div className="insight-body">
              <div className="insight-summary">
                <div>
                  <span className="muted">পার্ট (স্টকে)</span>
                  <strong>{stockRows.length}</strong>
                </div>
                <div>
                  <span className="muted">মোট কেনা মূল্য</span>
                  <strong className="insight-money">
                    {formatTk(stockRows.reduce((s, r) => s + r.line, 0))}
                  </strong>
                </div>
              </div>
              {stockRows.length === 0 ? (
                <div className="empty compact">স্টকে কিছু নেই</div>
              ) : (
                <div className="list">
                  {stockRows.map(({ part, balance, line }) => (
                    <div key={part.id} className="list-item">
                      <div className="part-row">
                        <PartThumb name={part.name} label={part.name_bn} size="sm" />
                        <div>
                          <strong>{part.name_bn}</strong>
                          <span className="muted">
                            {balance.qty} {part.unit} × {formatTk(balance.avg_buy_price)}
                          </span>
                        </div>
                      </div>
                      <strong>{formatTk(line)}</strong>
                    </div>
                  ))}
                </div>
              )}
              <div className="insight-footer">
                <Link to="/stock" className="btn" onClick={onClose}>
                  স্টক পেজ
                </Link>
              </div>
            </div>
          ) : null}

          {kind === 'low' ? (
            <div className="insight-body">
              <p className="muted" style={{ marginTop: 0 }}>
                রিঅর্ডার লেভেলের নিচে বা সমান — যেগুলো তাড়াতাড়ি কিনতে হবে।
              </p>
              {lowRows.length === 0 ? (
                <div className="empty compact">সব পার্ট ঠিক আছে</div>
              ) : (
                <div className="list">
                  {lowRows.map(({ part, balance }) => (
                    <div key={part.id} className="list-item">
                      <div className="part-row">
                        <PartThumb name={part.name} label={part.name_bn} size="sm" />
                        <div>
                          <strong>{part.name_bn}</strong>
                          <span className="muted">
                            আছে {balance.qty} · ন্যূনতম {part.reorder_level}
                          </span>
                        </div>
                      </div>
                      <Link to="/purchase" className="btn ghost" onClick={onClose}>
                        কিনুন
                      </Link>
                    </div>
                  ))}
                </div>
              )}
              <div className="insight-footer">
                <Link to="/stock" className="btn" onClick={onClose}>
                  স্টকে সব দেখুন
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {openSale ? (
        <MemoModal sale={openSale} db={db} onClose={() => setOpenSale(null)} />
      ) : null}
    </>
  )
}
