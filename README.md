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

ডেমো লগইন: `01700000000` / `1234`

ডিফল্টে ডেটা **ব্রাউজার localStorage**-এ থাকে (এক ডিভাইস)। এভাবেই Netlify-তে আপাতত চালানো যায়।

## Netlify ডিপ্লয়

1. রিপো GitHub-এ পুশ করুন
2. Netlify → New site from Git
3. Build: `npm run build`, Publish: `dist`
4. `netlify.toml` ইতিমধ্যে SPA redirect কনফিগ করা আছে

অথবা:

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

## Supabase (ক্লাউড সিঙ্ক / ভবিষ্যৎ মোবাইল অ্যাপ)

1. [Supabase](https://supabase.com) প্রজেক্ট তৈরি করুন
2. `supabase/migrations/`-এর SQL ফাইলগুলো ক্রমে রান করুন
3. Netlify / `.env`-এ সেট করুন:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

V1 অ্যাপ লজিক localStorage API (`src/lib/db.ts`) দিয়ে চলে। Supabase স্কিমা + RPC প্রস্তুত; ক্লায়েন্ট সুইচ পরের ধাপে একই UI দিয়ে করা যাবে।

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
