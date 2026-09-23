# বাইক পার্টস হিসাব

বাংলাদেশের বাইক পার্টস দোকানের জন্য স্টক, সিরিয়াল/QR ট্র্যাকিং, কেনা–বিক্রি ও রিটার্ন ম্যানেজমেন্ট ওয়েব অ্যাপ।

## ফিচার

- **কিনলাম** — সাপ্লায়ার থেকে স্টক; সিরিয়ালাইজড পার্টে অটো QR কোড
- **বিক্রি** — POS + ক্যাশমেমো প্রিন্ট
- **স্টক** — ব্র্যান্ড/মডেল/ক্যাটাগরি ফিল্টার, কম স্টক অ্যালার্ট
- **খুঁজো** — সিরিয়াল বা OEM নম্বর দিয়ে পুরো হিস্ট্রি
- **রিটার্ন** — সিরিয়াল মিল যাচাই
- **সিড ডেটা** — Hero ও Bajaj জনপ্রিয় মডেল + ফাস্ট-মুভিং পার্টস
- UI **বাংলায়**, বড় বাটন — নন-টেক দোকানদারদের জন্য

## লোকাল চালানো

```bash
npm install
npm run dev
```

Supabase সেট থাকলে লগইন **ইমেইল OTP** (ফ্রি, SMS নেই)। প্রতিটি ইমেইলের দোকানের ডাটা আলাদা। env না থাকলে ডেমো: `01700000000` / `1234` (ব্রাউজার localStorage)।

## Netlify ডিপ্লয়

GitHub-এ পুশ করলে Netlify নিজে বিল্ড করে। `netlify.toml`-এ কমান্ড `npm run build`, পাবলিশ `dist`, আর SPA রিডাইরেক্ট আছে। `.env` গিটে যায় না।

Netlify → Site configuration → Environment variables-এ এই দুটো দিন, তারপর **Clear cache and deploy**:

```
VITE_SUPABASE_URL=https://baqobrvwblxfmzsiboec.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>
```

এই দুটো না থাকলে লাইভ সাইট সুপাবেসে যুক্ত হবে না।

সাইট লাইভ হওয়ার পর Supabase → Authentication → URL Configuration-এ Netlify-এর ঠিকানা (যেমন `https://your-site.netlify.app`) Site URL এবং Redirect URLs-এ যোগ করুন।

## Supabase (ইমেইল OTP, আলাদা দোকান)

1. [Supabase](https://supabase.com) প্রজেক্ট তৈরি করুন
2. SQL Editor-এ শুধু `supabase/setup.sql` একবার রান করুন
3. Authentication → URL Configuration-এ সাইটের ঠিকানা দিন
4. Email Templates → Magic Link-এ `{{ .Token }}` রাখুন, যাতে ৬ সংখ্যার কোড যায়
5. `.env`-এ সেট করুন:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

প্রথম সফল লগইনে ওই ইমেইলের জন্য একটা দোকান তৈরি হয়। স্টক, কেনা, বিক্রি Row Level Security দিয়ে শুধু সেই দোকানে থাকে। মোবাইল SMS ব্যবহার হয় না।

## পার্টস ট্র্যাকিং

| মোড | উদাহরণ | আচরণ |
|-----|--------|--------|
| serialized | CDI, ব্যাটারি, স্পিডো | প্রতি ইউনিটে ইউনিক কোড (IMEI-এর মতো) |
| optional_serial | হেডলাইট, শক | চাইলে কোড |
| qty_only | অয়েল, বাল্ব, কেবল | শুধু পরিমাণ |

## টেক স্ট্যাক

- Vite + React + TypeScript
- React Router
- Netlify hosting
- Supabase (ঐচ্ছিক Postgres + Auth + RLS)
