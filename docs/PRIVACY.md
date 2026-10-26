# Privacy notes

Growth Tracker is **local-first**. By default everything stays in your browser and nothing is sent anywhere.

## Without cloud sync (default)
- Data lives in your browser's IndexedDB/localStorage on your device. No accounts, no analytics, no tracking.
- Voice dictation (optional) uses your browser's built-in speech recognition. In Chrome and Edge, audio is processed by the browser vendor's speech service. It only runs when you press the mic button.
- "Practice" buttons open LeetCode, GeeksforGeeks or Google search in a new window. This app sends them no personal data.

## With cloud sync (optional, you turn it on)
Data goes to the Supabase project the site is configured with (or your own project if you chose "My own Supabase").

| What | Why | Visible to others? |
|---|---|---|
| Account (via GitHub or Google): your email address and provider id | Sign-in. **No password is ever stored by this app.** | No (only the project administrator can see it in their dashboard) |
| Display name, avatar, optional country, opt-in flag | Your leaderboard identity | Only if you opt in to the leaderboard |
| Daily totals (focus minutes, topics passed, problems logged, cards reviewed) | Leaderboard scoring | Aggregated scores only, and only if you opt in |
| Backup snapshot (journal, skills, goals…) | Restore / move between devices | **No.** Only you. Optionally encrypted so even the administrator can't read it |

- **Choose a display name that isn't your real name.** It is public on the leaderboard if you opt in.
- **Opting out:** turning the leaderboard off removes your daily totals from the cloud. Signing out forgets this device's sync markers and the encryption passphrase.
- **Previous version:** to make accidents recoverable, the cloud keeps one extra (older) copy of your backup. It is deleted with your backup, or with your account.
- **Delete everything:** *Settings → Cloud sync → Delete my cloud data* removes your backup and leaderboard history; *Delete my account* removes the account and all rows. Data on your own device is untouched.
- **Retention:** data is kept until you delete it. The administrator may remove accounts that are inactive for a long time.
- **Leaderboard fairness:** scores are computed from numbers your device reports and are validated and capped on the server, but cannot be fully verified. It is for fun.
- **Third parties:** Supabase (hosting and database), and GitHub or Google (sign-in). Their own privacy policies apply to their services.

## Questions or requests
Open an issue on the repository, or contact the site administrator.
