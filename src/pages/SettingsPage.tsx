import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { dbApi } from '../lib/db'
import { isSupabaseConfigured } from '../lib/supabase'

export function SettingsPage() {
  const db = dbApi.getDb()
  const [name, setName] = useState(db.shop.name)
  const [address, setAddress] = useState(db.shop.address)
  const [phone, setPhone] = useState(db.shop.phone)
  const [prefix, setPrefix] = useState(db.shop.invoice_prefix)
  const [msg, setMsg] = useState('')

  function save() {
    dbApi.updateShop({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      invoice_prefix: prefix.trim() || 'BPM',
    })
    setMsg('সেভ হয়েছে ✓')
  }

  function resetDemo() {
    if (!confirm('সব ডেটা মুছে ডেমো আবার শুরু হবে। নিশ্চিত?')) return
    dbApi.resetDemo()
    window.location.href = '/login'
  }

  return (
    <>
      <PageHeader title="সেটিংস" />
      <div className="card">
        <h2>দোকানের তথ্য</h2>
        <div className="field">
          <label>দোকানের নাম</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>ঠিকানা</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="field">
          <label>ফোন</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label>ইনভয়েস প্রিফিক্স</label>
          <input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        </div>
        {msg && <p className="ok">{msg}</p>}
        <button type="button" className="btn block" onClick={save}>
          সেভ করুন
        </button>
      </div>

      <div className="card">
        <h2>ডেটা ও হোস্টিং</h2>
        <p className="muted">
          বর্তমান মোড:{' '}
          <strong>
            {isSupabaseConfigured ? 'Supabase ক্লাউড' : 'লোকাল (ব্রাউজার স্টোরেজ)'}
          </strong>
          । Netlify-তে ডিপ্লয়ের পর Supabase env দিলে সব ডিভাইসে সিঙ্ক হবে।
        </p>
        <p className="muted">
          ডেমো লগইন: <strong>01700000000</strong> / <strong>1234</strong>
        </p>
        <button type="button" className="btn danger block" onClick={resetDemo}>
          ডেমো রিসেট
        </button>
      </div>
    </>
  )
}
