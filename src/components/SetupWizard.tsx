import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { useToast } from '../lib/toast'

export function SetupWizard() {
  const { db, updateShop, addSupplier } = useData()
  const notify = useToast()
  const [step, setStep] = useState(() => {
    if (!db.shop.address.trim() && db.shop.name === 'আমার বাইক পার্টস') return 0
    if (db.suppliers.length === 0) return 1
    if (db.purchases.length === 0) return 2
    return 3
  })
  const [name, setName] = useState(db.shop.name === 'আমার বাইক পার্টস' ? '' : db.shop.name)
  const [address, setAddress] = useState(db.shop.address)
  const [phone, setPhone] = useState(db.shop.phone)
  const [supplierName, setSupplierName] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveShop(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      notify.error('দোকানের নাম দিন')
      return
    }
    setBusy(true)
    try {
      await updateShop({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        invoice_prefix: db.shop.invoice_prefix || 'BPM',
      })
      notify.success('দোকানের নাম সেভ হয়েছে')
      setStep(db.suppliers.length === 0 ? 1 : db.purchases.length === 0 ? 2 : 3)
    } catch (err) {
      notify.fromError(err, 'সেভ হয়নি')
    } finally {
      setBusy(false)
    }
  }

  async function saveSupplier(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierName.trim() || !supplierPhone.trim()) {
      notify.error('নাম ও ফোন লাগবে')
      return
    }
    setBusy(true)
    try {
      await addSupplier({
        name: supplierName.trim(),
        phone: supplierPhone.trim(),
        address: '',
        note: '',
      })
      notify.success('সাপ্লায়ার যোগ হয়েছে')
      setStep(2)
    } catch (err) {
      notify.fromError(err, 'সেভ হয়নি')
    } finally {
      setBusy(false)
    }
  }

  const steps = ['দোকান', 'সাপ্লায়ার', 'স্টক', 'প্রস্তুত']

  return (
    <div className="wizard">
      <div className="wizard-head">
        <p className="eyebrow">শুরু করুন</p>
        <h2>দোকান চালু করতে ৩টি ধাপ</h2>
        <p className="muted">একটা শেষ করলে পরেরটা আসবে। সব বাংলায়।</p>
      </div>

      <ol className="wizard-steps">
        {steps.map((label, i) => (
          <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''}>
            <span className="n">{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form className="card wizard-card" onSubmit={(e) => void saveShop(e)}>
          <h3>১. দোকানের নাম</h3>
          <p className="muted">মেমোতে এই নাম ছাপা হবে।</p>
          <div className="field">
            <label htmlFor="shop-name">দোকানের নাম</label>
            <input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: রহিম বাইক পার্টস"
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="shop-address">ঠিকানা</label>
            <input
              id="shop-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="এলাকা, শহর"
            />
          </div>
          <div className="field">
            <label htmlFor="shop-phone">ফোন</label>
            <input
              id="shop-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="০১৭…"
            />
          </div>
          <button type="submit" className="btn block" disabled={busy}>
            {busy ? 'সেভ হচ্ছে...' : 'পরের ধাপ'}
          </button>
        </form>
      )}

      {step === 1 && (
        <form className="card wizard-card" onSubmit={(e) => void saveSupplier(e)}>
          <h3>২. সাপ্লায়ার যোগ করুন</h3>
          <p className="muted">যার কাছ থেকে পার্টস কেনেন, তার নাম ও ফোন।</p>
          <div className="field">
            <label htmlFor="sup-name">নাম</label>
            <input
              id="sup-name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="sup-phone">ফোন</label>
            <input
              id="sup-phone"
              value={supplierPhone}
              onChange={(e) => setSupplierPhone(e.target.value)}
              inputMode="tel"
            />
          </div>
          <button type="submit" className="btn block" disabled={busy}>
            {busy ? 'সেভ হচ্ছে...' : 'পরের ধাপ'}
          </button>
          <button
            type="button"
            className="btn ghost block"
            style={{ marginTop: 8 }}
            onClick={() => setStep(2)}
          >
            পরে করব
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="card wizard-card">
          <h3>৩. প্রথমবার স্টক ঢোকান</h3>
          <p className="muted">
            সাপ্লায়ার থেকে কেনা পার্টস যোগ করুন। সিরিয়াল লাগলে কোড নিজে তৈরি হবে।
          </p>
          <Link to="/purchase" className="btn block">
            কিনলাম খুলুন
          </Link>
        </div>
      )}
    </div>
  )
}
