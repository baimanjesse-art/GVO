# 82-0 Arena — Supabase setup (one time, ~5 minutes)

Accounts, permanent Elo, and the online **Draft** mode all run on Supabase
(free tier). Do these steps once; then everything auto-deploys from GitHub.

## 1. Create a project
1. Go to <https://supabase.com> → sign up / log in → **New project**.
2. Name it (e.g. `82-0-arena`), pick a region near you, set a database
   password (save it somewhere), and create. Wait ~1 minute for it to spin up.

## 2. Create the tables + functions
1. In the project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this repo, copy the **whole file**, paste it
   in, and click **Run**. You should see "Success. No rows returned".
   - It's safe to re-run if you ever change it.

## 3. Turn on email/password login
1. **Authentication → Providers → Email** — make sure it's **enabled**.
2. For easiest testing, **Authentication → Providers → Email → "Confirm email"**
   can be turned **off** (players sign in immediately). Leave it on if you want
   email verification — sign-ups then have to click a link before logging in.

## 4. Grab your keys
1. **Project Settings → API**.
2. Copy two values:
   - **Project URL** → `https://<something>.supabase.co`
   - **anon public** key (the long one under "Project API keys")

## 5. Add the keys to Vercel
1. <https://vercel.com/elliottjesse/82-0-arena/settings/environment-variables>
2. Add these two (check **Production** and **Preview**):
   | Name | Value |
   |------|-------|
   | `VITE_SUPABASE_URL` | your Project URL |
   | `VITE_SUPABASE_ANON_KEY` | your anon public key |
3. Save, then **redeploy** (Deployments → ⋯ → Redeploy) so the build picks up
   the vars. From then on every push auto-deploys with them.

## Done
- The **anon key is safe to expose** in the browser — that's its purpose.
  Elo and match results can only be changed by the database functions, so
  players can't edit their own rank.
- If anything in step 2 errors, paste me the message and I'll fix the SQL.
