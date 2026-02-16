# LangGraph Shopping List Pipeline Implementation Plan

## Context

The current shopping list generation in `src/lib/langchain.ts` is a single-prompt approach: user data is assembled into a massive prompt, sent to Gemini, and markdown is returned. The diagram in `diagrams/shopping-list/shopping-list.mmd` describes a much richer pipeline with inventory scanning, virtual pantry, macro validation with a feedback loop, and structured output. We're implementing this full pipeline using LangGraph.

## 1. Install dependency

```bash
npm install @langchain/langgraph
```

## 2. New file structure

```
src/lib/langgraph/
  index.ts                    # Graph definition, compile, export convenience function
  state.ts                    # StateGraph schema (Zod-based)
  types.ts                    # TypeScript interfaces
  constants.ts                # Activity multipliers, durable item lists, staples
  nodes/
    fetchUser.ts              # Load user profile + user info from DB
    macroCalc.ts              # Deterministic BMR/TDEE/macro math
    fetchHistory.ts           # Get most recent shopping list from DB
    inventoryScan.ts          # Parse last list, classify durable vs perishable
    virtualPantry.ts          # Build pantry state from scan + saved inventory context
    promptBuilder.ts          # Assemble AI prompt (targets + pantry + context + feedback)
    aiGenerator.ts            # Call Gemini 2.5 Flash, parse structured JSON
    merger.ts                 # Merge pantry + AI draft, deduplicate, adjust quantities
    macroValidator.ts         # Validate 90-110% of calorie target, set feedback if not
    finalFormat.ts            # Format to markdown + structured JSON, prepare for save
  utils/
    macroMath.ts              # Pure functions: calculateBMR, calculateTDEE, calculateDailyCalories, calculateMacros, calculateBMI
    pantryClassifier.ts       # Rules-based durable/perishable classification
    shoppingListParser.ts     # Parse markdown shopping list tables into structured items
```

## 3. Graph state

Single `ShoppingListGraphState` with these key fields:
- **Input**: `userProfileId` (only required input)
- **User data**: `userProfile`, `season`
- **Macro targets**: `macroTargets` (BMR, TDEE, daily/weekly calories, protein, fat, carbs, BMI)
- **History**: `lastShoppingListMarkdown`, `lastShoppingListId`
- **Pantry**: `durableItems`, `virtualPantry`
- **AI**: `aiPrompt`, `draftShoppingItems`
- **Merged**: `mergedShoppingItems`
- **Validation**: `validationResult` (isValid, totalCalories, calorieRatio, feedback)
- **Retry control**: `retryCount` (default 0), `maxRetries` (default 3), `feedbackMessage`
- **Output**: `finalMarkdown`, `finalStructuredData`
- **Errors**: accumulated via reducer

## 4. Graph edges

```
START -> fetchUser -> macroCalc -> fetchHistory -> inventoryScan -> virtualPantry
  -> promptBuilder -> aiGenerator -> merger -> macroValidator
                                                |
                    (invalid & retries left) -> promptBuilder (loop back)
                    (valid OR max retries)   -> finalFormat -> END
```

The conditional edge from `macroValidator` checks `validationResult.isValid`:
- **true** -> `finalFormat`
- **false** -> `promptBuilder` (which incorporates the `feedbackMessage` into the next prompt)

The loop goes back to `promptBuilder` (not `aiGenerator`) so the feedback instructions get included.

## 5. Node details

