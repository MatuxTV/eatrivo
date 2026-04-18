## Drizzle Baseline Strategy

The source of truth for this repository is [src/db/schema.ts](../src/db/schema.ts).

This branch does not use a replayable Drizzle migration journal. Database changes are applied with `npm run db:push`, and `drizzle/meta/_journal.json` is intentionally absent.

Rules for this folder:

- Do not rebuild historical migration archaeology just to preserve replay order.
- Keep only current-state artifacts that are still useful for the active branch.
- If the project needs replayable migrations again, create a fresh squashed baseline from the current schema instead of extending the old chain.
- Treat data migrations that cannot be expressed by `schema.ts` as explicit one-off release work, not as a reason to restore the deleted journal.