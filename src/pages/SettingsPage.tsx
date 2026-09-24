import { useRef, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { ShopLogo } from '../components/ShopLogo'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/data'
import { dbApi } from '../lib/db'
import { isLocalDemoMode } from '../lib/runtime'
import { readShopLogoSvg } from '../lib/shopLogo'
import { isSupabaseConfigured } from '../lib/supabase'
import { useToast } from '../lib/toast'

export function SettingsPage() {
  const { user } = useAuth()
  const { db, updateShop } = useData()
  const notify = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(db.shop.name)
  const [address, setAddress] = useState(db.shop.address)
  const [phone, setPhone] = useState(db.shop.phone)
  const [prefix, setPrefix] = useState(db.shop.invoice_prefix)
  const [logoSvg, setLogoSvg] = useState<string | null>(db.shop.logo_svg ?? null)
  const [logoBusy, setLogoBusy] = useState(false)

  async function save() {
    try {
      await updateShop({
        name: name.trim(),
        address: address.trim(),
        phone: phone.trim(),
        invoice_prefix: prefix.trim() || 'BPM',
        logo_svg: logoSvg,
      })
      notify.success('দোকানের তথ্য সেভ হয়েছে')
    } catch (err) {
      notify.fromError(err, 'সেভ হয়নি')
    }
  }

  async function onLogoPicked(file: File | undefined) {
    if (!file) return
    setLogoBusy(true)
    try {
      const result = await readShopLogoSvg(file)
      if (!result.ok) {
        notify.error(result.error)
        return
      }
      setLogoSvg(result.svg)
      if (result.underRecommended) {
        notify.info('লোগো ঠিক আছে — ভালো কোয়ালিটির জন্য ২০–১০০ KB SVG ভালো')
      } else {
        notify.success('লোগো যোগ হয়েছে — সেভ করুন')
      }
    } finally {
      setLogoBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function clearLogo() {
    setLogoSvg(null)
    notify.info('লোগো সরানো হবে — সেভ করুন')
  }

  function resetDemo() {
    if (!isLocalDemoMode) return
    if (!confirm('সব ডেটা মুছে ডেমো আবার শুরু হবে। নিশ্চিত?')) return
    dbApi.resetDemo()
    notify.info('ডেমো রিসেট হয়েছে')
    window.location.href = '/login'
  }

  return (
    <>
      <header className="page-hero">
        <PageHeader title="দোকান" />
        <p className="muted">নাম, ঠিকানা ও লোগো — মেমো ও মেনুতে দেখাবে।</p>
      </header>

      <div className="card">
        <h2>দোকানের লোগো</h2>
        <div className="shop-logo-editor">
          <ShopLogo svg={logoSvg} name={name} size="lg" />
          <div className="shop-logo-editor-copy">
            <p className="muted">
              শুধু <strong>SVG</strong> ফাইল। সাইজ <strong>২০–১০০ KB</strong> (সর্বোচ্চ ১০০ KB)।
            </p>
            <ul className="shop-logo-tips">
              <li>
                আনুভূমিক লোগো: প্রায় <strong>২৫০×১৫০ px</strong>
              </li>
              <li>
                বর্গাকার / আইকন: <strong>৩২×৩২</strong> থেকে <strong>৫১২×৫১২ px</strong>
              </li>
              <li>মেনু ও ইনভয়েস/মেমোতে নাম ও ঠিকানার পাশে দেখাবে</li>
            </ul>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn"
                disabled={logoBusy}
                onClick={() => fileRef.current?.click()}
              >
                {logoBusy ? 'পড়ছি…' : 'SVG আপলোড'}
              </button>
              {logoSvg ? (
                <button type="button" className="btn ghost" onClick={clearLogo}>
                  লোগো সরান
                </button>
              ) : null}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,image/svg+xml"
              hidden
              onChange={(e) => void onLogoPicked(e.target.files?.[0])}
            />
          </div>
        </div>
      </div>

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
