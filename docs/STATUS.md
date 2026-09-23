# Project status

> **Source of truth for progress.** Agents must update this file when work lands.  
> Last reviewed: 2026-09-23

## Snapshot

| Area | State |
|------|--------|
| Multi-tenant schema + RLS | Ready; `npm run check:isolation` OK |
| Live anon RLS | Shop tables return `[]` (no leak) via PostgREST + anon key |
| Email OTP + shop bootstrap | Working; Auth Netlify `redirect_to` probe HTTP 200 |
| Desktop + phone UX | Done |
| Netlify | https://bike-parts-management.netlify.app (`index-DF_K1boJ.js`) |
| Live 2-email isolation smoke | **Not yet run** (final DoD) |
| Paid features | None |

## Done

- [x] Schema, RLS, RPCs, email OTP, cloud data layer
- [x] Shell, login, dashboard, wizard, counter + inventory UX
- [x] Harden: soft errors, catalog soft-fail, cart stock, hydrate queue, race SQL
- [x] Customer/supplier select-by-id
- [x] Offline isolation SQL checker (`scripts/check-isolation-sql.mjs`)
- [x] Live anon RLS probe (empty shop data)
- [x] Production Netlify deploys

## In progress

- (none)

## Next (priority order)

1. **You:** live smoke — email A OTP → wizard → purchase → sale → charts; email B sees no A stock
2. **You (existing DB):** run `006_ensure_shop_race.sql` if not on latest `setup.sql`
3. **You:** `git push` when ready

## Blocked on user

- [ ] Live 2-email isolation smoke test (closes industry DoD / goal)
- [ ] Optional: apply `006_ensure_shop_race.sql`
- [ ] Git push to `main`

## Gaps / risks

- Cross-shop isolation is enforced by RLS + `ensure_my_shop`; **two real logins on live URL still required** to close the goal

## Changelog

- 2026-09-23 — Multi-tenant auth + UX phases 1–4; Netlify deploys
- 2026-09-23 — Harden + Auth redirect OK + customer/supplier id return
- 2026-09-23 — `check:isolation` script; live anon RLS empty-array evidence on shop tables
