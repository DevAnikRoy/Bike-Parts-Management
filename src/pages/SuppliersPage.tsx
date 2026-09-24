import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useData } from '../lib/data'
import { formatDate } from '../lib/format'
import { useToast } from '../lib/toast'

export function SuppliersPage() {
  const { db, addSupplier, deleteSupplier } = useData()
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
      await addSupplier({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: '',
      })
      setName('')
      setPhone('')
      setAddress('')
      notify.success('সাপ্লায়ার যোগ হয়েছে')
    } catch (err) {
      notify.fromError(err, 'সাপ্লায়ার সেভ হয়নি')
    }
  }

  async function remove(id: string, label: string) {
    if (!confirm(`“${label}” সাপ্লায়ার মুছে ফেলবেন? পুরনো কেনার হিসাব থাকবে।`)) return
    setDeletingId(id)
    try {
      await deleteSupplier(id)
      notify.success('সাপ্লায়ার মুছে ফেলা হয়েছে')
    } catch (err) {
      notify.fromError(err, 'সাপ্লায়ার মুছা যায়নি')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <header className="page-hero">
        <PageHeader title="সাপ্লায়ার" />
        <p className="muted">কেনার সময় এই তালিকা থেকে বাছাই করা যাবে।</p>
      </header>
      <div className="flow-split">
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
          <button type="button" className="btn block" onClick={() => void add()}>
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
                    <button
                      type="button"
                      className="btn ghost danger"
                      disabled={deletingId === s.id}
                      onClick={() => void remove(s.id, s.name)}
                    >
                      {deletingId === s.id ? 'মুছছে...' : 'মুছুন'}
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
