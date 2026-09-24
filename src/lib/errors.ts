export function isDatabaseSetupError(message: string) {
  return /schema cache|could not find the table|could not find the function|pgrst20/i.test(
    message,
  )
}

/** Map technical / English API text to shopkeeper Bangla. */
export function toBanglaError(message: string) {
  const raw = (message || '').trim()
  if (!raw) return 'কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।'

  if (isDatabaseSetupError(raw)) {
    return 'ডাটাবেস এখনো তৈরি হয়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।'
  }
  if (/shop not found/i.test(raw)) {
    return 'এই অ্যাকাউন্টের দোকান পাওয়া যায়নি। আবার লগইন করুন।'
  }
  if (/insufficient stock/i.test(raw)) return 'পর্যাপ্ত স্টক নেই'
  if (/serial not found|code not found/i.test(raw)) {
    return 'এই সিরিয়াল/কোড আমাদের রেকর্ডে নেই — রিটার্ন গ্রহণ করা যাবে না'
  }
  if (/not in sold/i.test(raw)) return 'এই কোড বিক্রি অবস্থায় নেই'
  if (/not in stock|code not in stock/i.test(raw)) return 'এই কোড স্টকে নেই'
  if (/part not found/i.test(raw)) return 'পার্ট পাওয়া যায়নি'
  if (/serial count/i.test(raw)) return 'সিরিয়াল সংখ্যা পরিমাণের সমান হতে হবে'
  if (/duplicate|unique|already exists/i.test(raw)) {
    return 'এই তথ্য আগে থেকেই আছে। অন্য নাম বা ফোন দিন।'
  }
  if (/foreign key|violates|constraint/i.test(raw)) {
    return 'এই আইটেম অন্য হিসাবের সাথে যুক্ত — মুছা যায়নি।'
  }
  if (/permission|rls|row-level|not authorized|jwt/i.test(raw)) {
    return 'এই কাজের অনুমতি নেই। আবার লগইন করে চেষ্টা করুন।'
  }
  if (/failed to fetch|networkerror|network request failed|load failed|timeout/i.test(raw)) {
    return 'ইন্টারনেট সংযোগ নেই বা ধীর। নেট চেক করে আবার চেষ্টা করুন।'
  }
  if (/rate limit|too many|over_email_send_rate|RateLimitError/i.test(raw)) {
    return /সেকেন্ড|মিনিট/.test(raw)
      ? raw
      : 'অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
  }
  if (/token has expired|otp_expired|invalid.*otp|invalid.*token/i.test(raw)) {
    return 'কোড ভুল বা মেয়াদ শেষ। নতুন কোড নিন।'
  }
  if (/redirect/i.test(raw)) {
    return 'লগইন লিংক এই সাইটের সাথে মিলছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।'
  }
  if (/unable to validate email|invalid email/i.test(raw)) {
    return 'এই ইমেইল ঠিকানা গ্রহণ করা যায়নি'
  }
  if (/error sending confirmation email|error sending magic link/i.test(raw)) {
    return 'কোড পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন, ইনবক্স ও স্প্যাম চেক করুন।'
  }
  if (/supabase কনফিগার|কনফিগার করা নেই/i.test(raw)) {
    return 'ক্লাউড লগইন এখন চালু নেই। সাইট সেটআপ চেক করুন।'
  }
  // Already Bangla (common script) — pass through if mostly Bengali
  if (/[\u0980-\u09FF]/.test(raw) && !/[A-Za-z]{4,}/.test(raw)) {
    return raw
  }
  // Avoid dumping raw Postgres/JS noise
  if (/^[a-z0-9_.:\-\s]+$/i.test(raw) || raw.length > 160) {
    return 'কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করুন। সমস্যা থাকলে লগআউট করে লগইন করুন।'
  }
  return raw
}

/** Safe message from unknown catch value. */
export function userFacingError(err: unknown, fallback = 'কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।') {
  if (err instanceof Error && err.message) return toBanglaError(err.message)
  if (typeof err === 'string' && err.trim()) return toBanglaError(err)
  return fallback
}
