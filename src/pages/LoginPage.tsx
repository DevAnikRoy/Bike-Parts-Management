import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { CloudSetup } from '../components/CloudSetup'
import { useAuth } from '../lib/auth'
import { isDatabaseSetupError } from '../lib/errors'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export function LoginPage() {
  const { user, login, sendEmailOtp, verifyEmailOtp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [needsSql, setNeedsSql] = useState(false)

  async function probeSql() {
    if (!supabase) return
    const { error: probeError } = await supabase.from('shops').select('id').limit(1)
    setNeedsSql(Boolean(probeError && isDatabaseSetupError(probeError.message)))
  }

  useEffect(() => {
    void probeSql()
  }, [])

  if (user) return <Navigate to="/" replace />

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    const clean = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('সঠিক ইমেইল দিন')
      return
    }
    setBusy(true)
    try {
      await sendEmailOtp(clean)
      setEmail(clean)
      setStep('code')
      setInfo('ইমেইল দেখুন। ৬ সংখ্যার কোড এখানে দিন, অথবা ইমেইলের লিংকে ক্লিক করুন।')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'কোড পাঠানো যায়নি')
    } finally {
      setBusy(false)
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const token = code.replace(/\s/g, '')
    if (!/^\d{6}$/.test(token)) {
      setError('৬ সংখ্যার কোড দিন')
      return
    }
    setBusy(true)
    try {
      await verifyEmailOtp(email, token)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন ব্যর্থ')
    } finally {
      setBusy(false)
    }
  }

  function localLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      login(email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন ব্যর্থ')
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="card" style={{ marginTop: 40 }}>
        <h2>লগইন করুন</h2>
        <p className="muted">ডেমো: ০১৭০০০০০০০০ / ১২৩৪</p>
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
            />
          </div>
          {error && <p className="err">{error}</p>}
          <button type="submit" className="btn block">
            ভিতরে যান
          </button>
        </form>
      </div>
    )
  }

  return (
    <>
      <div className="card" style={{ marginTop: 24 }}>
        <h2>লগইন করুন</h2>
        <p className="muted">
          ইমেইলে কোড যাবে। নতুন ইমেইল হলে নিজের দোকান খুলবে। অন্য ইমেইলের স্টক ও বিক্রি আলাদা থাকবে।
        </p>
        {step === 'email' ? (
          <form onSubmit={sendCode}>
            <div className="field">
              <label htmlFor="email">ইমেইল</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@email.com"
              />
            </div>
            {error && <p className="err">{error}</p>}
            <button type="submit" className="btn block" disabled={busy}>
              {busy ? 'পাঠানো হচ্ছে...' : 'কোড পাঠান'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
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
              />
            </div>
            {error && <p className="err">{error}</p>}
            <button type="submit" className="btn block" disabled={busy}>
              {busy ? 'যাচাই হচ্ছে...' : 'ভিতরে যান'}
            </button>
            <button
              type="button"
              className="btn ghost block"
              style={{ marginTop: 8 }}
              disabled={busy}
              onClick={() => {
                setStep('email')
                setCode('')
                setError('')
              }}
            >
              অন্য ইমেইল
            </button>
          </form>
        )}
      </div>
      <CloudSetup showSql={needsSql} onRetry={() => void probeSql()} />
    </>
  )
}
