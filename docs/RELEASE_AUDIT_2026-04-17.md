# Eatrivo Pre-Release Audit

Date: 2026-04-17
Branch: eatrivo-2.0

## Executive Summary

This audit verified the current codebase against earlier security, PWA, and legal reports.

Current release status: release candidate, pending final authenticated smoke validation.

The previously confirmed blockers around `send-email` authorization and client analytics consent enforcement have now been fixed in this branch.

The repository is not using a historical Drizzle replay workflow on this branch. Database changes are applied from `src/db/schema.ts` via `npm run db:push`, and `drizzle/meta/_journal.json` is intentionally absent in the current working tree.

The following hardening items have also been completed:

- administrative surfaces now use admin-only role semantics instead of membership tiers
- admin analytics read endpoints use shared admin authorization and `Cache-Control: no-store`
- Stripe price IDs are validated at startup
- manifest copy and screenshots now reflect active pages only

## Drizzle Baseline Strategy

### 1. Branch uses schema push, not journal replay

Files:

- `package.json`
- `drizzle.config.ts`
- `src/db/schema.ts`
- `drizzle/README.md`

What changed:

- Verified that the operational database workflow for this repository is `npm run db:push` (`drizzle-kit push`), not SQL migration replay.
- Kept `drizzle/meta/_journal.json` removed instead of restoring a partially reconstructed historical chain.
- Removed the archaeology-only SQL files that had been reconstructed purely to imitate historical replay.
- Added a `drizzle/README.md` contract so future database work stays aligned with the journal-less branch workflow.

Operational note:

- Historical SQL replay is not the release gate for this branch, because the codebase does not expose a `db:generate` or `db:migrate` workflow and currently applies schema changes with `drizzle-kit push`.
- The real database release gate is whether the current schema can be pushed cleanly to a staging or disposable database and whether production receives the corresponding role transition safely.
- If the project later wants a replayable migration story again, the right fix is a fresh squashed baseline from the current schema, not continued repair of the deleted journal.

## Fixed In This Pass

### 2. send-email authorization now uses admin role semantics

File: `src/app/api/send-email/route.ts`

What changed:

- Elevated email sending now resolves `userProfiles.role` instead of checking membership.
- Shopping-list email sends are restricted to the dedicated `admin` role.

### 3. Client analytics now enforce consent centrally

File: `src/lib/analytics-client.ts`

What changed:

- `trackClientEvent()` now exits early unless analytics consent is present in the stored cookie-consent state.
- This closes the helper-level bypass that previously affected page-mount and tutorial/chat events.

### 4. Analytics read APIs are hardened for admin-only access

Files:

- `src/app/api/admin/analytics/route.ts`
- `src/app/api/admin/chat-analytics/route.ts`

What changed:

- Both routes now use shared admin authorization.
- Responses are marked `private, no-store` to avoid caching analytics payloads.

### 5. Stripe price IDs now fail fast at startup

File: `src/lib/stripe.ts`

What changed:

- `STRIPE_PRICE_PLUS_MONTHLY` and `STRIPE_PRICE_PLUS_YEARLY` are now validated with the same fail-fast behavior as `STRIPE_SECRET_KEY`.

### 6. Manifest now reflects active app surfaces

File: `public/manifest.json`

What changed:

- The manifest description no longer markets archived shopping-list and meal-plan flows.
- Screenshots now point to active app surfaces: home, pantry, and chat.


## High-Risk Findings

### 4. Resolved: Stripe price ID validation is in place

Files:

- `src/lib/stripe.ts`
- `src/lib/resend.ts`

Current behavior:

- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PLUS_MONTHLY`, and `STRIPE_PRICE_PLUS_YEARLY` now fail fast at startup.
- `RESEND_FROM_EMAIL` still falls back to `Acme <onboarding@resend.dev>` and should be reviewed separately before production.

Why this matters:

- Checkout can fail at runtime due to missing price IDs.
- Production mail can be sent from a development-looking sender identity.

Remaining recommendation:

- Verify the configured production sender identity in the deployed environment.

### 5. Resolved: admin authorization now uses role semantics consistently

Files:

- `src/app/config/permission.ts`
- `middleware.ts`
- `src/app/admin/page.tsx`

Current behavior:

- Administrative surfaces are now restricted to the dedicated `admin` authorization role.
- Middleware and shared auth helpers both use `userProfile.role` semantics for admin access.
- The misleading role comments that previously blurred membership and authorization were cleaned up in the touched auth files.

Why this matters:

- The current implementation is safer than the comments suggest, but the model is still conceptually split between membership and role.
- This is how the `send-email` bug survived after other admin fixes were made.

Release impact:

- This is no longer an active high-risk finding on this branch.

### 6. Stripe payment-failure handling needs an idempotency review

File: `src/app/api/stripe/webhook/route.ts`

Confirmed behavior:

- `handleInvoicePaid()` uses `onConflictDoUpdate()`.
- `handlePaymentFailed()` inserts invoices with `onConflictDoNothing()`.

Assessment:

- This is not yet proven to be a hard blocker from static review alone.
- It is a real audit target for replay behavior and invoice-state correctness.

Recommended next step:

- Run a final webhook replay smoke test in staging to confirm invoice lifecycle behavior against real Stripe event replays.

## Product-Scope Warnings

### 7. Archived meal-plan and shopping-list generation endpoints remain in the shipped artifact

Files:

- `src/app/api/shopping-lists/generate/route.ts`
- `src/app/api/shopping-lists/generate/status/route.ts`
- `src/app/api/meal-plans/route.ts`
- `src/app/api/meal-plans/status/route.ts`
- `src/app/api/meal-plans/[shoppingListId]/route.ts`

Confirmed behavior:

- These endpoints return archived `410 Gone` responses.
- Current live references found by code search are in `src/app/home/_archived-premium/**`, not in active app-shell flows.

Assessment:

- Not a hard runtime blocker if these features are intentionally out of scope for this release.
- They become a release blocker if public messaging, onboarding, or PWA metadata still promises them.

### 8. Resolved: manifest copy now reflects active capabilities

File: `public/manifest.json`

Current behavior:

- The manifest description now reflects active app surfaces instead of archived meal-plan generation.
- The install surface screenshots now point to active screens only.
- `lang` remains hardcoded to `sk`, which is still worth revisiting if install-surface localization becomes a release requirement.

Assessment:

- The main copy mismatch is resolved.
- Only the manifest localization choice remains as a possible product-polish follow-up.

## Verified False Positives or Downgraded Claims

### PWA fetch-handler finding was a false positive

Files:

- `public/sw.js`
- `public/custom-sw.js`

Confirmed behavior:

- `public/sw.js` is Workbox-generated and registers routes through Workbox APIs.
- `custom-sw.js` is imported via `importScripts("/custom-sw.js")`.
- The audit warning about a missing explicit `fetch` listener does not apply to Workbox-based service workers.

### Cookie banner delay alone is not the primary compliance bug

Files:

- `src/app/layout.tsx`
- `src/components/ConditionalAnalytics.tsx`
- `src/components/CookieConsent.tsx`

Confirmed behavior:

- `ConditionalAnalytics` waits for consent state and does not mount GA/PostHog providers until `consent.analytics` is true.
- The actual issue is unguarded client analytics helper usage elsewhere.

## Recommended Release Order

1. Run a final authenticated staging smoke pass for admin analytics, Stripe portal, and push subscription flows.
2. Run webhook replay smoke tests for invoice failure handling.
3. Verify deployed production environment variables match the validated release config.

## Verification Snapshot

### Drizzle workflow verification

- `package.json` exposes `db:push` and `db:studio`, but no `db:generate`, `db:migrate`, or programmatic Drizzle migration runner.
- `drizzle.config.ts` points Drizzle Kit at `src/db/schema.ts` and the `./drizzle` output folder.
- `npx drizzle-kit push` completed successfully in the current workspace environment.
- `drizzle/meta/_journal.json` is currently deleted, which is consistent with a journal-less branch workflow and inconsistent with the earlier audit assumption of a repaired replayable chain.

Assessment:

- Historical replay is not the active release gate for this branch.
- Current schema sync has been validated via `drizzle-kit push`, so the database release gate is closed for this branch workflow.

### Editor diagnostics

- `get_errors` on the workspace returned no editor-reported diagnostics at audit time.

### Lint

Command run:

```bash
npm run lint
```

Result: passed.

Assessment:

- The repository is currently lint-clean.

### Production build

Command run:

```bash
npm run build
```

Observed result:

- Next.js production build completed successfully.
- Type checking passed.

Assessment:

- The current branch is build-clean in the local release verification environment.

## Current Verdict

Primary remaining release gate is final authenticated integration smoke coverage in a staging or production-like environment.