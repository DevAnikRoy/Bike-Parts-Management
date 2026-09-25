import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SalesLineChart, TopPartsBarChart } from '../components/Charts'
import { MemoModal } from '../components/MemoModal'
import { PartThumb } from '../components/PartThumb'
import { SetupWizard } from '../components/SetupWizard'
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
} from '../lib/queries'
import type { Sale } from '../lib/types'

export function HomePage() {
  const { db } = useData()
  const [openSale, setOpenSale] = useState<Sale | null>(null)
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
  const top = topSoldParts(db, 6)
  const recent = [...db.sales].reverse().slice(0, 6)

  return (
    <>
      <header className="page-hero">
        <p className="eyebrow">ড্যাশবোর্ড</p>
        <h1>আজকের হিসাব</h1>
        <p className="muted">{db.shop.name} · বিক্রি, স্টক ও কম পার্ট এক নজরে</p>
      </header>

      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">আজকের বিক্রি</span>
          <strong className="kpi-value">{formatTk(today)}</strong>
        </div>
        <div className="kpi">
          <span className="kpi-label">এই মাস</span>
          <strong className="kpi-value">{formatTk(month)}</strong>
        </div>
        <div className="kpi">
          <span className="kpi-label">স্টকের কেনা মূল্য</span>
          <strong className="kpi-value">{formatTk(value)}</strong>
        </div>
        <div className={`kpi${low.length ? ' warn' : ''}`}>
          <span className="kpi-label">কম স্টক</span>
          <strong className="kpi-value">{low.length}</strong>
        </div>
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

      <div className="dash-grid">
        <section className="card chart-card">
          <div className="card-head">
            <h2>গত ৭ দিনের বিক্রি</h2>
            <span className="muted">টাকায়</span>
          </div>
          <SalesLineChart data={week.map((d) => ({ label: d.label, value: d.total }))} />
        </section>

        <section className="card chart-card">
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
      </div>

      <div className="dash-grid">
        <section className="card">
          <div className="card-head">
            <h2>কম স্টক</h2>
            <Link to="/stock" className="text-link">
              সব দেখুন
            </Link>
          </div>
          {low.length === 0 ? (
            <div className="empty compact">সব পার্ট ঠিক আছে</div>
          ) : (
            <div className="list">
              {low.slice(0, 6).map(({ part, balance }) => (
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
                  <Link to="/purchase" className="btn ghost">
                    কিনুন
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <h2>সাম্প্রতিক মেমো</h2>
            <Link to="/sale" className="text-link">
              নতুন বিক্রি
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty compact">এখনো বিক্রি নেই</div>
          ) : (
            <div className="list">
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
                  <strong>{formatTk(s.total - s.discount)}</strong>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {openSale ? (
        <MemoModal sale={openSale} db={db} onClose={() => setOpenSale(null)} />
      ) : null}
    </>
  )
}
