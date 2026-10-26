# Contributing

Thanks for helping! Small, focused pull requests are easiest to review.

## Setup

```bash
npm install
npm run dev
npm test
npm run build   # must pass before opening a PR
```

## Adding or fixing quiz questions

Questions live in [`src/data/quizzes.ts`](src/data/quizzes.ts), keyed by roadmap item id (`<section>:<slug>`, see `src/data/pythonRoadmap.ts`).

```ts
Q(
  'What does this print?',            // question
  '[0, 4]',                           // the correct answer
  ['[0, 1, 4, 9]', '[0, 2]', '[4, 16]'], // exactly 3 plausible wrong answers
  'Only even x pass the filter.',     // short explanation shown after answering
  'print([x * x for x in range(4) if x % 2 == 0])' // optional code snippet
)
```

Guidelines:

- Exactly 4 distinct options (1 correct + 3 wrong). Tests enforce this.
- Each topic needs at least 1 question. 2–3 per topic (one concept, one code-reading) is ideal.
- **Run the code snippet in real Python** before submitting to confirm the answer.
- Keep wrong answers plausible, not silly, and avoid trick questions.

Practice links live in [`src/data/practice.ts`](src/data/practice.ts) and must be real, free LeetCode problems (`https://leetcode.com/problems/<slug>/`).

## Code style

- TypeScript strict mode, functional React components, hooks.
- Keep the app local-first: no required backend, no secrets, no tracking.
- Match the existing patterns (Dexie tables in `src/db.ts`, pages in `src/pages`, shared UI in `src/components/ui.tsx`).
- Changing the database schema? Add a new `this.version(n).stores(...)` in `src/db.ts` rather than editing an existing version, so existing users' data migrates.

## Changing the cloud schema

`supabase/schema.sql` must stay re-runnable and keep every write behind a validating function. `npm test` loads it into an in-memory Postgres and checks security and scoring; add a check for any new rule.

## Reporting bugs

Open an issue with your browser, steps to reproduce, and any console errors.
