import type {
  pantryItems,
  pantryRestockItems,
  shoppingListItems,
} from "@/db/schema";
import { guessFoodCategory } from "@/lib/units";

import {
  findMatchingRestockItem,
  normalizeRestockUnit,
  parseStoredQuantity,
} from "./restock";

type PantryRow = typeof pantryItems.$inferSelect;
type PantryRestockRow = typeof pantryRestockItems.$inferSelect;
type ShoppingListItemRow = typeof shoppingListItems.$inferSelect;

function namesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function formatAmountLabel(
  quantity: string | number | null | undefined,
  unit: string | null | undefined,
): string | null {
  if (quantity === null || quantity === undefined || quantity === "") {
    return null;
  }

  const normalizedQuantity =
    typeof quantity === "number" ? String(quantity) : quantity;

  return unit ? `${normalizedQuantity} ${unit}`.trim() : normalizedQuantity;
}

export function findMatchingShoppingListItem(
  shoppingItems: ShoppingListItemRow[],
  pantryItem: Pick<
    PantryRow,
    "name" | "ingredientKey" | "ingredientSpecificKey"
  >,
): ShoppingListItemRow | undefined {
  return shoppingItems.find((item) => {
    if (
      pantryItem.ingredientSpecificKey &&
      item.ingredientSpecificKey === pantryItem.ingredientSpecificKey
    ) {
      return true;
    }

    if (pantryItem.ingredientKey && item.ingredientKey === pantryItem.ingredientKey) {
      return true;
    }

    return namesMatch(item.name, pantryItem.name);
  });
}

export function derivePantryInventoryItem(
  pantryItem: PantryRow,
  restockItems: PantryRestockRow[],
  shoppingItems: ShoppingListItemRow[],
  activeShoppingListId: string | null,
) {
  const restockItem = findMatchingRestockItem(restockItems, {
    name: pantryItem.name,
    ingredientKey: pantryItem.ingredientKey,
    ingredientSpecificKey: pantryItem.ingredientSpecificKey,
  });
  const matchedShoppingItem = findMatchingShoppingListItem(
    shoppingItems,
    pantryItem,
  );
  const pantryQuantity = parseStoredQuantity(pantryItem.quantity);
  const pantryUnit = normalizeRestockUnit(pantryItem.unit);
  const thresholdQuantity = restockItem
    ? parseStoredQuantity(restockItem.defaultQuantity)
    : null;
  const thresholdUnit = restockItem
    ? normalizeRestockUnit(restockItem.defaultUnit)
    : null;

  let lowStock = false;
  let lowStockReason: "missing_quantity" | "restock_threshold" | "out_of_stock" | null =
    null;

  if (restockItem) {
    if (pantryQuantity === null) {
      lowStock = true;
      lowStockReason = "missing_quantity";
    } else if (
      thresholdQuantity !== null &&
      pantryUnit !== null &&
      thresholdUnit !== null &&
      pantryUnit === thresholdUnit &&
      pantryQuantity <= thresholdQuantity
    ) {
      lowStock = true;
      lowStockReason = "restock_threshold";
    } else if (pantryQuantity <= 0) {
      lowStock = true;
      lowStockReason = "out_of_stock";
    }
  } else if (pantryQuantity !== null && pantryQuantity <= 0) {
    lowStock = true;
    lowStockReason = "out_of_stock";
  }

  return {
    ...pantryItem,
    category: pantryItem.category ?? guessFoodCategory(pantryItem.name),
    lowStock,
    lowStockReason,
    restockItemId: restockItem?.id ?? null,
    restockDefaultQuantity: restockItem?.defaultQuantity ?? null,
    restockDefaultUnit: restockItem?.defaultUnit ?? null,
    isOnActiveShoppingList: Boolean(matchedShoppingItem),
    activeShoppingListId: matchedShoppingItem ? activeShoppingListId : null,
    activeShoppingListItemId: matchedShoppingItem?.id ?? null,
  };
}

export function buildPantryInventoryItems(
  pantryRows: PantryRow[],
  restockItems: PantryRestockRow[],
  shoppingItems: ShoppingListItemRow[],
  activeShoppingListId: string | null,
) {
  return pantryRows.map((item) =>
    derivePantryInventoryItem(item, restockItems, shoppingItems, activeShoppingListId),
  );
}

export function resolveShoppingListSeedFromPantryItem(
  pantryItem: PantryRow,
  restockItems: PantryRestockRow[],
) {
  const restockItem = findMatchingRestockItem(restockItems, {
    name: pantryItem.name,
    ingredientKey: pantryItem.ingredientKey,
    ingredientSpecificKey: pantryItem.ingredientSpecificKey,
  });

  const quantity = restockItem?.defaultQuantity ?? pantryItem.quantity ?? null;
  const unit = restockItem?.defaultUnit ?? pantryItem.unit ?? null;

  return {
    name: pantryItem.name.trim(),
    ingredientName: pantryItem.ingredientName ?? pantryItem.name.trim(),
    ingredientKey: pantryItem.ingredientKey,
    ingredientSpecificKey: pantryItem.ingredientSpecificKey,
    quantity,
    unit,
    amountLabel: formatAmountLabel(quantity, unit),
    category:
      pantryItem.category ??
      restockItem?.category ??
      guessFoodCategory(pantryItem.name),
  };
}
