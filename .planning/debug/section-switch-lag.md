---
status: fixed
trigger: "small lags when switching between home, pantry, rivo, profile and kitchen counter"
created: 2026-10-09T00:00:00Z
updated: 2026-10-09T00:00:00Z
---

## Symptoms
Switching between Home, Pantry, Rivo (chat), Profile and Kitchen Counter shows small but visible lags on every switch.

All five "pages" are client-side sections of a single component, `src/app/home/basic/HomePage.tsx`, picked by `activeSection` state. Sidebar and bottom nav only call `setActiveSection`. No route change happens, so the lag doesn't come from Next.js routing, middleware or server rendering. It comes from how the sections mount and animate. Here are the causes I found, biggest first.

## Root causes

1. **Sequential exit→enter animation (main cause, ~600 ms on every switch).**
   `HomePage.tsx:329` uses `<AnimatePresence mode="wait">` with `duration: 0.3` on both exit and enter. The new section isn't even **mounted** until the old one has finished fading out. So every tap has a dead 300 ms before anything new appears, then another 300 ms fade-in.

2. **Pantry has a second, nested "wait" chain (~1.1 s total).**
   `PantryPage.tsx:214-231,464-482`: `isMounted` starts `false`, so the first render is always `PantryLoadingState`, even though SSR `initialData` is already there. One tick later the key flips `loading → content` inside another `AnimatePresence mode="wait"` with a 0.4 s `fadeIn`. Sequence: home exits (0.3) → skeleton → skeleton exits (0.4) → content fades in (0.4).

3. **The recipes skeleton flashes on every return to Home.**
   `RecipesSection.tsx:873-888` uses the same `mounted` gate. It renders `HeroCardSkeleton` first, then swaps to the full 1.5k-line tree. You see a skeleton→content flash plus one extra heavy commit.

4. **Network/render cascade every time you open Pantry.**
   - `usePantry.ts:229` refetches `/api/pantry`, `/drafts` and `/restock-items` on every mount, even when it has initial data.
   - `fetchItems` dispatches `pantry:changed`. `usePantrySync` listens for it (`usePantrySync.ts:187`) and calls `refreshPantrySummary`, which fetches `/api/pantry` and `/api/recipes/matches`.
   - `PantryPage.tsx:233` *also* calls `onPantryChanged` (= `refreshPantrySummary`) on mount and whenever the item count changes.
   - Net result per Pantry visit: about 2× `/api/pantry`, 2× `/api/recipes/matches` (the expensive one), plus drafts and restock. Each response does 4 `setState`s in `HomePage`, which re-renders the whole shell (sidebar, nav, section) while the enter animation is running, so the animation stutters.

5. **Every section remounts from scratch and refetches.**
   Sections unmount on exit, so each visit starts over:
   - Chat: `/api/chat/sessions`, the session itself, `/api/chat/limit`, then a smooth scroll to the bottom (`ChatWithRivoPage.tsx:328-394`).
   - Kitchen Counter: `/api/pantry` (`KitchenCounterPage.tsx:300`).
   - Profile and Pantry come back with the **stale SSR `initialData`**, so they show old data and then jump when the refetch lands. Profile never refetches if it has initial data, so edits disappear after you navigate away and come back.

6. **Lazy chunks on first visit.**
   Chat and Kitchen Counter are `dynamic(..., { ssr: false })` (`HomePage.tsx:55-68`). The first tap downloads the JS chunk and shows an empty gray skeleton.

7. **Layout/scroll jumps.**
   - The `<main>` className (padding and overflow) switches instantly when you go to or from Chat (`HomePage.tsx:323-327`) while the old section is still fading out, so the old content jumps.
   - The `<main>` scroll position is never reset, so the new section enters at the old section's scroll offset.

## Fix plan

### Phase 1: quick wins (low risk)
- **`HomePage.tsx` (outer AnimatePresence):** stop waiting for the exit. Either drop the exit animation and use `initial={false}` with a short enter-only fade (opacity 0→1, ~150 ms, no y), or use `mode="popLayout"`. Recommended: no exit, 150 ms opacity enter.
- Apply the layout className only after the section changes. The simple way is to derive padding per section inside each `motion.div` instead of on `<main>`.
- **Reset scroll on switch:** add a `ref` on `<main>` and call `scrollTo(0,0)` in a `useEffect` on `primaryActiveSection`.
- **`PantryPage.tsx`:**
  - Remove the `isMounted` gate. Show the skeleton only when `isLoading` (no initial data).
  - Remove the inner `mode="wait"` loading→content swap, or make it `initial={false}`.
  - Shorten `fadeIn` to about 0.2 s.
- **`RecipesSection.tsx`:** remove the `mounted`/`HeroCardSkeleton` gate. Check first that nothing in the tree needs client-only APIs during render; if something does, guard that leaf only.
- **Prefetch lazy chunks:** after first paint (`requestIdleCallback` in `HomePage`), call `import("@/app/chat-with-rivo/ChatWithRivoPage")` and `import("@/app/kitchen-counter/KitchenCounterPage")`. Optionally also do it on `pointerenter`/`touchstart` of the nav buttons.

