import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useData } from '../lib/data'
import { formatDate } from '../lib/format'

export function SuppliersPage() {
  const { db, addSupplier } = useData()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')

  async function add() {
    setError('')
    if (!name.trim() || !phone.trim()) {
      setError('নাম ও ফোন লাগবে')
      return
    }
    try {
      await addSupplier({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: '',
      })
      setName('')
      setPhone('')
      setAddress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'সেভ হয়নি')
    }
  }

  return (
    <>
      <PageHeader title="সাপ্লায়ার" />
      <div className="card">
        <h2>নতুন সাপ্লায়ার</h2>
        <div className="field">
          <label>নাম</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>ফোন</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
          />
        </div>
        <div className="field">
          <label>ঠিকানা</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        {error && <p className="err">{error}</p>}
        <button type="button" className="btn block" onClick={add}>
          সেভ করুন
        </button>
      </div>

      <div className="card">
        <h2>তালিকা ({db.suppliers.length})</h2>
        {db.suppliers.length === 0 ? (
          <div className="empty">এখনো সাপ্লায়ার নেই</div>
        ) : (
          <div className="list">
            {[...db.suppliers].reverse().map((s) => {
              const purchases = db.purchases.filter((p) => p.supplier_id === s.id)
              return (
                <div key={s.id} className="list-item">
                  <div>
                    <strong>{s.name}</strong>
                    <span className="muted">
                      {s.phone}
                      {s.address ? ` · ${s.address}` : ''}
                      <br />
                      ক্রয় {purchases.length} বার · যোগ {formatDate(s.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
