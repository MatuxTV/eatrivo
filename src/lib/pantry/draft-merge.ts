import type { PantryDraftItem } from "./draft-cache";

export interface ExistingPantryRowForMerge {
  id: string;
  name: string;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  inStock: boolean;
}

export interface DraftMergePlan {
  /** drafts that still need a new pantry row */
  toInsert: PantryDraftItem[];
  /** ids of existing rows that are out of stock and must be marked in stock */
  restockRowIds: string[];
  /** drafts that matched an existing row or an earlier draft in the same batch */
  mergedCount: number;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function identityKeys(item: {
  name: string;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
}): string[] {
  const keys: string[] = [];
  if (item.ingredientSpecificKey) keys.push(`specific:${item.ingredientSpecificKey}`);
  if (item.ingredientKey) keys.push(`key:${item.ingredientKey}`);
  const name = normalizeName(item.name);
  if (name) keys.push(`name:${name}`);
  return keys;
}

/**
 * Presence-only merge (used while quantity tracking is off): a draft that matches an
 * existing row (by specific key, ingredient key or normalized name) or an earlier draft
 * in the same batch does not create a duplicate row. Matching out-of-stock rows are
 * flagged to be marked in stock again.
 */
export function planDraftMerge(
  drafts: PantryDraftItem[],
  existingRows: ExistingPantryRowForMerge[],
): DraftMergePlan {
  const rowByKey = new Map<string, ExistingPantryRowForMerge>();
  for (const row of existingRows) {
    for (const key of identityKeys(row)) {
      if (!rowByKey.has(key)) rowByKey.set(key, row);
    }
  }

  const seenDraftKeys = new Set<string>();
  const restock = new Set<string>();
  const toInsert: PantryDraftItem[] = [];
  let mergedCount = 0;

  for (const draft of drafts) {
    const keys = identityKeys(draft);
    const matchedRow = keys.map((key) => rowByKey.get(key)).find(Boolean);
    const duplicateOfDraft = keys.some((key) => seenDraftKeys.has(key));

    if (matchedRow || duplicateOfDraft) {
      mergedCount += 1;
      if (matchedRow && !matchedRow.inStock && draft.inStock) {
        restock.add(matchedRow.id);
      }
      continue;
    }

    keys.forEach((key) => seenDraftKeys.add(key));
    toInsert.push(draft);
  }

  return { toInsert, restockRowIds: [...restock], mergedCount };
}
