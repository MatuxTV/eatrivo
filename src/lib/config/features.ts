/**
 * Feature flags. Inlined at build time (NEXT_PUBLIC_), so server and client always agree.
 *
 * PANTRY_QUANTITY_TRACKING
 *   false (default): the pantry only knows whether an item is in stock. Amounts and units
 *   are neither shown nor used for matching, shopping seeds or cooking deductions.
 *   true: original behaviour (quantity / unit tracking, restock thresholds, deductions).
 *
 * Every gated spot is tagged `[PANTRY_QUANTITY_TRACKING]`. List them with:
 *   grep -rn "PANTRY_QUANTITY_TRACKING" src
 * See docs/PANTRY_QUANTITY_DISABLED.md.
 */
export const PANTRY_QUANTITY_TRACKING =
  process.env.NEXT_PUBLIC_PANTRY_QUANTITY_TRACKING === "true";
