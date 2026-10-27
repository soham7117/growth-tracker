# Changelog

## 1.0.1

Final release of version 1.

- Sidebar **Sign out** button while signed in
- In-app confirmation dialogs and toasts replace every native browser `confirm` / `alert` (themed, keyboard and screen-reader friendly, mobile ready)
- Tabs left open across a deploy now recover automatically instead of showing an error; the error card resets when you navigate
- Hosted-only sync: removed the manual overwrite buttons and the custom Supabase connection
- Social preview tags, `robots.txt`, `.nvmrc`, `.editorconfig`
- Dependency upgrades: TypeScript 7, recharts 3, dexie-react-hooks 4, current GitHub Actions; Dependabot no longer proposes React major bumps
- Keep-alive workflow active, so the free Supabase project does not pause

## 1.0.0

First stable release.

- Focus timers (pomodoro, stopwatch, countdown) with alarms and notifications
- Journal with voice dictation, skills map, goals, practice log
- Python roadmap checklist where each topic is unlocked by passing a quiz, with LeetCode / GeeksforGeeks practice
- SM-2 flashcards, insights, streaks and heatmap
- Installable PWA that works offline; JSON export and import
- Optional cloud sync via Supabase: GitHub sign-in, private (optionally end-to-end encrypted) backup, previous-version restore, conflict handling
- Optional opt-in leaderboard built from daily totals only
- Production hardening: strict CSP and security headers, validated backup imports, safe external links, accessibility pass
- Row-level security tested against a real Postgres in CI; live smoke test for the deployed database
