# Pantry quantity tracking: disabled (reversible)

- **Date:** 2026-10-20
- **Branch:** `beta-pantry_rework`
- **Flag:** `PANTRY_QUANTITY_TRACKING` in `src/lib/config/features.ts` (default **off**)

## Executive summary

The pantry now only answers "do I have it, yes or no". Amounts and units are no longer shown, edited, compared or deducted for pantry items. Recipes (database recipes and Rivo custom recipes) keep their required amounts as display data, but they are matched against the pantry by presence only.

Nothing was deleted and nothing was commented out. Every change is gated behind one flag, so the old behaviour is still in the code and type-checked. Commented-out code would have left unused imports, which fail lint (`no-unused-vars` is an error in this repo).

Stored data is untouched: `quantity`, `unit` and `tracking_mode` stay in the database and are ignored. No migration was run.

## How to bring the feature back

1. Set `NEXT_PUBLIC_PANTRY_QUANTITY_TRACKING=true` in the environment. It is inlined at build time, so rebuild and redeploy. Client and server always agree.
2. Clear the pantry Redis keys (`pantry-view:*` snapshots and the pantry draft cache), see "Known limits" below.
3. Check the stale-data warning below before announcing it.

Find every gated spot at any time with:

```bash
grep -rn "PANTRY_QUANTITY_TRACKING" src
```

## Where the flag is read

The flag is `PANTRY_QUANTITY_TRACKING` (a constant). Callers use these wrappers instead of the original helpers, which stay unchanged so their tests keep passing:

| Wrapper | File | Flag off |
|---|---|---|
| `effectiveTrackingMode(mode)` | `src/lib/pantry/tracking.ts` | always `"availability"` |
| `resolveEffectiveTrackingMode(input)` | `src/lib/pantry/tracking.ts` | always `"availability"` |
| `shouldPreserveEffectiveQuantity(input)` | `src/lib/pantry/tracking.ts` | always `false` |
| `supportsEffectiveQuantityMutations(input)` | `src/lib/pantry/tracking.ts` | always `false` |
| `buildEffectivePantryComparison(...)` | `src/lib/recipes/recipe-quantity-comparison.ts` | status is `available-staple` if any matching row is in stock, else `unavailable`; the recipe's own amount is still returned for display |

## What was gated

### Server: writing pantry rows

| File | What changes with the flag off |
|---|---|
| `src/app/api/pantry/route.ts` (POST) | new rows are availability rows, no quantity or unit stored |
| `src/app/api/pantry/[id]/route.ts` (PUT) | old quantity-mode rows behave like availability rows; `inStock` toggles are allowed on them; stored `quantity`, `unit` and `tracking_mode` are **not rewritten**; quantity operations are rejected |
| `src/lib/schemas/pantry.ts` | `inStock` is allowed for every item; an `inStock`-only update is valid |
| `src/lib/pantry/prepare-drafts.ts` | scan and draft items are saved without amounts |
| `src/app/api/pantry/import/[shoppingListId]/route.ts` | same as drafts |
| `src/app/api/shopping-lists/[id]/checkout-to-pantry/route.ts` | bought items are planned without amounts, so matching rows are only marked in stock; stored quantity and unit of existing rows are not written back |
| `src/lib/langgraph/pantry-batch/nodes/upsertPantry.ts` | same ingredient always merges (units ignored); merging only marks it in stock; new items are availability rows with no amount |

### Server: reading the pantry

| File | What changes with the flag off |
|---|---|
| `src/lib/pantry/grocery.ts` | `trackingMode` is reported as `availability`; low stock means only "not in stock" (no restock threshold, no "missing quantity"); no pack/restock flags; shopping-list seeds carry no amount |
| `src/lib/recipes/recipe-matches.ts` | uses `buildEffectivePantryComparison` |
| `src/lib/custom-recipes/contracts.ts` | uses `buildEffectivePantryComparison` |
| `src/lib/pantry/consumption.ts` | `consumeRecipeFromPantry` returns zero counts immediately: **cooking changes nothing** (the route and analytics events still run, with zero counts) |

### AI prompts (wording only)

| File | What changes with the flag off |
|---|---|
| `src/lib/langgraph/custom-recipe/nodes/fetchPantry.ts` | no quantity or unit passed to the AI; every row is an availability row |
| `src/lib/langgraph/custom-recipe/pantryPromptContext.ts` | one plain list of in-stock names, "amounts are not tracked" |
| `src/lib/langgraph/custom-recipe/nodes/recipeRequest.ts` | summary says "Pantry items in stock: N" |
| `src/lib/langgraph/shopping-list/nodes/inventoryScan.ts` | only in-stock rows count as owned; no quantities |
| `src/lib/langgraph/shopping-list/nodes/buildPrompt.ts` | names only; instruction is now "every listed item is already owned, do NOT add it to the shopping list" |

The receipt-scan, barcode and pantry-batch prompts were not changed. They still extract quantities and units, which are then ignored when saving.

### UI

