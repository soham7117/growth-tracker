## What does this change?

<!-- A short description and the issue it closes, e.g. "Closes #12". -->

## Checklist

- [ ] The PR title follows Conventional Commits (`type(scope): summary`); it becomes the squash-commit message
- [ ] `npm test` and `npm run build` pass locally
- [ ] UI changes were checked in the browser (include a screenshot if visual)
- [ ] New or changed quiz questions have exactly 1 correct + 3 distinct wrong answers, and code snippets were run in real Python
- [ ] Database schema changes add a new `this.version(n)` in `src/db.ts` instead of editing an existing one
- [ ] No secrets, personal data, or tracking added (the app stays local-first)
