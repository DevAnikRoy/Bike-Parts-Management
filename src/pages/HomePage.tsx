import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SalesLineChart, TopPartsBarChart } from '../components/Charts'
import { DashboardInsight, type InsightKind } from '../components/DashboardInsight'
import { MemoModal } from '../components/MemoModal'
import { PartThumb } from '../components/PartThumb'
import { SetupWizard } from '../components/SetupWizard'
import { ShopLogo } from '../components/ShopLogo'
import { useData } from '../lib/data'
import { formatDate, formatTk } from '../lib/format'
import {
  isFreshShop,
  lowStockRows,
  monthSalesTotal,
  salesLast7Days,
  stockValue,
  todaySalesTotal,
  topSoldParts,
  type SalesPeriodId,
} from '../lib/queries'
import type { Sale } from '../lib/types'

type InsightState = { kind: InsightKind; period?: SalesPeriodId } | null

const PERIOD_CHIPS: { id: SalesPeriodId; label: string }[] = [
  { id: 'today', label: 'আজ' },
  { id: 'last_7', label: '৭ দিন' },
  { id: 'this_month', label: 'এই মাস' },
  { id: 'last_year', label: '১ বছর' },
]

export function HomePage() {
  const { db } = useData()
  const [openSale, setOpenSale] = useState<Sale | null>(null)
  const [insight, setInsight] = useState<InsightState>(null)
  const fresh = isFreshShop(db)
  const needsShopName =
    fresh && (!db.shop.address.trim() || db.shop.name === 'আমার বাইক পার্টস')
  const needsSupplier = fresh && db.suppliers.length === 0
  const needsPurchase = db.purchases.length === 0

  if (needsShopName || needsSupplier || needsPurchase) {
    return (
      <>
        <header className="page-hero">
          <p className="eyebrow">স্বাগতম</p>
          <h1>আজকের হিসাব</h1>
          <p className="muted">আগে দোকান প্রস্তুত করুন, তারপর বিক্রি দেখা যাবে।</p>
        </header>
        <SetupWizard />
      </>
    )
  }

  const today = todaySalesTotal(db)
  const month = monthSalesTotal(db)
  const value = stockValue(db)
  const low = lowStockRows(db)
  const week = salesLast7Days(db)
  const top = topSoldParts(db, 8)
  const recent = [...db.sales].reverse().slice(0, 10)

  return (
    <div className="dash">
      <header className="dash-hero">
        <div className="dash-hero-brand">
          <ShopLogo svg={db.shop.logo_svg} name={db.shop.name} size="lg" />
          <div>
            <p className="eyebrow">ড্যাশবোর্ড</p>
            <h1>{db.shop.name}</h1>
            <p className="muted">
              {db.shop.address?.trim() || 'বিক্রি, স্টক ও কম পার্ট এক নজরে'}
            </p>
          </div>
        </div>
        <div className="dash-periods" role="group" aria-label="বিক্রির সময়সীমা">
          {PERIOD_CHIPS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="period-chip"
              onClick={() => setInsight({ kind: 'sales', period: p.id })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className="dash-command">
        <div className="kpi-grid">
          <button
            type="button"
            className="kpi kpi-btn"
            onClick={() => setInsight({ kind: 'sales', period: 'today' })}
          >
            <span className="kpi-label">আজকের বিক্রি</span>
            <strong className="kpi-value">{formatTk(today)}</strong>
            <span className="kpi-hint">বিস্তারিত →</span>
          </button>
          <button
            type="button"
            className="kpi kpi-btn"
            onClick={() => setInsight({ kind: 'sales', period: 'this_month' })}
          >
            <span className="kpi-label">এই মাস</span>
            <strong className="kpi-value">{formatTk(month)}</strong>
            <span className="kpi-hint">বিস্তারিত →</span>
          </button>
          <button
            type="button"
            className="kpi kpi-btn"
            onClick={() => setInsight({ kind: 'stock' })}
          >
            <span className="kpi-label">স্টকের কেনা মূল্য</span>
            <strong className="kpi-value">{formatTk(value)}</strong>
            <span className="kpi-hint">পার্ট অনুযায়ী →</span>
          </button>
          <button
            type="button"
            className={`kpi kpi-btn${low.length ? ' warn' : ''}`}
            onClick={() => setInsight({ kind: 'low' })}
          >
            <span className="kpi-label">কম স্টক</span>
            <strong className="kpi-value">{low.length}</strong>
            <span className="kpi-hint">তালিকা →</span>
          </button>
        </div>

        <div className="dash-actions">
          <Link to="/purchase" className="dash-cta">
            কিনলাম
            <span>স্টক যোগ করুন</span>
          </Link>
          <Link to="/sale" className="dash-cta accent">
            বিক্রি
            <span>ক্যাশমেমো তৈরি</span>
          </Link>
        </div>
      </div>

      <div className="dash-main">
        <section className="card chart-card dash-panel dash-panel-chart">
          <div className="card-head">
            <h2>গত ৭ দিনের বিক্রি</h2>
            <button
              type="button"
              className="text-link"
              onClick={() => setInsight({ kind: 'sales', period: 'last_7' })}
            >
              বিস্তারিত
            </button>
          </div>
          <button
            type="button"
            className="chart-hit"
            onClick={() => setInsight({ kind: 'sales', period: 'last_7' })}
            aria-label="গত ৭ দিনের বিক্রির বিস্তারিত"
          >
            <SalesLineChart data={week.map((d) => ({ label: d.label, value: d.total }))} />
          </button>
        </section>

        <section className="card chart-card dash-panel dash-panel-bars">
          <div className="card-head">
            <h2>বেশি বিক্রি</h2>
            <span className="muted">পরিমাণ</span>
          </div>
          <TopPartsBarChart
            data={top
              .filter((t) => t.part)
              .map((t) => ({ name: t.part!.name_bn, qty: t.qty }))}
          />
        </section>

        <section className="card dash-panel dash-panel-low">
          <div className="card-head">
            <h2>কম স্টক</h2>
            <button
              type="button"
              className="text-link"
              onClick={() => setInsight({ kind: 'low' })}
            >
              সব দেখুন
            </button>
          </div>
          {low.length === 0 ? (
            <div className="empty compact dash-fill-empty">সব পার্ট ঠিক আছে</div>
          ) : (
            <div className="list dash-fill-list">
              {low.slice(0, 8).map(({ part, balance }) => (
                <div key={part.id} className="list-item">
                  <div className="part-row">
                    <PartThumb name={part.name} label={part.name_bn} size="md" />
                    <div>
                      <strong>{part.name_bn}</strong>
                      <span className="muted">
                        আছে {balance.qty} · ন্যূনতম {part.reorder_level}
                      </span>
                    </div>
                  </div>
                  <Link to="/purchase" className="btn ghost">
                    কিনুন
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card dash-panel dash-panel-memos">
          <div className="card-head">
            <h2>সাম্প্রতিক মেমো</h2>
            <Link to="/sale" className="text-link">
              নতুন বিক্রি
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty compact dash-fill-empty">এখনো বিক্রি নেই</div>
          ) : (
            <div className="list dash-fill-list">
              {recent.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="list-item list-item-btn"
                  onClick={() => setOpenSale(s)}
                >
                  <div>
                    <strong>{s.invoice_no}</strong>
                    <span className="muted">{formatDate(s.created_at)}</span>
                  </div>
                  <span className="list-item-trail">
                    <strong>{formatTk(s.total - s.discount)}</strong>
                    <span className="list-item-open">মেমো</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {insight ? (
        <DashboardInsight
          kind={insight.kind}
          db={db}
          initialPeriod={insight.period ?? 'today'}
          onClose={() => setInsight(null)}
        />
      ) : null}

      {openSale ? (
        <MemoModal sale={openSale} db={db} onClose={() => setOpenSale(null)} />
      ) : null}
    </div>
  )
}
