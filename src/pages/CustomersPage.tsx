import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useData } from '../lib/data'
import { formatDate } from '../lib/format'

export function CustomersPage() {
  const { db, addCustomer } = useData()
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
      await addCustomer({
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
      <header className="page-hero">
        <PageHeader title="কাস্টমার" />
        <p className="muted">বিক্রির সময় এই তালিকা থেকে বাছাই করা যাবে।</p>
      </header>
      <div className="flow-split">
      <div className="card">
        <h2>নতুন কাস্টমার</h2>
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
        <h2>তালিকা ({db.customers.length})</h2>
        {db.customers.length === 0 ? (
          <div className="empty">এখনো কাস্টমার নেই</div>
        ) : (
          <div className="list">
            {[...db.customers].reverse().map((c) => {
              const sales = db.sales.filter((s) => s.customer_id === c.id)
              return (
                <div key={c.id} className="list-item">
                  <div>
                    <strong>{c.name}</strong>
                    <span className="muted">
                      {c.phone}
                      {c.address ? ` · ${c.address}` : ''}
                      <br />
                      বিক্রি {sales.length} বার · যোগ {formatDate(c.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>
    </>
  )
}
