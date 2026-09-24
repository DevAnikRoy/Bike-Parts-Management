import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { dbApi } from '../lib/db'
import { isLocalDemoMode } from '../lib/runtime'
import { isSupabaseConfigured } from '../lib/supabase'

export function SettingsPage() {
  const { user } = useAuth()
  const { db, updateShop } = useData()
  const [name, setName] = useState(db.shop.name)
  const [address, setAddress] = useState(db.shop.address)
  const [phone, setPhone] = useState(db.shop.phone)
  const [prefix, setPrefix] = useState(db.shop.invoice_prefix)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function save() {
    setError('')
    setMsg('')
    try {
      await updateShop({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        invoice_prefix: prefix.trim() || 'BPM',
      })
      setMsg('সেভ হয়েছে ✓')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'সেভ হয়নি')
    }
  }

  function resetDemo() {
    if (!isLocalDemoMode) return
    if (!confirm('সব ডেটা মুছে ডেমো আবার শুরু হবে। নিশ্চিত?')) return
    dbApi.resetDemo()
    window.location.href = '/login'
  }

  return (
    <>
      <header className="page-hero">
        <PageHeader title="দোকান" />
        <p className="muted">মেমোতে যে নাম ও ঠিকানা ছাপা হবে।</p>
      </header>
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
        {error && <p className="err">{error}</p>}
        <button type="button" className="btn block" onClick={() => void save()}>
          সেভ করুন
        </button>
      </div>

      <div className="card">
        <h2>অ্যাকাউন্ট</h2>
        {isSupabaseConfigured ? (
          <p className="muted">
            লগইন ইমেইল: <strong>{user?.email}</strong>
            <br />
            এই ইমেইলের স্টক, কেনা, বিক্রি, কাস্টমার ও সাপ্লায়ার আলাদা। অন্য ইমেইলে ঢুকলে অন্য
            দোকান খুলবে। ব্র্যান্ড ও পার্টসের তালিকা সবার জন্য এক।
          </p>
        ) : isLocalDemoMode ? (
          <>
            <p className="muted">লোকাল ডেমো — ডাটা শুধু এই ব্রাউজারে।</p>
            <button type="button" className="btn danger block" onClick={resetDemo}>
              ডেমো রিসেট
            </button>
          </>
        ) : (
          <p className="muted">ক্লাউড কনফিগারেশন নেই।</p>
        )}
      </div>
    </>
  )
}
