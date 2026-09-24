import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { PartThumb } from '../components/PartThumb'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { stockValue } from '../lib/queries'
import { formatTk } from '../lib/format'
import { useToast } from '../lib/toast'

export function ReturnPage() {
  const { user } = useAuth()
  const { db, processReturn } = useData()
  const notify = useToast()
  const [mode, setMode] = useState<'serial' | 'qty'>('serial')
  const [code, setCode] = useState('')
  const [partId, setPartId] = useState('')
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState('')
  const [doneBanner, setDoneBanner] = useState('')

  useEffect(() => {
    const pending = sessionStorage.getItem('bpm_return_code')
    if (pending) {
      setCode(pending)
      setMode('serial')
      sessionStorage.removeItem('bpm_return_code')
    }
  }, [])

  async function submit() {
    if (!user) return
    setDoneBanner('')
    try {
      if (mode === 'serial') {
        if (!code.trim()) {
          notify.error('সিরিয়াল/কোড দিন')
          return
        }
        const rec = await processReturn({
          unique_code: code.trim(),
          reason,
          user_id: user.id,
        })
        const msg = `রিটার্ন গ্রহণ হয়েছে · কোড ${rec.unique_code}`
        setDoneBanner(msg)
        notify.success(msg)
        setCode('')
      } else {
        if (!partId) {
          notify.error('পার্ট বাছুন')
          return
        }
        if (!Number.isFinite(qty) || qty < 1) {
          notify.error('পরিমাণ ১ বা তার বেশি হতে হবে')
          return
        }
        await processReturn({
          part_id: partId,
          qty,
          reason,
          user_id: user.id,
        })
        const msg = `রিটার্ন গ্রহণ হয়েছে · ${qty} পিস স্টকে ফিরেছে`
        setDoneBanner(msg)
        notify.success(msg)
        setPartId('')
        setQty(1)
      }
      setReason('')
    } catch (err) {
      notify.fromError(err, 'রিটার্ন হয়নি')
    }
  }

  return (
    <>
      <PageHeader title="রিটার্ন" />

      {doneBanner && (
        <div className="success-banner flow-success">
          <strong>{doneBanner}</strong>
          <div className="row">
            <Link to="/stock" className="btn ghost">
              স্টক দেখুন
            </Link>
            <Link to="/" className="btn ghost">
              আজ
            </Link>
          </div>
        </div>
      )}

      <div className="card">
        <p className="muted">
          সিরিয়ালযুক্ত পার্ট ফেরত এলে কোড মিলিয়ে নিন — একই কোড না হলে সিস্টেম সতর্ক করবে।
        </p>
        <div className="row" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`btn ${mode === 'serial' ? '' : 'ghost'}`}
            onClick={() => setMode('serial')}
          >
            সিরিয়াল দিয়ে
          </button>
          <button
            type="button"
            className={`btn ${mode === 'qty' ? '' : 'ghost'}`}
            onClick={() => setMode('qty')}
          >
            শুধু পরিমাণ
          </button>
        </div>

        {mode === 'serial' ? (
          <div className="field">
            <label>সিরিয়াল / QR কোড</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="বিক্রির সময়ের কোড"
            />
          </div>
        ) : (
          <>
            <div className="field">
              <label>পার্ট</label>
              <select value={partId} onChange={(e) => setPartId(e.target.value)}>
                <option value="">— বাছুন —</option>
                {db.parts
                  .filter((p) => p.tracking_mode === 'qty_only')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name_bn}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>পরিমাণ</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </div>
          </>
        )}

        <div className="field">
          <label>কারণ</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="খারাপ / ভুল পার্ট / কাস্টমার ফেরত"
          />
        </div>

        <button type="button" className="btn block" onClick={() => void submit()}>
          রিটার্ন গ্রহণ করুন
        </button>
      </div>

      <div className="card">
        <h2>সাম্প্রতিক রিটার্ন</h2>
        {db.returns.length === 0 ? (
          <div className="empty">এখনো কোনো রিটার্ন নেই</div>
        ) : (
          <div className="list">
            {[...db.returns]
              .reverse()
              .slice(0, 10)
              .map((r) => {
                const part = db.parts.find((p) => p.id === r.part_id)
                return (
                  <div key={r.id} className="list-item">
                    <div className="part-row">
                      {part && <PartThumb name={part.name} label={part.name_bn} size="sm" />}
                      <div>
                        <strong>{part?.name_bn ?? r.unique_code ?? 'পার্ট'}</strong>
                        <span className="muted">
                          {r.unique_code ?? `qty ${r.qty}`} ·{' '}
                          {r.matched ? 'মিলেছে' : 'মেলেনি'}
                          {r.reason ? ` · ${r.reason}` : ''}
                        </span>
                      </div>
                    </div>
                    <span className={`badge ${r.matched ? '' : 'danger'}`}>
                      {r.matched ? 'OK' : 'না'}
                    </span>
                  </div>
                )
              })}
          </div>
        )}
        <p className="muted" style={{ marginBottom: 0 }}>
          স্টক মূল্য (রেফ): {formatTk(stockValue(db))}
        </p>
      </div>
    </>
  )
}
