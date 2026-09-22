import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('01700000000')
  const [password, setPassword] = useState('1234')
  const [error, setError] = useState('')

  if (user) return <Navigate to="/" replace />

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      login(phone.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন ব্যর্থ')
    }
  }

  return (
    <div className="card" style={{ marginTop: 40 }}>
      <h2>লগইন করুন</h2>
      <p className="muted">
        দোকানের হিসাব দেখতে ফোন নম্বর ও পাসওয়ার্ড দিন। ডেমো: ০১৭০০০০০০০০ / ১২৩৪
      </p>
      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="phone">ফোন বা ইমেইল</label>
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoComplete="username"
          />
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
        {error && <p className="err">{error}</p>}
        <button type="submit" className="btn block">
          ভিতরে যান
        </button>
      </form>
    </div>
  )
}
