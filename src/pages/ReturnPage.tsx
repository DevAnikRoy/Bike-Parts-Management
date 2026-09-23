import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { stockValue } from '../lib/queries'
import { formatTk } from '../lib/format'

export function ReturnPage() {
  const { user } = useAuth()
  const { db, processReturn } = useData()
  const [mode, setMode] = useState<'serial' | 'qty'>('serial')
  const [code, setCode] = useState('')
  const [partId, setPartId] = useState('')
  const [qty, setQty] = useState(1)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit() {
    if (!user) return
    setError('')
    setSuccess('')
    try {
      if (mode === 'serial') {
        const rec = await processReturn({
          unique_code: code.trim(),
          reason,
          user_id: user.id,
        })
        setSuccess(`রিটার্ন গ্রহণ হয়েছে ✓ কোড মিলেছে · ${rec.unique_code}`)
        setCode('')
      } else {
        await processReturn({
          part_id: partId,
          qty,
          reason,
          user_id: user.id,
        })
        setSuccess(`রিটার্ন গ্রহণ হয়েছে ✓ ${qty} পিস স্টকে ফিরেছে`)
        setPartId('')
        setQty(1)
      }
      setReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'রিটার্ন ব্যর্থ')
    }
  }

  return (
    <>
      <PageHeader title="রিটার্ন" />

      {success && <div className="success-banner">{success}</div>}

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

        {error && <p className="err">{error}</p>}

        <button type="button" className="btn block" onClick={submit}>
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
                    <div>
                      <strong>{part?.name_bn ?? r.unique_code ?? 'পার্ট'}</strong>
                      <span className="muted">
                        {r.unique_code ?? `qty ${r.qty}`} ·{' '}
                        {r.matched ? 'মিলেছে' : 'মেলেনি'}
                        {r.reason ? ` · ${r.reason}` : ''}
                      </span>
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
