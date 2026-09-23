# Agent guide — Bike Parts Management

This repo is built with **Cursor agents** plus living docs. Everything is intended to stay on a **free stack**.

## Read first (every significant task)

1. [`docs/STATUS.md`](docs/STATUS.md) — done / next / gaps (source of truth for progress)
2. [`docs/ROADMAP.md`](docs/ROADMAP.md) — phases to industry-ready
3. [`.cursor/rules/project.mdc`](.cursor/rules/project.mdc) — product + free constraints

## After you finish work

Update `docs/STATUS.md` (and ROADMAP ticks if a phase ends). Rules enforce this.

## Free stack (do not replace with paid)

| Layer | Choice |
|-------|--------|
| App | Vite + React + TypeScript |
| Auth + DB | Supabase free (email OTP, Postgres, RLS) |
| Email send | Gmail App Password SMTP (user’s account) |
| Host | Netlify free + GitHub |
| Agent memory | This repo’s `docs/` + `.cursor/rules/` (no paid project tools required) |

## Useful prompts for the human

- “STATUS অনুযায়ী পরের কাজ করো”
- “STATUS আপডেট করো — আজ যা হয়েছে …”
- “ROADMAP phase 3 শুরু করো”
- “Gaps লিস্ট থেকে সবচেয়ে জরুরি বাগ ফিক্স করো”

## Do not

- Require paid SMS, paid email APIs, or paid monitoring
- Commit secrets
- Show SQL/SMTP setup on normal login UI