| Node | Reads | Writes | Key logic |
|------|-------|--------|-----------|
| **fetchUser** | `userProfileId` | `userProfile`, `season` | Query `userInfoTable` + `userProfiles`, compute season from month |
| **macroCalc** | `userProfile` | `macroTargets` | Mifflin-St Jeor BMR, activity TDEE, goal-adjusted calories, macro splits -- extracted from `langchain.ts:302-372` into `utils/macroMath.ts` |
| **fetchHistory** | `userProfileId` | `lastShoppingListMarkdown`, `lastShoppingListId` | Query `shoppingLists` ORDER BY created_at DESC LIMIT 1 |
| **inventoryScan** | `lastShoppingListMarkdown` | `durableItems` | Parse markdown -> items, classify via `pantryClassifier.ts` using keyword lists in `constants.ts` |
| **virtualPantry** | `durableItems`, `userProfileId` | `virtualPantry` | Merge scan results with saved `inventoryContext` from DB |
| **promptBuilder** | `userProfile`, `macroTargets`, `virtualPantry`, `season`, `feedbackMessage` | `aiPrompt` | Build prompt requesting **structured JSON** output (not markdown). On retries, append feedback with specific calorie adjustment instructions |
| **aiGenerator** | `aiPrompt` | `draftShoppingItems` | Call Gemini 2.5 Flash, parse JSON response (reuse `extractJSON` pattern from `langchain.ts`) |
| **merger** | `draftShoppingItems`, `virtualPantry` | `mergedShoppingItems` | Deduplicate, reduce quantities by pantry amounts, mark `fromPantry` items |
| **macroValidator** | `mergedShoppingItems`, `macroTargets`, `retryCount`, `maxRetries` | `validationResult`, `retryCount`, `feedbackMessage` | Sum calories, check 90-110% range. If fail + retries left: increment count, set feedback. If fail + no retries: force-accept with warning |
| **finalFormat** | `mergedShoppingItems`, `macroTargets`, `userProfile` | `finalMarkdown`, `finalStructuredData` | Generate markdown (backward-compatible with current UI) + structured JSON |

## 6. Database changes

**File**: `src/db/schema.ts`

### New table: `inventoryContext`
```
id, userProfileId (FK), shoppingListId (FK nullable), pantryItems (jsonb),
durableItems (jsonb), macroTargetsUsed (jsonb), weekStartDate, weekEndDate, created_at
```

### New columns on `shoppingLists`
- `structuredData` (jsonb, nullable) -- full structured JSON output
- `pipelineMetadata` (jsonb, nullable) -- retryCount, validationResult, errors

Run `npm run db:push` after schema changes.

## 7. API route changes

**File**: `src/app/api/admin/shopping-lists/create/route.ts`

- Add `useLangGraph: boolean` flag in request body (feature flag for migration)
- When true: call `generateShoppingListPipeline(userProfileId)` from `@/lib/langgraph`
- Return both `markdown` and `structuredData` in response
- Keep existing `EatrivoAIService.generateShoppingList()` path for `useLangGraph: false`

**File**: `src/app/api/admin/shopping-lists/route.ts` (POST - save)

- Accept optional `structuredData` and `pipelineMetadata` in body
- Save to new columns on `shoppingLists`
- Create `inventoryContext` row when structured data is provided

Integration: Use existing `RequestLock` (5min TTL) and `CacheService` from `src/lib/redis.ts`, same patterns as `src/app/api/meal-plans/route.ts`.

## 8. Migration strategy

1. **Phase 1**: Build behind `useLangGraph` flag. Old code untouched. Admin can toggle.
2. **Phase 2**: Run both pipelines for same users, compare outputs, validate macro accuracy.
3. **Phase 3**: Default to LangGraph, keep old path as fallback.
4. **Phase 4**: Remove `generateShoppingList()` from `langchain.ts`. Keep `generateWeeklyMealPlan()`.

## 9. Error handling

- Each node: try/catch, append to `errors` state, return partial state
- Critical errors (user not found, no API key): throw to halt graph
- AI parse failures: return empty items -> validator flags it -> retry loop handles it
- Graph-level: wrap `invoke()` in try/catch, fall back to old pipeline during migration
- Max retries (3) prevents infinite feedback loops; RequestLock TTL (300s) bounds total time

## 10. Key files to modify/reference

- `src/lib/langchain.ts` -- Extract macro math (lines 302-372) and `extractJSON` (lines 104-128) for reuse
- `src/db/schema.ts` -- Add `inventoryContext` table + new columns on `shoppingLists`
- `src/app/api/admin/shopping-lists/create/route.ts` -- Add LangGraph pipeline path
- `src/app/api/admin/shopping-lists/route.ts` -- Accept structured data on save
- `src/lib/redis.ts` -- Reference for caching/locking patterns
- `src/app/api/meal-plans/route.ts` -- Reference for established caching + locking + error handling patterns

## 11. Verification

1. Run `npm run build` to verify no TypeScript errors
2. Run `npm run lint` to verify ESLint compliance
3. Run `npm run db:push` to apply schema changes
4. Test via admin shopping list create endpoint with `useLangGraph: true`
5. Compare output markdown with existing pipeline for same user
6. Verify feedback loop triggers by checking `retryCount` in response metadata
7. Verify `inventoryContext` row is created after generation
8. Test with a user who has no prior shopping lists (empty pantry path)
