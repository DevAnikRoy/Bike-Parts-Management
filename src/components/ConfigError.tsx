/** Shown when production build has no Supabase env (no demo fallback). */
export function ConfigError() {
  return (
    <div className="login-layout">
      <div className="card login-card">
        <h1>কনফিগারেশন বাকি</h1>
        <p className="muted">
          এই সাইটে ক্লাউড লগইন সেট করা নেই। Netlify-তে <code>VITE_SUPABASE_URL</code> ও{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> বসিয়ে আবার ডিপ্লয় করুন। ডেমো পাসওয়ার্ড দিয়ে
          প্রোডাকশন চালানো হয় না।
        </p>
      </div>
    </div>
  )
}
