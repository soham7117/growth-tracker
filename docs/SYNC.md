# Cloud sync & leaderboard: setup guide

Growth Tracker works fully offline. Cloud sync is **optional** and uses [Supabase](https://supabase.com) (Postgres + Auth). The hosted site connects to one Supabase project that the site owner configures with two build-time variables (section 4). Forks that want their own backend create their own project and set the same variables.

Sign-in is **GitHub and Google only** (no passwords stored, no email sending needed). Email sign-in needs a custom SMTP sender and is not offered yet.

> Free-tier numbers below were checked against supabase.com/pricing at the time of writing. Limits change, so re-check before launch.

## 1. Create the project
1. Create a free project at supabase.com (Free plan: ~500 MB database, 50,000 monthly active users, 2 active projects, paused after 1 week of inactivity, no automatic backups).
2. **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](../supabase/schema.sql), **Run**. It is safe to run again later.

## 2. Turn on GitHub and Google sign-in
Open **Authentication → Providers** in Supabase and note the **Callback URL** it shows (`https://<project-ref>.supabase.co/auth/v1/callback`).

**GitHub**
1. GitHub → Settings → Developer settings → OAuth Apps → *New OAuth App*.
2. Homepage URL: your site. Authorization callback URL: the Supabase callback URL above.
3. Copy the Client ID, generate a Client secret, paste both into Supabase → Providers → GitHub → Enable.

**Google**
1. Google Cloud Console → APIs & Services → *OAuth consent screen* (External; the basic profile/email scopes need no verification) → Credentials → *Create OAuth client ID* → Web application.
2. Authorized redirect URI: the Supabase callback URL. Copy the Client ID and secret into Supabase → Providers → Google → Enable.

## 3. Lock down what you don't use
- **Authentication → Providers → Email: turn OFF.** The app doesn't offer email sign-in, and leaving it on lets anyone create unconfirmed accounts through the API. Dashboards sometimes don't apply this switch reliably, so `schema.sql` also installs a `block_email_signups` trigger that rejects email/password signups on the server (remove it with `drop trigger block_email_signups on auth.users;` if you ever add email sign-in). You can test it: an email signup request should answer "Email sign-up is disabled".
- **Authentication → URL Configuration**
  - Site URL: your production URL (for example `https://growth-tracker-ecru.vercel.app`).
  - Redirect URLs: add the production URL with `/**` and `http://localhost:5173/**` for local development.
- Optional but recommended for a public site: enable CAPTCHA protection (Authentication → Attack Protection).
- Never put the **service_role** key anywhere in this app or repo. Only the **anon (public)** key is used; row-level security protects the data.

## 4. Connect the app
Copy *Project Settings → API → Project URL* and *anon public key*.
- Vercel → Project → Settings → Environment Variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.
- Local dev: copy `.env.example` to `.env.local` and fill the same two values.

## 5. Keep a free project awake (optional)
Free projects pause after a week with no activity. The workflow in `.github/workflows/keepalive.yml` pings the public leaderboard function every 3 days. Add repository secrets `SUPABASE_URL` and `SUPABASE_ANON_KEY` to activate it. Without them it does nothing.

## What is stored

| Table | Contents | Who can read it |
|---|---|---|
| `auth.users` (managed by Supabase) | Email from GitHub/Google, provider, timestamps. No password. | You (dashboard) |
| `profiles` | Display name, avatar emoji, optional country, opt-in flag | Owner; board shows only opted-in names |
| `daily_activity` | Per day: focus minutes, topics passed, problems, cards (about 40 bytes/day) | Owner; board shows totals only |
| `backups` | One compressed, optionally encrypted snapshot per person (max 1.5 MB) | Owner only |

All writes go through validating SQL functions; clients cannot write tables directly. See the comments in `schema.sql`.

> **Expected advisor warnings.** Supabase's security advisor will list the `SECURITY DEFINER` functions as warnings ("Public/Signed-in users can execute SECURITY DEFINER function"). That is by design: these functions are the only write path, each checks `auth.uid()` and validates its input, and only `leaderboard` is callable without signing in.

## How sync behaves
- **Manual:** *Sync now* decides automatically: push local changes, pull newer cloud data, or flag a **conflict** when both changed. On a conflict you choose **Keep this device** or **Keep cloud copy** (the latter saves a copy of your current data first).
- **Automatic:** pushes a few seconds after changes and checks the cloud every minute. It never overwrites on conflict; it pauses and asks.
- **Safety nets:** the cloud keeps one *previous version* (the largest backup of the last 7 days), so an accidental overwrite with a tiny or empty backup can be undone with **Restore previous cloud version**. "Keep cloud copy" and "Restore previous cloud version" first save a JSON copy of this device. If a different account signs in on the same device, the first sync is treated as a new device and raises a conflict instead of mixing the two accounts.
- **Encryption:** if enabled, backups are encrypted in the browser (PBKDF2 + AES-GCM). The passphrase lives only in the current tab. Lose it and the encrypted cloud copy cannot be recovered.
- The leaderboard numbers are separate from the backup and are only sent if you opted in.

## Administration
- Hide someone from the board: `update profiles set hidden = true where display_name = 'Name';`
- Remove a user entirely: Supabase dashboard → Authentication → Users → delete (cascades to all their rows).
- Free plans have **no automatic backups**: periodically export important tables from the dashboard.

## Smoke-testing a deployed project
Paste [`supabase/smoke-test.sql`](../supabase/smoke-test.sql) into the Supabase SQL Editor and Run. It exercises the real functions as temporary test users (profile, backup push, conflict, rate limit, daily stats, leaderboard, privacy between users, deletion) and then raises an error on purpose so everything is rolled back. The expected values are listed at the top of the file; read them in the error message `LIVE_TEST_RESULT {...}`.

## Testing the SQL locally
`npm test` runs `supabase/schema.test.ts`, which loads `schema.sql` into an in-memory Postgres (PGlite) and checks row-level security, input clamping, conflict handling, scoring and account deletion. Run it whenever you change the schema.