### Phase 2: stop the Pantry refetch cascade
- `usePantry.ts`: when `initialItems` is provided, skip the immediate `fetchItems` on mount, or run it in the background without dispatching `pantry:changed`. Dispatch `pantry:changed` only after real mutations (add/update/delete/confirm), not after plain reads.
- `PantryPage.tsx:233`: drop the mount call to `onPantryChanged`. The event already covers mutations, so this effect only adds a duplicate `/api/recipes/matches`.
- `usePantrySync.refreshPantrySummary`: coalesce calls that arrive at the same time (keep one in-flight promise in a ref) and skip `setState` when nothing changed.

### Phase 3: keep visited sections alive (biggest UX win; changes behaviour)
- In `HomePage`, track a `visitedSections` set. Render every visited section at once and hide the inactive ones with `hidden`/`display:none`, wrapped in a component that fades the active one in. Use React 19 `<Activity>` if this React version supports it; otherwise use CSS.
- The result: instant switches, scroll and filter state preserved, no refetch, and no stale-SSR flash.
- Things to guard:
  - Kitchen Counter's wake lock must run only while it's active. Pass an `isActive` prop.
  - Chat's `visualViewport` listeners and auto-scroll must be gated on `isActive`.
  - `useTutorialSurface` already depends on `activeSection`, so it's fine.
- Profile: lift `profileData`/`nutritionData` into state that survives, which keep-alive gives for free. This also fixes the "edits vanish" issue.

## Critical files
- `src/app/home/basic/HomePage.tsx`
- `src/app/pantry/components/PantryPage.tsx`
- `src/app/home/components/RecipesSection.tsx`
- `src/hooks/usePantry.ts`, `src/hooks/usePantrySync.ts`
- `src/app/kitchen-counter/KitchenCounterPage.tsx`, `src/app/chat-with-rivo/ChatWithRivoPage.tsx` (only for the Phase 3 `isActive` gating)

## Verification
- `npm run dev`, log in, and switch Home→Pantry→Rivo→Profile→Kitchen Counter repeatedly on a mobile viewport.
- Network tab: entering Pantry should trigger at most one `/api/pantry` and one `/api/recipes/matches` (zero after Phase 3).
- Performance trace (chrome-devtools MCP `performance_start_trace`) of one switch: time from tap to the first frame of the new section should drop from ~600–1100 ms to under 200 ms.
- React DevTools Profiler: no repeated `HomePage` commits during the enter animation.
- Regression checks:
  - Pantry add/delete still updates the Home "cookable" counts.
  - Kitchen Counter "cook" flow from recipes and from chat still works.
  - The `?section=` deep links (`/chat-with-rivo` redirect) still work.
  - `npm test` and `npm run lint` pass.

## Resolution

All three phases implemented.

**Phase 1 (quick wins):**
- `HomePage.tsx`: removed the `AnimatePresence mode="wait"` exit/enter chain. Sections are no longer unmounted on switch (see Phase 3); the active pane gets a 150 ms opacity enter fade via a new `SectionPane` wrapper. Layout padding (`pt/px/pb`) now lives on each pane instead of on `<main>`, so switching no longer restyles the shared scroll container. Added idle-time prefetch (`requestIdleCallback`, fallback `setTimeout`) of the Chat and Kitchen Counter dynamic chunks.
- `PantryPage.tsx`: dropped the `isMounted` gate (skeleton only when `isLoading`), made the loading→content `AnimatePresence` `initial={false}`, shortened `fadeIn` 0.4 s → 0.2 s.
- `RecipesSection.tsx`: removed the `mounted`/`HeroCardSkeleton` gate and the now-unused skeleton.

**Phase 2 (Pantry refetch cascade):**
- `usePantry.ts`: `fetchItems(showLoading, notify)`; the mount effect passes `notify = !hasInitialItems`, so a plain read with SSR data no longer dispatches `pantry:changed`. Mutations still notify.
- `PantryPage.tsx`: removed the mount/`items.length` effect that called `onPantryChanged`; removed the now-unused prop and `expiringItems` destructure.
- `usePantrySync.ts`: `refreshPantrySummary` now keeps a single in-flight promise in a ref (coalesces burst events) and skips all `setState`s when the pantry/matches signature is unchanged.

**Phase 3 (keep-alive via CSS `display:none`):**
- `HomePage.tsx`: `visitedSections` set keeps every opened section mounted; inactive panes are hidden with `display:none`. Scroll and filter/component state persist, no refetch on return, no stale-SSR flash, and Profile edits survive navigation.
- `ChatWithRivoPage.tsx`: new `isActive` prop gates the `visualViewport` listeners and the auto-scroll, and scrolls to bottom when re-activated.
- `KitchenCounterPage.tsx`: new `isActive` prop gates the wake lock and the `pantry:changed` listener.

**Checks:** `npx eslint` (changed files) clean, `npx tsc --noEmit` clean, `npm run build` compiled + type-checked (only fails at page-data collection on a missing `STRIPE_PRICE_PLUS_MONTHLY` env var, unrelated). `npm test`: 150/152 pass; the 2 failures are pre-existing in `src/lib/langgraph/custom-recipe/nodes/*` and tracked separately in this folder.

**Not verified here:** the manual mobile switch walkthrough and the performance trace (require an authenticated session).

