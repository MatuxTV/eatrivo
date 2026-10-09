# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## custom-recipe-schema-const-error — Gemini structured recipe generation failed due to incompatible schema transport
- **Date:** 2026-03-23
- **Error patterns:** custom recipe, response_schema, const, Gemini, jsonSchema, structuredParseSucceeded false, truncated output
- **Root cause:** Gemini rejected the strict app schema because it lowered to unsupported const fields, and jsonSchema mode remained unreliable for this larger nested payload even after a compatibility schema patch.
- **Fix:** Switched recipeRequest to a Gemini-compatible loose schema with functionCalling structured output, then serialized the parsed object back into JSON for the existing strict validator.
- **Files changed:** src/lib/langgraph/custom-recipe/nodes/recipeRequest.ts
---
## section-switch-lag — visible lag on every client-side section switch in the home shell
- **Date:** 2026-10-09
- **Error patterns:** section switch lag, tap delay, AnimatePresence mode="wait", skeleton flash, pantry refetch cascade, remount on navigation, stale SSR data, scroll jump
- **Root cause:** `HomePage` wrapped every section in `<AnimatePresence mode="wait">` (300 ms exit before the next section even mounted), Pantry and Recipes added extra `isMounted` skeleton gates, and each visit remounted the section so it refetched `/api/pantry` + `/api/recipes/matches` (with duplicate `pantry:changed` dispatches).
- **Fix:** enter-only 150 ms fade with keep-alive panes (visited sections stay mounted, inactive ones `display:none`), removed the `isMounted`/`mounted` skeleton gates, made `usePantry` skip the notify on plain reads, removed the duplicate Pantry mount callback, and coalesced `usePantrySync.refreshPantrySummary` with an in-flight ref + no-change signature skip. Chat/Kitchen Counter side effects gated by a new `isActive` prop.
- **Files changed:** src/app/home/basic/HomePage.tsx, src/app/home/components/RecipesSection.tsx, src/app/pantry/components/PantryPage.tsx, src/hooks/usePantry.ts, src/hooks/usePantrySync.ts, src/app/chat-with-rivo/ChatWithRivoPage.tsx, src/app/kitchen-counter/KitchenCounterPage.tsx
---
