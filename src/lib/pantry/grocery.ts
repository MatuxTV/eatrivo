import type {
  pantryItems,
  pantryRestockItems,
  shoppingListItems,
} from "@/db/schema";
import { formatAmountLabel } from "@/lib/pantry/format";
import { normalizeShoppingListAmount } from "@/lib/pantry/shopping-list-amount";
import { isStampedAvailabilityCandidate } from "@/lib/pantry/tracking";
import { guessFoodCategory } from "@/lib/ingredients/units";

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
  const trackingMode = pantryItem.trackingMode ?? "quantity";
  const inStock = pantryItem.inStock ?? true;
  const isStamped =
    trackingMode === "availability" &&
    (pantryQuantity !== null ||
      isStampedAvailabilityCandidate({
        name: pantryItem.name,
        ingredientKey: pantryItem.ingredientKey,
        ingredientSpecificKey: pantryItem.ingredientSpecificKey,
        quantity: pantryQuantity,
        unit: pantryUnit,
      }));
  const supportsRestockPackage =
    isStamped && Boolean(restockItem?.defaultQuantity ?? restockItem?.defaultUnit);

  let lowStock = false;
  let lowStockReason:
    | "missing_quantity"
    | "restock_threshold"
    | "out_of_stock"
    | null = null;

  if (trackingMode === "availability") {
    if (!inStock) {
      lowStock = true;
      lowStockReason = "out_of_stock";
    } else if (
      isStamped &&
      pantryQuantity !== null &&
      thresholdQuantity !== null &&
      pantryUnit !== null &&
      thresholdUnit !== null &&
      pantryUnit === thresholdUnit &&
      pantryQuantity <= thresholdQuantity
    ) {
      lowStock = true;
      lowStockReason = "restock_threshold";
    } else if (isStamped && pantryQuantity !== null && pantryQuantity <= 0) {
      lowStock = true;
      lowStockReason = "out_of_stock";
    }
  } else if (restockItem) {
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
    trackingMode,
    inStock,
    category: pantryItem.category ?? guessFoodCategory(pantryItem.name),
    lowStock,
    lowStockReason,
    restockItemId: restockItem?.id ?? null,
    restockDefaultQuantity: restockItem?.defaultQuantity ?? null,
    restockDefaultUnit: restockItem?.defaultUnit ?? null,
    isStamped,
    supportsRestockPackage,
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
  const trackingMode = pantryItem.trackingMode ?? "quantity";
  const isStamped =
    trackingMode === "availability" &&
    isStampedAvailabilityCandidate({
      name: pantryItem.name,
      ingredientKey: pantryItem.ingredientKey,
      ingredientSpecificKey: pantryItem.ingredientSpecificKey,
      quantity: parseStoredQuantity(pantryItem.quantity),
      unit: normalizeRestockUnit(pantryItem.unit),
    });
  const quantity =
    trackingMode === "quantity" || isStamped
      ? restockItem?.defaultQuantity ?? pantryItem.quantity ?? null
      : null;
  const unit =
    trackingMode === "quantity" || isStamped
      ? restockItem?.defaultUnit ?? pantryItem.unit ?? null
      : null;
  const normalizedAmount = normalizeShoppingListAmount(quantity, unit);

  return {
    name: pantryItem.name.trim(),
    ingredientName: pantryItem.ingredientName ?? pantryItem.name.trim(),
    ingredientKey: pantryItem.ingredientKey,
    ingredientSpecificKey: pantryItem.ingredientSpecificKey,
    trackingMode,
    inStock: pantryItem.inStock ?? true,
    quantity: normalizedAmount.ok ? quantity : null,
    unit: normalizedAmount.ok ? normalizedAmount.unit : null,
    amountLabel: normalizedAmount.ok
      ? normalizedAmount.amountLabel
      : formatAmountLabel(null, null),
    category:
      pantryItem.category ??
      restockItem?.category ??
      guessFoodCategory(pantryItem.name),
  };
}
