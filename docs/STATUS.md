# Project status

> **Source of truth for progress.** Agents must update this file when work lands.  
> Last reviewed: 2026-09-25

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
- [x] Customer/supplier delete + site-wide Bangla toasts
- [x] Real part-type photos (22/22) under `public/parts/*.jpg` from Commons + Unsplash; SVG fallback
- [x] Dense home dashboard (logo hero, period chips, KPI+CTA strip, stretch 2×2 panels)

## In progress

- (none)

## Next (priority order)

1. **You (30s):** Auth → Providers → **Anonymous** ON — watcher completes proof automatically  
   *or* paste 6-digit OTP into `scripts/.smoke-otp-a` after `npm run smoke:isolation`  
   *or* `npm run prove:isolation` → Ctrl+V → Run → `RLS_ISOLATION_PASS`
2. **You (existing DB):** run `006_ensure_shop_race.sql` if not on latest `setup.sql`
3. **You:** `git push` when ready

## Blocked on user

- [ ] Live 2-shop isolation smoke (closes industry DoD / goal) — one of the three paths above
- [ ] Optional: apply `006_ensure_shop_race.sql`
- [ ] **Existing Supabase project:** run `supabase/migrations/007_shop_logo.sql` (or re-run `setup.sql` alter) so logo saves to cloud
- [ ] **Existing Supabase project:** run `supabase/migrations/008_rate_limit.sql` so server-side mutation rate limits apply
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
- 2026-09-24 — Customer/supplier delete (UI + local/cloud; sales/purchases keep history via null FK)
- 2026-09-24 — Site-wide Bangla toasts (top-right): success/error/info; stronger toBanglaError map
- 2026-09-24 — Part type thumbnails beside names (stock/sale/purchase/lookup/labels/home); 22 SVG icons
- 2026-09-24 — Replaced SVG thumbs with real Commons/Unsplash photos for all 22 visual keys; `partImageSrc` prefers jpg; SVG onError fallback
- 2026-09-24 — Desktop hover: modest ~112px part photo preview on PartThumb (phone unchanged)
- 2026-09-24 — Stock page redesign: summary chips, search toolbar, qty meter, cleaner desktop table + phone cards
- 2026-09-24 — Stock list/grid toggle (persisted); hover preview opens to the right (no left clip)
- 2026-09-24 — README rewritten in English for recruiters: niche, problem, plain-language stack & scope
- 2026-09-24 — Larger stock photos (xl); shop SVG logo in Settings → sidebar/topbar + sale memo; migration `007_shop_logo.sql`
- 2026-09-24 — Rate limits: client OTP/mutations + DB `assert_shop_rate` (`008_rate_limit.sql`); login cooldown UI
- 2026-09-25 — Home «সাম্প্রতিক মেমো» clickable → popup with full invoice details + print
- 2026-09-25 — Home KPIs clickable: sales history (day/week/month/year), stock value breakdown, low-stock list
- 2026-09-25 — Dashboard densified: wider shell, logo hero + period chips, KPI+CTA command strip, stretch 2×2 main grid fills viewport