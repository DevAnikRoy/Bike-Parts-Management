import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useData } from '../lib/data'
import { formatDate } from '../lib/format'
import { useToast } from '../lib/toast'

export function CustomersPage() {
  const { db, addCustomer, deleteCustomer } = useData()
  const notify = useToast()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function add() {
    if (!name.trim() || !phone.trim()) {
      notify.error('নাম ও ফোন লাগবে')
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
      notify.success('কাস্টমার যোগ হয়েছে')
    } catch (err) {
      notify.fromError(err, 'কাস্টমার সেভ হয়নি')
    }
  }

  async function remove(id: string, label: string) {
    if (!confirm(`“${label}” কাস্টমার মুছে ফেলবেন? পুরনো বিক্রির হিসাব থাকবে।`)) return
    setDeletingId(id)
    try {
      await deleteCustomer(id)
      notify.success('কাস্টমার মুছে ফেলা হয়েছে')
    } catch (err) {
      notify.fromError(err, 'কাস্টমার মুছা যায়নি')
    } finally {
      setDeletingId(null)
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
          <button type="button" className="btn block" onClick={() => void add()}>
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
                    <button
                      type="button"
                      className="btn ghost danger"
                      disabled={deletingId === c.id}
                      onClick={() => void remove(c.id, c.name)}
                    >
                      {deletingId === c.id ? 'মুছছে...' : 'মুছুন'}
                    </button>
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
