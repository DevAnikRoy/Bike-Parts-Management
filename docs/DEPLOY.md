# Free production deploy

Live site (already on Netlify free): https://bike-parts-management.netlify.app  
Admin: https://app.netlify.com/projects/bike-parts-management  
Repo: https://github.com/DevAnikRoy/Bike-Parts-Management (`main`)

Local folder is linked via Netlify CLI (`.netlify` is gitignored).

## 1. Push latest code (optional for site)

Site can be updated via local `netlify deploy --prod` (already used).  
Push to GitHub `main` when you want CI + GitHub to match live (agent does not push unless asked).

## 2. Netlify environment variables

Site configuration → Environment variables → add for **Production** (and Preview if you want):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | your project URL (`https://….supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | anon **public** key only |

Then **Deploys → Trigger deploy → Clear cache and deploy site** (or CLI deploy).  
Vite bakes these in at build time — changing env without redeploy does nothing.

## 3. Supabase Auth URLs

Authentication → URL Configuration:

- Site URL: `https://bike-parts-management.netlify.app`
- Redirect URLs: also add  
  `https://bike-parts-management.netlify.app`  
  and keep `http://localhost:5173` for local.

If the database was set up earlier, also run once in SQL Editor:  
`supabase/migrations/006_ensure_shop_race.sql` (safe concurrent first-login). New projects: full `supabase/setup.sql` already includes this.

Also run (existing projects) for logo + rate limits if not on latest `setup.sql`:

- `supabase/migrations/007_shop_logo.sql`
- `supabase/migrations/008_rate_limit.sql`

## 3b. Rate limits (security)

The app layers three free protections:

| Layer | What |
|-------|------|
| **Browser** | OTP send cooldown (~45s), verify / sale / purchase / return / shop update limits (`src/lib/rateLimit.ts`) |
| **Database** | `assert_shop_rate` before cloud writes (sale, purchase, return, shop, contacts) |
| **Supabase Auth** | Built-in email OTP rate limits (dashboard) |

**Supabase Dashboard (recommended):** Authentication → Rate Limits — keep email OTP limits on (default is fine for a free shop demo). Do not disable them.

Shopkeeper-facing message when blocked: Bangla “অনেকবার চেষ্টা…” / countdown on the login button.

## 4. Email (free)

Gmail App Password SMTP (already used locally). No paid email product required.  
Disposable/temp inboxes usually **do not** receive OTP from Gmail SMTP — use real Gmail addresses for smoke.

## 5. Smoke test after deploy

### Manual (browser)

1. Open the live URL → email OTP login  
2. Complete wizard → purchase → sale → see dashboard charts  
3. Logout → second email → empty/other shop (no first shop stock)

### Anonymous isolation smoke (no OTP inbox)

1. Supabase → Authentication → Providers → enable **Anonymous** (free).  
2. `npm run smoke:isolation:anon`  
3. Expect `ISOLATION_SMOKE_PASS`.

### Scripted isolation (free, two real Gmails)

**Phased (recommended — no long wait timeout):**

```bash
npx --yes tsx scripts/live-isolation-smoke.mts --send-a
# inbox → then:
npx --yes tsx scripts/live-isolation-smoke.mts --verify-a --otp-a=123456
# wait ~1 min for rate limit
npx --yes tsx scripts/live-isolation-smoke.mts --send-b
npx --yes tsx scripts/live-isolation-smoke.mts --verify-b --otp-b=654321
npx --yes tsx scripts/live-isolation-smoke.mts --isolate
```

**All-in-one** (polls OTP files up to 5 minutes each):

```bash
npm run smoke:isolation
```

Defaults: `softvenceanik@gmail.com` then `anikroy302@gmail.com` (`SMOKE_EMAIL_A` / `SMOKE_EMAIL_B`).  
Success line: `ISOLATION_SMOKE_PASS`. Offline schema: `npm run check:isolation`.

### SQL Editor RLS proof (no OTP inbox)

If OTP smoke is inconvenient, run [`supabase/tests/rls_isolation.sql`](../supabase/tests/rls_isolation.sql) once in the Supabase SQL Editor. Look for notice **`RLS_ISOLATION_PASS`** (transaction rolls back — no leftover users). Requires catalog parts already seeded (open the app once while logged in).

## Local CLI (optional)

```bash
netlify link --id cfe42c61-cdf2-4118-8522-c17519b29601
netlify open
```
