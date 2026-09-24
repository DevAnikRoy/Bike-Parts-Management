export function isDatabaseSetupError(message: string) {
  return /schema cache|could not find the table|could not find the function|pgrst20/i.test(
    message,
  )
}

export function toBanglaError(message: string) {
  if (isDatabaseSetupError(message)) {
    return 'ডাটাবেস এখনো তৈরি হয়নি। নিচের একবারের সেটআপ শেষ করুন।'
  }
  if (/shop not found/i.test(message)) {
    return 'এই অ্যাকাউন্টের দোকান পাওয়া যায়নি। আবার লগইন করুন।'
  }
  if (/insufficient stock/i.test(message)) return 'পর্যাপ্ত স্টক নেই'
  if (/serial not found|code not found/i.test(message)) {
    return 'এই সিরিয়াল/কোড আমাদের রেকর্ডে নেই — রিটার্ন গ্রহণ করা যাবে না'
  }
  if (/not in sold/i.test(message)) return 'এই কোড বিক্রি অবস্থায় নেই'
  if (/not in stock|code not in stock/i.test(message)) return 'এই কোড স্টকে নেই'
  if (/part not found/i.test(message)) return 'পার্ট পাওয়া যায়নি'
  if (/serial count/i.test(message)) return 'সিরিয়াল সংখ্যা পরিমাণের সমান হতে হবে'
  if (/rate limit|too many|over_email_send_rate/i.test(message)) {
    return 'ইমেইলের সীমা শেষ। কিছুক্ষণ পর আবার চেষ্টা করুন। ফ্রি প্ল্যানে ঘণ্টায় কয়েকটি কোড যায়।'
  }
  if (/token has expired|otp_expired|invalid.*otp|invalid.*token/i.test(message)) {
    return 'কোড ভুল বা মেয়াদ শেষ। নতুন কোড নিন।'
  }
  if (/redirect/i.test(message)) {
    return 'লগইন লিংক এই সাইটের সাথে মিলছে না। কিছুক্ষণ পর আবার চেষ্টা করুন। সমস্যা থাকলে দোকানের মালিককে জানান।'
  }
  if (/unable to validate email|invalid email/i.test(message)) {
    return 'এই ইমেইল ঠিকানা গ্রহণ করা যায়নি'
  }
  if (/error sending confirmation email|error sending magic link/i.test(message)) {
    return 'কোড পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন, ইনবক্স ও স্প্যাম চেক করুন।'
  }
  return message
}
