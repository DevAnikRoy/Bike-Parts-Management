import { useState } from 'react'
import { supabaseProjectRef } from '../lib/supabase'

const EMAIL_TEMPLATE = `<h2>লগইন কোড</h2>
<p>আপনার কোড: <strong>{{ .Token }}</strong></p>
<p>অথবা <a href="{{ .ConfirmationURL }}">এই লিংকে ক্লিক করুন</a></p>`

function CopyBlock({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false)
  return (
    <div style={{ marginTop: 8 }}>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          background: 'var(--bg)',
          padding: 12,
          borderRadius: 8,
          margin: '8px 0',
        }}
      >
        {text}
      </pre>
      <button
        type="button"
        className="btn ghost"
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => setOk(true))
        }}
      >
        {ok ? 'কপি হয়েছে' : label}
      </button>
    </div>
  )
}

export function CloudSetup({
  showSql,
  onRetry,
}: {
  showSql: boolean
  onRetry?: () => void
}) {
  const ref = supabaseProjectRef()
  const origin = window.location.origin
  const sql = ref ? `https://supabase.com/dashboard/project/${ref}/sql/new` : ''
  const urls = ref
    ? `https://supabase.com/dashboard/project/${ref}/auth/url-configuration`
    : ''
  const templates = ref
    ? `https://supabase.com/dashboard/project/${ref}/auth/templates`
    : ''

  return (
    <div className="card">
      <h2>একবারের ফ্রি সেটআপ</h2>
      <p className="muted">
        ইমেইল OTP ফ্রি। মোবাইল SMS বন্ধ রাখা হয়েছে, তাই কোনো টাকা লাগবে না। প্রতিটি ইমেইলের
        দোকান, স্টক ও বিক্রি আলাদা থাকবে।
      </p>

      {showSql && (
        <>
          <p>
            <strong>১. ডাটাবেস</strong>
          </p>
          <p className="muted">
            এই প্রজেক্টের <strong>supabase/setup.sql</strong> ফাইল খুলে সব কপি করুন। Supabase SQL
            Editor-এ পেস্ট করে Run দিন। migrations ফোল্ডারের ফাইল আলাদা করে চালাবেন না।
          </p>
          {sql && (
            <p>
              <a href={sql} target="_blank" rel="noreferrer">
                SQL Editor খুলুন
              </a>
            </p>
          )}
        </>
      )}

      <p>
        <strong>{showSql ? '২' : '১'}. লগইন লিংক</strong>
      </p>
      <p className="muted">
        Authentication → URL Configuration-এ Site URL এবং Redirect URLs দুটোতে এই ঠিকানা দিন:
      </p>
      <CopyBlock text={origin} label="ঠিকানা কপি" />
      {urls && (
        <p>
          <a href={urls} target="_blank" rel="noreferrer">
            URL Configuration খুলুন
          </a>
        </p>
      )}

      <p>
        <strong>{showSql ? '৩' : '২'}. ইমেইল পাঠানো (Gmail, ফ্রি)</strong>
      </p>
      <p className="muted">
        Supabase-এর নিজের মেইল সার্ভার অনেক সময় 500 দেয়। নিজের Gmail দিয়ে পাঠালে কোড চলে আসে, টাকা
        লাগে না।
      </p>
      <ol className="muted">
        <li>Gmail-এ 2-Step Verification চালু রাখুন।</li>
        <li>
          <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">
            App passwords
          </a>{' '}
          থেকে একটা পাসওয়ার্ড বানান। নাম দিন Supabase।
        </li>
        <li>
          Supabase → Authentication → Emails → SMTP Settings → Enable Custom SMTP।
        </li>
        <li>Host: smtp.gmail.com, Port: 587</li>
        <li>Username ও Sender email: আপনার Gmail। Password: ওই App password (Gmail-এর আসল পাসওয়ার্ড নয়)।</li>
        <li>Sender name: Bike Parts। Save করে আবার কোড পাঠান।</li>
      </ol>
      {ref && (
        <p>
          <a
            href={`https://supabase.com/dashboard/project/${ref}/auth/smtp`}
            target="_blank"
            rel="noreferrer"
          >
            SMTP Settings খুলুন
          </a>
        </p>
      )}

      <p>
        <strong>{showSql ? '৪' : '৩'}. ইমেইলের কোড</strong>
      </p>
      <p className="muted">
        Authentication → Email Templates → Magic Link-এর ভিতরের লেখা মুছে নিচেরটা বসান। না বসালে
        ইমেইলে শুধু লিংক থাকে, ৬ সংখ্যার কোড দেখায় না।
      </p>
      <CopyBlock text={EMAIL_TEMPLATE} label="টেমপ্লেট কপি" />
      {templates && (
        <p>
          <a href={templates} target="_blank" rel="noreferrer">
            Email Templates খুলুন
          </a>
        </p>
      )}

      {onRetry && (
        <button type="button" className="btn block" onClick={onRetry}>
          সেটআপ হয়ে গেছে, আবার চেষ্টা
        </button>
      )}
    </div>
  )
}
