import { Link } from 'react-router-dom'
import { dbApi } from '../lib/db'
import { formatTk } from '../lib/format'

export function HomePage() {
  const db = dbApi.getDb()
  const today = dbApi.getTodaySalesTotal()
  const lowStock = db.stock_balances.filter((b) => {
    const part = db.parts.find((p) => p.id === b.part_id)
    return part && b.qty <= part.reorder_level
  }).length

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 14 }}>
        <div className="stat">
          <div className="label">আজকের বিক্রি</div>
          <div className="value">{formatTk(today)}</div>
        </div>
        <div className="stat">
          <div className="label">কম স্টক</div>
          <div className="value">{lowStock}</div>
        </div>
      </div>

      <div className="grid-actions">
        <Link to="/purchase" className="big-btn">
          কিনলাম
          <span className="hint">সাপ্লায়ার থেকে স্টক যোগ</span>
        </Link>
        <Link to="/sale" className="big-btn accent">
          বিক্রি করলাম
          <span className="hint">ক্যাশমেমো তৈরি</span>
        </Link>
        <Link to="/stock" className="big-btn secondary">
          স্টক দেখো
          <span className="hint">কী আছে, কত আছে</span>
        </Link>
        <Link to="/lookup" className="big-btn neutral">
          খুঁজো
          <span className="hint">সিরিয়াল / পার্ট নম্বর</span>
        </Link>
        <Link to="/return" className="big-btn secondary">
          রিটার্ন
          <span className="hint">সিরিয়াল মিলিয়ে নিন</span>
        </Link>
        <Link to="/reports" className="big-btn neutral">
          রিপোর্ট
          <span className="hint">বিক্রি ও স্টক হিসাব</span>
        </Link>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>আরও</h2>
        <div className="row">
          <Link to="/customers" className="btn ghost">
            কাস্টমার
          </Link>
          <Link to="/suppliers" className="btn ghost">
            সাপ্লায়ার
          </Link>
          <Link to="/labels" className="btn ghost">
            লেবেল প্রিন্ট
          </Link>
          <Link to="/settings" className="btn ghost">
            সেটিংস
          </Link>
        </div>
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Hero ও Bajaj-এর জনপ্রিয় মডেল ও পার্টস আগে থেকে লোড করা আছে। আগে{' '}
          <strong>কিনলাম</strong> দিয়ে স্টক যোগ করুন, তারপর বিক্রি করুন।
        </p>
      </div>
    </>
  )
}
