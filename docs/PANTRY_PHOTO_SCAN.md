# Pantry: add items from photos

**Branch:** `beta-pantry_rework` · **Status:** implemented, not committed, not tested on a real phone

## What it does
The pantry has a "Pridať z fotky" button. The user takes or uploads 1–15 photos of groceries. Each photo is resized in the browser (long edge 1568 px, JPEG 0.82, EXIF/GPS dropped) and sent to `POST /api/pantry/scan-photos`. The server runs **one vision-model call per photo** (4 in parallel, 1 retry each), merges and dedupes the items, flags the ones already in the pantry, and returns a review list. The user ticks items and confirms; they go through the existing draft queue (`scan-photos/finalize` → Redis drafts → `drafts/confirm`). Photos are never stored.

## Files
| Area | Path |
|---|---|
| Provider factory | `src/lib/ai/model-config.ts` (pure), `src/lib/ai/models.ts` (server), `src/lib/ai/image-content.ts` |
| Pure helpers | `src/lib/pantry/photo-scan/` — `constants`, `schema`, `merge`, `mark-existing`, `validate-batch`, `quota`, `magic-bytes`, `prompt`, `recognize-batch`, `client-compress` |
| Server only | `photo-scan/access.ts`, `photo-scan/quota-store.ts`, `photo-scan/recognize-one.ts` |
| API | `src/app/api/pantry/scan-photos/route.ts`, `…/quota/route.ts`, `…/finalize/route.ts` |
| UI | `src/app/pantry/components/PhotoScanModal.tsx`, button in `PantryPage.tsx` |
| Copy | `pantry.photo_*` in `locales/sk.json` and `en.json` |

## Rules
- Access: any signed-in user. Daily quota in photos (UTC day): free 5, paid 60 (`PHOTO_DAILY_QUOTA` in `constants.ts`). Reserved before the AI call, refunded for photos that failed on our side.
- Limits: 15 photos, 1.5 MB each, 4 MB per request (Vercel body limit). The client splits larger sets into several requests.
- Rate limit: `expensive` (10/min). `maxDuration = 60`.
- Items below confidence 0.4 or already in the pantry are unticked by default.
- Photo items never write to the global barcode catalog.

## Changed in existing code
- `extractReceipt.ts`: a failing extraction now counts as a retry (it used to loop to the recursion limit).
- `draft-cache.ts`: drafts live 30 min (was 60 s). `receipt-scan-contracts.ts`: review payload up to 100 items. `drafts/route.ts`: max 100 items.
- `drafts/confirm/route.ts`: while quantity tracking is off, drafts that match an existing pantry row (or each other) no longer create duplicates; out-of-stock matches are marked in stock. Uses `invalidatePantryCaches`.

## AI provider
All model calls go through `getChatModel(feature)` (see `docs/AI_PROVIDER.md`). Photo recognition uses the `photoRecognition` feature (Claude Haiku 5.5 by default).

## Not done yet
- Analytics events (`pantry_photo_scan_*`) are not registered.
- Privacy policy still names OpenAI (the AI provider is now Anthropic) and says nothing about photos; legal text needs the owner's review and a version bump.
- No tutorial/coachmark; no per-photo progress during the AI call.
- Not tried on iOS Safari / Android Chrome (camera `capture`, HEIC), and not run against a real grocery photo.
