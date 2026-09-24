# Project status

> **Source of truth for progress.** Agents must update this file when work lands.  
> Last reviewed: 2026-09-24

## Snapshot

| Area | State |
|------|--------|
| Multi-tenant schema + RLS | Ready; `npm run check:isolation` OK |
| Live anon RLS | Shop tables return `[]` (no leak) via PostgREST + anon key |
| Email OTP + shop bootstrap | Working; Auth Netlify `redirect_to` probe HTTP 200 |
| Desktop + phone UX | Done |
| Netlify | https://bike-parts-management.netlify.app |
| Live 2-shop isolation smoke | **Blocked** — needs one of: Anonymous ON / OTP paste / SQL prove |
| Paid features | None |

## Definition of done — evidence

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Email OTP login (free) | **Met** | Live OTP UI; Gmail SMTP; Netlify redirect accepted |
| Desktop + phone UX | **Met** | Dual shell + purchase/sale/stock flows live |
| Netlify + Supabase free | **Met** | Live site; no paid SMS/email SaaS |
| Per-shop isolation | **Code+RLS ready; live cross-user proof pending** | `check:isolation` OK; anon PostgREST `[]`; smoke scripts ready |
| Second shop cannot see first stock | **Unproven on live** | Anon disabled; Confirm email ON blocks password signup session; OTP not pasted |

## Done

- [x] Schema, RLS, RPCs, email OTP, cloud data layer
- [x] Shell, login, dashboard, wizard, counter + inventory UX
- [x] Harden: soft errors, catalog soft-fail, cart stock, hydrate queue, race SQL
- [x] Customer/supplier select-by-id
- [x] Offline isolation SQL checker (`scripts/check-isolation-sql.mjs`)
- [x] Live anon RLS probe (empty shop data)
- [x] Production Netlify deploys
- [x] Isolation tooling: `smoke:isolation`, `smoke:isolation:anon`, `prove:isolation`, `rls_isolation.sql`

## In progress

- (none — anon watcher stopped)

## Next (priority order)

1. **You (30s):** Auth → Providers → **Anonymous** ON — watcher completes proof automatically  
   *or* paste 6-digit OTP into `scripts/.smoke-otp-a` after `npm run smoke:isolation`  
   *or* `npm run prove:isolation` → Ctrl+V → Run → `RLS_ISOLATION_PASS`
2. **You (existing DB):** run `006_ensure_shop_race.sql` if not on latest `setup.sql`
3. **You:** `git push` when ready

## Blocked on user

- [ ] Live 2-shop isolation smoke (closes industry DoD / goal) — one of the three paths above
- [ ] Optional: apply `006_ensure_shop_race.sql`
- [ ] Git push to `main`

## Gaps / risks

- Cross-shop isolation is enforced by RLS + `ensure_my_shop`; **two real sessions on live project still required** to close the goal

## Changelog

- 2026-09-23 — Multi-tenant auth + UX phases 1–4; Netlify deploys
- 2026-09-23 — Harden + Auth redirect OK + customer/supplier id return
- 2026-09-23 — `check:isolation` script; live anon RLS empty-array evidence on shop tables
- 2026-09-24 — Isolation smoke tooling (OTP/anon/password/SQL prove); hard-blocked on human Auth toggle or OTP/SQL
- 2026-09-24 — Graphify installed (`graphifyy` + SQL); Cursor rule; `graphify-out/` (436 nodes) for architecture queries
- 2026-09-24 — Security harden: prod fail-closed (no demo), hide SQL/SMTP from shop owners, strip local passwords, delete dead ReportsPage, smoke emails via env only
