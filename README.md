# Bike Parts Management

**A shop management web app for motorcycle spare-parts stores in Bangladesh.**

Built so a non-technical shop owner can run day-to-day business on a laptop or phone — in Bangla — without buying expensive POS software or SMS packages.

**Live demo:** [bike-parts-management.netlify.app](https://bike-parts-management.netlify.app)

---

## The problem (why this exists)

In Bangladesh, most motorcycle parts shops still run on:

- Paper notebooks or messy Excel sheets  
- WhatsApp photos of invoices  
- Memory (“I think we have three CDIs left…”)  

That leads to **wrong stock counts**, **lost serial numbers**, **no clear purchase/sale history**, and **hard returns** when a customer brings a part back.

Generic accounting tools are often in English, desktop-only, or too complex for a counter shop. This project targets that **niche**: one shop owner, Bangla-first UI, parts catalog (Hero / Bajaj–style fast movers), and inventory that matches how these shops actually buy and sell.

---

## Who it’s for

| Audience | What they get |
|----------|----------------|
| **Shop owners** | Buy stock, sell with a printable memo, see what’s low, find a part by serial/OEM |
| **Recruiters / reviewers** | A real product demo: login → shop → stock → sale → charts, with each email = its own shop |
| **Developers** | Free-tier full stack (see below) you can clone and run |

---

## What the product does

Plain-language feature map:

| In the app | Business meaning |
|------------|------------------|
| **কিনলাম (Purchase)** | Record stock received from a supplier; serialized parts get unique codes (like IMEI for parts) |
| **বিক্রি (Sale)** | Counter sale + printable cash memo |
| **স্টক (Stock)** | Browse inventory (list or grid), filter by brand/model/category, spot low / empty stock |
| **খুঁজো (Lookup)** | Find a part by serial or OEM number and see its history |
| **রিটার্ন (Return)** | Take a part back with serial checks where needed |
| **Dashboard** | Today’s sales, stock value, low-stock alerts, simple charts |
| **Customers / suppliers** | Keep contacts used on sales and purchases |
| **Labels** | Print or view codes for serialized units |

**Privacy model:** one email login → one shop. Shop A cannot see Shop B’s stock or sales. That isolation is enforced in the database (not just “hidden in the UI”).

**Cost model:** designed to run on **free tiers** only — no paid SMS OTP, no paid email SaaS required.

---

## Tech stack (simple explanation)

Think of the product as three layers:

```
[ Phone / laptop browser ]
        ↓
[ Web app — screens & shop logic ]
        ↓
[ Cloud login + database — each shop’s private data ]
```

| Layer | Technology | In plain English |
|-------|------------|------------------|
| Interface | **React** + **TypeScript** + **Vite** | Modern web app UI; TypeScript reduces bugs; Vite builds it quickly |
| Navigation | **React Router** | Different pages (stock, sale, settings) without reloading the whole site |
| Login | **Supabase Auth** (email OTP) | User gets a 6-digit code by email — no SMS fees |
| Database | **Supabase Postgres** + **RLS** | Cloud database; “row level security” means each shop only reads its own rows |
| Hosting | **Netlify** (from **GitHub**) | Public website URL; free hosting for this demo |
| Email send | **Gmail App Password SMTP** | Shop/project uses the owner’s Gmail to send OTP mail (still free-tier friendly) |
| Language / UX | Bangla UI, large taps, desktop sidebar + phone bottom nav | Built for shop counters, not for developers |

**Not used (on purpose):** paid SMS (Twilio), paid email APIs, native App Store apps — kept out of scope so the demo stays $0 beyond free cloud quotas.

---

## Scope of this project

**In scope today**

- Multi-shop (multi-tenant) cloud data with email login  
- Purchase → stock → sale → return loop  
- Shared parts catalog + per-shop quantities and prices  
- Bangla-first UX for desktop and phone  
- Production deploy on Netlify + Supabase free tier  

**Out of scope (for now)**

- Staff roles / multi-branch chains  
- Native iOS/Android store apps  
- Paid SMS login  
- Full accounting/tax suite  

Progress notes for builders: [`docs/STATUS.md`](docs/STATUS.md) · roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md)

---

## How parts are tracked

Shops don’t treat every item the same way:

| Mode | Examples | Behavior |
|------|----------|----------|
| Serialized | CDI, battery, speedometer | Each unit gets a unique code |
| Optional serial | Headlight, shock | Code only if you want it |
| Quantity only | Oil, bulbs, cables | Just count (pcs / bottles) |

---

## Quick demo script (for a recruiter walkthrough)

1. Open the [live site](https://bike-parts-management.netlify.app).  
2. Log in with **email A** → enter the OTP from email → name the shop → add a supplier → **কিনলাম** (receive stock) → **বিক্রি** (sale) → check the home dashboard charts.  
3. Log out → log in with **email B** → confirm you **do not** see email A’s stock (separate shop).  
4. Try the same flows on a **phone** (bottom menu) and a **laptop** (sidebar).

---

## Run locally (developers)

```bash
npm install
npm run dev
```

With Supabase configured, login uses **email OTP**. Without cloud env vars, production builds fail closed (no fake demo shop online). Local `npm run dev` can still use a local demo path for UI work.

### Deploy notes

- Live: https://bike-parts-management.netlify.app  
- Full steps: [`docs/DEPLOY.md`](docs/DEPLOY.md)  
- Netlify env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`  
- Database: run `supabase/setup.sql` once in the Supabase SQL editor  

Optional checks:

```bash
npm run check:isolation   # schema/RLS review helper
npm run build             # production build
```

---

## Project at a glance

| | |
|--|--|
| **Niche** | Bangladesh motorcycle spare-parts retail |
| **Problem** | Paper/Excel chaos → wrong stock, weak serial tracking, no clean counter workflow |
| **Solution** | Bangla web app: buy, sell, stock, lookup, return — one shop per login |
| **Stack** | React, TypeScript, Vite, Supabase, Netlify |
| **Constraint** | Free-tier only (no paid SMS / email SaaS required) |

---

Built as a portfolio-ready product demo: real users, real isolation, and a counter UX shop owners can understand without training manuals.
