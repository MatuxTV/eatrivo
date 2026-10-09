import {
  fromCanonicalQuantity,
  normalizeUnit,
  toCanonicalQuantity,
} from "@/lib/ingredients/units";

export interface IngredientIdentityFields {
  name: string;
  ingredientId?: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
}

function namesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

// Two rows are the same ingredient when their ids match; failing that, their
// specific keys. The family key is only a fallback for legacy rows that have
// no specific key — siblings like olive-oil and vegetable-oil share the family
// "oil" but are different items.
export function isSameIngredientItem(
  left: IngredientIdentityFields,
  right: IngredientIdentityFields,
): boolean {
  if (left.ingredientId && right.ingredientId) {
    return left.ingredientId === right.ingredientId;
  }

  if (left.ingredientSpecificKey && right.ingredientSpecificKey) {
    return left.ingredientSpecificKey === right.ingredientSpecificKey;
  }

  if (left.ingredientKey && right.ingredientKey) {
    return left.ingredientKey === right.ingredientKey;
  }

  return namesMatch(left.name, right.name);
}

export function findSameIngredientItem<T extends IngredientIdentityFields>(
  items: T[],
  candidate: IngredientIdentityFields,
): T | undefined {
  return items.find((item) => isSameIngredientItem(item, candidate));
}

function parseQuantity(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOptionalUnit(unit: string | null | undefined): string | null {
  return unit ? normalizeUnit(unit) : null;
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// Adds `incoming` to `existing`, expressed in the existing unit. Returns null
// when the units cannot be combined (different dimensions, unknown units).
export function addQuantities(
  existing: { quantity: number; unit: string | null },
  incoming: { quantity: number; unit: string | null },
): { quantity: number; unit: string | null } | null {
  const existingUnit = normalizeOptionalUnit(existing.unit);
  const incomingUnit = normalizeOptionalUnit(incoming.unit);

  if (existingUnit === incomingUnit) {
    return {
      quantity: roundQuantity(existing.quantity + incoming.quantity),
      unit: existingUnit,
    };
  }

  if (!existingUnit || !incomingUnit) {
    return null;
  }

  const existingCanonical = toCanonicalQuantity(existing.quantity, existingUnit);
  const incomingCanonical = toCanonicalQuantity(incoming.quantity, incomingUnit);
  if (
    !existingCanonical ||
    !incomingCanonical ||
    existingCanonical.dimension !== incomingCanonical.dimension
  ) {
    return null;
  }

  const total = fromCanonicalQuantity(
    existingCanonical.value + incomingCanonical.value,
    existingUnit,
  );
  return total === null ? null : { quantity: roundQuantity(total), unit: existingUnit };
}

export interface CheckoutListItem extends IngredientIdentityFields {
  id: string;
  quantity: string | null;
  unit: string | null;
}

export interface CheckoutPantryItem extends IngredientIdentityFields {
  id: string;
  trackingMode: "quantity" | "availability";
  inStock: boolean;
  quantity: string | null;
  unit: string | null;
}

export interface PantryMergeUpdate {
  pantryItemId: string;
  quantity: string | null;
  unit: string | null;
  inStock: boolean;
  shoppingListItemIds: string[];
}

export interface PantryCheckoutPlan<T extends CheckoutListItem = CheckoutListItem> {
  merges: PantryMergeUpdate[];
  inserts: T[];
}

// Decides, for each bought item, whether it tops up an existing pantry item or
// becomes a new row:
// - availability items are simply marked in stock again;
// - quantity items add the bought amount, converting units where possible
//   (500 g onto 1 kg → 1.5 kg);
// - an amount in an incompatible unit (2 ks onto 500 g) becomes its own row.
// Several list items for the same pantry item accumulate into one update.
export function planPantryCheckout<T extends CheckoutListItem>(
  listItems: T[],
  pantryItems: CheckoutPantryItem[],
): PantryCheckoutPlan<T> {
  const working = new Map(
    pantryItems.map((item) => [
      item.id,
      {
        item,
        quantity: parseQuantity(item.quantity),
        unit: normalizeOptionalUnit(item.unit),
        inStock: item.inStock,
        touchedBy: [] as string[],
      },
    ]),
  );
  const inserts: T[] = [];

  for (const listItem of listItems) {
    const incomingQuantity = parseQuantity(listItem.quantity);
    const incomingUnit = normalizeOptionalUnit(listItem.unit);
    const matches = pantryItems.filter((item) => isSameIngredientItem(item, listItem));

    let merged = false;
    for (const match of matches) {
      const state = working.get(match.id)!;

      if (match.trackingMode === "availability" || incomingQuantity === null) {
        state.inStock = true;
        state.touchedBy.push(listItem.id);
        merged = true;
        break;
      }

      if (state.quantity === null) {
        state.quantity = incomingQuantity;
        state.unit = incomingUnit;
        state.inStock = true;
        state.touchedBy.push(listItem.id);
        merged = true;
        break;
      }

      const total = addQuantities(
        { quantity: state.quantity, unit: state.unit },
        { quantity: incomingQuantity, unit: incomingUnit },
      );
      if (total) {
        state.quantity = total.quantity;
        state.unit = total.unit;
        state.inStock = true;
        state.touchedBy.push(listItem.id);
        merged = true;
        break;
      }
    }

    if (!merged) {
      inserts.push(listItem);
    }
  }

  const merges: PantryMergeUpdate[] = [];
  for (const state of working.values()) {
    if (state.touchedBy.length === 0) {
      continue;
    }
    merges.push({
      pantryItemId: state.item.id,
      quantity: state.quantity === null ? null : String(state.quantity),
      unit: state.unit,
      inStock: state.inStock,
      shoppingListItemIds: state.touchedBy,
    });
  }

  return { merges, inserts };
}