| File | What changes with the flag off |
|---|---|
| `src/components/inline-edit/QuantityUnitEditor.tsx` | new optional prop `presenceOnly` (default false, so the shopping list is unchanged): hides amount, unit, tracking switch and quick-adjust chips; keeps category and in-stock buttons |
| `src/app/pantry/components/PantryItemRow.tsx` | passes `presenceOnly`; hides the add-pack button and the recurring-restock pin |
| `src/app/pantry/components/PantryEditableItemCard.tsx` | hides amount, unit, tracking switch and availability buttons |
| `src/app/pantry/components/AddPantryItemModal.tsx` | new items default to `availability` |
| `src/app/pantry/components/PantryPage.tsx` | pending drafts show only the name; no low-stock highlight |
| `src/app/pantry/components/ReceiptScanModal.tsx` | hides the "check quantities" hint (amount inputs are hidden by the card) |
| `src/app/home/components/RecipeBrowserDialog.tsx`, `src/app/home/components/RivoCustomRecipeExperience.tsx` | the recipe's own amount stays visible; "have at home" replaces it only when the ingredient has no amount; nothing is shown as a "staple" |
| `src/app/kitchen-counter/KitchenCounterPage.tsx` | uses `buildEffectivePantryComparison`; recipe amount stays visible; the "missing ingredients" dialog no longer promises a deduction |

### Translations

New key in both `locales/en.json` and `locales/sk.json`: `home.basic.kitchenCounter.missingIngredientsDescriptionNoDeduction`. All old keys are kept.

## Not gated on purpose

- `QuantityUnitEditor` for shopping lists: shopping-list quantities stay (they are needed for shopping).
- Recipe ingredient amounts and units, and unit validation for recipes.
- The restock routes (`/api/pantry/restock-items/*`) and the `pantry_restock_items` table: they are simply unreachable from the UI.
- `src/app/home/_archived-premium/*`: unchanged, still compiles against `usePantry` and `QuantityUnitEditor`.
- Receipt and barcode extraction.
- The database schema.

## Known limits and weak spots

1. **Shopping-list generation can under-buy.** The AI used to compare amounts. It now treats any listed pantry item as already owned, even if only a little is left.
2. **Recipes can show a false "can cook".** Having a little flour counts as having it. Wording is "in your pantry", not "enough".
3. **Duplicate rows are more visible.** `POST /api/pantry`, `drafts/confirm` and the old import route never merge, and there is no unique constraint. Adding "milk" twice gives two rows. Only the batch graph and checkout merge. Not changed here.
4. **Re-enabling shows stale amounts.** Old rows come back with the quantity they had when the feature was turned off; rows created while it was off have none.
5. **Caches carry old data for a while.** Pantry snapshots in Redis (about 120 s) hold already-computed `lowStock`, and the draft cache holds quantity strings. Clear the pantry keys after flipping the flag.
6. **Copy and assets are out of sync (manual follow-up).** `SCREEN_PANTRY.jpg` (sign-in carousel and PWA manifest) shows quantities, and `tutorial.coachmarks.pantry.*` and the sign-in slide copy mention stock levels. Not changed.
7. **Restock features have no meaning now.** Restock thresholds, "add pack" and recurring restock are hidden. The data stays.
8. **One test already failed before this change** and is not caused by it: `validateRecipeJson` "accepts available preferences-only candidates" (a capitalised category in an AI output fixture). It is the only failure left in `npm test`.

## Tests

Result with the flag off (default): `npm test` runs 186 tests, 185 pass, 1 fails (the pre-existing `validateRecipeJson` one). `npx tsc --noEmit` is clean, and ESLint is clean on every touched file. Whole-repo `npm run lint` still reports older warnings in files this work did not touch.

New tests cover both modes. The flag is read once when the module loads, and node:test runs each file in its own process, so each flag-on test sets the environment variable inside the test and imports the module afterwards.

| File | Covers |
|---|---|
| `src/lib/pantry/tracking.flag-off.test.ts`, `tracking.flag-on.test.ts` | the four tracking wrappers |
| `src/lib/recipes/recipe-quantity-comparison.flag-off.test.ts`, `.flag-on.test.ts` | presence-only comparison (never `unit-mismatch`), original statuses with the flag on |
| `src/lib/pantry/grocery.flag-off.test.ts`, `grocery.flag-on.test.ts` | low-stock logic. `grocery.ts` imports the database client, so these tests set a dummy `DATABASE_URL` before importing; no query is run |
| `src/lib/langgraph/custom-recipe/pantryPromptContext.flag-off.test.ts` | prompt lists in-stock names without amounts |

`src/lib/langgraph/custom-recipe/nodes/recipeRequest.test.ts` was rewritten as the flag-on test of the same function. It expected the heading `Always-available staples already in stock:`, but the code prints `Untracked availability items already in stock:`, so it was already failing before this work.

Not covered by tests: the UI components, the API routes and the cooking early return in `consumeRecipeFromPantry` (importing it needs a real database). These were reviewed in code and type-checked, but not run in a browser.
