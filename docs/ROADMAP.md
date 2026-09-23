# Roadmap — industry-ready (free stack only)

Goal: recruiter-demoable bike parts shop system — real multi-user isolation, modern desktop+phone UX, zero paid SaaS beyond free tiers.

## Phase 0 — Foundation

- [x] Schema, RLS, purchase/sale/return RPCs
- [x] Email OTP + shop bootstrap
- [x] Cloud client wired to UI

## Phase 1 — Shell & dashboard UX

- [x] Desktop sidebar / phone bottom nav
- [x] Clean login
- [x] Analytical home + empty-shop wizard

## Phase 2 — Counter flows (current focus)

- [x] Purchase UX (split / steps + next actions)
- [x] Sale UX (scan-first + sticky cart + memo)
- [x] Guided handoffs (purchase → label → sale)

## Phase 3 — Inventory loop

- [x] Stock table (desktop) / cards (phone)
- [x] Lookup + return polish + deep links from dashboard low-stock

## Phase 4 — Secondary screens & polish

- [x] Customers, suppliers, labels, shop settings in same design language
- [x] Empty/error states in Bangla (no jargon)
- [x] Print paths (memo, labels) verified

## Phase 5 — Ship & showcase

- [x] Netlify site exists + local `netlify link` (see `docs/DEPLOY.md`)
- [x] Production deploy of app build (CLI); Netlify `VITE_*` present in live bundle
- [x] Supabase Auth accepts Netlify `redirect_to` (OTP API probe HTTP 200)
- [ ] Live 2-email isolation smoke verified *(user — final DoD)*
- [ ] Latest working tree pushed to GitHub `main` *(user; optional for site, needed for CI)*
- [x] README demo script (2 users, prove data isolation)
- [x] Optional: free GitHub Actions `npm run build` + `check:isolation`

## Out of scope while free

- Paid SMS OTP / Twilio
- Paid email providers (Resend paid, etc.) as requirements
- Native mobile app stores
- Multi-branch / staff roles beyond owner (can add later on free tier)

## Definition of done (industry showcase)

A non-technical owner can on **laptop and phone**: email login → name shop → receive stock → sell with memo → see charts — and a **second email** never sees the first shop’s data — with **$0** required services beyond free GitHub/Netlify/Supabase/Gmail.
