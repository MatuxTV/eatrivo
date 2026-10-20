import { normalizeItemKey, type MergedPhotoItem } from "./merge";

export interface ExistingPantryName {
  name: string;
  ingredientName: string | null;
}

export interface PhotoReviewItem extends MergedPhotoItem {
  id: string;
  alreadyInPantry: boolean;
}

/** Flags merged items that already exist in the user's pantry (by normalized name or ingredient name). */
export function markExistingItems(
  items: MergedPhotoItem[],
  existing: ExistingPantryName[],
): PhotoReviewItem[] {
  const known = new Set<string>();
  for (const row of existing) {
    const nameKey = normalizeItemKey(row.name);
    if (nameKey) known.add(nameKey);
    if (row.ingredientName) {
      const ingredientKey = normalizeItemKey(row.ingredientName);
      if (ingredientKey) known.add(ingredientKey);
    }
  }

  return items.map((item, index) => ({
    ...item,
    id: `photo-${index}`,
    alreadyInPantry: known.has(normalizeItemKey(item.name)),
  }));
}