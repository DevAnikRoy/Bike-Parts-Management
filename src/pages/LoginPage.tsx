import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { isLocalDemoMode } from '../lib/runtime'
import { isSupabaseConfigured } from '../lib/supabase'
import { useToast } from '../lib/toast'

export function LoginPage() {
  const { user, login, sendEmailOtp, verifyEmailOtp } = useAuth()
  const navigate = useNavigate()
  const notify = useToast()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setInfo('')
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      notify.error('সঠিক ইমেইল দিন')
      return
    }
    setBusy(true)
    try {
      await sendEmailOtp(clean)
      setEmail(clean)
      setStep('code')
      setInfo('ইমেইলে যে ৬ সংখ্যা এসেছে, এখানে লিখুন।')
      notify.success('কোড পাঠানো হয়েছে — ইনবক্স দেখুন')
    } catch (err) {
      notify.fromError(err, 'কোড পাঠানো যায়নি')
    } finally {
      setBusy(false)
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    const token = code.replace(/\s/g, '')
    if (!/^\d{6}$/.test(token)) {
      notify.error('৬ সংখ্যার কোড দিন')
      return
    }
    setBusy(true)
    try {
      await verifyEmailOtp(email, token)
      notify.success('লগইন হয়েছে')
      navigate('/')
    } catch (err) {
      notify.fromError(err, 'লগইন হয়নি')
    } finally {
      setBusy(false)
    }
  }

  function localLogin(e: React.FormEvent) {
    e.preventDefault()
    try {
      login(email.trim(), password)
      notify.success('লগইন হয়েছে')
      navigate('/')
    } catch (err) {
      notify.fromError(err, 'লগইন হয়নি')
    }
  }

  return (
    <div className="login-layout">
      <div className="login-brand">
        <div className="brand-mark lg" aria-hidden />
        <h1>বাইক পার্টস হিসাব</h1>
        <p>স্টক, বিক্রি ও সিরিয়াল — দোকানের হিসাব এক জায়গায়।</p>
      </div>

      <div className="card login-card">
        <h2>লগইন</h2>
        {isLocalDemoMode ? (
          <>
            <p className="muted">লোকাল ডেমো (শুধু ডেভেলপমেন্ট)</p>
            <form onSubmit={localLogin}>
              <div className="field">
                <label htmlFor="phone">ফোন বা ইমেইল</label>
                <input id="phone" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="password">পাসওয়ার্ড</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <button type="submit" className="btn block">
                ভিতরে যান
              </button>
            </form>
          </>
        ) : !isSupabaseConfigured ? (
          <p className="err">ক্লাউড লগইন কনফিগার করা নেই।</p>
        ) : step === 'email' ? (
          <>
            <p className="muted">ইমেইলে কোড যাবে। নতুন ইমেইল হলে নিজের দোকান খুলবে।</p>
            <form onSubmit={(e) => void sendCode(e)}>
              <div className="field">
                <label htmlFor="email">ইমেইল</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="you@email.com"
                  autoFocus
                />
              </div>
              <button type="submit" className="btn block" disabled={busy}>
                {busy ? 'পাঠানো হচ্ছে...' : 'কোড পাঠান'}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={(e) => void verify(e)}>
            <p className="muted">{info}</p>
            <div className="field">
              <label htmlFor="otp">৬ সংখ্যার কোড</label>
              <input
                id="otp"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
              />
            </div>
            <button type="submit" className="btn block" disabled={busy}>
              {busy ? 'যাচাই হচ্ছে...' : 'ভিতরে যান'}
            </button>
            <button
              type="button"
              className="btn ghost block"
              style={{ marginTop: 8 }}
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setInfo('')
                  setBusy(true)
                  try {
                    await sendEmailOtp(email)
                    setInfo('নতুন কোড পাঠানো হয়েছে।')
                    notify.success('নতুন কোড পাঠানো হয়েছে')
                  } catch (err) {
                    notify.fromError(err, 'কোড পাঠানো যায়নি')
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              আবার কোড পাঠান
            </button>
            <button
              type="button"
              className="btn ghost block"
              style={{ marginTop: 8 }}
              disabled={busy}
              onClick={() => {
                setStep('email')
                setCode('')
              }}
            >
              অন্য ইমেইল
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
