# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Use GitHub's private reporting instead:
**Security → Report a vulnerability** on this repository. You'll get a reply within a few days.

## What is in scope

- The web app (this repository) and its service worker.
- The Supabase schema in `supabase/schema.sql` (row-level security, the `SECURITY DEFINER` functions, grants).

## How the project protects users

- **Local-first.** All data stays in the browser unless the user turns cloud sync on.
- **No secrets in the client.** The only credential shipped is Supabase's public anon key. Every table has
  row-level security and writes go through audited functions; see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **End-to-end encrypted backups (optional).** AES-GCM with a PBKDF2 key; the passphrase never leaves the tab.
- **Strict headers.** A Content-Security-Policy (no inline scripts, `connect-src` limited to Supabase),
  HSTS, `frame-ancestors 'none'` and more are set in `vercel.json`.
- **Untrusted input is validated.** Imported backups are checked before any data is replaced, and user-entered
  links are only rendered if they are plain `http(s)`.
- **Tested.** The database rules run against a real Postgres (PGlite) in CI, and `supabase/smoke-test.sql`
  verifies a deployed project inside a transaction that is always rolled back.
