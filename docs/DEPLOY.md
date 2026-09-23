# Free production deploy

Live site (already on Netlify free): https://bike-parts-management.netlify.app  
Admin: https://app.netlify.com/projects/bike-parts-management  
Repo: https://github.com/DevAnikRoy/Bike-Parts-Management (`main`)

Local folder is linked via Netlify CLI (`.netlify` is gitignored).

## 1. Push latest code

Uncommitted UI/auth work must be on `main` before Netlify rebuilds it. Push yourself when ready (agent does not push unless asked).

## 2. Netlify environment variables

Site configuration → Environment variables → add for **Production** (and Preview if you want):

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | your project URL (`https://….supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | anon **public** key only |

Then **Deploys → Trigger deploy → Clear cache and deploy site**.  
Vite bakes these in at build time — changing env without redeploy does nothing.

## 3. Supabase Auth URLs

Authentication → URL Configuration:

- Site URL: `https://bike-parts-management.netlify.app`
- Redirect URLs: also add  
  `https://bike-parts-management.netlify.app`  
  and keep `http://localhost:5173` for local.

If the database was set up earlier, also run once in SQL Editor:  
`supabase/migrations/006_ensure_shop_race.sql` (safe concurrent first-login). New projects: full `supabase/setup.sql` already includes this.

## 4. Email (free)

Gmail App Password SMTP (already used locally). No paid email product required.

## 5. Smoke test after deploy

1. Open the live URL → email OTP login  
2. Complete wizard → purchase → sale → see dashboard charts  
3. Logout → second email → empty/other shop (no first shop stock)

## Local CLI (optional)

```bash
netlify link --id cfe42c61-cdf2-4118-8522-c17519b29601
netlify open
```
